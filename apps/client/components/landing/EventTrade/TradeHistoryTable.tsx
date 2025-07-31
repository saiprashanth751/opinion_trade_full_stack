import React from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { TradeAddedMessage } from '@trade/types';
import { History, TrendingUp, TrendingDown, Clock } from 'lucide-react';

interface TradeHistoryTableProps {
  trades: TradeAddedMessage['data'][];
}

export const TradeHistoryTable: React.FC<TradeHistoryTableProps> = ({ trades }) => {
  return (
    <div className="w-full p-6">
      {/* Header with icon */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-lg border border-violet-500/30">
          <History className="w-5 h-5 text-violet-400" />
        </div>
        <h3 className="text-xl font-bold text-white">Recent Trades</h3>
      </div>

      {/* Increased height from h-80 to h-96 for better scrolling experience */}
      <ScrollArea className="h-96">
        <div className="space-y-3">
          <AnimatePresence>
            {trades.length > 0 ? (
              trades.map((trade, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  transition={{ 
                    delay: index * 0.02,
                    type: "spring",
                    stiffness: 300,
                    damping: 25
                  }}
                  className={`group relative overflow-hidden rounded-xl border transition-all duration-300 hover:scale-[1.02] ${
                    trade.action === "buy"
                      ? "bg-gradient-to-r from-green-900/20 to-emerald-900/10 border-green-500/20 hover:border-green-400/40 hover:shadow-lg hover:shadow-green-500/10"
                      : "bg-gradient-to-r from-red-900/20 to-rose-900/10 border-red-500/20 hover:border-red-400/40 hover:shadow-lg hover:shadow-red-500/10"
                  }`}
                >
                  {/* Animated background effect */}
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                    trade.action === "buy" 
                      ? "bg-gradient-to-r from-green-500/5 to-emerald-500/5"
                      : "bg-gradient-to-r from-red-500/5 to-rose-500/5"
                  }`} />
                  
                  <div className="relative p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Enhanced badge with icons */}
                        <Badge
                          variant="secondary"
                          className={`${
                            trade.action === "buy"
                              ? "bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border-green-500/30"
                              : "bg-gradient-to-r from-red-500/20 to-rose-500/20 text-red-300 border-red-500/30"
                          } text-xs font-bold px-3 py-1 rounded-lg backdrop-blur-sm`}
                        >
                          {trade.action === "buy" ? (
                            <>
                              <TrendingUp className="w-3 h-3 mr-1" />
                              BUY
                            </>
                          ) : (
                            <>
                              <TrendingDown className="w-3 h-3 mr-1" />
                              SELL
                            </>
                          )}
                        </Badge>
                        
                        {/* Price with glow effect */}
                        <span className={`text-lg font-bold ${
                          trade.action === "buy" ? "text-green-300" : "text-red-300"
                        } filter drop-shadow-sm`}>
                          ₹{typeof trade.p === 'number' ? trade.p.toFixed(2) : parseFloat(trade.p).toFixed(2)}
                        </span>
                      </div>

                      <div className="text-right">
                        {/* Quantity */}
                        <div className="text-lg font-bold text-white mb-1">
                          {trade.q}
                        </div>
                        
                        {/* Time with icon */}
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="w-3 h-3" />
                          {new Date(trade.timestamp).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Volume indicator bar */}
                    <div className="mt-3 w-full bg-slate-800/50 rounded-full h-1 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((parseInt(trade.q) / 100) * 100, 100)}%` }}
                        transition={{ delay: index * 0.02 + 0.2, duration: 0.8, ease: "easeOut" }}
                        className={`h-full rounded-full ${
                          trade.action === "buy"
                            ? "bg-gradient-to-r from-green-500 to-emerald-400"
                            : "bg-gradient-to-r from-red-500 to-rose-400"
                        }`}
                      />
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16 bg-slate-800/20 rounded-xl border border-slate-700/30"
              >
                <History className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                <div className="text-slate-400 text-lg font-medium mb-2">No recent trades</div>
                <div className="text-slate-500 text-sm">
                  Trades will appear here when executed
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
};