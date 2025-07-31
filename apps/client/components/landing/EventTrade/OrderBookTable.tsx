import React from 'react';
import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, TrendingUp, TrendingDown } from "lucide-react";

interface OrderBookTableProps {
  yesBids: [string, string][];
  yesAsks: [string, string][];
  noBids: [string, string][];
  noAsks: [string, string][];
}

// Helper function to format numbers to 3 significant digits
const formatNumber = (value: string): string => {
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  
  // For very small numbers (< 0.001), show in scientific notation
  if (num < 0.001 && num > 0) {
    return num.toExponential(2);
  }
  
  // For numbers >= 1000, show with k suffix
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  
  // For numbers >= 100, show no decimal places
  if (num >= 100) {
    return num.toFixed(0);
  }
  
  // For numbers >= 10, show 1 decimal place
  if (num >= 10) {
    return num.toFixed(1);
  }
  
  // For numbers >= 1, show 2 decimal places
  if (num >= 1) {
    return num.toFixed(2);
  }
  
  // For numbers < 1, show 3 decimal places
  return num.toFixed(3);
};

const OrderSection = ({ title, bids, asks, isYes }: { title: string, bids: [string, string][], asks: [string, string][], isYes: boolean }) => (
  <div className="grid grid-cols-2 gap-6">
    {/* Bids Section - Now scrollable */}
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-green-400" />
        <h4 className="text-sm font-bold text-green-400 tracking-wide">BIDS (BUY)</h4>
      </div>
      {/* Made ScrollArea height consistent and scrollable for all orders */}
      <ScrollArea className="h-80">
        <div className="space-y-2 pr-2">
          {bids.length > 0 ? (
            bids.map(([price, quantity], index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="group relative overflow-hidden"
              >
                {/* Background bar based on quantity */}
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-green-500/5 rounded-lg"
                  style={{ width: `${Math.min((parseFloat(quantity) / 100) * 100, 100)}%` }}
                />
                <div className="relative flex justify-between items-center py-3 px-4 hover:bg-green-500/10 rounded-lg border-l-2 border-green-500/30 bg-slate-800/30 backdrop-blur-sm transition-all duration-200 group-hover:border-green-400/50 group-hover:shadow-lg group-hover:shadow-green-500/10">
                  <span className="text-sm font-bold text-green-400 group-hover:text-green-300">
                    ₹{formatNumber(price)}
                  </span>
                  <span className="text-sm text-slate-300 font-medium">
                    {quantity}
                  </span>
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-slate-500 py-12 text-sm bg-slate-800/20 rounded-lg border border-slate-700/30"
            >
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <div>No bids available</div>
              <div className="text-xs text-slate-600 mt-1">Waiting for buy orders</div>
            </motion.div>
          )}
        </div>
      </ScrollArea>
    </div>

    {/* Asks Section - Now scrollable */}
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <TrendingDown className="w-4 h-4 text-red-400" />
        <h4 className="text-sm font-bold text-red-400 tracking-wide">ASKS (SELL)</h4>
      </div>
      {/* Made ScrollArea height consistent and scrollable for all orders */}
      <ScrollArea className="h-80">
        <div className="space-y-2 pr-2">
          {asks.length > 0 ? (
            asks.map(([price, quantity], index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="group relative overflow-hidden"
              >
                {/* Background bar based on quantity */}
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-red-500/5 rounded-lg"
                  style={{ width: `${Math.min((parseFloat(quantity) / 100) * 100, 100)}%` }}
                />
                <div className="relative flex justify-between items-center py-3 px-4 hover:bg-red-500/10 rounded-lg border-l-2 border-red-500/30 bg-slate-800/30 backdrop-blur-sm transition-all duration-200 group-hover:border-red-400/50 group-hover:shadow-lg group-hover:shadow-red-500/10">
                  <span className="text-sm font-bold text-red-400 group-hover:text-red-300">
                    ₹{formatNumber(price)}
                  </span>
                  <span className="text-sm text-slate-300 font-medium">
                    {quantity}
                  </span>
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-slate-500 py-12 text-sm bg-slate-800/20 rounded-lg border border-slate-700/30"
            >
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <div>No asks available</div>
              <div className="text-xs text-slate-600 mt-1">Waiting for sell orders</div>
            </motion.div>
          )}
        </div>
      </ScrollArea>
    </div>
  </div>
);

export const OrderBookTable: React.FC<OrderBookTableProps> = ({ yesBids, yesAsks, noBids, noAsks }) => {
  return (
    <div className="w-full p-6">
      {/* Header with icon */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-500/30">
          <BookOpen className="w-5 h-5 text-blue-400" />
        </div>
        <h3 className="text-xl font-bold text-white">Order Book</h3>
      </div>

      <Tabs defaultValue="YES" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 border border-slate-700/50 rounded-xl p-1 h-auto">
          <TabsTrigger 
            value="YES" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25 text-slate-300 hover:text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 h-auto min-h-[48px] flex items-center justify-center"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            YES Orders
          </TabsTrigger>
          <TabsTrigger 
            value="NO" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-rose-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-red-500/25 text-slate-300 hover:text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 h-auto min-h-[48px] flex items-center justify-center"
          >
            <TrendingDown className="w-4 h-4 mr-2" />
            NO Orders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="YES" className="space-y-4 mt-6">
          <OrderSection title="YES" bids={yesBids} asks={yesAsks} isYes={true} />
        </TabsContent>

        <TabsContent value="NO" className="space-y-4 mt-6">
          <OrderSection title="NO" bids={noBids} asks={noAsks} isYes={false} />
        </TabsContent>
      </Tabs>
    </div>
  );
};