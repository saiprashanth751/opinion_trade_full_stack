import { WebSocket } from "ws";
import { IncomingMessage, OutgoingMessage, subscribeOrderbook, unsubscribeOrderbook } from "../types";
import { SubscriptionManager } from "./SubscriptionManager";

export class User {
    private id: string;
    private ws: WebSocket;
    // private subscriptions: string[] = [];

    constructor(id: string, ws: WebSocket){
        this.id = id;
        this.ws = ws;
        this.addListeners();
    }

    private addListeners() {
        this.ws.on("message", (message: string) => {
            const parsedMessage:IncomingMessage = JSON.parse(message);
            if(parsedMessage.method === subscribeOrderbook){
                //subscribe to get event updates
                parsedMessage.events.forEach((s) => SubscriptionManager.getInstance().subscribe(this.id, s));
            }
            if(parsedMessage.method === unsubscribeOrderbook) {
                //unsubscribe to stop getting updates...
                parsedMessage.events.forEach((s) => SubscriptionManager.getInstance().unsubscribe(this.id, s));
            }
        })
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