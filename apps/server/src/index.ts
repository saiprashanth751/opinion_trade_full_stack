import express from "express"
import { logger } from "@trade/logger"
import orderRouter from "./router/orderRouter"
import eventRouter from "./router/eventRouter"
import morgan from "morgan"

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

app.listen(3000, () => {
    logger.info("SERVER | Listening on port 3000")
});