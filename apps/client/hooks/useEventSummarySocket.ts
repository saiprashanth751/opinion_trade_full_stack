
import { useEffect, useState } from "react";


interface EventSummary {
    eventId: string;
    yesPrice: number;
    noPrice: number;
}

interface EventSummaryMessage {
    type: "EVENT_SUMMARY";
    payload: {
        events: EventSummary[];
    }
}

type EventPrices = Map<string, {yesPrice: number; noPrice: number}>; 

export const useEventSummarySocket = () => {
    const [eventPrices, setEventPrices] = useState<EventPrices>(new Map());

    useEffect(() => {
        const ws = new WebSocket(process.env.NEXT_PUBLIC_WSS_URL || "ws://localhost:8080");

        ws.onopen = () => {
            console.log("Connected to WebSocket for event summaries");
        }

        ws.onmessage = (event) => {
            try {
                const message:EventSummaryMessage = JSON.parse(event.data);

                if(message.type === "EVENT_SUMMARY") {
                    setEventPrices(prevPrices => {
                        const newPrices = new Map(prevPrices);
                        message.payload.events.forEach(summary => {
                            newPrices.set(summary.eventId, {
                                yesPrice: summary.yesPrice,
                                noPrice: summary.noPrice,
                            });
                        });
                        console.log(newPrices);
                        return newPrices;
                    })
                } 
            } catch(error) {
                console.error("Failed to parse WebSocket message: ", error);
            }
        }

        ws.onclose = () => {
            console.log("Disconnedted from WebSocket for event summaries");
        }

        ws.onerror = (error) => {
            console.error("WebSocket error: ", error);
        };

        //do we need to close??
        return () => {
            ws.close();
        }

    }, []);

    return eventPrices;
}