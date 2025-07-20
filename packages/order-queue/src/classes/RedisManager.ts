import { RedisClientType, createClient } from "redis"
import { DbMessage,  MessageToApi, WsMessage} from "@trade/types"

export class RedisManager {
    // These are the variables declared with theit types!!!
    private client: RedisClientType; // client of RedisClientType
    private static instance: RedisManager; // instance of type class itself (ofcourse)

    constructor() {
        this.client = createClient();
        console.log("Redis connected!!! : Log inside Redis Manager")
        this.client.connect();
    }

    public getClient(): RedisClientType {
        return this.client;
    }

    public static getInstance() {
        if(!this.instance){
            this.instance = new RedisManager;
        }
        return this.instance;
    }

    public pushMessage(message: DbMessage){
        this.client.lPush("db_processor", JSON.stringify(message));
    }

    public publishMessage(channel: string, message: WsMessage){
        this.client.publish(channel, JSON.stringify(message))
    }

    public sendToApi(clientId: string, message: MessageToApi){
        this.client.publish(clientId, JSON.stringify(message))
    }
    
}