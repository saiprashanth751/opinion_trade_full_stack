// services/wss/src/classes/SubscriptionManager.ts
import { UserManager } from "./UserManager";
import { logger } from "@trade/logger";
import dotenv from "dotenv";
import { DepthUpdateMessage, TradeAddedMessage, ORDERBOOK_SNAPSHOT, MessageToApi, EventSummaryMessage } from "@trade/types";
import { SubscribeManager } from "@trade/order-queue";

interface EventCache {
    yesBids: [string, string][];
    yesAsks: [string, string][];
    noBids: [string, string][];
    noAsks: [string, string][];
    trades: TradeAddedMessage['data'][];
    yesPrice: number;
    noPrice: number;
}

export class SubscriptionManager {
    private static instance: SubscriptionManager;
    private subscriptions: Map<string, string[]> = new Map();
    private reverseSubscriptions: Map<string, string[]> = new Map();
    private centralizedSubscribeManager: SubscribeManager;
    private eventDataCache: Map<string, EventCache> = new Map();
    private initialized = false;

    private constructor() {
        dotenv.config();
        this.centralizedSubscribeManager = SubscribeManager.getInstance();
        this.initializeAsync();
    }

    private async initializeAsync() {
        try {
            await this.centralizedSubscribeManager.ensureConnected();
            
            // Subscribe to event summaries channel
            this.centralizedSubscribeManager.subscribeToChannel("event_summaries", (message, channel) => {
                this.handleEventSummariesMessage(message);
            });
            
            this.initialized = true;
            logger.info("SubscriptionManager | Initialized successfully and subscribed to event_summaries");
        } catch (error) {
            logger.error("SubscriptionManager | Failed to initialize:", error);
        }
    }

    private handleEventSummariesMessage(message: string) {
        try {
            const parsedMessage: EventSummaryMessage = JSON.parse(message);
            if (parsedMessage.type === "EVENT_SUMMARY") {
                console.log("Broadcasting event summaries to subscribed users");
                // Send to users subscribed to event_summaries
                this.reverseSubscriptions.get("event_summaries")?.forEach((subscriberId) => {
                    const user = UserManager.getInstance().getUser(subscriberId);
                    if (user) {
                        user.emitMessage(parsedMessage);
                    }
                });
            }
        } catch (error) {
            logger.error("SubscriptionManager | Error parsing event summaries message:", error);
        }
    }

    public static getInstance() {
        if (!this.instance) {
            this.instance = new SubscriptionManager();
        }
        return this.instance;
    }

    public publishToChannel(channel: string, message: any) {
        this.reverseSubscriptions.get(channel)?.forEach((subscriber) => {
            const user = UserManager.getInstance().getUser(subscriber);
            if (user) {
                user.emitMessage(message);
            }
        });
    }

    public async subscribe(userId: string, subscription: string) {
        console.log(`SubscriptionManager | User ${userId} subscribing to ${subscription}`);
        
        if (this.subscriptions.get(userId)?.includes(subscription)) {
            this.sendCachedDataToUser(userId, subscription);
            return;
        }
        
        const newSubscription = (this.subscriptions.get(userId) || []).concat(subscription);
        this.subscriptions.set(userId, newSubscription);

        const newReverseSubscription = (this.reverseSubscriptions.get(subscription) || []).concat(userId);
        this.reverseSubscriptions.set(subscription, newReverseSubscription);

        // Only subscribe to Redis if this is the first user for this channel
        if (this.reverseSubscriptions.get(subscription)?.length === 1) {
            try {
                await this.centralizedSubscribeManager.ensureConnected();
                this.centralizedSubscribeManager.subscribeToChannel(subscription, (message, channel) => {
                    this.redisCallbackHandler(message, channel);
                });
                logger.info(`SubscriptionManager | Subscribed to Redis channel: ${subscription}`);
            } catch (error) {
                logger.error(`SubscriptionManager | Failed to subscribe to Redis channel ${subscription}:`, error);
            }
        }
        
        logger.info(`SubscriptionManager | User ${userId} subscribed to ${subscription}`);
        this.sendCachedDataToUser(userId, subscription);
    }

    private redisCallbackHandler = (message: string, channel: string) => {
        try {
            const parsedMessage = JSON.parse(message);
            console.log(`SubscriptionManager | Received message from channel ${channel}:`, parsedMessage.type || 'unknown type');

            // Handle depth updates
            if (channel.startsWith("depth@")) {
                this.handleDepthUpdate(channel, parsedMessage as DepthUpdateMessage);
            } 
            // Handle trade updates
            else if (channel.startsWith("trade@")) {
                this.handleTradeUpdate(channel, parsedMessage as TradeAddedMessage);
            }
            // Handle client-specific API responses (like OPEN_ORDERS)
            else {
                console.log(`SubscriptionManager | Received API response on channel ${channel}:`, parsedMessage);
                logger.info(`SubscriptionManager | Processing API response on channel ${channel}, type: ${parsedMessage.type}`);
            }

            // Send to all subscribed users for this channel
            const subscribers = this.reverseSubscriptions.get(channel);
            console.log(`SubscriptionManager | Channel ${channel} has ${subscribers?.length || 0} subscribers`);
            
            subscribers?.forEach((subscriber) => {
                const user = UserManager.getInstance().getUser(subscriber);
                if (user) {
                    console.log(`SubscriptionManager | Sending message to user ${subscriber}`);
                    user.emitMessage(parsedMessage);
                } else {
                    console.log(`SubscriptionManager | User ${subscriber} not found`);
                }
            });
        } catch (error) {
            logger.error(`SubscriptionManager | Error processing Redis message from channel ${channel}:`, error);
        }
    }

    private handleDepthUpdate(channel: string, message: DepthUpdateMessage) {
        const eventId = channel.split('@')[1]?.split('-')[0];
        const outcome = channel.split('-')[1];
        
        if (eventId && outcome) {
            const depthData = message.data;
            let cachedEvent = this.eventDataCache.get(eventId) || { 
                yesBids: [], yesAsks: [], noBids: [], noAsks: [], trades: [], yesPrice: 0, noPrice: 0 
            };

            if (outcome === 'yes') {
                cachedEvent.yesBids = depthData.b || [];
                cachedEvent.yesAsks = depthData.a || [];
                
                // Update yesPrice with proper type guards
                const yesBids = cachedEvent.yesBids;
                const yesAsks = cachedEvent.yesAsks;
                
                if (yesBids.length > 0 && yesAsks.length > 0 && yesBids[0] && yesAsks[0] && yesBids[0][0] && yesAsks[0][0]) {
                    cachedEvent.yesPrice = (parseFloat(yesBids[0][0]) + parseFloat(yesAsks[0][0])) / 2;
                } else if (yesBids.length > 0 && yesBids[0] && yesBids[0][0]) {
                    cachedEvent.yesPrice = parseFloat(yesBids[0][0]);
                } else if (yesAsks.length > 0 && yesAsks[0] && yesAsks[0][0]) {
                    cachedEvent.yesPrice = parseFloat(yesAsks[0][0]);
                }
            } else if (outcome === 'no') {
                cachedEvent.noBids = depthData.b || [];
                cachedEvent.noAsks = depthData.a || [];
                
                // Update noPrice with proper type guards
                const noBids = cachedEvent.noBids;
                const noAsks = cachedEvent.noAsks;
                
                if (noBids.length > 0 && noAsks.length > 0 && noBids[0] && noAsks[0] && noBids[0][0] && noAsks[0][0]) {
                    cachedEvent.noPrice = (parseFloat(noBids[0][0]) + parseFloat(noAsks[0][0])) / 2;
                } else if (noBids.length > 0 && noBids[0] && noBids[0][0]) {
                    cachedEvent.noPrice = parseFloat(noBids[0][0]);
                } else if (noAsks.length > 0 && noAsks[0] && noAsks[0][0]) {
                    cachedEvent.noPrice = parseFloat(noAsks[0][0]);
                }
            }
            this.eventDataCache.set(eventId, cachedEvent);
        }
    }

    private handleTradeUpdate(channel: string, message: TradeAddedMessage) {
        const eventId = channel.split('@')[1]?.split('-')[0];
        if (eventId) {
            const tradeData = message.data;
            let cachedEvent = this.eventDataCache.get(eventId) || { 
                yesBids: [], yesAsks: [], noBids: [], noAsks: [], trades: [], yesPrice: 0, noPrice: 0 
            };
            cachedEvent.trades = [tradeData, ...cachedEvent.trades.slice(0, 99)];
            this.eventDataCache.set(eventId, cachedEvent);
        }
    }

    private sendCachedDataToUser(userId: string, subscription: string) {
        const user = UserManager.getInstance().getUser(userId);
        if (!user) return;

        const eventId = subscription.split('@')[1]?.split('-')[0];
        if (eventId) {
            const cachedEvent = this.eventDataCache.get(eventId);
            if (cachedEvent) {
                const snapshotMessage: MessageToApi = {
                    type: "ORDERBOOK_SNAPSHOT",
                    payload: {
                        eventId: eventId,
                        yesBids: cachedEvent.yesBids,
                        yesAsks: cachedEvent.yesAsks,
                        noBids: cachedEvent.noBids,
                        noAsks: cachedEvent.noAsks,
                        trades: cachedEvent.trades,
                        yesPrice: cachedEvent.yesPrice,
                        noPrice: cachedEvent.noPrice,
                    }
                };
                user.emitMessage(snapshotMessage);
                logger.info(`SubscriptionManager | Sent cached snapshot to user ${userId} for event ${eventId}`);
            }
        }
    }

    public unsubscribe(userId: string, subscription: string) {
        const subscriptions = this.subscriptions.get(userId);
        if (subscriptions) {
            this.subscriptions.set(userId, subscriptions.filter((s) => s !== subscription));
        }

        const reverseSubscriptions = this.reverseSubscriptions.get(subscription);
        if (reverseSubscriptions) {
            this.reverseSubscriptions.set(subscription, reverseSubscriptions.filter((s) => s !== userId));

            if (this.reverseSubscriptions.get(subscription)?.length === 0) {
                this.reverseSubscriptions.delete(subscription);
                this.centralizedSubscribeManager.unsubscribeFromChannel(subscription);
                logger.info(`SubscriptionManager | Unsubscribed from Redis channel: ${subscription}`);
            }
        }
        logger.info(`SubscriptionManager | User ${userId} unsubscribed from ${subscription}`);
    }

    public userLeft(userId: string) {
        logger.info("User Left: " + userId);
        const userSubscriptions = this.subscriptions.get(userId);
        if (userSubscriptions) {
            userSubscriptions.forEach((s) => this.unsubscribe(userId, s));
        }
        this.subscriptions.delete(userId);
    }

    getSubscriptions(userId: string) {
        return this.subscriptions.get(userId) || [];
    }
}