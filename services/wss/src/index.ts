import { WebSocketServer } from "ws";
import { UserManager } from "./classes/UserManager";
import dotenv from "dotenv"

dotenv.config();

const port = process.env.PORT as unknown as number;

const wss = new WebSocketServer({ port: port });

wss.on("listening", () => {
    console.log(`WebSocket server is running on port ws://localhost:${wss.options.port}`);
})

wss.on("connection", (ws) => {
    UserManager.getInstance().addUser(ws);
})