"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getEventDetails } from '@/actions/Event/getEventDetails';
import { TEvent } from '@trade/types';
import { useOrderbookSocket } from '@/hooks/useOrderbookSocket';
import { OrderBookTable } from '@/components/landing/EventTrade/OrderBookTable';
import { TradeHistoryTable } from '@/components/landing/EventTrade/TradeHistoryTable';
import { PriceLineChart } from '@/components/landing/EventTrade/PriceLineChart';
import { IntegratedOrderForm } from '@/components/landing/EventTrade/IntegratedOrderForm';

export default function EventDetailsPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [event, setEvent] = useState<TEvent | null>(null);

  // Use the new hook to get real-time data, including priceHistory
  const { yesBids, yesAsks, noBids, noAsks, trades, yesPrice, noPrice, priceHistory } = useOrderbookSocket(eventId);

  useEffect(() => {
    if (eventId) {
      getEventDetails(eventId).then(setEvent).catch(console.error);
    }
  }, [eventId]);

  if (!event) {
    return <div className="flex justify-center items-center h-screen text-lg font-semibold">Loading event details...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">{event.title}</h1>
      <p className="text-gray-600 mb-6">{event.description}</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Price Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
          <PriceLineChart priceHistory={priceHistory} />
        </div>

        {/* Integrated Order Form */}
        <div className="lg:col-span-1">
          <IntegratedOrderForm
            event={event}
            currentYesPrice={yesPrice}
            currentNoPrice={noPrice}
          />
        </div>

        {/* Order Book Tables */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md grid grid-cols-1 md:grid-cols-2 gap-8">
          <OrderBookTable title="Yes" bids={yesBids} asks={yesAsks} />
          <OrderBookTable title="No" bids={noBids} asks={noAsks} />
        </div>

        {/* Trade History */}
        <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow-md">
          <TradeHistoryTable trades={trades} />
        </div>
      </div>
    </div>
  );
}
