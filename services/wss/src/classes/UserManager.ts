// services/wss/src/classes/UserManager.ts - Enhanced for Phase 3
import { OutgoingMessage } from "../types";
import { SubscriptionManager } from "./SubscriptionManager";
import { User } from "./User";
import { WebSocket } from "ws";
import { logger } from "@trade/logger";

export class UserManager {
    //only instance for entire application -> singleton
    private static instance: UserManager;
    private users: Map<string, User> = new Map();
    
    // Phase 3: Enhanced connection tracking and management
    private connectionMetrics = {
        totalConnections: 0,
        activeConnections: 0,
        peakConnections: 0,
        connectionHistory: [] as Array<{ timestamp: number; action: 'connect' | 'disconnect'; userId: string }>
    };
    
    private cleanupInterval: NodeJS.Timeout | null = null;
    private isShuttingDown = false;

    public static getInstance() {
        if(!this.instance) {
            this.instance = new UserManager();
        }
        return this.instance;
    }

    constructor() {
        this.initializePhase3Features();
    }

    // Phase 3: Initialize background operations
    private initializePhase3Features() {
        // Cleanup inactive connections every 5 minutes
        this.cleanupInterval = setInterval(() => {
            this.performConnectionCleanup();
        }, 5 * 60 * 1000);

        // Log connection metrics every 2 minutes
        setInterval(() => {
            this.logConnectionMetrics();
        }, 2 * 60 * 1000);

        logger.info("PHASE 3 | UserManager enhanced features initialized");
    }

    addUser(ws: WebSocket, clientIP?: string) {
        if (this.isShuttingDown) {
            logger.warn("PHASE 3 | Rejecting new user connection during shutdown");
            ws.close(1012, "Server is shutting down");
            return null;
        }

        const id = this.getRandomId();
        const user = new User(id, ws, clientIP);
        this.users.set(id, user);
        this.registerOnClose(id, ws);
        
        // Phase 3: Update connection metrics
        this.updateConnectionMetrics('connect', id);
        
        logger.info(`PHASE 3 | User ${id} connected from ${clientIP || 'unknown'}. Active users: ${this.users.size}`);
        
        return user;
    }

    public getUser(id: string) {
        return this.users.get(id);
    }

    // Phase 3: Enhanced connection close handling
    private registerOnClose(id: string, ws: WebSocket) {
        ws.on("close", (code, reason) => {
            this.users.delete(id);
            
            // Phase 3: Update metrics and cleanup
            this.updateConnectionMetrics('disconnect', id);
            
            // Manage user's subscription with error handling
            try {
                SubscriptionManager.getInstance().userLeft(id);
            } catch (error) {
                logger.error(`PHASE 3 | Error cleaning up subscriptions for user ${id}:`, error);
            }
            
            logger.info(`PHASE 3 | User ${id} disconnected (Code: ${code}, Reason: ${reason}). Active users: ${this.users.size}`);
        });

        ws.on("error", (error) => {
            logger.error(`PHASE 3 | WebSocket error for user ${id}:`, error);
            // Force cleanup on error
            this.users.delete(id);
            this.updateConnectionMetrics('disconnect', id);
        });
    }

    private getRandomId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    // Phase 3: Enhanced broadcast with error handling
    public broadcastMessage(message: OutgoingMessage) {
        const startTime = Date.now();
        let successCount = 0;
        let errorCount = 0;

        this.users.forEach((user: User, userId: string) => {
            try {
                user.emitMessage(message);
                successCount++;
            } catch (error) {
                errorCount++;
                logger.error(`PHASE 3 | Failed to broadcast to user ${userId}:`, error);
                
                // Remove dead connections
                this.users.delete(userId);
                this.updateConnectionMetrics('disconnect', userId);
            }
        });

        const duration = Date.now() - startTime;
        if (duration > 100) { // Log slow broadcasts
            logger.warn(`PHASE 3 | Slow broadcast: ${duration}ms for ${this.users.size} users`);
        }

        if (errorCount > 0) {
            logger.warn(`PHASE 3 | Broadcast completed: ${successCount} success, ${errorCount} errors`);
        }
    }

    // Phase 3: Connection metrics tracking
    private updateConnectionMetrics(action: 'connect' | 'disconnect', userId: string) {
        if (action === 'connect') {
            this.connectionMetrics.totalConnections++;
            this.connectionMetrics.activeConnections++;
            
            if (this.connectionMetrics.activeConnections > this.connectionMetrics.peakConnections) {
                this.connectionMetrics.peakConnections = this.connectionMetrics.activeConnections;
            }
        } else {
            this.connectionMetrics.activeConnections = Math.max(0, this.connectionMetrics.activeConnections - 1);
        }

        // Keep last 1000 connection events
        this.connectionMetrics.connectionHistory.push({
            timestamp: Date.now(),
            action,
            userId
        });

        if (this.connectionMetrics.connectionHistory.length > 1000) {
            this.connectionMetrics.connectionHistory.shift();
        }
    }

    // Phase 3: Connection cleanup
    private performConnectionCleanup() {
        const beforeCount = this.users.size;
        const deadConnections: string[] = [];

        this.users.forEach((user, userId) => {
            if (!user.isAlive()) {
                deadConnections.push(userId);
            }
        });

        deadConnections.forEach(userId => {
            this.users.delete(userId);
            this.updateConnectionMetrics('disconnect', userId);
            
            try {
                SubscriptionManager.getInstance().userLeft(userId);
            } catch (error) {
                logger.error(`PHASE 3 | Error cleaning up dead connection ${userId}:`, error);
            }
        });

        if (deadConnections.length > 0) {
            logger.info(`PHASE 3 | Cleaned up ${deadConnections.length} dead connections. Active: ${this.users.size} (was ${beforeCount})`);
        }
    }

    // Phase 3: Connection metrics logging
    private logConnectionMetrics() {
        const metrics = this.getConnectionMetrics();
        logger.info(`PHASE 3 METRICS | Active: ${metrics.activeConnections}, Peak: ${metrics.peakConnections}, Total: ${metrics.totalConnections}`);
    }

    // Phase 3: Get connection metrics
    public getConnectionMetrics() {
        return {
            ...this.connectionMetrics,
            currentActiveConnections: this.users.size
        };
    }

    // Phase 3: Get all active user IDs
    public getActiveUserIds(): string[] {
        return Array.from(this.users.keys());
    }

    // Phase 3: Send message to specific user
    public sendToUser(userId: string, message: OutgoingMessage): boolean {
        const user = this.users.get(userId);
        if (user && user.isAlive()) {
            try {
                user.emitMessage(message);
                return true;
            } catch (error) {
                logger.error(`PHASE 3 | Failed to send message to user ${userId}:`, error);
                this.users.delete(userId);
                this.updateConnectionMetrics('disconnect', userId);
                return false;
            }
        }
        return false;
    }

    // Phase 3: Graceful shutdown
    public async gracefulShutdown(): Promise<void> {
        logger.info("PHASE 3 | UserManager starting graceful shutdown...");
        this.isShuttingDown = true;

        // Clear cleanup interval
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        // Send shutdown notification to all users
        const shutdownMessage: OutgoingMessage = {
            type: "CLIENT_ID", // Reusing existing type, could add SERVER_SHUTDOWN type
            payload: {
                clientId: "SERVER_SHUTDOWN"
            }
        };

        this.broadcastMessage(shutdownMessage);

        // Give users 5 seconds to close gracefully
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Force close remaining connections
        const remainingUsers = this.users.size;
        this.users.forEach((user, userId) => {
            try {
                user.forceClose();
            } catch (error) {
                logger.error(`PHASE 3 | Error force-closing user ${userId}:`, error);
            }
        });

        this.users.clear();
        
        if (remainingUsers > 0) {
            logger.info(`PHASE 3 | Force-closed ${remainingUsers} remaining connections`);
        }

        logger.info("PHASE 3 | UserManager graceful shutdown completed");
    }

    // Phase 3: Public cleanup method for external use
    public cleanup(): void {
        this.gracefulShutdown().catch(error => {
            logger.error("PHASE 3 | Error during UserManager cleanup:", error);
        });
    }

    // Phase 3: Health check
    public getHealthStatus() {
        return {
            isHealthy: !this.isShuttingDown,
            activeConnections: this.users.size,
            metrics: this.connectionMetrics,
            memoryUsage: process.memoryUsage()
        };
    }
}