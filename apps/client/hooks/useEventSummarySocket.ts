// apps/client/hooks/useEventSummarySocket.ts
import { useEffect, useState, useRef } from "react"; // Import useRef
import { EventSummary, EventSummaryMessage } from "@trade/types"; // Ensure EventSummaryMessage is imported

type EventPrices = Map<string, {yesPrice: number; noPrice: number}>;

export const useEventSummarySocket = () => {
    const [eventPrices, setEventPrices] = useState<EventPrices>(new Map());
    const wsRef = useRef<WebSocket | null>(null); // Add wsRef to manage WebSocket connection

    useEffect(() => {
        const ws = new WebSocket(process.env.NEXT_PUBLIC_WSS_URL || "ws://localhost:8080");
        wsRef.current = ws; // Assign WebSocket to ref

        ws.onopen = () => {
            console.log("Connected to WebSocket for event summaries");
            // Explicitly subscribe to the new channel for client-side event summaries
            ws.send(JSON.stringify({ method: "subscribe_orderbook", events: ["client_event_summaries"] }));
        }

        ws.onmessage = (event) => {
            try {
                const message: EventSummaryMessage = JSON.parse(event.data);

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
            console.log("Disconnected from WebSocket for event summaries");
        }

        ws.onerror = (error) => {
            console.error("WebSocket error: ", error);
        };

        return () => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ method: "unsubscribe_orderbook", events: ["client_event_summaries"] }));
                wsRef.current.close();
            }
        }

    }, []);

    return eventPrices;
}
