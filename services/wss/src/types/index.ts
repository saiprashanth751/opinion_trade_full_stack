
export const subscribeOrderbook = "subscribe_orderbook";
export const unsubscribeOrderbook = "unsubscribe_orderbook";

export type SubscribeMessage = {
    method: typeof subscribeOrderbook,
    events: string[],
}

export type UnsubscribeMessage = {
    method: typeof unsubscribeOrderbook,
    events: string[],
}

export type IncomingMessage = SubscribeMessage | UnsubscribeMessage;

export type DepthUpdateMessage = {
    type: "Depth",
    data: {
        b?: [string, string][],
        a?: [string, string][],
        id: number,
        e: "depth"
    }
}

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
    type: "EVENT_SUMMARY",
    payload: {
        events: EventSummary[];
    }
}

export type OutgoingMessage = DepthUpdateMessage | ClientIdMessage | EventSummaryMessage;