import { WebSocketServer } from "ws";
import { UserManager } from "./classes/UserManager";
import dotenv from "dotenv"
import { Engine } from "@repo/engine"
import { EventSummary, EventSummaryMessage } from "./types";

dotenv.config();

const port = process.env.PORT as unknown as number;

const wss = new WebSocketServer({ port: port });

const engine = new Engine();

wss.on("listening", () => {
    console.log(`WebSocket server is running on port ws://localhost:${wss.options.port}`);
})

wss.on("connection", (ws) => {
    UserManager.getInstance().addUser(ws);
})

//we need to braodcast event summaries(dynamic price changing)

setInterval(() => {
    const allEventSummaries = engine.getAllEventOrderbooks();
    const eventSummaries: EventSummary[] = [];

    for(const[eventId, orderbooks] of allEventSummaries.entries()) {
        const yesPrice = orderbooks.yes.getMarketPrice();
        const noPrice = orderbooks.no.getMarketPrice();
        eventSummaries.push({eventId, yesPrice, noPrice})
    }

    const message: EventSummaryMessage = {
        type: "EVENT_SUMMARY",
        payload: {
            events: eventSummaries,
        }
    }
    //broadcast to all connected users...
    UserManager.getInstance().broadcastMessage(message);
}, 2000);