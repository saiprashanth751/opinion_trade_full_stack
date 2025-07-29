// apps/client/hooks/useEventSummarySocket.ts
import { useEffect, useState, useRef } from "react";
import { EventSummary, EventSummaryMessage } from "@trade/types";

type EventPrices = Map<string, {yesPrice: number; noPrice: number}>;

export const useEventSummarySocket = () => {
    const [eventPrices, setEventPrices] = useState<EventPrices>(new Map());
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        const ws = new WebSocket(process.env.NEXT_PUBLIC_WSS_URL || "ws://localhost:8080");
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("Connected to WebSocket for event summaries");
            
            // FIXED: Send message in the format the server expects
            const subscribeMessage = {
                method: "subscribe_orderbook",
                events: ["event_summaries"]
            };
            
            ws.send(JSON.stringify(subscribeMessage));
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
                        console.log("Updated event prices:", newPrices);
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
                const unsubscribeMessage = {
                    method: "unsubscribe_orderbook",
                    events: ["event_summaries"]
                };
                wsRef.current.send(JSON.stringify(unsubscribeMessage));
                wsRef.current.close();
            }
        }
    }, []);

    return eventPrices;
}