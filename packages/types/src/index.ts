
export enum sides {
    YES = "yes",
    NO = "no",
}

export enum orderType {
    BUY = "buy",
    SELL = "sell",
}

export type TEvent = {
    id: string;
    title: string;
    slug: string;
    description: string;
    start_date: Date;
    end_date: Date;
    createdAt: Date;
    initialYesPrice: number;
    initialNoPrice: number;
    sot: string;
    traders: number;
    // quantity: number
}

export const TRADE_ADDED = "TRADE_ADDED"
export const ORDER_UPDATE = "ORDER_UPDATE"
export const CREATE_ORDER = "CREATE_ORDER"
export const CANCEL_ORDER = "CANCEL_ORDER"
export const ON_RAMP = "ON_RAMP"
export const GET_DEPTH = "GET_DEPTH"
export const GET_OPEN_ORDERS = "GET_OPEN_ORDERS"


// DB Operation Types

export type DbMessage =
    | {
        type: typeof TRADE_ADDED;
        data: {
            id: string;
            isBuyerMaker: boolean; 
            price: number;
            quantity: number;
            timestamp: number;
            market: string;
        };
    }
    | {
        type: typeof ORDER_UPDATE;
        data: {
            orderId: string;
            executedQty: number;
            market?: string;
            price?: number;
            quantity?: number;
            side?: "yes" | "no";
        };
    };

// Sever Types: Responding to Server

export interface Order {
    price: number;
    quantity: number;
    filled: number;
    orderId: string;
    type: "bid" | "ask";
    userId: string;
}

export type MessageFromApi =
    | {
        type: typeof CREATE_ORDER;
        data: {
            market: string;
            price: number;
            quantity: number;
            action: "buy" | "sell";
            outcome: "yes" | "no";
            userId: string;
        }
    }
    | {
        type: typeof CANCEL_ORDER;
        data: {
            orderId: string;
            market: string;
        }
    }
    | {
        type: typeof ON_RAMP;
        data: {
            amount: number;
            userId: string;
            txnId: string;
        }
    }
    | {
        type: typeof GET_DEPTH;
        data: {
            market: string;
        }
    }
    | {
        type: typeof GET_OPEN_ORDERS;
        data: {
            userId: string;
            market: string;
        };
    }

export type MessageToApi =
    | {
        type: "DEPTH";
        payload: {
            bids: [string, string][];
            asks: [string, string][];
            yesBids: [string, string][];
            yesAsks: [string, string][];
            noBids: [string, string][];
            noAsks: [string, string][];
        }
    }
    | {
        type: "ORDER_PLACED";
        payload: {
            orderId: string;
            executedQty: number;
            fills: {
                price: number;
                qty: number;
                tradeId: string;
            }[];
        };
    }
    | {
        type: "ORDER_CANCELLED";
        payload: {
            orderId: string;
            executedQty: number;
            remainingQty: number;
        };
    }
    | {
        type: "OPEN_ORDERS";
        payload: {
            openOrders: Order[]
        };
    };


// Web Socket Types...
// Need to dig deep into these..
export type TickerUpdateMessage = {
    stream: string;
    data: {
        c?: string;
        h?: string;
        l?: string;
        v?: string;
        V?: string;
        s?: string;
        id: number;
        e: "ticker";
    }
}

export type DepthUpdateMessage = {
    stream: string;
    data: {
        b?: [string, string][];
        a?: [string, string][];
        e: "depth";
    }
}

export type TradeAddedMessage = {
    stream: string;
    data: {
        e: "trade";
        t: string;
        m: boolean;
        p: number;
        q: string;
        s: string
    }
}

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


export type WsMessage =
    | TickerUpdateMessage
    | DepthUpdateMessage
    | TradeAddedMessage
    | EventSummaryMessage
