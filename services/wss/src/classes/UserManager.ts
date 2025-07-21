import { SubscriptionManager } from "./SubscriptionManager";
import { User } from "./User";
import { WebSocket} from "ws";

export class UserManager {
    //only instance for entire application -> singleton
    private static instance: UserManager;
    private users: Map<string, User> = new Map();

    public static getInstance() {
        if(!this.instance) {
            this.instance = new UserManager();
        }
        return this.instance;
    }

    addUser(ws: WebSocket) {
        const id = this.getRandomId();
        const user = new User(id, ws);
        this.users.set(id, user);
        this.registerOnClose(id, ws);
        return user;
    }

    public getUser(id: string) {
        return this.users.get(id);
    }

    private registerOnClose(id:string, ws:WebSocket) {
        ws.on("close", () => {
            this.users.delete(id);
            //manage user's subscription...
            SubscriptionManager.getInstance().userLeft(id);
        })
    }

    private getRandomId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
}