// packages/order-queue/src/index.ts (or wherever addToOrderQueue is defined)
import { RedisManager } from "./classes/RedisManager";
import { SubscribeManager } from "./classes/SubscriberManager"
import { MessageFromApi } from "@trade/types";
import { logger } from "@trade/logger";

export async function addToOrderQueue(data: { clientId: string; message: MessageFromApi }) {
    try {
        console.log("ORDER_QUEUE | Adding to queue:", JSON.stringify(data));
        logger.info(`ORDER_QUEUE | Adding message to queue - ClientId: ${data.clientId}, MessageType: ${data.message.type}`);
        
        const redis = RedisManager.getInstance();
        await redis.ensureConnected();
        
        const redisClient = redis.getClient();
        
        // Push to the ORDER_QUEUE that the engine is listening to
        await redisClient.lPush("ORDER_QUEUE", JSON.stringify(data));
        
        console.log("ORDER_QUEUE | Successfully added to queue");
        logger.info(`ORDER_QUEUE | Successfully added ${data.message.type} message to ORDER_QUEUE`);
        
        return true;
    } catch (error) {
        console.error("ORDER_QUEUE | Failed to add to queue:", error);
        logger.error("ORDER_QUEUE | Failed to add to queue:", error);
        throw error;
    }
}

// Re-export other functions
export {RedisManager, SubscribeManager};