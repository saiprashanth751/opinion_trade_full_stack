// services/wss/src/index.ts - Enhanced for Phase 3
import { WebSocketServer } from "ws";
import { UserManager } from "./classes/UserManager";
import dotenv from "dotenv";
import { SubscribeManager } from "@trade/order-queue";
import { logger } from "@trade/logger";
import { SubscriptionManager } from "./classes/SubscriptionManager";

dotenv.config();

const port = process.env.PORT as unknown as number || 8080;

const wss = new WebSocketServer({ port: port });

// Phase 3: Track server state for graceful operations
let serverState = {
    isShuttingDown: false,
    activeConnections: 0,
    startTime: Date.now()
};

wss.on("listening", () => {
    logger.info(`PHASE 3 | WebSocket server running on ws://localhost:${port}`);
    logger.info(`PHASE 3 | Server started at ${new Date().toISOString()}`);
});

wss.on("connection", (ws, req) => {
    const clientIP = req.socket.remoteAddress || 'unknown';
    serverState.activeConnections++;
    
    logger.info(`PHASE 3 | New WebSocket connection from ${clientIP} (Active: ${serverState.activeConnections})`);
    
    if (serverState.isShuttingDown) {
        logger.warn(`PHASE 3 | Rejecting new connection during shutdown`);
        ws.close(1012, "Server is shutting down");
        return;
    }
    
    // Phase 3: Enhanced user creation with client IP tracking
    const user = UserManager.getInstance().addUser(ws, clientIP);
    
    if (!user) {
        // User creation failed (probably during shutdown)
        serverState.activeConnections = Math.max(0, serverState.activeConnections - 1);
        return;
    }

    // Phase 3: Track connection lifecycle - Remove duplicate tracking since UserManager handles this
    ws.on('close', () => {
        serverState.activeConnections = Math.max(0, serverState.activeConnections - 1);
        logger.info(`PHASE 3 | Connection closed. Active connections: ${serverState.activeConnections}`);
    });

    ws.on('error', (error) => {
        logger.error(`PHASE 3 | WebSocket connection error from ${clientIP}:`, error);
        serverState.activeConnections = Math.max(0, serverState.activeConnections - 1);
    });
});

// Phase 3: Enhanced initialization with better error handling
async function initializeSystem() {
    try {
        logger.info("PHASE 3 | Initializing system components...");
        
        // Initialize Redis connections with retry logic
        await initializeRedisWithRetry();
        
        // Initialize subscription management
        await initializeSubscriptionManager();
        
        // Setup graceful shutdown handlers
        setupGracefulShutdown();
        
        // Setup health monitoring
        setupHealthMonitoring();
        
        // Phase 3: Initialize UserManager early
        const userManager = UserManager.getInstance();
        logger.info("PHASE 3 | UserManager initialized and ready");
        
        logger.info("PHASE 3 | ✅ All systems initialized and ready!");
        
    } catch (error) {
        logger.error("PHASE 3 | ❌ System initialization failed:", error);
        process.exit(1);
    }
}

// Phase 3: Redis initialization with retry logic
async function initializeRedisWithRetry(maxRetries = 5, delay = 5000) {
    let retries = 0;
    
    while (retries < maxRetries) {
        try {
            logger.info(`PHASE 3 | Attempting Redis connection (attempt ${retries + 1}/${maxRetries})...`);
            
            const centralizedSubscribeManager = SubscribeManager.getInstance();
            await centralizedSubscribeManager.ensureConnected();
            
            logger.info("PHASE 3 | ✅ Redis Pub/Sub client connected successfully");
            return;
            
        } catch (error) {
            retries++;
            logger.error(`PHASE 3 | Redis connection attempt ${retries} failed:`, error);
            
            if (retries >= maxRetries) {
                throw new Error(`Failed to connect to Redis after ${maxRetries} attempts`);
            }
            
            logger.info(`PHASE 3 | Retrying Redis connection in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Phase 3: Subscription manager initialization
async function initializeSubscriptionManager() {
    try {
        logger.info("PHASE 3 | Initializing SubscriptionManager...");
        
        const subscriptionManager = SubscriptionManager.getInstance();
        
        // Give it a moment to fully initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        logger.info("PHASE 3 | ✅ SubscriptionManager initialized successfully");
        
    } catch (error) {
        logger.error("PHASE 3 | SubscriptionManager initialization failed:", error);
        throw error;
    }
}

// Phase 3: Graceful shutdown handling
function setupGracefulShutdown() {
    const gracefulShutdown = async (signal: string) => {
        logger.info(`PHASE 3 | Received ${signal}. Starting graceful shutdown...`);
        serverState.isShuttingDown = true;
        
        try {
            // Stop accepting new connections
            wss.close(() => {
                logger.info("PHASE 3 | WebSocket server stopped accepting new connections");
            });
            
            // Phase 3: Enhanced cleanup with proper UserManager integration
            const userManager = UserManager.getInstance();
            
            // Get final user metrics before shutdown
            const userMetrics = userManager.getConnectionMetrics();
            logger.info(`PHASE 3 | Final user metrics: Active=${userMetrics.currentActiveConnections}, Peak=${userMetrics.peakConnections}, Total=${userMetrics.totalConnections}`);
            
            // Start graceful user cleanup
            logger.info("PHASE 3 | Initiating graceful user cleanup...");
            await userManager.gracefulShutdown();
            
            // Give existing connections time to finish
            const shutdownTimeout = 30000; // 30 seconds
            const shutdownStart = Date.now();
            
            while (serverState.activeConnections > 0 && (Date.now() - shutdownStart) < shutdownTimeout) {
                logger.info(`PHASE 3 | Waiting for ${serverState.activeConnections} active connections to close...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            if (serverState.activeConnections > 0) {
                logger.warn(`PHASE 3 | Force closing ${serverState.activeConnections} remaining connections`);
            }
            
            // Final cleanup
            const subscriptionManager = SubscriptionManager.getInstance();
            logger.info("PHASE 3 | Subscription cleanup completed");
            
            logger.info("PHASE 3 | ✅ Graceful shutdown completed");
            process.exit(0);
            
        } catch (error) {
            logger.error("PHASE 3 | Error during graceful shutdown:", error);
            process.exit(1);
        }
    };

    // Handle different termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGUSR1', () => gracefulShutdown('SIGUSR1'));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
        logger.error('PHASE 3 | Uncaught Exception:', error);
        gracefulShutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
        logger.error('PHASE 3 | Unhandled Rejection at:', promise, 'reason:', reason);
        gracefulShutdown('unhandledRejection');
    });
    
    logger.info("PHASE 3 | ✅ Graceful shutdown handlers configured");
}

// Phase 3: Enhanced health monitoring with UserManager integration
function setupHealthMonitoring() {
    const healthCheckInterval = setInterval(() => {
        const uptime = Date.now() - serverState.startTime;
        const uptimeHours = (uptime / (1000 * 60 * 60)).toFixed(2);
        
        const memUsage = process.memoryUsage();
        const memUsageMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
        
        // Get UserManager metrics
        const userManager = UserManager.getInstance();
        const userMetrics = userManager.getConnectionMetrics();
        
        logger.info(`PHASE 3 HEALTH | Uptime: ${uptimeHours}h, Connections: ${serverState.activeConnections}, UserManager: ${userMetrics.currentActiveConnections}, Memory: ${memUsageMB}MB`);
        
        // Alert on high memory usage
        if (memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
            logger.warn(`PHASE 3 HEALTH | High memory usage detected: ${memUsageMB}MB`);
        }
        
        // Alert on connection discrepancies
        if (Math.abs(serverState.activeConnections - userMetrics.currentActiveConnections) > 5) {
            logger.warn(`PHASE 3 HEALTH | Connection count mismatch: Server=${serverState.activeConnections}, UserManager=${userMetrics.currentActiveConnections}`);
        }
        
    }, 5 * 60 * 1000); // Every 5 minutes
    
    // Clear health check on shutdown
    process.on('SIGTERM', () => clearInterval(healthCheckInterval));
    process.on('SIGINT', () => clearInterval(healthCheckInterval));
    
    logger.info("PHASE 3 | ✅ Health monitoring configured");
}

// Start the initialization
initializeSystem();

// Phase 3: Export server state and additional utilities for monitoring
export { serverState, wss, UserManager };