// services/wss/src/classes/User.ts - Enhanced for Phase 3
import { WebSocket } from "ws";
import { GET_OPEN_ORDERS, MessageFromApi } from "@trade/types";
import { IncomingMessage, OutgoingMessage, subscribeOrderbook, unsubscribeOrderbook } from "../types";
import { SubscriptionManager } from "./SubscriptionManager";
import { addToOrderQueue } from "@trade/order-queue";
import { logger } from "@trade/logger";

export class User {
    private id: string;
    private ws: WebSocket;
    private clientIP: string;
    
    // Phase 3: Enhanced connection lifecycle tracking
    private connectionState = {
        isAlive: true,
        lastPingTime: Date.now(),
        lastPongTime: Date.now(),
        messageCount: 0,
        errorCount: 0,
        connectedAt: Date.now(),
        lastActivityTime: Date.now()
    };
    
    private pingInterval: NodeJS.Timeout | null = null;
    private activityTimeout: NodeJS.Timeout | null = null;

    constructor(id: string, ws: WebSocket, clientIP?: string) {
        this.id = id;
        this.ws = ws;
        this.clientIP = clientIP || 'unknown';
        
        this.initializePhase3Features();
        this.addListeners();
        
        // Subscribe to the client-specific Redis channel for API responses
        SubscriptionManager.getInstance().subscribe(this.id, this.id);
        
        this.sendClientId();
        
        logger.info(`PHASE 3 | User ${this.id} constructed from ${this.clientIP}`);
    }

    // Phase 3: Initialize enhanced features
    private initializePhase3Features() {
        // Set up ping-pong heartbeat every 30 seconds
        this.pingInterval = setInterval(() => {
            this.sendPing();
        }, 30000);

        // Set up activity timeout (5 minutes of inactivity)
        this.resetActivityTimeout();

        // Set up WebSocket ping/pong handlers
        this.ws.on('pong', () => {
            this.connectionState.lastPongTime = Date.now();
            this.connectionState.isAlive = true;
        });

        this.ws.on('ping', () => {
            this.ws.pong();
            this.updateActivity();
        });
    }

    // Phase 3: Enhanced message listeners with error handling
    private addListeners() {
        this.ws.on("message", async (rawMessage: string) => {
            try {
                this.updateActivity();
                this.connectionState.messageCount++;

                const parsedMessage = JSON.parse(rawMessage);
                logger.info(`PHASE 3 | User ${this.id} received message:`, parsedMessage.type || parsedMessage.method);

                // Handle subscription/unsubscription messages
                if ("method" in parsedMessage) {
                    await this.handleSubscriptionMessage(parsedMessage);
                }
                // Handle API messages
                else if ("type" in parsedMessage) {
                    await this.handleApiMessage(parsedMessage);
                }
                else {
                    logger.warn(`PHASE 3 | User ${this.id} sent unknown message format:`, parsedMessage);
                }

            } catch (error) {
                this.connectionState.errorCount++;
                logger.error(`PHASE 3 | User ${this.id} | Error processing message: ${rawMessage}. Error:`, error);
                
                // Send error response for malformed messages
                this.sendErrorResponse("Invalid message format");
                
                // If too many errors, consider closing connection
                if (this.connectionState.errorCount > 10) {
                    logger.warn(`PHASE 3 | User ${this.id} has too many errors (${this.connectionState.errorCount}), closing connection`);
                    this.forceClose();
                }
            }
        });

        // Phase 3: Enhanced error handling
        this.ws.on("error", (error) => {
            logger.error(`PHASE 3 | User ${this.id} WebSocket error:`, error);
            this.connectionState.isAlive = false;
            this.cleanup();
        });

        this.ws.on("close", (code, reason) => {
            logger.info(`PHASE 3 | User ${this.id} connection closed (Code: ${code}, Reason: ${reason})`);
            this.connectionState.isAlive = false;
            this.cleanup();
        });
    }

    // Phase 3: Handle subscription messages
    private async handleSubscriptionMessage(parsedMessage: any) {
        try {
            if (parsedMessage.method === subscribeOrderbook) {
                logger.info(`PHASE 3 | User ${this.id} subscribing to:`, parsedMessage.events);
                
                if (Array.isArray(parsedMessage.events)) {
                    parsedMessage.events.forEach((eventName: string) => {
                        try {
                            SubscriptionManager.getInstance().subscribe(this.id, eventName);
                        } catch (subError) {
                            logger.error(`PHASE 3 | User ${this.id} failed to subscribe to ${eventName}:`, subError);
                        }
                    });
                }
                
            } else if (parsedMessage.method === unsubscribeOrderbook) {
                logger.info(`PHASE 3 | User ${this.id} unsubscribing from:`, parsedMessage.events);
                
                if (Array.isArray(parsedMessage.events)) {
                    parsedMessage.events.forEach((eventName: string) => {
                        try {
                            SubscriptionManager.getInstance().unsubscribe(this.id, eventName);
                        } catch (unsubError) {
                            logger.error(`PHASE 3 | User ${this.id} failed to unsubscribe from ${eventName}:`, unsubError);
                        }
                    });
                }
            }
        } catch (error) {
            logger.error(`PHASE 3 | User ${this.id} subscription error:`, error);
            this.sendErrorResponse("Subscription failed");
        }
    }

    // Phase 3: Handle API messages with enhanced error recovery
    private async handleApiMessage(parsedMessage: any) {
        logger.info(`PHASE 3 | User ${this.id} sending API message:`, parsedMessage.type);
        
        try {
            await addToOrderQueue({
                clientId: this.id,
                message: parsedMessage as MessageFromApi
            });
            
            logger.info(`PHASE 3 | User ${this.id} successfully queued ${parsedMessage.type} message`);
            
        } catch (queueError) {
            logger.error(`PHASE 3 | User ${this.id} failed to add to order queue:`, queueError);
            
            // Send appropriate error response based on message type
            this.sendApiErrorResponse(parsedMessage.type);
        }
    }

    // Phase 3: Send appropriate error responses
    private sendApiErrorResponse(messageType: string) {
        try {
            switch (messageType) {
                case "GET_OPEN_ORDERS":
                    this.emitMessage({
                        type: "OPEN_ORDERS",
                        payload: { openOrders: [] }
                    });
                    break;
                    
                case "GET_DEPTH":
                    this.emitMessage({
                        type: "DEPTH",
                        payload: {
                            bids: [], asks: [],
                            yesBids: [], yesAsks: [],
                            noBids: [], noAsks: []
                        }
                    });
                    break;
                    
                case "CREATE_ORDER":
                    this.emitMessage({
                        type: "ORDER_CANCELLED",
                        payload: {
                            orderId: "",
                            executedQty: 0,
                            remainingQty: 0
                        }
                    });
                    break;
                    
                default:
                    this.sendErrorResponse(`Failed to process ${messageType}`);
            }
        } catch (error) {
            logger.error(`PHASE 3 | User ${this.id} failed to send error response:`, error);
        }
    }

    // Phase 3: Send generic error response
    private sendErrorResponse(errorMessage: string) {
        try {
            this.emitMessage({
                type: "CLIENT_ID", // Reusing existing type for error messages
                payload: {
                    clientId: `ERROR: ${errorMessage}`
                }
            });
        } catch (error) {
            logger.error(`PHASE 3 | User ${this.id} failed to send error message:`, error);
        }
    }

    // Phase 3: Enhanced message emission with error handling
    emitMessage(message: OutgoingMessage) {
        if (!this.connectionState.isAlive) {
            logger.warn(`PHASE 3 | Attempted to send message to dead connection ${this.id}`);
            return false;
        }

        try {
            this.ws.send(JSON.stringify(message));
            this.updateActivity();
            return true;
        } catch (error) {
            logger.error(`PHASE 3 | User ${this.id} | Error sending message:`, error);
            this.connectionState.isAlive = false;
            this.cleanup();
            return false;
        }
    }

    // Phase 3: Send client ID with enhanced info
    private sendClientId() {
        this.emitMessage({
            type: "CLIENT_ID",
            payload: {
                clientId: this.id
            }
        });
    }

    // Phase 3: Activity tracking
    private updateActivity() {
        this.connectionState.lastActivityTime = Date.now();
        this.resetActivityTimeout();
    }

    // Phase 3: Reset activity timeout
    private resetActivityTimeout() {
        if (this.activityTimeout) {
            clearTimeout(this.activityTimeout);
        }
        
        // 5 minutes of inactivity timeout
        this.activityTimeout = setTimeout(() => {
            logger.info(`PHASE 3 | User ${this.id} inactive for 5 minutes, closing connection`);
            this.forceClose();
        }, 5 * 60 * 1000);
    }

    // Phase 3: Send ping
    private sendPing() {
        if (!this.connectionState.isAlive) {
            return;
        }

        try {
            this.connectionState.lastPingTime = Date.now();
            this.ws.ping();
            
            // If no pong received within 10 seconds, mark as dead
            setTimeout(() => {
                const timeSinceLastPong = Date.now() - this.connectionState.lastPongTime;
                if (timeSinceLastPong > 40000) { // 40 seconds without pong
                    logger.warn(`PHASE 3 | User ${this.id} failed ping-pong check, marking as dead`);
                    this.connectionState.isAlive = false;
                }
            }, 10000);
            
        } catch (error) {
            logger.error(`PHASE 3 | User ${this.id} ping failed:`, error);
            this.connectionState.isAlive = false;
        }
    }

    // Phase 3: Check if connection is alive
    public isAlive(): boolean {
        // Check various health indicators
        const now = Date.now();
        const timeSinceLastActivity = now - this.connectionState.lastActivityTime;
        const timeSinceLastPong = now - this.connectionState.lastPongTime;
        
        // Consider dead if:
        // 1. Explicitly marked as not alive
        // 2. No activity for 10 minutes
        // 3. No pong response for 2 minutes
        // 4. WebSocket is not open
        return this.connectionState.isAlive && 
               timeSinceLastActivity < 10 * 60 * 1000 &&
               timeSinceLastPong < 2 * 60 * 1000 &&
               this.ws.readyState === WebSocket.OPEN;
    }

    // Phase 3: Get connection info
    public getConnectionInfo() {
        return {
            id: this.id,
            clientIP: this.clientIP,
            isAlive: this.isAlive(),
            state: this.connectionState,
            readyState: this.ws.readyState,
            uptime: Date.now() - this.connectionState.connectedAt
        };
    }

    // Phase 3: Force close connection
    public forceClose() {
        logger.info(`PHASE 3 | Force closing connection for user ${this.id}`);
        this.connectionState.isAlive = false;
        
        try {
            this.ws.terminate();
        } catch (error) {
            logger.error(`PHASE 3 | Error terminating WebSocket for user ${this.id}:`, error);
        }
        
        this.cleanup();
    }

    // Phase 3: Cleanup resources
    private cleanup() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        
        if (this.activityTimeout) {
            clearTimeout(this.activityTimeout);
            this.activityTimeout = null;
        }
        
        logger.info(`PHASE 3 | User ${this.id} cleanup completed`);
    }

    // Phase 3: Get user ID
    public getId(): string {
        return this.id;
    }
}