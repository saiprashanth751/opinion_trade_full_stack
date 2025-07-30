"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TrendingUp, TrendingDown, Users, Plus, Minus, Activity, Zap, Target } from "lucide-react"

// New imports for form handling and data
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import { toast } from "react-hot-toast"
import { useSession } from "next-auth/react"
import { Loader2 } from "lucide-react"
import { placeOrder } from "@/actions/Order/placeOrder"
import { TEvent, orderType, sides, TradeAddedMessage } from "@trade/types"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

// Define PricePoint interface (can be imported if exported from useOrderbookSocket.ts)
interface PricePoint {
  timestamp: number;
  yesPrice: number;
  noPrice: number;
}

// Define props for the TradingInterface component
interface TradingInterfaceProps {
  event: TEvent;
  yesBids: [string, string][];
  yesAsks: [string, string][];
  noBids: [string, string][];
  noAsks: [string, string][];
  trades: TradeAddedMessage['data'][];
  yesPrice: number;
  noPrice: number;
  priceHistory: PricePoint[];
}

// Define the form schema using Zod (copied from IntegratedOrderForm.tsx)
const formSchema = z.object({
  quantity: z.coerce
    .number()
    .min(1, { message: "Quantity must be at least 1." })
    .int({ message: "Quantity must be a whole number." }),
  price: z.coerce
    .number()
    .min(0.01, { message: "Price must be positive." }) // Assuming price can be decimal
    .max(100, { message: "Price cannot exceed 100." }), // Assuming price is out of 100
});


export default function LuxeTradingInterface({
  event,
  yesBids,
  yesAsks,
  noBids,
  noAsks,
  trades,
  yesPrice,
  noPrice,
  priceHistory,
}: TradingInterfaceProps) {
  const { data: session } = useSession();

  const [orderSide, setOrderSide] = useState<sides>(sides.YES)
  const [orderTypeVal, setOrderTypeVal] = useState<orderType>(orderType.BUY)

  // Form setup using react-hook-form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 1,
      price: orderSide === "yes" ? yesPrice : noPrice, // Set initial price based on selected side
    },
  });

  // Effect to update price field when selectedOutcome or live prices change
  useEffect(() => {
    form.setValue("price", orderSide === "yes" ? yesPrice : noPrice);
  }, [orderSide, yesPrice, noPrice, form]);

  // Mutation for placing orders
  const { mutate, isPending } = useMutation({
    mutationFn: placeOrder,
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        form.reset({
          quantity: 1,
          price: orderSide === "yes" ? yesPrice : noPrice,
        });
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      console.error("Order placement error:", error);
      toast.error("Failed to place order. Please try again.");
    },
  });

  // Form submission handler
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!session?.user?.id) {
      toast.error("You must be logged in to place an order.");
      return;
    }

    mutate({
      eventId: event.id,
      price: values.price,
      quantity: values.quantity,
      action: orderTypeVal === "buy" ? orderType.BUY : orderType.SELL, // Map "BUY" | "SELL" to orderTypeVal enum
      outcome: orderSide === "yes" ? sides.YES : sides.NO, // Map "YES" | "NO" to sides enum
    });
  };

  // Helper to format X-axis for chart
  const formatXAxis = (tickItem: number) => {
    return new Date(tickItem).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Custom Tooltip for the price chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 shadow-2xl"
        >
          <p className="text-slate-300 text-sm font-medium mb-2">{`Time: ${new Date(label).toLocaleString()}`}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-sm font-semibold" style={{ color: entry.color }}>
                {entry.dataKey === 'yesPrice' ? 'YES Price' : 'NO Price'}: ₹{entry.value.toFixed(2)}
              </span>
            </div>
          ))}
        </motion.div>
      )
    }
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto p-6 space-y-8">
        {/* Luxe Header */}
        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-6">
          <div className="relative">
            <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent leading-tight">
              {event.title}
            </h1>
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-emerald-600/20 blur-xl -z-10" />
          </div>

          <div className="flex items-center justify-center gap-8 flex-wrap">
            <p className="text-slate-400 text-lg font-medium max-w-2xl">
              {event.description}
            </p>
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 backdrop-blur-sm rounded-full border border-slate-700/50">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-slate-300 font-semibold">{event.traders} traders</span>
            </div>
          </div>
        </motion.div>

        {/* Premium Price Blocks */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto"
        >
          <motion.div whileHover={{ scale: 1.02, y: -2 }} className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-green-600 rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-300" />
            <Card className="relative bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-emerald-600/10 border-emerald-500/30 backdrop-blur-xl rounded-3xl overflow-hidden">
              <CardContent className="p-8 text-center">
                <div className="space-y-3">
                  <div className="text-4xl font-black text-emerald-400">₹{yesPrice.toFixed(2)}</div>
                  <div className="text-lg font-bold text-emerald-300 tracking-wider">YES</div>
                  {/* Price change calculation can be added here if needed, based on initial price */}
                  <div className="flex items-center justify-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">
                      {((yesPrice - event.initialYesPrice) / event.initialYesPrice * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02, y: -2 }} className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-rose-600 rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-300" />
            <Card className="relative bg-gradient-to-br from-red-500/10 via-rose-500/5 to-red-600/10 border-red-500/30 backdrop-blur-xl rounded-3xl overflow-hidden">
              <CardContent className="p-8 text-center">
                <div className="space-y-3">
                  <div className="text-4xl font-black text-red-400">₹{noPrice.toFixed(2)}</div>
                  <div className="text-lg font-bold text-red-300 tracking-wider">NO</div>
                  {/* Price change calculation can be added here if needed, based on initial price */}
                  <div className="flex items-center justify-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 font-semibold">
                      {((noPrice - event.initialNoPrice) / event.initialNoPrice * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Main Trading Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Refined Chart */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="xl:col-span-2">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-emerald-600/20 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500" />
              <Card className="relative bg-slate-900/50 backdrop-blur-2xl border-slate-700/50 rounded-3xl overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl font-bold flex items-center gap-3">
                      <Activity className="w-6 h-6 text-blue-400" />
                      Price Chart
                    </CardTitle>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-emerald-400 rounded-full" />
                        <span className="text-sm font-medium text-emerald-400">YES</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-400 rounded-full" />
                        <span className="text-sm font-medium text-red-400">NO</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-96 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={priceHistory} // Use priceHistory from props
                      >
                        <defs>
                          <linearGradient id="yesGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="noGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.3} />
                        <XAxis
                          dataKey="timestamp" // Use timestamp from PricePoint
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={formatXAxis} // Use custom formatter
                          tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 500 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 500 }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="yesPrice" // Use yesPrice from PricePoint
                          stroke="#4ade80"
                          strokeWidth={3}
                          dot={false}
                          activeDot={{
                            r: 6,
                            fill: "#4ade80",
                            stroke: "#065f46",
                            strokeWidth: 2,
                            filter: "drop-shadow(0 0 8px #4ade80)",
                          }}
                          filter="drop-shadow(0 0 4px #4ade8050)"
                        />
                        <Line
                          type="monotone"
                          dataKey="noPrice" // Use noPrice from PricePoint
                          stroke="#f87171"
                          strokeWidth={3}
                          dot={false}
                          activeDot={{
                            r: 6,
                            fill: "#f87171",
                            stroke: "#7f1d1d",
                            strokeWidth: 2,
                            filter: "drop-shadow(0 0 8px #f87171)",
                          }}
                          filter="drop-shadow(0 0 4px #f8717150)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Premium Order Form */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}>
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500" />
              <Card className="relative bg-slate-900/50 backdrop-blur-2xl border-slate-700/50 rounded-3xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold flex items-center gap-3">
                    <Target className="w-6 h-6 text-purple-400" />
                    Place Order
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      {/* Side Toggle */}
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-300">Position</Label>
                        <Tabs value={orderSide} onValueChange={(value) => setOrderSide(value as sides)}>
                          <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 backdrop-blur-sm rounded-2xl p-1">
                            <TabsTrigger
                              value="YES"
                              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-xl font-semibold transition-all duration-200"
                            >
                              YES
                            </TabsTrigger>
                            <TabsTrigger
                              value="NO"
                              className="data-[state=active]:bg-red-600 data-[state=active]:text-white rounded-xl font-semibold transition-all duration-200"
                            >
                              NO
                            </TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>

                      {/* Order Type Toggle */}
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-300">Action</Label>
                        <Tabs value={orderTypeVal} onValueChange={(value) => setOrderTypeVal(value as orderType)}>
                          <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 backdrop-blur-sm rounded-2xl p-1">
                            <TabsTrigger
                              value="BUY"
                              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-xl font-semibold transition-all duration-200"
                            >
                              BUY
                            </TabsTrigger>
                            <TabsTrigger
                              value="SELL"
                              className="data-[state=active]:bg-orange-600 data-[state=active]:text-white rounded-xl font-semibold transition-all duration-200"
                            >
                              SELL
                            </TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>

                      {/* Quantity Input */}
                      <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <Label className="text-sm font-semibold text-slate-300">Quantity</Label>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Enter quantity"
                                {...field}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value === "" ? "" : Number(value));
                                }}
                                className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 rounded-2xl text-lg font-semibold focus:border-blue-500/50 transition-all duration-200"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Price Input */}
                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <Label className="text-sm font-semibold text-slate-300">Price (₹)</Label>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01" // Allow decimal prices
                                placeholder="Enter price"
                                {...field}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value === "" ? "" : Number(value));
                                }}
                                className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 rounded-2xl text-lg font-semibold focus:border-blue-500/50 transition-all duration-200"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Order Summary */}
                      {form.watch("quantity") && form.watch("price") && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/30"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Total Cost:</span>
                            <span className="text-xl font-bold text-white">
                              ₹{(form.watch("quantity") * form.watch("price")).toFixed(2)}
                            </span>
                          </div>
                        </motion.div>
                      )}

                      {/* Submit Button */}
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          type="submit"
                          disabled={isPending}
                          className={`w-full h-14 text-lg font-bold rounded-2xl transition-all duration-300 ${
                            orderSide === "yes"
                              ? "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 shadow-lg shadow-emerald-500/25"
                              : "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-lg shadow-red-500/25"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {isPending ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Placing Order...
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Zap className="w-5 h-5" />
                              {orderTypeVal} {orderSide}
                            </div>
                          )}
                        </Button>
                      </motion.div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>

        {/* Order Book & Trade History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Refined Order Book */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600/10 to-red-600/10 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500" />
              <Card className="relative bg-slate-900/50 backdrop-blur-2xl border-slate-700/50 rounded-3xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold">Order Book</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <Tabs defaultValue="YES" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 backdrop-blur-sm rounded-2xl p-1 mb-6">
                      <TabsTrigger
                        value="YES"
                        className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-xl font-semibold"
                      >
                        YES Orders
                      </TabsTrigger>
                      <TabsTrigger
                        value="NO"
                        className="data-[state=active]:bg-red-600 data-[state=active]:text-white rounded-xl font-semibold"
                      >
                        NO Orders
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="YES" className="space-y-4">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-bold text-emerald-400 mb-4 uppercase tracking-wider">Bids</h4>
                          <div className="space-y-2">
                            {yesBids.length > 0 ? (
                              yesBids.map(([price, quantity], index) => (
                                <motion.div
                                  key={index}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.03 }}
                                  className="flex justify-between items-center p-3 bg-emerald-500/5 hover:bg-emerald-500/10 rounded-xl border border-emerald-500/10 transition-all duration-200"
                                >
                                  <span className="text-emerald-400 font-bold">₹{parseFloat(price).toFixed(2)}</span>
                                  <span className="text-slate-300 font-medium">{parseInt(quantity).toLocaleString()}</span>
                                </motion.div>
                              ))
                            ) : (
                              <p className="text-slate-400 text-sm">No YES bids</p>
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-red-400 mb-4 uppercase tracking-wider">Asks</h4>
                          <div className="space-y-2">
                            {yesAsks.length > 0 ? (
                              yesAsks.map(([price, quantity], index) => (
                                <motion.div
                                  key={index}
                                  initial={{ opacity: 0, x: 10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.03 }}
                                  className="flex justify-between items-center p-3 bg-red-500/5 hover:bg-red-500/10 rounded-xl border border-red-500/10 transition-all duration-200"
                                >
                                  <span className="text-red-400 font-bold">₹{parseFloat(price).toFixed(2)}</span>
                                  <span className="text-slate-300 font-medium">{parseInt(quantity).toLocaleString()}</span>
                                </motion.div>
                              ))
                            ) : (
                              <p className="text-slate-400 text-sm">No YES asks</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="NO" className="space-y-4">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-bold text-emerald-400 mb-4 uppercase tracking-wider">Bids</h4>
                          <div className="space-y-2">
                            {noBids.length > 0 ? (
                              noBids.map(([price, quantity], index) => (
                                <motion.div
                                  key={index}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.03 }}
                                  className="flex justify-between items-center p-3 bg-emerald-500/5 hover:bg-emerald-500/10 rounded-xl border border-emerald-500/10 transition-all duration-200"
                                >
                                  <span className="text-emerald-400 font-bold">₹{parseFloat(price).toFixed(2)}</span>
                                  <span className="text-slate-300 font-medium">{parseInt(quantity).toLocaleString()}</span>
                                </motion.div>
                              ))
                            ) : (
                              <p className="text-slate-400 text-sm">No NO bids</p>
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-red-400 mb-4 uppercase tracking-wider">Asks</h4>
                          <div className="space-y-2">
                            {noAsks.length > 0 ? (
                              noAsks.map(([price, quantity], index) => (
                                <motion.div
                                  key={index}
                                  initial={{ opacity: 0, x: 10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.03 }}
                                  className="flex justify-between items-center p-3 bg-red-500/5 hover:bg-red-500/10 rounded-xl border border-red-500/10 transition-all duration-200"
                                >
                                  <span className="text-red-400 font-bold">₹{parseFloat(price).toFixed(2)}</span>
                                  <span className="text-slate-300 font-medium">{parseInt(quantity).toLocaleString()}</span>
                                </motion.div>
                              ))
                            ) : (
                              <p className="text-slate-400 text-sm">No NO asks</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Premium Trade History */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-500" />
              <Card className="relative bg-slate-900/50 backdrop-blur-2xl border-slate-700/50 rounded-3xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold">Recent Trades</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ScrollArea className="h-96 pr-4">
                    <div className="space-y-3">
                      <AnimatePresence>
                        {trades.length > 0 ? (
                          trades.map((trade, index) => (
                            <motion.div
                              key={trade.t + trade.p + trade.q + index} // Unique key for trades
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ delay: index * 0.02 }}
                              className="flex items-center justify-between p-4 bg-slate-800/30 hover:bg-slate-800/50 rounded-2xl border border-slate-700/30 transition-all duration-200 group"
                            >
                              <div className="flex items-center gap-4">
                                <Badge
                                  variant="secondary"
                                  className={`${
                                    trade.m // 'm' indicates if the buyer is the maker (true for buy, false for sell)
                                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                      : "bg-red-500/20 text-red-400 border-red-500/30"
                                  } text-xs font-bold px-3 py-1 rounded-full`}
                                >
                                  {trade.m ? "BUY" : "SELL"}
                                </Badge>
                                <div className="space-y-1">
                                  <div className="text-lg font-bold text-white">₹{trade.p.toFixed(2)}</div>
                                  <div className="text-sm text-slate-400">{parseInt(trade.q).toLocaleString()} shares</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-slate-400 font-medium">
                                  {new Date(trade.t).toLocaleTimeString("en-US", {
                                    hour12: false,
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })}
                                </div>
                              </div>
                            </motion.div>
                          ))
                        ) : (
                          <p className="text-slate-400 text-sm">No recent trades</p>
                        )}
                      </AnimatePresence>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
