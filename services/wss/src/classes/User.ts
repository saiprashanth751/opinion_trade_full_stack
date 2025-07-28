import { WebSocket } from "ws";
import { FrontendIncomingMessage, IncomingMessage, OutgoingMessage, subscribeOrderbook, unsubscribeOrderbook } from "../types";
import { SubscriptionManager } from "./SubscriptionManager";
import { addToOrderQueue } from "@trade/order-queue";
import { GET_OPEN_ORDERS, MessageFromApi } from "@trade/types";

export class User {
    private id: string;
    private ws: WebSocket;
    // private subscriptions: string[] = [];

    constructor(id: string, ws: WebSocket) {
        this.id = id;
        this.ws = ws;
        this.addListeners();
        this.ws.send(JSON.stringify({ type: "CLIENT_ID", payload: { clientId: this.id } }));
        //purpose: open orders
        SubscriptionManager.getInstance().subscribe(this.id, this.id);
    }
    //recheck for types, fixed in a weird way...
    private addListeners() {
        this.ws.on("message", async (rawMessage: string) => {
             const parsedFrontendMessage: FrontendIncomingMessage = JSON.parse(rawMessage);
            const actualMessage: IncomingMessage = parsedFrontendMessage.message; // Extract the actual message payload
            const clientIdFromFrontend: string = parsedFrontendMessage.clientId; // Extract the clientId


            // Type guard for messages with 'method' and 'events'
             if ("method" in actualMessage && (actualMessage.method === subscribeOrderbook || actualMessage.method === unsubscribeOrderbook)) {
                const events = actualMessage.events;
                if (actualMessage.method === subscribeOrderbook) {
                    events.forEach((s: string) => SubscriptionManager.getInstance().subscribe(this.id, s));
                }
                if (actualMessage.method === unsubscribeOrderbook) {
                    events.forEach((s: string) => SubscriptionManager.getInstance().unsubscribe(this.id, s));
                }
            }
            // Handle GET_OPEN_ORDERS messages
            else if ("type" in actualMessage && actualMessage.type === GET_OPEN_ORDERS) {
                await addToOrderQueue({
                    clientId: clientIdFromFrontend, // Use the clientId received from the frontend
                    message: actualMessage as MessageFromApi // This is the correct MessageFromApi object
                });
            }
        });
    }

    // //go through again...
    // public subscribe(subscription: string) {
    //     this.subscriptions.push(subscription);
    // }
    // //go thorough again...
    // public unsubscribe(subscription: string) {
    //     this.subscriptions = this.subscriptions.filter((s) => s !== subscription);
    // }

    emitMessage(message: OutgoingMessage) {
        this.ws.send(JSON.stringify(message));
    }
}