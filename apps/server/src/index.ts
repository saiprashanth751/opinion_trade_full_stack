// apps/server/src/index.ts
import express from "express"
import { logger } from "@trade/logger"
import orderRouter from "./router/orderRouter"
import eventRouter from "./router/eventRouter"
import morgan from "morgan"
import { RedisManager } from "@trade/order-queue"; // Import RedisManager

const app = express();
const morganFormat = ":method :url :status :response-time ms";
app.use(express.json());
app.use(
    morgan(morganFormat, {
        stream: {
            write: (message) => {
                const [method, url, status, responseTime] = message.split(" ");
                const formattedLog = `${method} - ${url} - ${status} - ${responseTime?.trim()} ms`;
                logger.info(formattedLog)
            },
        },
    })
)

app.use("/api/v1/events", eventRouter);
app.use("/api/v1/order", orderRouter);


const redisManager = RedisManager.getInstance();
redisManager.ensureConnected().then(() => {
    logger.info("SERVER | Redis client connected for server service.");
    app.listen(3000, () => {
        logger.info("SERVER | Listening on port 3000")
    });
}).catch(error => {
    logger.error("SERVER | Failed to connect Redis for server service:", error);
    process.exit(1); // Exit if Redis connection fails at startup
});


// REMOVE the old app.listen() call:
// app.listen(3000, () => {
//     logger.info("SERVER | Listening on port 3000")
// });
