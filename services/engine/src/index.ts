// services/engine/src/index.ts
import { RedisManager } from "@trade/order-queue";
import { Engine } from "./trade/Engine";
import { MessageFromApi } from "@trade/types";
import { logger } from "@trade/logger";
import { EventSummary, EventSummaryMessage } from "./types/index"

async function main() {
    const engine = new Engine();
    const redis = RedisManager.getInstance();
    const redisClient = redis.getClient();

    // Ensure Redis client is connected before proceeding
    await redis.ensureConnected();
    logger.info("ENGINE_SERVICE | Connected to Redis");
    console.log("ENGINE_SERVICE | Redis connection established, starting main loop");

    // Event summaries interval
    setInterval(() => {
        const allEventSummaries = engine.getAllEventOrderbooks();
        const eventSummaries: EventSummary[] = [];

        for(const [eventId, orderbooks] of allEventSummaries.entries()){
            const yesPrice = orderbooks.yes.getMarketPrice();
            const noPrice = orderbooks.no.getMarketPrice();
            eventSummaries.push({eventId, yesPrice, noPrice});
        }

        const message: EventSummaryMessage = {
            type: "EVENT_SUMMARY",
            payload: {
                events: eventSummaries,
            }
        };

        redis.publishMessage("event_summaries", message);
    }, 2000);

    console.log("ENGINE_SERVICE | Starting to listen for messages on ORDER_QUEUE...");
    
    while (true) {
        try {
            // Check current queue length for debugging
            const queueLength = await redisClient.lLen("ORDER_QUEUE");
            if (queueLength > 0) {
                console.log(`ENGINE_SERVICE | ORDER_QUEUE has ${queueLength} messages waiting`);
            }

            // Use BRPOP with 1 second timeout instead of RPOP
            const response = await redisClient.brPop("ORDER_QUEUE", 1);
            
            if (!response) {
                // No message received within timeout period - this is normal
                continue;
            }

            // BRPOP returns { key: 'ORDER_QUEUE', element: 'message' }
            const message = response.element;
            console.log(`ENGINE_SERVICE | Received message from ORDER_QUEUE:`, message);
            logger.info(`ENGINE_SERVICE | Popped from ORDER_QUEUE: ${message}`);

            try {
                const parsedQueueItem: { clientId: string; message: MessageFromApi } = JSON.parse(message);
                const { clientId } = parsedQueueItem;
                
                console.log(`ENGINE_SERVICE | Parsed queue item - ClientId: ${clientId}, MessageType: ${parsedQueueItem.message.type}`);
                logger.info(`ENGINE_SERVICE | Processing message for client ${clientId}: ${JSON.stringify(parsedQueueItem.message)}`);
                
                await engine.processOrders({
                    clientId,
                    message: parsedQueueItem.message
                });
                
                console.log(`ENGINE_SERVICE | Successfully processed ${parsedQueueItem.message.type} for client ${clientId}`);
            } catch (parseError) {
                console.error(`ENGINE_SERVICE | Failed to parse queue message:`, parseError);
                logger.error(`ENGINE_SERVICE | Failed to parse queue message: ${message}`, parseError);
            }
        } catch (error) {
            console.error(`ENGINE_SERVICE | Error in main loop:`, error);
            logger.error(`ENGINE_SERVICE | Error processing message: ${error}`);
            // Add a small delay before retrying after error
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
}

main().catch((error) => {
    console.error("ENGINE_SERVICE | Fatal error in main:", error);
    process.exit(1);
});

export { Engine };