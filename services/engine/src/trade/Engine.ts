import { Fill, Order, Orderbook } from "./Orderbook";
import fs from "fs"
import { CANCEL_ORDER, CREATE_ORDER, GET_DEPTH, GET_OPEN_ORDERS, MessageFromApi, ON_RAMP, ORDER_UPDATE, sides } from "@trade/types"
import { v4 as uuidv4 } from "uuid";
import { RedisManager } from "@trade/order-queue"

export const EXAMPLE_EVENT = "gta6-trailer-3-to-be-released-by-the-end-of-the-day";
export const CURRENCY = "INR";

//Declaring funds and asset balance interface...
interface UserBalance {
    available: number;
    locked: number;
    yesContracts: number;
    noContracts: number;
    lockedYesContracts: number;
    lockedNoContracts: number;
}

export class Engine {
    //balances -> funds and asset balances
    private balances: Map<string, UserBalance> = new Map();
    private marketOrderbooks: Map<string, { yes: Orderbook; no: Orderbook }> = new Map();

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
            console.log("Snapshot loading is not fully implemented for new orderbook structure.");
            this.marketOrderbooks.set(EXAMPLE_EVENT, {
                yes: new Orderbook([], [], EXAMPLE_EVENT, 1, 0),
                no: new Orderbook([], [], EXAMPLE_EVENT, 1, 0),
            });
            this.balances = new Map(parsedSnapShot.balances);
        } else {
            //Need to comeback for verification...
            this.marketOrderbooks.set(EXAMPLE_EVENT, {
                yes: new Orderbook([], [], EXAMPLE_EVENT, 1, 0),
                no: new Orderbook([], [], EXAMPLE_EVENT, 1, 0),
            });
            this.setBaseBalances();
        }
        setInterval(() => {
            this.saveSnapshot();
        }, 1000 * 3);
    }

    saveSnapshot() {
        // save the new marketOrderbooks structure
        const orderbookSnapshot = Array.from(this.marketOrderbooks.entries()).map(([market, books]) => ({
            market,
            yes: books.yes.getSnapshot(),
            no: books.no.getSnapshot(),
        }));

        const toSaveSnapshot = {
            orderbooks: orderbookSnapshot,
            balances: Array.from(this.balances.entries()),
        };

        fs.writeFileSync("./snapshot.json", JSON.stringify(toSaveSnapshot))
    }

    setBaseBalances() {
        this.balances.set("1", {
            available: 1000,
            locked: 0,
            yesContracts: 0,
            noContracts: 0,
            lockedYesContracts: 0,
            lockedNoContracts: 0
        });

        this.balances.set("2", {
            available: 1000,
            locked: 0,
            yesContracts: 0,
            noContracts: 0,
            lockedYesContracts: 0,
            lockedNoContracts: 0
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
                    const { market, price, quantity, action, outcome, userId } = message.data
                    const orderType = action === "buy" ? "bid" : "ask";

                    const { executedQty, fills, orderId } = this.createOrders(
                        market,
                        price,
                        quantity,
                        orderType,
                        outcome,
                        userId
                    );

                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "ORDER_PLACED",
                        payload: {
                            orderId,
                            executedQty,
                            fills
                        }
                    })

                    console.log("Pushed ORDER_PLACED into REDIS");
                    console.log(`usesr ${userId} : balance`, this.balances.get(userId))
                } catch (error) {
                    console.log(error);

                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "ORDER_CANCELLED",
                        payload: {
                            orderId: "",
                            executedQty: 0,
                            remainingQty: 0
                        }
                    })
                }
                break;
            case CANCEL_ORDER:
                try {
                    const orderId = message.data.orderId
                    const cancelMarket = message.data.market;
                    //Need to comeback
                    const marketBooks = this.marketOrderbooks.get(cancelMarket);

                    if (!marketBooks) {
                        throw new Error("No orderbooks found fo this market.");
                    }

                    let orderToCancel: Order | undefined;
                    let targetOrderbook: Orderbook | undefined;
                    let cancelledOrderOutcome: "yes" | "no" | undefined;

                    orderToCancel = marketBooks.yes.bids.find((o) => o.orderId === orderId) || marketBooks.yes.asks.find((o) => o.orderId === orderId);

                    if (orderToCancel) {
                        targetOrderbook = marketBooks.yes;
                        cancelledOrderOutcome = "yes";
                    } else {
                        orderToCancel = marketBooks.no.bids.find((o) => o.orderId === orderId) || marketBooks.no.asks.find((o) => o.orderId === orderId);

                        if (orderToCancel) {
                            targetOrderbook = marketBooks.no;
                            cancelledOrderOutcome = "no";
                        }
                    }

                    if (!orderToCancel || !targetOrderbook || !cancelledOrderOutcome) {
                        console.log("No order found to cancel with ID: ", orderId);
                        throw new Error("No order found to cancel");
                    }

                    let price: number | undefined;
                    if (orderToCancel.type == "bid") {
                        price = targetOrderbook.cancelBid(orderToCancel);
                        const leftQunatityAmount = (orderToCancel.quantity - orderToCancel.filled) * orderToCancel.price;

                        //Recheck
                        //@ts-ignore
                        this.balances.get(orderToCancel.userId)?.available += leftQunatityAmount;
                        //@ts-ignore
                        this.balances.get(orderToCancel.userId)?.locked -= leftQunatityAmount;
                    } else {
                        price = targetOrderbook.cancelAsk(orderToCancel);

                        const leftQunatity = orderToCancel.quantity - orderToCancel.filled;

                        if (cancelledOrderOutcome === "yes") {
                            //@ts-ignore
                            this.balances.get(orderToCancel.userId)?.yesContracts += leftQunatity;
                            //@ts-ignore
                            this.balances.get(orderToCancel.userId)?.lockedYesContracts -= leftQunatity;
                        } else {
                            //@ts-ignore
                            this.balances.get(orderToCancel.userId)?.noContracts += leftQunatity
                        }
                        //@ts-ignore
                        this.balances.get(orderToCancel.userId)?.noContracts -= leftQunatity
                    }

                    if (price) {
                        this.sendUpdatedDepthAt(price.toString(), cancelMarket, cancelledOrderOutcome)
                    }

                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "ORDER_CANCELLED",
                        payload: {
                            orderId,
                            // Need to recheck
                            executedQty: 0,
                            remainingQty: 0,
                        }
                    })
                } catch (error) {
                    console.log("Error while cancelling order: ", error);
                }
                break;
            case GET_OPEN_ORDERS:
                try {
                    const market = message.data.market;

                    const marketBooks = this.marketOrderbooks.get(market);
                    if (!marketBooks) {
                        throw new Error("Orderbooks not found for this market");
                    }

                    const openOrders = [
                        ...marketBooks.yes.getOpenOrders(message.data.userId),
                        ...marketBooks.no.getOpenOrders(message.data.userId)
                    ]

                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "OPEN_ORDERS",
                        payload: openOrders,
                    })
                } catch (error) {
                    console.log(error);
                }
                break;
            case ON_RAMP:
                const userId = message.data.userId;
                const amount = message.data.amount;
                this.onRamp(userId, amount);
                break;
            case GET_DEPTH:
                try {
                    const market = message.data.market;
                    const marketBooks = this.marketOrderbooks.get(market);

                    if (!marketBooks) {
                        throw new Error("No orderbooks found for this market");
                    }

                    //Needs Recheck, functionality check
                    const yesDepth = marketBooks.yes.getMarketDepth();
                    const noDepth = marketBooks.no.getMarketDepth();

                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "DEPTH",
                        payload: {
                            // For a true 4-op market, it is necessary to separate depth for Yes and No
                            bids: yesDepth.bids,
                            asks: noDepth.asks,
                            //Needs Recheck
                            yesBids: yesDepth.bids,
                            yesAsks: yesDepth.asks,
                            noBids: noDepth.bids,
                            noAsks: noDepth.asks,
                        }
                    })
                } catch (error) {
                    console.log(error);
                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "DEPTH",
                        payload: {
                            bids: [],
                            asks: [],
                            yesBids: [],
                            yesAsks: [],
                            noBids: [],
                            noAsks: [],
                        },
                    });
                }
                break;
        }
    }

    createOrders(
        market: string,
        price: number,
        quantity: number,
        orderType: "bid" | "ask",
        outcome: "yes" | "no",
        userId: string
    ): {
        executedQty: number;
        fills: Fill[];
        orderId: string;
    } {
        const marketOrderbooks = this.marketOrderbooks.get(market);
        if (!marketOrderbooks) {
            throw new Error("No orderbooks found for this market");
        }

        const targetOrderbook = outcome === "yes" ? marketOrderbooks.yes : marketOrderbooks.no;

        this.checkAndLockFundsAndAssets(orderType, outcome, userId, price, quantity);

        const order: Order = {
            price: Number(price),
            quantity: Number(quantity),
            orderId: uuidv4(),
            filled: 0,
            type: orderType,
            userId,
        };
        const { fills, executedQty } = targetOrderbook.addOrder(order);

        this.updateBalance(orderType, outcome, userId, fills);
        this.createDbTrades(fills, market); //do we actually need to pass outcome parameter...
        this.updateDbOrders(order, executedQty, fills, market, outcome);
        this.publishWsDepthUpdates(fills, price, orderType, market, outcome);
        this.publishWsTrades(fills, userId, market, outcome);

        return { executedQty, fills, orderId: order.orderId }
    }

    checkAndLockFundsAndAssets(
        orderType: "bid" | "ask",
        outcome: "yes" | "no",
        userId: string,
        price: number,
        quantity: number
    ) {
        const userBalance = this.balances.get(userId);
        if (!userBalance) {
            throw new Error(`User balance is not found for user: ${userId}`);
        }
        if (orderType === "bid") {
            const cost = price * quantity;
            if (userBalance.available < cost) {
                throw new Error("Insufficient balance!");
            }
            userBalance.available -= cost;
            userBalance.locked += cost;

            // //@ts-ignore
            // this.balances.get(userId)?.available = this.balances.get(userId)?.available - quantity * price;

            // //@ts-ignore
            // this.balances.get(userId)?.locked = this.balances.get(userId)?.locked + quantity * price;
        } else {
            // TODO: Assumptions are bring made. Come up with an optimal solution...

            const userContracts = outcome === "yes" ? userBalance.yesContracts : userBalance.noContracts;

            if (userContracts === undefined || userContracts < quantity) {
                throw new Error(`Insufficient ${outcome} contracts to sell.`)
            }

            if (outcome === "yes") {
                userBalance.yesContracts -= quantity;
                //@ts-ignore
                userBalance.lockedYesContracts = (userBalance.lockedYesContracts || 0) + quantity;
            } else {
                userBalance.noContracts -= quantity;
                //@ts-ignore
                userBalance.lockedNoContracts = (userBalance.lockedNoContracts || 0) + quantity;
            }
        }

        console.log(`User ${userId} balance after locking funds: `, userBalance);
    }

    updateBalance(
        orderType: "bid" | "ask",
        outcome: "yes" | "no",
        userId: string,
        fills: Fill[]
    ) {
        console.log("----------------Balance updating------------");
        fills.forEach((fill) => {
            const takerBalance = this.balances.get(userId); //user who places order
            const makerBalance = this.balances.get(fill.otherUserId); // user whose trade was matched with.

            if (!takerBalance || !makerBalance) {
                console.error("Error: Taker or Maker balance not found during update.")
                return;
            }

            if (orderType === "bid") {
                //Architecture:
                //Taker (buyer) receives 'outcome' contracts, pays currency
                //Maker (seller) receives currency, gives 'outcome' contracts

                //Taker's locked currency is released and converted to contracts
                takerBalance.locked -= fill.qty * fill.price;
                if (outcome === "yes") {
                    //@ts-ignore
                    takerBalance.yesContracts = (takerBalance.yesContracts || 0) + fill.qty;
                } else {
                    //@ts-ignore
                    takerBalance.noContracts = (takerBalance.noContracts || 0) + fill.qty;
                }


                //Maker's locked contracts are released, and they receive currency
                if (outcome === "yes") {
                    //@ts-ignore
                    makerBalance.lockedYesContracts = (makerBalance.lockedYesContracts || 0) - fill.qty;
                } else {
                    //@ts-ignore
                    makerBalance.lockedNoContracts = (makerBalance.lockedNoContracts || 0) - fill.qty;
                }

                makerBalance.available += fill.qty * fill.price;
            } else {
                //handling sell
                //Taker -> pays currency receives contracts
                //Maker -> gives contracts, receives currency

                takerBalance.locked -= fill.qty * fill.price;

                if(outcome == "yes"){
                    takerBalance.yesContracts = (takerBalance.yesContracts || 0) + fill.qty;
                } else {
                    takerBalance.noContracts =(takerBalance.noContracts || 0) + fill.qty;
                }

                if(outcome == "yes"){
                    makerBalance.lockedYesContracts = (makerBalance.lockedYesContracts || 0) - fill.qty;
                } else {
                    makerBalance.lockedNoContracts = (makerBalance.lockedNoContracts || 0) - fill.qty;
                }

                makerBalance.available +- fill.qty * fill.price;
            }
        })
        console.log("----------------Balance updated------------");
    }

    createDbTrades(
        fills: Fill[],
        market: string,
        // outcome: "yes" | "no"
    ) {
        console.log("-------------Creating DB Trades------------");
        fills.forEach((fill) => {
            RedisManager.getInstance().pushMessage({
                type: "TRADE_ADDED",
                data: {
                    market,
                    id: fill.tradeId.toString(),
                    isBuyerMaker: "kuch bi", //incomplete, need clarity
                    price: fill.price,
                    quantity: fill.qty,
                    timestamp: Date.now(),
                }
            })
        })
    }

    updateDbOrders(
        order: Order,
        executedQty: number,
        fills: Fill[],
        market: string,
        outcome: "yes" | "no"
    ) {
        console.log("-----------DB Orders Updating--------------");
        RedisManager.getInstance().pushMessage({
            type: ORDER_UPDATE,
            data: {
                orderId: order.orderId,
                executedQty,
                market,
                price: order.price, //converting to string -> type error
                quantity: order.quantity, //converting to string -> type error
                side: outcome,
            }
        });
        //Recheck
        fills.forEach((fill) => {
            RedisManager.getInstance().pushMessage({
                type: ORDER_UPDATE,
                data: {
                    orderId: fill.marketOrderId,
                    executedQty: fill.qty,
                }
            })
        })
    }

    publishWsDepthUpdates(
        fills: Fill[],
        price: number,
        orderType: "bid" | "ask",
        market: string,
        outcome: "yes" | "no"
    ) {
        console.log("------------Publishing WS Depth--------");
        const marketBooks = this.marketOrderbooks.get(market);

        if (!marketBooks) {
            return;
        }

        const targetOrderbook = outcome === "yes" ? marketBooks.yes : marketBooks.no;

        const depth = targetOrderbook.getMarketDepth();

        //send to API (using wsMessge contoller in Redis Manager)...
        RedisManager.getInstance().sendToApi(`depth@${market} - ${outcome}`, {
            stream: `depthj@${market}-${outcome}`,
            data: {
                b: depth.bids,
                a: depth.asks,
                e: "depth",
            }
        })
    }

    publishWsTrades(
        fills: Fill[],
        userId: string,
        market: string,
        outcome: "yes" | "no"
    ) {
        console.log("------------publishing WsTrades------------");

        fills.forEach((fill) => {
            //send to API (using wsMessge contoller in Redis Manager)...
            RedisManager.getInstance().sendToApi(`trade@${market} - ${outcome}`, {
                stream: `trade@${market} - ${outcome}`,
                //Recheck required
                data: {
                    e: "trade",
                    t: fill.tradeId,
                    m: fill.otherUserId === userId,
                    p: fill.price,
                    q: fill.qty.toString(),
                    s: market
                }
            })
        })
    }

    //Never Used here.
    onRamp(userId: string, amount: number) {
        const userBalance = this.balances.get(userId);
        if (!userBalance) {
            this.balances.set(userId, {
                available: amount,
                locked: 0,
                yesContracts: 0,
                noContracts: 0,
                lockedYesContracts: 0,
                lockedNoContracts: 0,
            });
        } else {
            userBalance.available += amount;
        }
    }

    sendUpdatedDepthAt(price: string, market: string, outcome: "yes" | "no") {
        const marketBooks = this.marketOrderbooks.get(market);
        if (!marketBooks) {
            return;
        }
        const targetOrderbook = outcome === "yes" ? marketBooks.yes : marketBooks.no;
        const depth = targetOrderbook.getMarketDepth();

        //Publish to the specific outcome's depth channel
        //send to API (using wsMessge contoller in Redis Manager)...
        RedisManager.getInstance().sendToApi(`depth@${market}-${outcome}`, {
            stream: `depth@${market}-${outcome}`,
            data: {
                b: depth.bids,
                a: depth.asks,
                e: "depth",
            },
        });
    }

}