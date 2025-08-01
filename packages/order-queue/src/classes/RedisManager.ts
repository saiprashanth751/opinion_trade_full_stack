// packages/order-queue/src/classes/RedisManager.ts
import { RedisClientType, createClient } from "redis"
import { DbMessage, MessageToApi, WsMessage } from "@trade/types"
import { logger } from "@trade/logger";
import dotenv from "dotenv"; // Import dotenv

export class RedisManager {
    private client: RedisClientType;
    private static instance: RedisManager;
    private isConnected: boolean = false;

    private constructor() {
        dotenv.config(); // Load environment variables when RedisManager is instantiated
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'; // Use REDIS_URL
        this.client = createClient({ url: redisUrl }); // Pass the URL to createClient [1], [3], [4], [7]

        this.client.on('error', (err) => {
            logger.error('REDIS_MANAGER | Redis Client Error:', err);
            this.isConnected = false;
        });
        this.client.on('connect', () => {
            this.isConnected = true;
            logger.info(`REDIS_MANAGER | Redis client connected successfully to ${redisUrl}!`); // Log the URL
        });
        this.client.on('end', () => {
            this.isConnected = false;
            logger.warn('REDIS_MANAGER | Redis client connection ended.');
        });
        this.client.on('reconnecting', () => logger.info('REDIS_MANAGER | Redis client reconnecting...'));
    }

    public static getInstance() {
        if (!this.instance) {
            this.instance = new RedisManager;
        }
        return this.instance;
    }

    public async ensureConnected() {
        if (this.client.isReady) {
            logger.info('REDIS_MANAGER | Client already connected or connecting. Skipping new connection attempt.');
            this.isConnected = this.client.isReady;
            return;
        }

        try {
            logger.info('REDIS_MANAGER | Attempting to connect Redis client...');
            await this.client.connect();
        } catch (error) {
            logger.error('REDIS_MANAGER | Failed to connect to Redis during ensureConnected:', error);
            this.isConnected = false;
            throw error;
        }
    }

    public getClient(): RedisClientType {
        return this.client;
    }

    public pushMessage(message: DbMessage) {
        this.client.lPush("db_processor", JSON.stringify(message));
    }

    public publishMessage(channel: string, message: WsMessage) {
        this.client.publish(channel, JSON.stringify(message))
    }

    // Add this enhanced sendToApi method to your RedisManager class

public sendToApi(clientId: string, message: MessageToApi) {
    try {
        console.log(`REDIS_MANAGER | Publishing to client channel: ${clientId}`);
        console.log(`REDIS_MANAGER | Message type: ${message.type}`);
        console.log(`REDIS_MANAGER | Message payload:`, JSON.stringify(message.payload));
        
        const messageString = JSON.stringify(message);
        console.log(`REDIS_MANAGER | Full message string:`, messageString);
        
        this.client.publish(clientId, messageString).then((result) => {
            console.log(`REDIS_MANAGER | Publish result for ${clientId}: ${result} subscribers received the message`);
            if (result === 0) {
                console.warn(`REDIS_MANAGER | WARNING: No subscribers listening to channel ${clientId}`);
            }
        }).catch((error) => {
            console.error(`REDIS_MANAGER | Error publishing to ${clientId}:`, error);
        });
        
    } catch (error) {
        console.error(`REDIS_MANAGER | Error in sendToApi for client ${clientId}:`, error);
    }
}
}
