"use client"
import { getEvents } from "@/actions/Event/getEvents"
import { EventCard } from "@/components/landing/Home/EventCard";
import { useEventSummarySocket } from "@/hooks/useEventSummarySocket";
import { TEvent } from "@trade/types"
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Activity, Users, Timer, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AuthenticatedLayout from "@/components/landing/layout/AuthenticatedLayout";
import { AuthGuard } from "@/components/landing/Auth/AuthGuard";

const Page = () => {
    const [events, setEvents] = useState<TEvent[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const eventPrices = useEventSummarySocket();

    useEffect(() => {
        const fetchEvents = async () => {
            setIsLoading(true);
            const fetchedEvents = await getEvents();
            setEvents(fetchedEvents);
            setIsLoading(false);
        }

        fetchEvents();
    }, []);

    const filteredEvents = events.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalTraders = events.reduce((sum, event) => sum + (event.traders || 0), 0);
    const activeEvents = events.length;

    return (
        <AuthGuard requireAuth={true}>
            <AuthenticatedLayout>
                <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
                    {/* Animated background effects */}
                    <div className="fixed inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
                        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
                        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
                    </div>

                    <div className="relative z-10">
                        {/* Hero Section */}
                        <div className="pt-16 pb-12 px-8">
                            <div className="max-w-7xl mx-auto">
                                <motion.div
                                    initial={{ opacity: 0, y: -30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.8 }}
                                    className="text-center mb-12"
                                >
                                    <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-cyan-200 to-emerald-300 bg-clip-text text-transparent leading-tight">
                                        Live Prediction Markets
                                    </h1>
                                    <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
                                        Trade on the outcomes of real-world events. Make predictions, earn rewards, and be part of the future of forecasting.
                                    </p>
                                </motion.div>

                                {/* Stats Bar */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3, duration: 0.6 }}
                                    className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
                                >
                                    <div className="group relative">
                                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
                                        <div className="relative bg-gradient-to-br from-emerald-900/50 to-cyan-900/50 backdrop-blur-sm border border-emerald-500/30 rounded-2xl p-6 text-center hover:transform hover:scale-105 transition-all duration-300">
                                            <Activity className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                                            <div className="text-2xl font-bold text-white">{activeEvents}</div>
                                            <div className="text-emerald-300 text-sm font-medium">Active Markets</div>
                                        </div>
                                    </div>

                                    <div className="group relative">
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-violet-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
                                        <div className="relative bg-gradient-to-br from-blue-900/50 to-violet-900/50 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-6 text-center hover:transform hover:scale-105 transition-all duration-300">
                                            <Users className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                                            <div className="text-2xl font-bold text-white">{totalTraders.toLocaleString()}</div>
                                            <div className="text-blue-300 text-sm font-medium">Active Traders</div>
                                        </div>
                                    </div>

                                    <div className="group relative">
                                        <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-pink-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
                                        <div className="relative bg-gradient-to-br from-violet-900/50 to-pink-900/50 backdrop-blur-sm border border-violet-500/30 rounded-2xl p-6 text-center hover:transform hover:scale-105 transition-all duration-300">
                                            <TrendingUp className="w-8 h-8 text-violet-400 mx-auto mb-3" />
                                            <div className="text-2xl font-bold text-white">24/7</div>
                                            <div className="text-violet-300 text-sm font-medium">Live Trading</div>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Search and Filter Bar */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5, duration: 0.6 }}
                                    className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 mb-12 shadow-2xl"
                                >
                                    <div className="flex flex-col md:flex-row gap-4 items-center">
                                        <div className="relative flex-1 max-w-md">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                placeholder="Search markets..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="pl-10 bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 rounded-lg h-12"
                                            />
                                        </div>
                                        <Button className="bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white border-0 px-6 h-12">
                                            <Filter className="w-4 h-4 mr-2" />
                                            Filters
                                        </Button>
                                    </div>
                                </motion.div>
                            </div>
                        </div>

                        {/* Events Grid */}
                        <div className="px-8 pb-16">
                            <div className="max-w-7xl mx-auto">
                                {isLoading ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {[...Array(6)].map((_, i) => (
                                            <div key={i} className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/30 rounded-2xl p-6 animate-pulse">
                                                <div className="h-6 bg-slate-700/50 rounded mb-4"></div>
                                                <div className="h-4 bg-slate-700/50 rounded mb-2"></div>
                                                <div className="h-4 bg-slate-700/50 rounded w-2/3 mb-6"></div>
                                                <div className="flex gap-3">
                                                    <div className="h-10 bg-slate-700/50 rounded flex-1"></div>
                                                    <div className="h-10 bg-slate-700/50 rounded flex-1"></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : filteredEvents.length > 0 ? (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.7, duration: 0.6 }}
                                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                                    >
                                        {filteredEvents.map((event, index) => (
                                            <motion.div
                                                key={event.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.8 + (index * 0.1), duration: 0.6 }}
                                            >
                                                <EventCard
                                                    event={event}
                                                    liveYesPrice={eventPrices.get(event.id)?.yesPrice ?? event.initialYesPrice}
                                                    liveNoPrice={eventPrices.get(event.id)?.noPrice ?? event.initialNoPrice}
                                                />
                                            </motion.div>
                                        ))}
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-center py-20"
                                    >
                                        <Timer className="w-16 h-16 mx-auto mb-6 text-slate-600" />
                                        <h3 className="text-2xl font-bold text-white mb-4">No markets found</h3>
                                        <p className="text-slate-400 text-lg">
                                            {searchTerm ? "Try adjusting your search terms" : "New markets will appear here soon"}
                                        </p>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </AuthenticatedLayout>
        </AuthGuard>
    );
}

export default Page;