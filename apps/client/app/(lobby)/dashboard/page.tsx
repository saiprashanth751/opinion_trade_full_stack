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
// import { Order } from '@trade/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button'; 
import { Loader2 } from 'lucide-react'; 


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

  const [rechargeAmount, setRechargeAmount] = useState<number | string>(""); // State for recharge input
  const [isRecharging, setIsRecharging] = useState(false); // State for recharge loading

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
      setRechargeAmount(""); // Clear input
      await fetchAllData(); // Re-fetch all data to update balance
    } else {
      toast.error(result.message);
    }
    setIsRecharging(false);
  };

  if (status === "loading") {
    return <div className="flex justify-center items-center h-screen text-lg font-semibold">Loading dashboard...</div>;
  }

  if (!session) {
    return <div className="flex justify-center items-center h-screen text-lg font-semibold">Please log in to view your dashboard.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Welcome, {session.user?.name || session.user?.phoneNumber}!</h1>
      <p className="text-gray-600 mb-6">This is your personal dashboard.</p>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-3">Your Wallet</h2>
        {loadingBalance ? (
          <p>Loading balance...</p>
        ) : (
          <p className="text-2xl font-bold">Balance: ₹{balance !== null ? balance.toFixed(2) : 'N/A'}</p>
        )}
        <div className="mt-4 flex gap-2">
          <Input
            type="number"
            placeholder="Recharge amount"
            value={rechargeAmount}
            onChange={(e) => setRechargeAmount(Number(e.target.value))}
            className="max-w-xs"
            min="1"
          />
          <Button onClick={handleRecharge} disabled={isRecharging}>
            {isRecharging ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              "Recharge"
            )}
          </Button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-3">Your Contracts</h2>
        {loadingContracts ? (
          <p>Loading contracts...</p>
        ) : userContracts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Yes Contracts
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    No Contracts
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Locked Yes
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Locked No
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {userContracts.map((contract) => (
                  <tr key={contract.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {contract.event.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {contract.yesContracts}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {contract.noContracts}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {contract.lockedYesContracts}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {contract.lockedNoContracts}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No contracts found.</p>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-3">Your Open Orders</h2>
        {loadingOpenOrders ? (
          <p>Loading open orders...</p>
        ) : openOrdersError ? (
          <p className="text-red-500">Error loading open orders: {openOrdersError}</p>
        ) : openOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Filled
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {openOrders.map((order) => (
                  <tr key={order.orderId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.orderId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.price}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.filled}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.type}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No open orders found.</p>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-3">Your Trade History</h2>
        {loadingTradeHistory ? (
          <p>Loading trade history...</p>
        ) : tradeHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tradeHistory.map((trade) => (
                  <tr key={trade.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {trade.event.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {trade.buyerId === session?.user?.id ? 'Buy' : 'Sell'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₹{trade.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {trade.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(trade.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No trade history found.</p>
        )}
      </div>
    </div>
  );
}
