import { createClient, RedisClientType } from "redis";
import { logger } from "@trade/logger";

export class SubscribeManager {
    private client: RedisClientType;
    private static instance: SubscribeManager;
    private isConnected: boolean = false;

    constructor() {
         const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

        this.client = createClient({url : redisUrl});

        this.client.on('error', (err) => {
            logger.error('SUBSCRIBE_MANAGER | Redis Client Error:', err);
            this.isConnected = false;
        });
        this.client.on('connect', () => {
            this.isConnected = true;
            logger.info(`SUBSCRIBE_MANAGER | Redis client connected successfully to ${redisUrl}!`);
        });
        this.client.on('end', () => {
            this.isConnected = false;
            logger.warn('SUBSCRIBE_MANAGER | Redis client connection ended.');
        });
        this.client.on('reconnecting', () => logger.info('SUBSCRIBE_MANAGER | Redis client reconnecting...'));

        this.ensureConnected().catch(err => {
            logger.error('SUBSCRIBE_MANAGER | Initial connection attempt failed:', err);
        });

        // this.client.connect();
    }

    public static getInstance(){
        if(!this.instance){
            this.instance = new SubscribeManager();
        }
        return this.instance;
    }

    //  The redis library defines the order and names of the arguments it passes to its callback: the first argument is the message content, and the second is the channel name.
    public async ensureConnected() {
        if (this.client.isReady) {
            logger.info('SUBSCRIBE_MANAGER | Client already connected or connecting. Skipping new connection attempt.');
            this.isConnected = this.client.isReady;
            return;
        }

        try {
            logger.info('SUBSCRIBE_MANAGER | Attempting to connect Redis client...');
            await this.client.connect();
        } catch (error) {
            logger.error('SUBSCRIBE_MANAGER | Failed to connect to Redis during ensureConnected:', error);
            this.isConnected = false;
            throw error;
        }
    }

    public subscribeToChannel(
        channel: string,
        callback: (event: string, message: string) => void
    ) {
        this.client.subscribe(channel, (message: string, channel: string) => {
            callback(channel, message);
        });
    }

    public unsubscribeFromChannel(channel: string){
        this.client.unsubscribe(channel);
    }

}

