import { RedisManager } from "@trade/order-queue";
import { Engine } from "./trade/Engine";
import { MessageFromApi } from "@trade/types";
import { logger } from "@trade/logger";
import { EventSummary, EventSummaryMessage } from "./types/index"
// import { Orderbook } from "./trade/Orderbook";

async function main() {
    const engine = new Engine();
    const redis = RedisManager.getInstance();
    const redisClient = redis.getClient();

    // Ensure Redis client is connected before proceeding
    await redis.ensureConnected();
    logger.info("ENGINE_SERVICE | Connected to Redis");

    setInterval(() => {
        const allEventSummaries = engine.getAllEventOrderbooks();
        const eventSummaries:EventSummary[] = [];

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

    while (true) {
        try {
            // Use BRPOP with 1 second timeout instead of RPOP
            const response = await redisClient.brPop("ORDER_QUEUE", 1);
            
            if (!response) {
                // No message received within timeout period
                continue;
            }

            // BRPOP returns { key: 'ORDER_QUEUE', element: 'message' }
            const message = response.element;
            logger.info(`ENGINE_SERVICE | Popped from ORDER_QUEUE: ${message}`);

            const parsedQueueItem: { clientId: string; message: MessageFromApi } = JSON.parse(message);
            const { clientId } = parsedQueueItem;
            
            logger.info(`ENGINE_SERVICE | Processing message for client ${clientId}: ${JSON.stringify(parsedQueueItem.message)}`);
            await engine.processOrders({
                clientId,
                message: parsedQueueItem.message
            });
        } catch (error) {
            logger.error(`ENGINE_SERVICE | Error processing message: ${error}`);
            // Add a small delay before retrying after error
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
}

main();

export { Engine};