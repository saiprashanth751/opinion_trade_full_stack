/* 
reference: opinix repo.
need to go through....completely new concept...

*** implemented concepts ***
1. subscribe
2. unsubscribe
3. start listening
4. stop listening

subscriptions = {
    "user1": ["channel1", "channel2"],
    "user2": ["channel1", "channel3"]
}

reverseSubscriptions = {
    "channel1": ["user1", "user2"],
    "channel2": ["user1"],
    "channel3": ["user2"]
}


by adding reverseSubscriptions, we are making the subscribe and unsubscribe process faster
*/

// import { createClient, RedisClientType } from "redis"
import { UserManager } from "./UserManager";
import { logger } from "@trade/logger"
import dotenv from "dotenv"
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
    // private redisClient: RedisClientType;
    private centralizedSubscribeManager: SubscribeManager;
    private eventDataCache: Map<string, EventCache> = new Map();

    private constructor() {
        dotenv.config();

        //trying to centralize pub/sub...
        this.centralizedSubscribeManager = SubscribeManager.getInstance();

        // const redisUrl = process.env.REDIS_URI || "redis://localhost:6379";
        // this.redisClient = createClient({ url: redisUrl });
        // this.redisClient.connect().catch(err => {
        //     logger.error(`SubscriptionManager | Failed to connect to Redis: ${err}`);
        // });

        // this.redisClient.on("error", (err) => {
        //     logger.error(`SubscriptionManager | Redis Client Error: ${err}`);
        // })

        // this.redisClient.on("connect", () => {
        //     logger.info(`SubscriptionManager | Redis Client connected successfully to : ${redisUrl}`);
        // })

        // this.redisClient.on("end", () => {
        //     logger.warn(`SubscriptionManager | Redis client connection ended.`);
        // })

        // this.redisClient.on("reconnecting", () => {
        //     logger.info("SubscriptionManager | Redis client reconnecting...")
        // })
        this.centralizedSubscribeManager.subscribeToChannel("event_summaries", this.redisCallbackHandler.bind(this))
            .then(() => logger.info("SubscriptionManager | Subscribed to global 'event_summaries' channel."))
            .catch(error => logger.error(`SubscriptionManager | Failed to subscribe to 'event_summaries': ${error}`));
    }

    public static getInstance() {
        if (!this.instance) {
            this.instance = new SubscriptionManager();
        }
        return this.instance;
    }
    //using 'any' for message type for now, can be refined
    public publishToChannel(channel: string, message: any) { 
        this.reverseSubscriptions.get(channel)?.forEach((subscriber) => {
            const user = UserManager.getInstance().getUser(subscriber);
            if (user) {
                user.emitMessage(message);
            }
        });
    }

    public async subscribe(userId: string, subscription: string) {
        if (this.subscriptions.get(userId)?.includes(subscription)) {
            if (userId === subscription) {
                this.sendCachedDataToUser(userId, subscription);
            }
            return;
        }
        const newSubscription = (this.subscriptions.get(userId) || []).concat(subscription);
        this.subscriptions.set(userId, newSubscription);

        const newReverseSubscription = (this.reverseSubscriptions.get(subscription) || []).concat(userId);
        this.reverseSubscriptions.set(subscription, newReverseSubscription);

        if (this.reverseSubscriptions.get(subscription)?.length === 1) {
            await this.centralizedSubscribeManager.subscribeToChannel(subscription, this.redisCallbackHandler.bind(this))
            logger.info(`SubscriptionManager | Subscribed to Redis channel: ${subscription}`);
        }
        logger.info(`SubscriptionManager | User ${userId} subscribed to ${subscription}`);

        if (userId === subscription) {
            this.sendCachedDataToUser(userId, subscription);
        }
    }

    private redisCallbackHandler = (message: string, channel: string) => {
        try {
            const parsedMessage = JSON.parse(message);

            const user = UserManager.getInstance().getUser(channel);
             if (user) {
                user.emitMessage(parsedMessage);
                logger.info(`SubscriptionManager | Sent direct message to user ${channel}`);
                return; 
            }

            if (channel === "event_summaries") {
                // Ensure it's an EventSummaryMessage type
                if (parsedMessage.type === "EVENT_SUMMARY") {
                    // Broadcast to all users who might be interested in global summaries
                    // (e.g., the /events page)
                    UserManager.getInstance().broadcastMessage(parsedMessage as EventSummaryMessage);
                    logger.info(`SubscriptionManager | Broadcasted event summaries.`);
                }
                return; // Message handled
            }

            // Update cache based on message type
            if (channel.startsWith("depth@")) {
                const eventId = channel.split('@')[1]?.split('-')[0];
                const outcome = channel.split('-')[1];
                if (eventId && outcome) {
                    const depthData = (parsedMessage as DepthUpdateMessage).data;
                    let cachedEvent = this.eventDataCache.get(eventId) || { yesBids: [], yesAsks: [], noBids: [], noAsks: [], trades: [], yesPrice: 0, noPrice: 0 };

                    if (outcome === 'yes') {
                        cachedEvent.yesBids = depthData.b || [];
                        cachedEvent.yesAsks = depthData.a || [];
                        // Update yesPrice based on current depth
                        //fixed type issues.. is it efficient??.. recheck..
                        if (
                            cachedEvent.yesBids.length > 0 &&
                            cachedEvent.yesAsks.length > 0 &&
                            cachedEvent.yesBids[0] !== undefined &&
                            cachedEvent.yesAsks[0] !== undefined &&
                            cachedEvent.yesBids[0][0] !== undefined &&
                            cachedEvent.yesAsks[0][0] !== undefined
                        ) {
                            cachedEvent.yesPrice = (parseFloat(cachedEvent.yesBids[0][0]) + parseFloat(cachedEvent.yesAsks[0][0])) / 2;
                        } else if (
                            cachedEvent.yesBids.length > 0 &&
                            cachedEvent.yesBids[0] !== undefined &&
                            cachedEvent.yesBids[0][0] !== undefined
                        ) {
                            cachedEvent.yesPrice = parseFloat(cachedEvent.yesBids[0][0]);
                        } else if (
                            cachedEvent.yesAsks.length > 0 &&
                            cachedEvent.yesAsks[0] !== undefined &&
                            cachedEvent.yesAsks[0][0] !== undefined
                        ) {
                            cachedEvent.yesPrice = parseFloat(cachedEvent.yesAsks[0][0]);
                        }
                    } else if (outcome === 'no') {
                        cachedEvent.noBids = depthData.b || [];
                        cachedEvent.noAsks = depthData.a || [];
                        // Update noPrice based on current depth
                        if (
                            cachedEvent.noBids.length > 0 &&
                            cachedEvent.noAsks.length > 0 &&
                            cachedEvent.noBids[0] !== undefined &&
                            cachedEvent.noAsks[0] !== undefined &&
                            cachedEvent.noBids[0][0] !== undefined &&
                            cachedEvent.noAsks[0][0] !== undefined
                        ) {
                            cachedEvent.noPrice = (parseFloat(cachedEvent.noBids[0][0]) + parseFloat(cachedEvent.noAsks[0][0])) / 2;
                        } else if (
                            cachedEvent.noBids.length > 0 &&
                            cachedEvent.noBids[0] !== undefined &&
                            cachedEvent.noBids[0][0] !== undefined
                        ) {
                            cachedEvent.noPrice = parseFloat(cachedEvent.noBids[0][0]);
                        } else if (
                            cachedEvent.noAsks.length > 0 &&
                            cachedEvent.noAsks[0] !== undefined &&
                            cachedEvent.noAsks[0][0] !== undefined
                        ) {
                            cachedEvent.noPrice = parseFloat(cachedEvent.noAsks[0][0]);
                        }
                    }
                    this.eventDataCache.set(eventId, cachedEvent);
                }
            } else if (channel.startsWith("trade@")) {
                const eventId = channel.split('@')[1]?.split('-')[0];
                if (eventId) {
                    const tradeData = (parsedMessage as TradeAddedMessage).data;
                    let cachedEvent = this.eventDataCache.get(eventId) || { yesBids: [], yesAsks: [], noBids: [], noAsks: [], trades: [], yesPrice: 0, noPrice: 0 };
                    cachedEvent.trades = [tradeData, ...cachedEvent.trades.slice(0, 99)]; // Keep last 100 trades
                    this.eventDataCache.set(eventId, cachedEvent);
                }
            }

            // Emit message to all subscribed users for this channel
            this.reverseSubscriptions.get(channel)?.forEach((subscriber) => {
                const user = UserManager.getInstance().getUser(subscriber);
                if (user) {
                    user.emitMessage(parsedMessage);
                }
            })
        } catch (error) {
            logger.error(`SubscriptionManager | Error parsing or processing Redis message from channel ${channel}: ${error}`);
        }
    }

    // private sendCachedDataToUser(userId: string, subscription: string) {
    //     const user = UserManager.getInstance().getUser(userId);
    //     if (!user) return;

    //     const eventId = subscription.split('@')[1]?.split('-')[0];
    //     if (!eventId) return;

    //     const cachedEvent = this.eventDataCache.get(eventId);

    //     if (cachedEvent) {
    //         const snapshotMessage: MessageToApi = {
    //             type: "ORDERBOOK_SNAPSHOT",
    //             payload: {
    //                 eventId: eventId,
    //                 yesBids: cachedEvent.yesBids,
    //                 yesAsks: cachedEvent.yesAsks,
    //                 noBids: cachedEvent.noBids,
    //                 noAsks: cachedEvent.noAsks,
    //                 trades: cachedEvent.trades,
    //                 yesPrice: cachedEvent.yesPrice,
    //                 noPrice: cachedEvent.noPrice,
    //             }
    //         };
    //         //chagned the types but do not know whether it is efficient or not..recheck
    //         user.emitMessage(snapshotMessage);
    //         logger.info(`SubscriptionManager | Sent cached snapshot to user ${userId} for event ${eventId}`);
    //     }
    // }

     private sendCachedDataToUser(userId: string, subscription: string) {
        const user = UserManager.getInstance().getUser(userId);
        if (!user) return;

        const eventId = subscription.split('@')[1]?.split('-')[0]; // Extract eventId if it's a stream channel
        if (eventId) { // This means it's a depth or trade channel
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
        // For clientId channels, there's no "cached data" to send from here.
        // The engine sends the direct response.
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
        logger.info(`SubscriptionManager | User ${userId} unsubscribed from ${subscription}`)
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

