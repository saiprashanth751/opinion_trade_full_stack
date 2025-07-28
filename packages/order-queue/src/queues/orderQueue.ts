import { RedisManager } from "../classes/RedisManager";
import { logger } from "@trade/logger"

let redisManager = RedisManager.getInstance();

const QUEUE_NAME = "ORDER_QUEUE";

export const addToOrderQueue  = async (order: object) => {
    try {
        await redisManager.ensureConnected();
        const redisClient = redisManager.getClient();

        await redisClient.lPush(QUEUE_NAME, JSON.stringify(order));
        logger.info(`Order successfully added to queue:  ${JSON.stringify(order)}`);
    }catch(err){
        if(err instanceof Error){
            logger.error(`Error adding to the order queue: ${err.message}`);
        }
    }
}

// export const processOrderQueue = async () => {
//     while(true){
//         try {
//             const order = await redisClient.lPop(QUEUE_NAME);

//             let orderObj: MessageFromApi | null = null;
//             if(order){
//                 orderObj = JSON.parse(order);
//             }

//             const userId = (orderObj?.type == CREATE_ORDER)  ? orderObj?.data.userId : null;

//             if(!userId){
//                 logger.error(`Error processing order: userId not found`);
//             }
//         }catch(err){
//             if(err instanceof Error){
//                 logger.error(`Error processing order: ${err.message}`);
//             }
//         }
//     }
// }