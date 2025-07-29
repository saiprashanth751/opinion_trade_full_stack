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

interface PriceData {
  time: string
  yes: number
  no: number
  timestamp: number
}

interface OrderBookEntry {
  price: number
  quantity: number
  id: string
}

interface Trade {
  id: string
  price: number
  quantity: number
  side: "YES" | "NO"
  time: string
}

export default function LuxeTradingInterface() {
  const [priceData, setPriceData] = useState<PriceData[]>([])
  const [currentPrices, setCurrentPrices] = useState({ yes: 65.42, no: 34.58 })
  const [priceChanges, setPriceChanges] = useState({ yes: 2.34, no: -2.34 })
  const [orderSide, setOrderSide] = useState<"YES" | "NO">("YES")
  const [orderType, setOrderType] = useState<"BUY" | "SELL">("BUY")
  const [quantity, setQuantity] = useState(100)
  const [price, setPrice] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [hoveredPoint, setHoveredPoint] = useState<any>(null)

  const [orderBook, setOrderBook] = useState({
    yes: {
      bids: [] as OrderBookEntry[],
      asks: [] as OrderBookEntry[],
    },
    no: {
      bids: [] as OrderBookEntry[],
      asks: [] as OrderBookEntry[],
    },
  })

  const [trades, setTrades] = useState<Trade[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize data
  useEffect(() => {
    // Initialize price data
    const initialData: PriceData[] = []
    const now = Date.now()
    for (let i = 29; i >= 0; i--) {
      const timestamp = now - i * 60000
      const baseYes = 65.42
      const baseNo = 34.58
      initialData.push({
        time: new Date(timestamp).toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
        }),
        yes: baseYes + Math.sin(i * 0.1) * 3 + Math.random() * 2 - 1,
        no: baseNo + Math.cos(i * 0.1) * 3 + Math.random() * 2 - 1,
        timestamp,
      })
    }
    setPriceData(initialData)

    // Initialize order book
    const generateOrderBook = () => ({
      yes: {
        bids: Array.from({ length: 8 }, (_, i) => ({
          price: currentPrices.yes - (i + 1) * 0.25,
          quantity: Math.floor(Math.random() * 2000) + 500,
          id: `yes-bid-${i}`,
        })),
        asks: Array.from({ length: 8 }, (_, i) => ({
          price: currentPrices.yes + (i + 1) * 0.25,
          quantity: Math.floor(Math.random() * 2000) + 500,
          id: `yes-ask-${i}`,
        })),
      },
      no: {
        bids: Array.from({ length: 8 }, (_, i) => ({
          price: currentPrices.no - (i + 1) * 0.25,
          quantity: Math.floor(Math.random() * 2000) + 500,
          id: `no-bid-${i}`,
        })),
        asks: Array.from({ length: 8 }, (_, i) => ({
          price: currentPrices.no + (i + 1) * 0.25,
          quantity: Math.floor(Math.random() * 2000) + 500,
          id: `no-ask-${i}`,
        })),
      },
    })

    setOrderBook(generateOrderBook())

    // Initialize trades
    const initialTrades: Trade[] = Array.from({ length: 15 }, (_, i) => ({
      id: `trade-${i}`,
      price: Math.random() > 0.5 ? currentPrices.yes + Math.random() * 2 - 1 : currentPrices.no + Math.random() * 2 - 1,
      quantity: Math.floor(Math.random() * 1000) + 100,
      side: Math.random() > 0.5 ? "YES" : "NO",
      time: new Date(now - i * 45000).toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    }))
    setTrades(initialTrades)
  }, [])

  // Real-time updates
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const yesChange = (Math.random() - 0.5) * 1.5
      const noChange = (Math.random() - 0.5) * 1.5

      setCurrentPrices((prev) => {
        const newYes = Math.max(0, Math.min(100, prev.yes + yesChange))
        const newNo = Math.max(0, Math.min(100, prev.no + noChange))
        return { yes: newYes, no: newNo }
      })

      setPriceChanges((prev) => ({
        yes: prev.yes + yesChange * 0.1,
        no: prev.no + noChange * 0.1,
      }))

      // Update price chart
      setPriceData((prev) => {
        const newData = [...prev]
        const now = Date.now()
        newData.push({
          time: new Date(now).toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
          }),
          yes: currentPrices.yes + yesChange,
          no: currentPrices.no + noChange,
          timestamp: now,
        })
        return newData.slice(-30)
      })

      // Update order book
      if (Math.random() > 0.6) {
        setOrderBook((prev) => {
          const updated = { ...prev }
          const side = Math.random() > 0.5 ? "yes" : "no"
          const type = Math.random() > 0.5 ? "bids" : "asks"
          const index = Math.floor(Math.random() * updated[side][type].length)

          updated[side][type][index] = {
            ...updated[side][type][index],
            quantity: Math.floor(Math.random() * 2000) + 500,
          }

          return updated
        })
      }

      // Add new trade
      if (Math.random() > 0.7) {
        const newTrade: Trade = {
          id: `trade-${Date.now()}`,
          price: Math.random() > 0.5 ? currentPrices.yes : currentPrices.no,
          quantity: Math.floor(Math.random() * 1000) + 100,
          side: Math.random() > 0.5 ? "YES" : "NO",
          time: new Date().toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        }
        setTrades((prev) => [newTrade, ...prev.slice(0, 24)])
      }
    }, 2000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [currentPrices])

  const handlePlaceOrder = async () => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1200))
    setIsLoading(false)
    setPrice("")
  }

  const adjustQuantity = (delta: number) => {
    setQuantity((prev) => Math.max(1, prev + delta))
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 shadow-2xl"
        >
          <p className="text-slate-300 text-sm font-medium mb-2">{`Time: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-sm font-semibold" style={{ color: entry.color }}>
                {entry.dataKey.toUpperCase()}: ₹{entry.value.toFixed(2)}
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
              Will Bitcoin reach $100K by Dec 2024?
            </h1>
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-emerald-600/20 blur-xl -z-10" />
          </div>

          <div className="flex items-center justify-center gap-8 flex-wrap">
            <p className="text-slate-400 text-lg font-medium max-w-2xl">
              Trade on whether Bitcoin will reach the $100,000 milestone before the end of 2024
            </p>
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 backdrop-blur-sm rounded-full border border-slate-700/50">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-slate-300 font-semibold">3,247 traders</span>
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
                  <div className="text-4xl font-black text-emerald-400">₹{currentPrices.yes.toFixed(2)}</div>
                  <div className="text-lg font-bold text-emerald-300 tracking-wider">YES</div>
                  <div className="flex items-center justify-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">+{Math.abs(priceChanges.yes).toFixed(2)}%</span>
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
                  <div className="text-4xl font-black text-red-400">₹{currentPrices.no.toFixed(2)}</div>
                  <div className="text-lg font-bold text-red-300 tracking-wider">NO</div>
                  <div className="flex items-center justify-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 font-semibold">{priceChanges.no.toFixed(2)}%</span>
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
                        data={priceData}
                        onMouseMove={(e) => setHoveredPoint(e)}
                        onMouseLeave={() => setHoveredPoint(null)}
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
                          dataKey="time"
                          axisLine={false}
                          tickLine={false}
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
                          dataKey="yes"
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
                          dataKey="no"
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
                  {/* Side Toggle */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-slate-300">Position</Label>
                    <Tabs value={orderSide} onValueChange={(value) => setOrderSide(value as "YES" | "NO")}>
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
                    <Tabs value={orderType} onValueChange={(value) => setOrderType(value as "BUY" | "SELL")}>
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

                  {/* Custom Quantity Input */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-slate-300">Quantity</Label>
                    <div className="flex items-center bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => adjustQuantity(-10)}
                        className="p-3 text-slate-400 hover:text-white transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </motion.button>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="flex-1 bg-transparent text-center text-lg font-semibold text-white focus:outline-none"
                      />
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => adjustQuantity(10)}
                        className="p-3 text-slate-400 hover:text-white transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>

                  {/* Price Input */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-slate-300">Price (₹)</Label>
                    <Input
                      type="number"
                      placeholder="Enter price"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 rounded-2xl text-lg font-semibold focus:border-blue-500/50 transition-all duration-200"
                    />
                  </div>

                  {/* Order Summary */}
                  {quantity && price && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-700/30"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Total Cost:</span>
                        <span className="text-xl font-bold text-white">
                          ₹{(quantity * Number.parseFloat(price)).toFixed(2)}
                        </span>
                      </div>
                    </motion.div>
                  )}

                  {/* Submit Button */}
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={handlePlaceOrder}
                      disabled={isLoading || !quantity || !price}
                      className={`w-full h-14 text-lg font-bold rounded-2xl transition-all duration-300 ${
                        orderSide === "YES"
                          ? "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 shadow-lg shadow-emerald-500/25"
                          : "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-lg shadow-red-500/25"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Placing Order...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Zap className="w-5 h-5" />
                          {orderType} {orderSide}
                        </div>
                      )}
                    </Button>
                  </motion.div>
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
                            {orderBook.yes.bids.slice(0, 6).map((bid, index) => (
                              <motion.div
                                key={bid.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className="flex justify-between items-center p-3 bg-emerald-500/5 hover:bg-emerald-500/10 rounded-xl border border-emerald-500/10 transition-all duration-200"
                              >
                                <span className="text-emerald-400 font-bold">₹{bid.price.toFixed(2)}</span>
                                <span className="text-slate-300 font-medium">{bid.quantity.toLocaleString()}</span>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-red-400 mb-4 uppercase tracking-wider">Asks</h4>
                          <div className="space-y-2">
                            {orderBook.yes.asks.slice(0, 6).map((ask, index) => (
                              <motion.div
                                key={ask.id}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className="flex justify-between items-center p-3 bg-red-500/5 hover:bg-red-500/10 rounded-xl border border-red-500/10 transition-all duration-200"
                              >
                                <span className="text-red-400 font-bold">₹{ask.price.toFixed(2)}</span>
                                <span className="text-slate-300 font-medium">{ask.quantity.toLocaleString()}</span>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="NO" className="space-y-4">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-bold text-emerald-400 mb-4 uppercase tracking-wider">Bids</h4>
                          <div className="space-y-2">
                            {orderBook.no.bids.slice(0, 6).map((bid, index) => (
                              <motion.div
                                key={bid.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className="flex justify-between items-center p-3 bg-emerald-500/5 hover:bg-emerald-500/10 rounded-xl border border-emerald-500/10 transition-all duration-200"
                              >
                                <span className="text-emerald-400 font-bold">₹{bid.price.toFixed(2)}</span>
                                <span className="text-slate-300 font-medium">{bid.quantity.toLocaleString()}</span>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-red-400 mb-4 uppercase tracking-wider">Asks</h4>
                          <div className="space-y-2">
                            {orderBook.no.asks.slice(0, 6).map((ask, index) => (
                              <motion.div
                                key={ask.id}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className="flex justify-between items-center p-3 bg-red-500/5 hover:bg-red-500/10 rounded-xl border border-red-500/10 transition-all duration-200"
                              >
                                <span className="text-red-400 font-bold">₹{ask.price.toFixed(2)}</span>
                                <span className="text-slate-300 font-medium">{ask.quantity.toLocaleString()}</span>
                              </motion.div>
                            ))}
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
                        {trades.map((trade, index) => (
                          <motion.div
                            key={trade.id}
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
                                  trade.side === "YES"
                                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                    : "bg-red-500/20 text-red-400 border-red-500/30"
                                } text-xs font-bold px-3 py-1 rounded-full`}
                              >
                                {trade.side}
                              </Badge>
                              <div className="space-y-1">
                                <div className="text-lg font-bold text-white">₹{trade.price.toFixed(2)}</div>
                                <div className="text-sm text-slate-400">{trade.quantity.toLocaleString()} shares</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-slate-400 font-medium">{trade.time}</div>
                            </div>
                          </motion.div>
                        ))}
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
