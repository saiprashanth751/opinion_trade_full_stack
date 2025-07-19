import { Fill, Order, Orderbook } from "./Orderbook";
import fs from "fs"
import { CREATE_ORDER, MessageFromApi, sides } from "@trade/types"
import { v4 as uuidv4 } from "uuid";
import { RedisManager } from "@trade/order-queue"

export const EXAMPLE_EVENT = "gta6-trailer-3-to-be-released-by-the-end-of-the-day";
export const CURRENCY = "INR";

//Declaring funds and asset balance interface...
interface UserBalance {
    currency: {
        available: number;
        locked: number;
    };
    assets: {
        yes: number;
        no: number;
    };
}

export class Engine {
    //balances -> funds and asset balances
    private balances: Map<string, UserBalance> = new Map();
    private orderbooks: Orderbook[] = [];

    constructor() {
        let snapshot = null;
        try {
            if (process.env.WITH_SNAPSHOT) {
                snapshot = fs.readFileSync("./snapshot.json");
            }
        } catch (error) {
            console.log("No snapshot found");
        }

        if (snapshot) {
            const parsedSnapShot = JSON.parse(snapshot.toString());
            this.orderbooks = parsedSnapShot.orderbooks.map(
                (o: any) => // either use return or do not put {}. Both methods work...
                    new Orderbook(o.bids, o.asks, o.lastTradeId, o.currentPrice, o.event)
            );
            this.balances = new Map(parsedSnapShot.balances);
        } else {
            const lastTradeId = 1;
            this.orderbooks = [new Orderbook([], [], EXAMPLE_EVENT, lastTradeId, 0)];
            this.setBaseBalances();
        }
        setInterval(() => {
            this.saveSnapshot();
        }, 1000 * 3);
    }

    saveSnapshot() {
        const toSaveSnapshot = {
            orderbooks: this.orderbooks.map((o) => o.getSnapshot()),
            balances: Array.from(this.balances.entries()),
        };

        fs.writeFileSync("./snapshot.json", JSON.stringify(toSaveSnapshot))
    }

    setBaseBalances() {
        this.balances.set("1", {
            currency: {
                available: 15,
                locked: 15,
            },
            assets: {
                yes: 0,
                no: 0
            }
        });

        this.balances.set("2", {
            currency: {
                available: 15,
                locked: 15,
            },
            assets: {
                yes: 0,
                no: 0,
            }
        })
    }

    processOrders({
        message,
        clientId
    }: {
        message: MessageFromApi;
        clientId: string;
    }) {
        console.log("message", message, " clientId", clientId);

        switch (message.type) {
            case CREATE_ORDER:
                try {
                    const { executedQty, fills, orderId } = this.createOrders(
                        message.data.market,
                        message.data.price,
                        message.data.quantity,
                        message.data.side,
                        message.data.userId
                    );

                }
        }
    }

    createOrders(
        market: string,
        price: number,
        quantity: number,
        side: string,
        userId: string
    ): {
        executedQty: number;
        fills: Fill[];
        orderId: string;
    } {
        const orderbook = this.orderbooks.find((o) => o.market === market);

        if (!orderbook) {
            throw new Error("No orderbook found");
        }

        this.checkAndLockFundsAndAssets(side, userId, price, quantity);
        const order: Order = {
            price: Number(price),
            quantity: Number(quantity),
            orderId: uuidv4(),
            filled: 0,
            side,
            userId,
        };
        const { fills, executedQty } = orderbook.addOrder(order);

        return { executedQty, fills, orderId: order.orderId }
    }

    checkAndLockFundsAndAssets(
        side: "yes" | "no",
        userId: string,
        price: number,
        quantity: number
    ) {
        if (side === "yes") {
            if ((this.balances.get(userId)?.available || 0) < quantity * price) {
                throw new Error("Insufficient balance");
            }

            //@ts-ignore
            this.balances.get(userId)?.available = this.balances.get(userId)?.available - quantity * price;

            //@ts-ignore
            this.balances.get(userId)?.locked = this.balances.get(userId)?.locked + quantity * price;
        } else {
            console.log(`user ${userId} balance`, this.balances.get(userId));

            if ((this.balances.get(userId)?.locked || 0) < Number(quantity)) {
                throw new Error("Insufficient funds");
            }

            //@ts-ignore
            this.balances.get(userId)?.available = this.balances.get(userId)?.available - Number(quantity);
            //@ts-ignore
            this.balances.get(userId)?.locked = this.balances.get(userId)?.locked + Number(quantity);
        }
    }
}