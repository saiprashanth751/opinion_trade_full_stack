import { logger } from "@trade/logger"
import { processOrderQueue } from "./queues/orderQueue.js";
import { addToOrderQueue } from "./queues/orderQueue.js";
import { RedisManager} from "./classes/RedisManager";
import { SubscribeManager } from "./classes/SubscriberManager"
import { createClient } from "redis";

const startWorker = async () => {
    logger.info("WORKER | Starting order worker");
    processOrderQueue;
}

startWorker();
export { addToOrderQueue, RedisManager, createClient, SubscribeManager};