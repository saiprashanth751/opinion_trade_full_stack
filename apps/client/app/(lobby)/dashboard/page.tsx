"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getUserBalance } from '@/actions/User/getBalance';
import { getUserContracts } from '@/actions/User/getUserContracts';
import { getEvents } from '@/actions/Event/getEvents';
import { useOpenOrdersSocket } from '@/hooks/useOpenOrdersSocket';
import { getTradeHistory } from '@/actions/User/getTradeHistory';
import { rechargeBalance } from '@/actions/User/rechargeBalance';
import { toast } from 'react-hot-toast';
import { UserContract, Event, Trade } from "@prisma/client";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button'; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, 
  Wallet, 
  FileText, 
  Activity, 
  History, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Clock,
  Target,
  Zap
} from 'lucide-react';

type UserContractWithEvent = (UserContract & {
  event: Pick<Event, 'id' | 'title' | 'eventId'>;
});

type TradeWithEvent = Trade & {
  event: Pick<Event, 'id' | 'title' | 'eventId'>;
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [userContracts, setUserContracts] = useState<UserContractWithEvent[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(true);
  const [tradeHistory, setTradeHistory] = useState<TradeWithEvent[]>([]);
  const [loadingTradeHistory, setLoadingTradeHistory] = useState(true);

  const [rechargeAmount, setRechargeAmount] = useState<number | string>(""); 
  const [isRecharging, setIsRecharging] = useState(false); 

  const { openOrders, loading: loadingOpenOrders, error: openOrdersError, fetchOrders } = useOpenOrdersSocket();

  const fetchAllData = async () => {
    if (status === "authenticated" && session?.user?.id) {
      // Fetch balance
      setLoadingBalance(true);
      const balanceResult = await getUserBalance();
      if (balanceResult.success && balanceResult.balance !== null) {
        setBalance(balanceResult.balance);
      } else {
        toast.error(balanceResult.message || "Failed to load balance.");
      }
      setLoadingBalance(false);

      // Fetch contracts
      setLoadingContracts(true);
      const contractsResult = await getUserContracts();
      if (contractsResult.success) {
        setUserContracts(contractsResult.contracts);
      } else {
        toast.error(contractsResult.message || "Failed to load contracts.");
      }
      setLoadingContracts(false);

      // Fetch open orders
      const eventsResult = await getEvents();
      if (eventsResult && eventsResult.length > 0) {
        const eventIds = eventsResult.map(event => event.id);
        fetchOrders(session.user.id, eventIds);
      } else {
        console.warn("No events found to fetch open orders for.");
      }

      // Fetch trade history
      setLoadingTradeHistory(true);
      const tradeHistoryResult = await getTradeHistory();
      if (tradeHistoryResult.success) {
        setTradeHistory(tradeHistoryResult.trades);
      } else {
        toast.error(tradeHistoryResult.message || "Failed to load trade history.");
      }
      setLoadingTradeHistory(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [status, session?.user?.id]);

  const handleRecharge = async () => {
    if (typeof rechargeAmount !== 'number' || rechargeAmount <= 0) {
      toast.error("Please enter a valid positive amount to recharge.");
      return;
    }

    setIsRecharging(true);
    const result = await rechargeBalance(rechargeAmount);
    if (result.success) {
      toast.success(result.message);
      setRechargeAmount(""); 
      await fetchAllData(); 
    } else {
      toast.error(result.message);
    }
    setIsRecharging(false);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex justify-center items-center">
        <div className="text-center">
          <div className="inline-flex items-center gap-3 text-xl font-semibold text-white">
            <Activity className="w-6 h-6 animate-pulse text-cyan-400" />
            Loading dashboard...
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex justify-center items-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-white">Please log in to view your dashboard.</div>
        </div>
      </div>
    );
  }

  const totalYesContracts = userContracts.reduce((sum, contract) => sum + contract.yesContracts, 0);
  const totalNoContracts = userContracts.reduce((sum, contract) => sum + contract.noContracts, 0);
  const totalTrades = tradeHistory.length;
  const totalValue = tradeHistory.reduce((sum, trade) => sum + (trade.price * trade.quantity), 0);

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
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Welcome back, {session.user?.name || session.user?.phoneNumber}!
          </h1>
          <p className="text-slate-400 text-lg">
            Your personal trading dashboard - Track your portfolio and manage your investments
          </p>
        </motion.div>

        {/* Stats Overview */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {/* Balance Card */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative bg-gradient-to-br from-emerald-900/50 to-green-900/50 backdrop-blur-sm border border-emerald-500/30 rounded-2xl p-6 hover:transform hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-300 text-sm font-medium">Wallet Balance</p>
                  <p className="text-2xl font-bold text-white">
                    {loadingBalance ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      `₹${balance !== null ? balance.toFixed(2) : 'N/A'}`
                    )}
                  </p>
                </div>
                <Wallet className="w-8 h-8 text-emerald-400" />
              </div>
            </div>
          </div>

          {/* Yes Contracts */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative bg-gradient-to-br from-blue-900/50 to-cyan-900/50 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-6 hover:transform hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-300 text-sm font-medium">YES Contracts</p>
                  <p className="text-2xl font-bold text-white">{totalYesContracts}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-400" />
              </div>
            </div>
          </div>

          {/* No Contracts */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative bg-gradient-to-br from-red-900/50 to-rose-900/50 backdrop-blur-sm border border-red-500/30 rounded-2xl p-6 hover:transform hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-300 text-sm font-medium">NO Contracts</p>
                  <p className="text-2xl font-bold text-white">{totalNoContracts}</p>
                </div>
                <TrendingDown className="w-8 h-8 text-red-400" />
              </div>
            </div>
          </div>

          {/* Total Trades */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
            <div className="relative bg-gradient-to-br from-violet-900/50 to-purple-900/50 backdrop-blur-sm border border-violet-500/30 rounded-2xl p-6 hover:transform hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-violet-300 text-sm font-medium">Total Trades</p>
                  <p className="text-2xl font-bold text-white">{totalTrades}</p>
                </div>
                <Activity className="w-8 h-8 text-violet-400" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Wallet Recharge Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 mb-8 shadow-2xl"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg border border-cyan-500/30">
              <Zap className="w-5 h-5 text-cyan-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Quick Recharge</h2>
          </div>
          
          <div className="flex gap-4 items-end">
            <div className="flex-1 max-w-xs">
              <label className="text-slate-300 text-sm font-medium mb-2 block">Amount (₹)</label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(Number(e.target.value))}
                className="bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 rounded-lg"
                min="1"
              />
            </div>
            <Button 
              onClick={handleRecharge} 
              disabled={isRecharging}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 border-0 px-8 py-3"
            >
              {isRecharging ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Recharge
                </>
              )}
            </Button>
          </div>
        </motion.div>

        {/* Tabbed Content Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden"
        >
          <Tabs defaultValue="contracts" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border-b border-slate-700/50 rounded-none p-1 h-auto">
              <TabsTrigger 
                value="contracts" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25 text-slate-300 hover:text-white font-semibold py-4 px-6 rounded-lg transition-all duration-300 h-auto min-h-[60px] flex items-center justify-center"
              >
                <FileText className="w-4 h-4 mr-2" />
                Your Contracts
              </TabsTrigger>
              <TabsTrigger 
                value="orders" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/25 text-slate-300 hover:text-white font-semibold py-4 px-6 rounded-lg transition-all duration-300 h-auto min-h-[60px] flex items-center justify-center"
              >
                <Target className="w-4 h-4 mr-2" />
                Open Orders
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-violet-500/25 text-slate-300 hover:text-white font-semibold py-4 px-6 rounded-lg transition-all duration-300 h-auto min-h-[60px] flex items-center justify-center"
              >
                <History className="w-4 h-4 mr-2" />
                Trade History
              </TabsTrigger>
            </TabsList>

            {/* Contracts Tab */}
            <TabsContent value="contracts" className="p-6 m-0">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-lg border border-emerald-500/30">
                  <FileText className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Your Contracts</h3>
              </div>

              {loadingContracts ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                  <span className="ml-3 text-slate-400">Loading contracts...</span>
                </div>
              ) : userContracts.length > 0 ? (
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {userContracts.map((contract, index) => (
                      <motion.div
                        key={contract.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/30 rounded-xl p-4 hover:bg-slate-700/30 transition-all duration-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-white font-semibold text-lg">{contract.event.title}</h4>
                          <div className="flex gap-2">
                            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-2 py-1.5">
                              YES: {contract.yesContracts}
                            </Badge>
                            <Badge className="bg-red-500/20 text-red-300 border-red-500/30 px-2 py-1.5">
                              NO: {contract.noContracts}
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 min-w-fit">Locked YES Contracts:</span>
                            <span className="text-slate-300 font-medium">{contract.lockedYesContracts}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 min-w-fit">Locked NO Contracts:</span>
                            <span className="text-slate-300 font-medium">{contract.lockedNoContracts}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-16">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                  <div className="text-slate-400 text-lg font-medium mb-2">No contracts found</div>
                  <div className="text-slate-500 text-sm">Start trading to build your portfolio</div>
                </div>
              )}
            </TabsContent>

            {/* Open Orders Tab */}
            <TabsContent value="orders" className="p-6 m-0">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-lg border border-blue-500/30">
                  <Target className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Open Orders</h3>
              </div>

              {loadingOpenOrders ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                  <span className="ml-3 text-slate-400">Loading orders...</span>
                </div>
              ) : openOrdersError ? (
                <div className="text-center py-16">
                  <div className="text-red-400 text-lg font-medium mb-2">Error loading orders</div>
                  <div className="text-slate-500 text-sm">{openOrdersError}</div>
                </div>
              ) : openOrders.length > 0 ? (
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {openOrders.map((order, index) => (
                      <motion.div
                        key={order.orderId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/30 rounded-xl p-4 hover:bg-slate-700/30 transition-all duration-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Badge className={`${
                              order.type.includes('BUY') 
                                ? "bg-green-500/20 text-green-300 border-green-500/30" 
                                : "bg-red-500/20 text-red-300 border-red-500/30"
                            }`}>
                              {order.type}
                            </Badge>
                            <span className="text-white font-semibold">₹{order.price}</span>
                          </div>
                          <span className="text-slate-400 text-sm">#{order.orderId}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 min-w-fit">Quantity:</span>
                            <span className="text-slate-300 font-medium">{order.quantity}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 min-w-fit">Filled:</span>
                            <span className="text-slate-300 font-medium">{order.filled}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-16">
                  <Target className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                  <div className="text-slate-400 text-lg font-medium mb-2">No open orders</div>
                  <div className="text-slate-500 text-sm">Your active orders will appear here</div>
                </div>
              )}
            </TabsContent>

            {/* Trade History Tab */}
            <TabsContent value="history" className="p-6 m-0">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-lg border border-violet-500/30">
                  <History className="w-5 h-5 text-violet-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Trade History</h3>
              </div>

              {loadingTradeHistory ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                  <span className="ml-3 text-slate-400">Loading trade history...</span>
                </div>
              ) : tradeHistory.length > 0 ? (
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {tradeHistory.map((trade, index) => (
                      <motion.div
                        key={trade.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`bg-slate-800/30 backdrop-blur-sm border rounded-xl p-4 hover:bg-slate-700/30 transition-all duration-200 ${
                          trade.buyerId === session?.user?.id 
                            ? "border-green-500/20 hover:border-green-400/30" 
                            : "border-red-500/20 hover:border-red-400/30"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Badge className={`${
                              trade.buyerId === session?.user?.id
                                ? "bg-green-500/20 text-green-300 border-green-500/30" 
                                : "bg-red-500/20 text-red-300 border-red-500/30"
                            }`}>
                              {trade.buyerId === session?.user?.id ? (
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
                            <span className="text-white font-semibold">₹{trade.price.toFixed(2)}</span>
                            <span className="text-slate-300">× {trade.quantity}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Clock className="w-3 h-3" />
                            {new Date(trade.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-sm text-slate-400 truncate">
                          {trade.event.title}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-16">
                  <History className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                  <div className="text-slate-400 text-lg font-medium mb-2">No trades yet</div>
                  <div className="text-slate-500 text-sm">Your trading history will appear here</div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}