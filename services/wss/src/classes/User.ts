// services/wss/src/classes/User.ts
import { WebSocket } from "ws";
import { GET_OPEN_ORDERS, MessageFromApi } from "@trade/types";
import { IncomingMessage, OutgoingMessage, subscribeOrderbook, unsubscribeOrderbook } from "../types";
import { SubscriptionManager } from "./SubscriptionManager";
import { addToOrderQueue } from "@trade/order-queue";
import { logger } from "@trade/logger";

export class User {
    private id: string;
    private ws: WebSocket;

    constructor(id: string, ws: WebSocket) {
        this.id = id;
        this.ws = ws;
        this.addListeners();
        
        // Subscribe to the client-specific Redis channel for API responses
        SubscriptionManager.getInstance().subscribe(this.id, this.id);
        
        this.ws.send(JSON.stringify({ type: "CLIENT_ID", payload: { clientId: this.id } }));
    }

    private addListeners() {
        this.ws.on("message", async (rawMessage: string) => {
            try {
                const parsedMessage = JSON.parse(rawMessage);
                console.log(`User ${this.id} received message:`, parsedMessage);

                // Handle subscription/unsubscription messages
                if ("method" in parsedMessage) {
                    if (parsedMessage.method === subscribeOrderbook) {
                        console.log(`User ${this.id} subscribing to:`, parsedMessage.events);
                        parsedMessage.events.forEach((s: string) => 
                            SubscriptionManager.getInstance().subscribe(this.id, s));
                    } else if (parsedMessage.method === unsubscribeOrderbook) {
                        console.log(`User ${this.id} unsubscribing from:`, parsedMessage.events);
                        parsedMessage.events.forEach((s: string) => 
                            SubscriptionManager.getInstance().unsubscribe(this.id, s));
                    }
                }
                // Handle API messages like GET_OPEN_ORDERS
                else if ("type" in parsedMessage) {
                    console.log(`User ${this.id} sending API message:`, parsedMessage.type);
                    console.log(`User ${this.id} message data:`, JSON.stringify(parsedMessage));
                    
                    try {
                        await addToOrderQueue({
                            clientId: this.id,
                            message: parsedMessage as MessageFromApi
                        });
                        console.log(`User ${this.id} successfully added message to order queue`);
                    } catch (queueError) {
                        console.error(`User ${this.id} failed to add to order queue:`, queueError);
                        logger.error(`User ${this.id} | Failed to add to order queue:`, queueError);
                        
                        // Send error response back to client
                        if (parsedMessage.type === "GET_OPEN_ORDERS") {
                            this.emitMessage({
                                type: "OPEN_ORDERS",
                                payload: {
                                    openOrders: []
                                }
                            });
                        }
                    }
                }
            } catch (error) {
                logger.error(`User ${this.id} | Error processing message: ${rawMessage}. Error:`, error);
            }
        });
    }

    emitMessage(message: OutgoingMessage) {
        try {
            this.ws.send(JSON.stringify(message));
        } catch (error) {
            logger.error(`User ${this.id} | Error sending message:`, error);
        }
    }
}