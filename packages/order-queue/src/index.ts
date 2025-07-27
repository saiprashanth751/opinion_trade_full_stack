// packages/order-queue/src/index.ts
// import { logger } from "@trade/logger";
import { addToOrderQueue } from "./queues/orderQueue";
import { RedisManager} from "./classes/RedisManager";
import { SubscribeManager } from "./classes/SubscriberManager"

// REMOVE these lines:
// const redisManager = RedisManager.getInstance();
// redisManager.ensureConnected().then(() => {
//     logger.info("ORDER_QUEUE_INIT | Redis client for order queue is ready.");
// }).catch(error => {
//     logger.error("ORDER_QUEUE_INIT | Failed to initialize Redis client for order queue:", error);
// });

export { addToOrderQueue, RedisManager, SubscribeManager};
