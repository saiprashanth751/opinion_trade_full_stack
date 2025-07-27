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