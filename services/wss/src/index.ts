import { WebSocketServer } from "ws";
import { UserManager } from "./classes/UserManager";
import dotenv from "dotenv";
// import { EventSummaryMessage } from "./types";
import { SubscribeManager } from "@trade/order-queue";
import { logger } from "@trade/logger";
import { SubscriptionManager } from "./classes/SubscriptionManager";

// Initialize environment variables first
dotenv.config();

const port = process.env.PORT as unknown as number || 8080;

// WebSocket Server Setup
const wss = new WebSocketServer({ port: port });

// Connection Handling
wss.on("listening", () => {
    logger.info(`WebSocket server running on ws://localhost:${port}`);
});

wss.on("connection", (ws) => {
    UserManager.getInstance().addUser(ws);
});

// Redis Pub/Sub Initialization
(async () => {
    // Ensure the centralized Redis Pub/Sub client is connected
    const centralizedSubscribeManager = SubscribeManager.getInstance();
    try {
        await centralizedSubscribeManager.ensureConnected();
        logger.info("WSS | Centralized Redis Pub/Sub client connected successfully.");
    } catch (error) {
        logger.error("WSS | Failed to connect Centralized Redis Pub/Sub client at startup:", error);
        process.exit(1); // Exit the process if the critical Redis connection fails
    }

    // Initialize the WSS's SubscriptionManager. Its constructor will handle
    // subscribing to global channels like "event_summaries" and setting up its own
    // redisCallbackHandler for all messages.
    SubscriptionManager.getInstance(); // Simply call getInstance to ensure it's initialized

    // The rest of the application logic (WebSocket server, user management) continues as before.
})();











//we need to braodcast event summaries(dynamic price changing)

// setInterval(() => {
//     const allEventSummaries = engine.getAllEventOrderbooks();
//     const eventSummaries: EventSummary[] = [];

//     for(const[eventId, orderbooks] of allEventSummaries.entries()) {
//         const yesPrice = orderbooks.yes.getMarketPrice();
//         const noPrice = orderbooks.no.getMarketPrice();
//         eventSummaries.push({eventId, yesPrice, noPrice})
//     }

//     const message: EventSummaryMessage = {
//         type: "EVENT_SUMMARY",
//         payload: {
//             events: eventSummaries,
//         }
//     }
//     //broadcast to all connected users...
//     UserManager.getInstance().broadcastMessage(message);
// }, 2000);