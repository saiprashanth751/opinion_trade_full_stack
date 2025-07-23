import Image from "next/image"

export const EventCard = ({ event }) => {
    return (
        <div className="rounded-lg shadow-lg p-4 flex flex-col justify-between bg-white over">
            <div className="flex flex-col mb-2">
                <Image
                    src={"/assets/event1.png"}
                    alt="Something"
                    className="w-10 h-10 mr-4"
                    width={200}
                    height={200}
                />
                <div className="flex mt-2">
                    <Image
                        src={"/assets/event1.png"}
                        alt="Something"
                        className="w-5 h-5"
                        width={200}
                        height={200}
                    />
                    <div className="text-gray-500 text-xs mt-0.5">
                        {event?.traders} traders
                    </div>
                </div>
            </div>

            <h3 className="font-semibold mb-4">{event?.title}</h3>
            <div className="flex justify-between">
                <button className="bg-blue-100 text-blue-600 px-6 py-2 rounded font-bold">
                    Yes ₹{event.min_bet}
                </button>
                <button className="bg-red-100 text-red-600 px-6 py-2 rounded font-bold">
                    No ₹{event.max_bet}
                </button>
            </div>
        </div>
    )
}