"use client";

import Image from "next/image";
import { useState } from "react";
import { TEvent, sides } from "@trade/types";
import { OrderPlacementDialog } from "../Order/OrderPlacementDialog";

interface EventCardProps {
  event: TEvent;
}

export const EventCard = ({ event }: EventCardProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState(0);
  const [selectedOutcome, setSelectedOutcome] = useState<sides>(sides.YES);

  const handleOpenDialog = (price: number, outcome: sides) => {
    setSelectedPrice(price);
    setSelectedOutcome(outcome);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  return (
    <>
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
          <button
            className="bg-blue-100 text-blue-600 px-6 py-2 rounded font-bold"
            onClick={() => handleOpenDialog(event.min_bet, sides.YES)}
          >
            Yes ₹{event.min_bet}
          </button>
          <button
            className="bg-red-100 text-red-600 px-6 py-2 rounded font-bold"
            onClick={() => handleOpenDialog(event.max_bet, sides.NO)}
          >
            No ₹{event.max_bet}
          </button>
        </div>
      </div>

      <OrderPlacementDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        event={event}
        initialPrice={selectedPrice}
        outcome={selectedOutcome}
      />
    </>
  );
};
