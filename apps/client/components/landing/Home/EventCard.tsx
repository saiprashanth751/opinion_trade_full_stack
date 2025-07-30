"use client";

import { useState } from "react";
import { TEvent, sides } from "@trade/types";
import { OrderPlacementDialog } from "../Order/OrderPlacementDialog";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  ArrowUpRight,
  Zap,
  Target
} from "lucide-react";

interface EventCardProps {
  event: TEvent;
  liveYesPrice: number;
  liveNoPrice: number;
}

export const EventCard = ({ event, liveYesPrice, liveNoPrice }: EventCardProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState(0);
  const [selectedOutcome, setSelectedOutcome] = useState<sides>(sides.YES);
  const [isHovered, setIsHovered] = useState(false);

  const handleOpenDialog = (price: number, outcome: sides) => {
    setSelectedPrice(price);
    setSelectedOutcome(outcome);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  // Calculate price changes (mock for now - you can implement real price tracking)
  const yesPriceChange = Math.random() * 10 - 5; // Random between -5 and 5
  const noPriceChange = Math.random() * 10 - 5;

  return (
    <>
      <motion.div 
        className="group relative"
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        whileHover={{ y: -8 }}
        transition={{ duration: 0.3 }}
      >
        {/* Glowing border effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-violet-500/20 to-emerald-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        {/* Main card */}
        <div className="relative bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl group-hover:shadow-cyan-500/10 transition-all duration-500">
          
          {/* Header with gradient overlay */}
          <div className="relative bg-gradient-to-r from-slate-800/80 to-slate-700/80 p-6 border-b border-slate-700/30">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="relative flex items-start justify-between">
              <div className="flex items-center gap-3">
                {/* Event icon with animated background */}
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-violet-500/20 rounded-xl flex items-center justify-center border border-cyan-500/30 group-hover:border-cyan-400/50 transition-colors duration-300">
                    <Target className="w-6 h-6 text-cyan-400 group-hover:text-cyan-300 transition-colors duration-300" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-violet-500/10 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex items-center gap-1 text-slate-400 text-xs">
                      <Users className="w-3 h-3" />
                      <span>{event?.traders || 0} traders</span>
                    </div>
                    <div className="w-1 h-1 bg-slate-600 rounded-full"></div>
                    <div className="flex items-center gap-1 text-slate-400 text-xs">
                      <Zap className="w-3 h-3" />
                      <span>Live</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Live indicator */}
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-emerald-400 text-xs font-medium">LIVE</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Title with hover effect - Fixed height for consistency */}
            <Link href={`/events/${event.id}`} className="block group/title">
              <div className="h-14 mb-4"> {/* Fixed height container */}
                <h3 className="font-bold text-lg text-white line-clamp-2 group-hover/title:text-cyan-300 transition-colors duration-300 leading-tight">
                  {event?.title}
                  <ArrowUpRight className="inline-block w-4 h-4 ml-1 opacity-0 group-hover/title:opacity-100 transition-opacity duration-300" />
                </h3>
              </div>
            </Link>

            {/* Price buttons with enhanced styling - Fixed height */}
            <div className="grid grid-cols-2 gap-3">
              {/* YES Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group/btn relative overflow-hidden bg-gradient-to-r from-emerald-500/10 to-green-500/10 hover:from-emerald-500/20 hover:to-green-500/20 border border-emerald-500/30 hover:border-emerald-400/50 rounded-xl p-4 h-24 transition-all duration-300 flex flex-col justify-between"
                onClick={() => handleOpenDialog(event.initialYesPrice, sides.YES)}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-green-500/5 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-emerald-300 font-semibold text-sm">YES</span>
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  
                  <div className="text-white font-bold text-xl">₹{liveYesPrice.toFixed(6)}</div>
                </div>
                
                {/* Price change indicator - Fixed position */}
                <div className={`flex items-center gap-1 text-xs ${
                  yesPriceChange >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {yesPriceChange >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>{Math.abs(yesPriceChange).toFixed(1)}%</span>
                </div>
              </motion.button>

              {/* NO Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group/btn relative overflow-hidden bg-gradient-to-r from-red-500/10 to-rose-500/10 hover:from-red-500/20 hover:to-rose-500/20 border border-red-500/30 hover:border-red-400/50 rounded-xl p-4 h-24 transition-all duration-300 flex flex-col justify-between"
                onClick={() => handleOpenDialog(event.initialNoPrice, sides.NO)}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-rose-500/5 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-red-300 font-semibold text-sm">NO</span>
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  </div>
                  
                  <div className="text-white font-bold text-xl">₹{liveNoPrice.toFixed(6)}</div>
                </div>
                
                {/* Price change indicator - Fixed position */}
                <div className={`flex items-center gap-1 text-xs ${
                  noPriceChange >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {noPriceChange >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>{Math.abs(noPriceChange).toFixed(1)}%</span>
                </div>
              </motion.button>
            </div>
          </div>

          {/* Bottom accent bar */}
          <div className="h-1 bg-gradient-to-r from-cyan-500/50 via-violet-500/50 to-emerald-500/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        </div>
      </motion.div>

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