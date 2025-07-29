// services/wss/src/types/index.ts
import { MessageToApi, MessageFromApi } from "@trade/types";

export const subscribeOrderbook = "subscribe_orderbook";
export const unsubscribeOrderbook = "unsubscribe_orderbook";

export type SubscribeMessage = {
    method: typeof subscribeOrderbook;
    events: string[];
}

export type UnsubscribeMessage = {
    method: typeof unsubscribeOrderbook;
    events: string[];
}

export type IncomingMessage = SubscribeMessage | UnsubscribeMessage | MessageFromApi;

export type ClientIdMessage = {
    type: "CLIENT_ID";
    payload: {
        clientId: string;
    };
};

export type EventSummary = {
    eventId: string;
    yesPrice: number;
    noPrice: number;
}

export type EventSummaryMessage = {
    type: "EVENT_SUMMARY";
    payload: {
        events: EventSummary[];
    }
}

export type OutgoingMessage = ClientIdMessage | EventSummaryMessage | MessageToApi;