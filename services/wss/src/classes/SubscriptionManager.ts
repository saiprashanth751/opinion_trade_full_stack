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

import { createClient, RedisClientType } from "redis"
import { UserManager } from "./UserManager";

export class SubscriptionManager {
    private static instance: SubscriptionManager;
    private subscriptions: Map<string, string[]> = new Map();
    private reverseSubscriptions: Map<string, string[]> = new Map();
    private redisClient: RedisClientType;

    private constructor() {
        this.redisClient = createClient();
        this.redisClient.connect();
    }

    public static getInstance() {
        if(!this.instance){
            this.instance = new SubscriptionManager();
        }
        return this.instance;
    }

    subscribe(userId: string, subscription: string) {
        if(this.subscriptions.get(userId)?.includes(subscription)) {
            return;
        }
        const newSubscription = (this.subscriptions.get(userId) || []).concat(subscription);
        this.subscriptions.set(userId, newSubscription);

        const newReverseSubscription = (this.reverseSubscriptions.get(subscription) || []).concat(userId);
        this.reverseSubscriptions.set(subscription, newReverseSubscription);

        if(this.reverseSubscriptions.get(subscription)?.length === 1) {
            this.redisClient.subscribe(subscription, this.redisCallbackHandler)
        }
    }

    private redisCallbackHandler = (message: string, channel: string) => {
        const parsedMessage = JSON.parse(message);
        this.reverseSubscriptions.get(channel)?.forEach((subscriber) => {
            const user = UserManager.getInstance().getUser(subscriber);
            if (user) {
                user.emitMessage(parsedMessage);
            }
        })
    }

    unsubscribe(userId: string, subscription: string) {
        const subscriptions = this.subscriptions.get(userId);
        if(subscriptions) {
            this.subscriptions.set(userId, subscriptions.filter((s) => s !== subscription));
        }

        const reverseSubscriptions = this.reverseSubscriptions.get(subscription);
        if(reverseSubscriptions) {
            this.reverseSubscriptions.set(subscription, reverseSubscriptions.filter((s) => s !== userId));
            
            if(this.reverseSubscriptions.get(subscription)?.length === 0) {
                this.reverseSubscriptions.delete(subscription);
                this.redisClient.unsubscribe(subscription);
            }
        }
    }

    public userLeft(userId: string) {
        console.log("User Left: " + userId);
        this.subscriptions.get(userId)?.forEach((s) => this.unsubscribe(userId, s));
    }

    getSubscriptions(userId: string) {
        return this.subscriptions.get(userId) || [];
    }
    
}
