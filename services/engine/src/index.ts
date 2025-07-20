// Need to recheck the whole engine and its dependents.
//Test Cases
import { RedisManager } from "@trade/order-queue";
import { Engine } from "./trade/Engine";
import { MessageFromApi } from "@trade/types";
import { Orderbook } from "./trade/Orderbook";

async function main (){

    const engine = new Engine();
    const redis = new RedisManager();
    const redisClient = redis.getClient();

    console.log("Connected to Redis");

    while(true) {
        const response = await redisClient.rPop("ORDER_QUEUE");
        //wait if there is nothing...
        //concept: fallback rPop should block until data is available...
        if(!response) {
            await new Promise(resolve => setTimeout(resolve, 100));
            continue;
        }

        const parsedQueueItem:{clientId: string, message: MessageFromApi} = JSON.parse(response);
        const clientId = parsedQueueItem.clientId;
        const message = parsedQueueItem.message;

        engine.processOrders({
            clientId,
            message
        })
    }
}

main();

export { Engine, Orderbook};