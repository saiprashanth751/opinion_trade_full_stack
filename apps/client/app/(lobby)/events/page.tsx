"use client"
import { getEvents } from "@/actions/Event/getEvents"
import { EventCard } from "@/components/landing/Home/EventCard";
import { useEventSummarySocket } from "@/hooks/useEventSummarySocket";
import { TEvent } from "@trade/types"
import { useEffect, useState } from "react";

const Page = () => {
    const [events, setEvents] = useState<TEvent[]>([]);
    const eventPrices = useEventSummarySocket();

    useEffect(() => {
        const fetchEvents = async () => {
            const fetchedEvents = await getEvents();
            setEvents(fetchedEvents);
        }

        fetchEvents();
    }, []);

    return (
        <>
            <div className="w-full lg:w-full p-8 flex justify-center items-center">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-8 lg:w-1/2 w-full mt-8 lg:mt-0 overflow-y-auto">
                {
                    events.map((event) => (
                        <EventCard
                        key={event.id}
                        event={event}
                        liveYesPrice = {eventPrices.get(event.id)?.yesPrice ?? event.initialYesPrice}
                        liveNoPrice = {eventPrices.get(event.id)?.noPrice ?? event.initialNoPrice}
                        />
                    ))
                }
                </div>
            </div>
        </>
    )
}

export default Page;
