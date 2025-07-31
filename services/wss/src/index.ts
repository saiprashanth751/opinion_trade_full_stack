// services/wss/src/index.ts
import { WebSocketServer } from "ws";
import { UserManager } from "./classes/UserManager";
import dotenv from "dotenv";
import { SubscribeManager } from "@trade/order-queue";
import { logger } from "@trade/logger";
import { SubscriptionManager } from "./classes/SubscriptionManager";

dotenv.config();

const port = process.env.PORT as unknown as number || 8080;

const wss = new WebSocketServer({ port: port });

wss.on("listening", () => {
    logger.info(`WebSocket server running on ws://localhost:${port}`);
});

wss.on("connection", (ws) => {
    logger.info("New WebSocket connection established");
    UserManager.getInstance().addUser(ws);
});

// Initialize Redis connections and managers
(async () => {
    try {
        logger.info("WSS | Initializing Redis connections...");
        
        // Ensure the centralized Redis Pub/Sub client is connected
        const centralizedSubscribeManager = SubscribeManager.getInstance();
        await centralizedSubscribeManager.ensureConnected();
        logger.info("WSS | Centralized Redis Pub/Sub client connected successfully.");

        // Initialize the SubscriptionManager (this will handle event_summaries subscription)
        SubscriptionManager.getInstance();
        logger.info("WSS | SubscriptionManager initialized successfully.");

        logger.info("WSS | All systems initialized and ready!");
    } catch (error) {
        logger.error("WSS | Failed to initialize:", error);
        process.exit(1);
    }
})();