import { createClient, RedisClientType } from "redis";


export class SubscribeManager {
    private client: RedisClientType;
    private static instance: SubscribeManager;

    constructor() {
        this.client = createClient();
        this.client.connect();
    }

    public static getInstance(){
        if(!this.instance){
            this.instance = new SubscribeManager();
        }
        return this.instance;
    }

    //  The redis library defines the order and names of the arguments it passes to its callback: the first argument is the message content, and the second is the channel name.

    public subscribeToChannel(
        channel: string,
        callback: (event: string, message: string) => void
    ) {
        this.client.subscribe(channel, (message: string, channel: string) => {
            callback(channel, message);
        });
    }

    public unsubscribeFromChannel(channel: string){
        this.client.unsubscribe(channel);
    }

}

