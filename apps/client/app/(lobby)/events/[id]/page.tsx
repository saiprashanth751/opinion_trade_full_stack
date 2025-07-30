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
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

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
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex justify-center items-center">
        <div className="text-center">
          <div className="inline-flex items-center gap-3 text-xl font-semibold text-white">
            <Activity className="w-6 h-6 animate-pulse text-cyan-400" />
            Loading event details...
          </div>
        </div>
      </div>
    );
  }

  const priceChange = priceHistory.length > 1 ? 
    yesPrice - priceHistory[priceHistory.length - 2].yesPrice : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      {/* Animated background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 container mx-auto p-6">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold  mb-3 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            {event.title}
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed max-w-4xl">
            {event.description}
          </p>
        </div>

        {/* Current Prices - Enhanced with 6 decimal precision */}
        <div className="flex justify-center gap-6 mb-8">
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative bg-gradient-to-br from-emerald-900/50 to-green-900/50 backdrop-blur-sm border border-emerald-500/30 rounded-2xl px-8 py-6 text-center hover:transform hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-300">YES</span>
              </div>
              <div className="text-3xl font-bold text-white mb-1">₹{yesPrice.toFixed(6)}</div>
              {priceChange !== 0 && (
                <div className={`text-sm font-medium ${priceChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {priceChange > 0 ? '+' : ''}{priceChange.toFixed(6)}
                </div>
              )}
            </div>
          </div>
          
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative bg-gradient-to-br from-red-900/50 to-rose-900/50 backdrop-blur-sm border border-red-500/30 rounded-2xl px-8 py-6 text-center hover:transform hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingDown className="w-5 h-5 text-red-400" />
                <span className="text-sm font-medium text-red-300">NO</span>
              </div>
              <div className="text-3xl font-bold text-white mb-1">₹{noPrice.toFixed(6)}</div>
              {priceChange !== 0 && (
                <div className={`text-sm font-medium ${-priceChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {-priceChange > 0 ? '+' : ''}{(-priceChange).toFixed(6)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Row: Chart and Place Order */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Price Chart */}
          <div className="lg:col-span-2 bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
            <PriceLineChart priceHistory={priceHistory} />
          </div>

          {/* Place Order */}
          <div className="lg:col-span-1">
            <IntegratedOrderForm
              event={event}
              currentYesPrice={yesPrice}
              currentNoPrice={noPrice}
            />
          </div>
        </div>

        {/* Bottom Row: Order Book and Trade History */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Book */}
          <div className="lg:col-span-2 bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
            <OrderBookTable yesBids={yesBids} yesAsks={yesAsks} noBids={noBids} noAsks={noAsks} />
          </div>

          {/* Trade History */}
          <div className="lg:col-span-1 bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
            <TradeHistoryTable trades={trades} />
          </div>
        </div>
      </div>
    </div>
  );
}