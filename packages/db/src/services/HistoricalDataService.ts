// packages/db/src/services/HistoricalDataService.ts
import prisma from "../index";
import { logger } from "@trade/logger";

export class HistoricalDataService {
    private static instance: HistoricalDataService;

    private constructor() {}

    public static getInstance(): HistoricalDataService {
        if (!this.instance) {
            this.instance = new HistoricalDataService();
        }
        return this.instance;
    }

    /**
     * Get historical price data for charts
     */
    async getHistoricalPriceData(eventId: string, hoursBack: number = 24): Promise<Array<{timestamp: number, yesPrice: number, noPrice: number}>> {
        try {
            const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
            
            const priceHistory = await prisma.priceHistory.findMany({
                where: {
                    eventId: eventId,
                    timestamp: { gte: cutoffTime }
                },
                orderBy: { timestamp: 'asc' },
                take: 1000 // Limit to prevent memory issues
            });

            return priceHistory.map(ph => ({
                timestamp: ph.timestamp.getTime(),
                yesPrice: ph.yesPrice,
                noPrice: ph.noPrice
            }));

        } catch (error) {
            logger.error(`Failed to get historical price data for event ${eventId}:`, error);
            return [];
        }
    }

    /**
     * Get recent trades for UI display
     */
    async getRecentTradesData(eventId: string, limit: number = 50): Promise<Array<any>> {
        try {
            const recentTrades = await prisma.recentTradesCache.findMany({
                where: { eventId },
                include: {
                    trade: {
                        include: {
                            buyer: { select: { id: true, name: true } },
                            seller: { select: { id: true, name: true } }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: limit
            });

            return recentTrades.map(tradeCache => ({
                e: "trade",
                t: tradeCache.trade.tradeId,
                m: false, // Will be determined contextually
                p: tradeCache.trade.price,
                q: tradeCache.trade.quantity.toString(),
                s: eventId,
                timestamp: tradeCache.trade.timestamp,
                buyer: tradeCache.trade.buyer.name,
                seller: tradeCache.trade.seller.name
            }));

        } catch (error) {
            logger.error(`Failed to get recent trades for event ${eventId}:`, error);
            return [];
        }
    }

    /**
     * Get current market prices from latest orderbook data
     */
    async getCurrentMarketPrices(eventId: string): Promise<{yesPrice: number, noPrice: number}> {
        try {
            // Get the most recent price history entry
            const latestPrice = await prisma.priceHistory.findFirst({
                where: { eventId },
                orderBy: { timestamp: 'desc' }
            });

            if (latestPrice) {
                return {
                    yesPrice: latestPrice.yesPrice,
                    noPrice: latestPrice.noPrice
                };
            }

            // Fallback to event initial prices
            const event = await prisma.event.findUnique({
                where: { id: eventId },
                select: { initialYesPrice: true, initialNoPrice: true }
            });

            return {
                yesPrice: event?.initialYesPrice || 0,
                noPrice: event?.initialNoPrice || 0
            };

        } catch (error) {
            logger.error(`Failed to get current market prices for event ${eventId}:`, error);
            return { yesPrice: 0, noPrice: 0 };
        }
    }

    /**
     * Get multiple events' current prices (for event summaries)
     */
    async getMultipleEventPrices(eventIds: string[]): Promise<Record<string, {yesPrice: number, noPrice: number}>> {
        try {
            const prices: Record<string, {yesPrice: number, noPrice: number}> = {};

            // Get latest prices for all events in one query
            const latestPrices = await prisma.priceHistory.findMany({
                where: { 
                    eventId: { in: eventIds }
                },
                orderBy: { timestamp: 'desc' },
                distinct: ['eventId']
            });

            // Map results
            latestPrices.forEach(price => {
                prices[price.eventId] = {
                    yesPrice: price.yesPrice,
                    noPrice: price.noPrice
                };
            });

            // Fill in missing events with initial prices
            const missingEventIds = eventIds.filter(id => !prices[id]);
            if (missingEventIds.length > 0) {
                const events = await prisma.event.findMany({
                    where: { id: { in: missingEventIds } },
                    select: { id: true, initialYesPrice: true, initialNoPrice: true }
                });

                events.forEach(event => {
                    prices[event.id] = {
                        yesPrice: event.initialYesPrice,
                        noPrice: event.initialNoPrice
                    };
                });
            }

            return prices;

        } catch (error) {
            logger.error(`Failed to get multiple event prices:`, error);
            return {};
        }
    }

    /**
     * Get complete snapshot data for an event (for WebSocket initialization)
     */
    async getEventSnapshot(eventId: string): Promise<{
        historicalPrices: Array<{timestamp: number, yesPrice: number, noPrice: number}>;
        recentTrades: Array<any>;
        currentPrices: {yesPrice: number, noPrice: number};
    }> {
        try {
            const [historicalPrices, recentTrades, currentPrices] = await Promise.all([
                this.getHistoricalPriceData(eventId, 24), // Last 24 hours
                this.getRecentTradesData(eventId, 50),
                this.getCurrentMarketPrices(eventId)
            ]);

            return {
                historicalPrices,
                recentTrades,
                currentPrices
            };

        } catch (error) {
            logger.error(`Failed to get event snapshot for ${eventId}:`, error);
            return {
                historicalPrices: [],
                recentTrades: [],
                currentPrices: { yesPrice: 0, noPrice: 0 }
            };
        }
    }
}