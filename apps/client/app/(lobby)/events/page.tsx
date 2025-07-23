"use server"
import { getEvents } from "@/actions/Event/getEvents"
import { EventCard } from "@/components/landing/Home/EventCard";
import { TEvent } from "@trade/types"

const Page = async() => {
    const events: TEvent[] = await getEvents();
    return (
        <>
            <div className="w-full lg:w-full p-8 flex justify-center items-center">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-8 lg:w-1/2 w-full mt-8 lg:mt-0 overflow-y-auto">
                {
                    events.map((event) => (
                        <EventCard key={Math.random()} event={event}/>
                    ))
                }
                </div>
            </div>
        </>
    )
}

export default Page;