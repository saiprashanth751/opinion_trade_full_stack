import { WebSocketServer } from "ws";
import { UserManager } from "./classes/UserManager";
import dotenv from "dotenv"
import { EventSummary, EventSummaryMessage } from "./types";
import { SubscribeManager } from "@trade/order-queue";
import { logger } from "@trade/logger";

dotenv.config();

const port = process.env.PORT as unknown as number;

const wss = new WebSocketServer({ port: port });


wss.on("listening", () => {
    console.log(`WebSocket server is running on port ws://localhost:${wss.options.port}`);
})

wss.on("connection", (ws) => {
    UserManager.getInstance().addUser(ws);
})

//todo: SubscribeManager's client connects in its constructor, but explicit ensureConnected is good practice
const subscribeManager = SubscribeManager.getInstance();
// await subscribeManager.ensureConnected();
// logger.info("ENGINE_SERVICE | Connected to Redis");

subscribeManager.subscribeToChannel("event_summaries", (channel, message) => {
    try {
        const parsedMessage: EventSummaryMessage = JSON.parse(message);
        if(parsedMessage.type === "EVENT_SUMMARY") {
            UserManager.getInstance().broadcastMessage(parsedMessage);
        }
    } catch(error) {
        logger.error(`WSS | Error parsing event summary message from Redis: ${error}`);
    }
})


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