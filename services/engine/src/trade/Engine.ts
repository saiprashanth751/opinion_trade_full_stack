import { Fill, Order, Orderbook } from "./Orderbook";
import fs from "fs"
import { CANCEL_ORDER, CREATE_ORDER, GET_DEPTH, GET_OPEN_ORDERS, MessageFromApi, ON_RAMP, ORDER_UPDATE, sides } from "@trade/types"
import { v4 as uuidv4 } from "uuid";
import { RedisManager } from "@trade/order-queue"
import prisma from "@repo/db/client"
import { Prisma } from "@prisma/client"
import dotenv from "dotenv";

dotenv.config();

//imp-todo : implement transactions for balance updates -> optimal

// export const EXAMPLE_EVENT = "gta6-trailer-3-to-be-released-by-the-end-of-the-day";
export const CURRENCY = "INR";

//Declaring funds and asset balance interface...
interface UserBalance {
    available: number;
    locked: number;
    // managed by db...
    // yesContracts: number;
    // noContracts: number;
    // lockedYesContracts: number;
    // lockedNoContracts: number;
}

//implementing synthetic market maker -> for dynamic price changing according to the orderbook

const SYNTHETIC_MARKET_MAKER_USER_ID = process.env.SYNTHETIC_MARKET_MAKER_USER_ID as string; // Unique ID for the market maker
const SYNTHETIC_ORDER_QUANTITY = Number(process.env.SYNTHETIC_ORDER_QUANTITY); // Quantity of shares the market maker will offer/bid for
const PRICE_ADJUSTMENT_INTERVAL_MS = Number(process.env.PRICE_ADJUSTMENT_INTERVAL_MS); // How often the market maker checks and adjusts prices (e.g., 5 seconds)
const MARKET_MAKER_SPREAD = Number(process.env.MARKET_MAKER_SPREAD); // A small value to create a bid-ask spread for the synthetic orders (e.g., 1 unit of price)

export class Engine {
    //balances -> funds and asset balances
    private balances: Map<string, UserBalance> = new Map();
    private marketOrderbooks: Map<string, { yes: Orderbook; no: Orderbook }> = new Map();
    private syntheticOrders: Map<string, { yesBidId?: string, yesAskId?: string, noBidId?: string, noAskId?: string }> = new Map();

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
            //recheck
            // console.log("Snapshot loading is not fully implemented for new orderbook structure.");
            // this.marketOrderbooks.set(EXAMPLE_EVENT, {
            //     yes: new Orderbook([], [], EXAMPLE_EVENT, 1, 0),
            //     no: new Orderbook([], [], EXAMPLE_EVENT, 1, 0),
            // });
            //Load orderbooks
            parsedSnapShot.orderbooks.forEach((obData: any) => {
                this.marketOrderbooks.set(obData.market, {
                    yes: new Orderbook(obData.yes.bids, obData.yes.asks, obData.market, obData.yes.lastTradeId, obData.yes.currentPrice),
                    no: new Orderbook(obData.no.bids, obData.no.asks, obData.market, obData.no.lastTradeId, obData.no.currentPrice)
                })
            })
            this.balances = new Map(parsedSnapShot.balances);
            console.log("Snapshot loaded successfully.");
        } else {
            //     //Need to comeback for verification...
            //     // this.marketOrderbooks.set(EXAMPLE_EVENT, {
            //     //     yes: new Orderbook([], [], EXAMPLE_EVENT, 1, 0),
            //     //     no: new Orderbook([], [], EXAMPLE_EVENT, 1, 0),
            //     // });
            //     //is there any conflict, what is the optimal solution
            //     this.setBaseBalances();
            // -> constructors cannot be async. 
            // ->  no snapshot -> initialize orderbooks from existing events in the database
            this.initializeFromDatabase();
        }
        setInterval(() => {
            this.saveSnapshot();
        }, 1000 * 3);

        setInterval(() => {
            this.runSyntheticMarketMaker();
        }, PRICE_ADJUSTMENT_INTERVAL_MS)
    }

    private async initializeFromDatabase() {
        console.log("Initializing engine from database...");
        try {
            const events = await prisma.event.findMany();
            events.forEach(event => {
                this.marketOrderbooks.set(event.id, {
                    yes: new Orderbook([], [], event.id, 0, event.initialYesPrice),
                    no: new Orderbook([], [], event.id, 0, event.initialNoPrice),
                });
            });

            //imp -> ensure market maker user balance is loaded/initialized
            const marketMakerUser = await prisma.user.findUnique({
                where: { id: SYNTHETIC_MARKET_MAKER_USER_ID }
            });
            
            //marketMaker -> synthetic user
            if (marketMakerUser) {
                this.balances.set(SYNTHETIC_MARKET_MAKER_USER_ID, {
                    available: marketMakerUser.balance,
                    locked: 0,
                });
                console.log(`Market maker balance initialized: ${marketMakerUser.balance}`);
            } else {
                console.warn(`Market maker user with ID ${SYNTHETIC_MARKET_MAKER_USER_ID} not found in DB. Please ensure it exists and has sufficient balance.`);
            }

            console.log(`Initialized ${events.length} event orderbooks from database.`);
        } catch (error) {
            console.error("Error initializing engine from database:", error);
        }
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

    // setBaseBalances() {
    //     this.balances.set("1", {
    //         available: 1000,
    //         locked: 0,
    //         yesContracts: 0,
    //         noContracts: 0,
    //         lockedYesContracts: 0,
    //         lockedNoContracts: 0
    //     });

    //     this.balances.set("2", {
    //         available: 1000,
    //         locked: 0,
    //         yesContracts: 0,
    //         noContracts: 0,
    //         lockedYesContracts: 0,
    //         lockedNoContracts: 0
    //     })
    // }

    async processOrders({
        clientId,
        message
    }: {
        clientId: string;
        message: MessageFromApi;
    }) {
        console.log("message", message, " clientId", clientId);

        switch (message.type) {
            case CREATE_ORDER:
                try {
                    const { market, price, quantity, action, outcome, userId } = message.data
                    const orderType = action === "buy" ? "bid" : "ask";

                    if (!this.marketOrderbooks.has(market)) {
                        console.log(`Initializing new orderbooks for market: ${market}`);
                        const eventDetails = await prisma.event.findUnique({
                            where: {
                                id: market
                            }
                        })

                        if (!eventDetails) {
                            throw new Error(`Event details not fount for market: ${market}`)
                        }

                        this.marketOrderbooks.set(market, {
                            yes: new Orderbook([], [], market, 0, eventDetails.initialYesPrice),
                            no: new Orderbook([], [], market, 0, eventDetails.initialNoPrice),
                        })
                    }
                    //transactions for atomicity...
                    const { executedQty, fills, orderId } = await prisma.$transaction(async (tx) => {
                        return this.createOrders(
                            market,
                            price,
                            quantity,
                            orderType,
                            outcome,
                            userId,
                            tx
                        );
                    })

                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "ORDER_PLACED",
                        payload: {
                            orderId,
                            executedQty,
                            fills
                        }
                    })

                    console.log("Pushed ORDER_PLACED into REDIS");
                    console.log(`user ${userId} : balance`, await this.getUserBalance(userId));
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

                    // const userBalance = this.balances.get(orderToCancel.userId);
                    const userBalance = await this.getUserBalance(orderToCancel.userId);
                    if (!userBalance) {
                        console.log("User Balance not found to cancel order for user", orderToCancel.userId);
                        throw new Error("User Balance not found to cancel order");
                    }
                    const userContract = await this.getUserContract(orderToCancel.userId, cancelMarket);
                    if (!userContract) {
                        throw new Error(`User contract not found for user: ${orderToCancel.userId} and event: ${cancelMarket}`);
                    }

                    let price: number | undefined;
                    if (orderToCancel.type == "bid") {
                        price = targetOrderbook.cancelBid(orderToCancel);
                        const leftQunatityAmount = (orderToCancel.quantity - orderToCancel.filled) * orderToCancel.price;

                        //Recheck
                        //@ts-ignore
                        userBalance.available += leftQunatityAmount;
                        //@ts-ignore
                        userBalance.locked -= leftQunatityAmount;
                    } else {
                        price = targetOrderbook.cancelAsk(orderToCancel);

                        const leftQunatity = orderToCancel.quantity - orderToCancel.filled;

                        if (cancelledOrderOutcome === "yes") {
                            // //@ts-ignore
                            // userBalance.yesContracts += leftQunatity;
                            // //@ts-ignore
                            // userBalance.lockedYesContracts -= leftQunatity;
                            userContract.yesContracts += leftQunatity;
                            userContract.lockedYesContracts -= leftQunatity;
                        } else {
                            //@ts-ignore
                            // userBalance.noContracts += leftQunatity;
                            // //@ts-ignore
                            // userBalance.lockedNoContracts -= leftQunatity;
                            userContract.noContracts += leftQunatity;
                            userContract.lockedNoContracts -= leftQunatity;
                        }
                        //@ts-ignore
                        // userBalance.noContracts -= leftQunatity
                    }

                    await this.saveUserBalance(orderToCancel.userId, userBalance);
                    await this.saveUserContract(userContract);

                    if (price) {
                        this.sendUpdatedDepthAt(price.toString(), cancelMarket, cancelledOrderOutcome)
                    }

                    RedisManager.getInstance().sendToApi(clientId, {
                        type: "ORDER_CANCELLED",
                        payload: {
                            orderId,
                            // Need to recheck
                            executedQty: orderToCancel.filled,
                            remainingQty: orderToCancel.quantity - orderToCancel.filled,
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
                        payload: {
                            openOrders
                        },
                    })
                } catch (error) {
                    console.log(error);
                }
                break;
            case ON_RAMP:
                const userId = message.data.userId;
                const amount = message.data.amount;
                // this.onRamp(userId, amount);
                await this.onRamp(userId, amount);
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

    async createOrders(
        market: string,
        price: number,
        quantity: number,
        orderType: "bid" | "ask",
        outcome: "yes" | "no",
        userId: string,
        tx: Prisma.TransactionClient
    ): Promise<{
        executedQty: number;
        fills: Fill[];
        orderId: string;
    }> {
        const marketOrderbooks = this.marketOrderbooks.get(market);
        if (!marketOrderbooks) {
            throw new Error("No orderbooks found for this market");
        }

        const targetOrderbook = outcome === "yes" ? marketOrderbooks.yes : marketOrderbooks.no;

        // this.checkAndLockFundsAndAssets(orderType, outcome, userId, price, quantity);
        await this.checkAndLockFundsAndAssets(orderType, outcome, userId, price, quantity, market, tx);
        const order: Order = {
            price: Number(price),
            quantity: Number(quantity),
            orderId: uuidv4(),
            filled: 0,
            type: orderType,
            userId,
        };
        const { fills, executedQty } = targetOrderbook.addOrder(order);

        await this.updateBalance(orderType, outcome, userId, fills, market, tx);
        this.createDbTrades(fills, market); //do we actually need to pass outcome parameter...
        this.updateDbOrders(order, executedQty, fills, market, outcome);
        this.publishWsDepthUpdates(fills, price, orderType, market, outcome);
        this.publishWsTrades(fills, userId, market, outcome);

        return { executedQty, fills, orderId: order.orderId }
    }

    async checkAndLockFundsAndAssets(
        orderType: "bid" | "ask",
        outcome: "yes" | "no",
        userId: string,
        price: number,
        quantity: number,
        eventId: string,
        tx: Prisma.TransactionClient
    ) {
        // const userBalance = this.balances.get(userId);
        // if (!userBalance) {
        //     throw new Error(`User balance is not found for user: ${userId}`);
        // }

        const userBalance = await this.getUserBalance(userId, tx);
        if (!userBalance) {
            throw new Error(`User balance is not found for user: ${userId}`);
        }

        const userContract = await this.getUserContract(userId, eventId, tx); // Get user contract
        if (!userContract) {
            throw new Error(`User contract not found for user: ${userId} and event: ${eventId}`);
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

            // const userContracts = outcome === "yes" ? userBalance.yesContracts : userBalance.noContracts;
            const userContracts = outcome === "yes" ? userContract.yesContracts : userContract.noContracts;

            if (userContracts === undefined || userContracts < quantity) {
                throw new Error(`Insufficient ${outcome} contracts to sell.`)
            }

            if (outcome === "yes") {
                // userBalance.yesContracts -= quantity;
                // //@ts-ignore
                // userBalance.lockedYesContracts = (userBalance.lockedYesContracts || 0) + quantity;
                userContract.yesContracts -= quantity;
                userContract.lockedYesContracts += quantity;
            } else {
                // userBalance.noContracts -= quantity;
                // //@ts-ignore
                // userBalance.lockedNoContracts = (userBalance.lockedNoContracts || 0) + quantity;
                userContract.noContracts -= quantity;
                userContract.lockedNoContracts += quantity;
            }
        }
        await this.saveUserBalance(userId, userBalance, tx);
        await this.saveUserContract(userContract, tx);

        console.log(`User ${userId} balance after locking funds: `, userBalance);
    }

    // services/engine/src/trade/Engine.ts

    //What is the optimal implementation? !!!Finance feature!!!
    async updateBalance(
        orderType: "bid" | "ask",
        outcome: "yes" | "no",
        userId: string,
        fills: Fill[],
        eventId: string,
        tx: Prisma.TransactionClient
    ) {
        //what is optimistic locking or row-level DB locks....
        console.log("----------------Balance updating------------");
        // for (const fill of fills) {
        //     //user who placed the original order
        //     const takerBalance = await this.getUserBalance(userId, tx);
        //     //user whose order was matched
        //     const makerBalance = await this.getUserBalance(fill.otherUserId, tx);
        //     const takerContract = await this.getUserContract(userId, eventId, tx);
        //     const makerContract = await this.getUserContract(fill.otherUserId, eventId, tx);

        //     if (!takerBalance || !makerBalance || !takerContract || !makerContract) {
        //         console.error("Error: Taker or Maker balance not found during update.")
        //         return;
        //     }

        //     if (orderType === "bid") {
        //         //buy order (taker is buyer)
        //         //taker(buyer) receives contracts pays currency
        //         //maker(seller) receives currency give contracts

        //         //taker's locked currency is released and converted to contracts
        //         takerBalance.locked -= fill.qty * fill.price;
        //         if (outcome === "yes") {
        //             takerContract.yesContracts += fill.qty;
        //         } else {
        //             takerContract.noContracts += fill.qty;
        //         }
        //         await this.saveUserBalance(userId, takerBalance);
        //         await this.saveUserContract(takerContract);
        //         //maker's locked contracts are released, and they receive currency
        //         if (outcome === "yes") {
        //             makerContract.lockedYesContracts -= fill.qty;
        //         } else {
        //             makerContract.lockedNoContracts -= fill.qty;
        //         }
        //         makerBalance.available += fill.qty * fill.price;
        //         await this.saveUserBalance(fill.otherUserId, makerBalance, tx);
        //         await this.saveUserContract(makerContract, tx);
        //     } else {
        //         //sell order (taker is seller)
        //         //taker (userId) is the seller of contracts, RECEIVES currency!!!
        //         //maker (fill.otherUserId) is the BUYER of contracts, PAYS currency!!!

        //         //taker -> release locked contracts
        //         if (outcome === "yes") {
        //             takerContract.lockedYesContracts -= fill.qty;
        //         } else {
        //             takerContract.lockedNoContracts -= fill.qty;
        //         }
        //         //seller receives currency
        //         takerBalance.available += fill.qty * fill.price;
        //         await this.saveUserBalance(userId, takerBalance, tx);
        //         await this.saveUserContract(takerContract, tx);

        //         //maker -> Release locked currency
        //         makerBalance.locked -= fill.qty * fill.price;
        //         //maker -> buyer receives contracts
        //         if (outcome === "yes") {
        //             makerContract.yesContracts += fill.qty;;
        //         } else {
        //             makerContract.noContracts += fill.qty;
        //         }
        //         await this.saveUserBalance(fill.otherUserId, makerBalance, tx);
        //         await this.saveUserContract(makerContract, tx);
        //     }
        // }

        // -----------------------------------v2-----------------------------------------

        // Optimized version. To reduce db calls round-trip.. complex to understand
        const userIdsToUpdate = new Set<string>();
        userIdsToUpdate.add(userId); // Taker
        fills.forEach(fill => userIdsToUpdate.add(fill.otherUserId)); // Makers

        // Fetch all necessary balances and contracts in one go
        const [users, userContracts] = await Promise.all([
            tx.user.findMany({ where: { id: { in: Array.from(userIdsToUpdate) } } }),
            tx.userContract.findMany({
                where: {
                    userId: { in: Array.from(userIdsToUpdate) },
                    eventId: eventId
                }
            })
        ]);

        const userMap = new Map(users.map(u => [u.id, u]));
        const userContractMap = new Map(userContracts.map(uc => [uc.userId, uc]));

        // Prepare updates
        const balanceUpdates: { id: string, data: { balance: number } }[] = [];
        const contractUpdates: { id: string, data: { yesContracts?: number, noContracts?: number, lockedYesContracts?: number, lockedNoContracts?: number } }[] = [];

        // Process taker's balance/contracts
        const takerDbUser = userMap.get(userId);
        const takerDbContract = userContractMap.get(userId);

        if (!takerDbUser || !takerDbContract) {
            console.error("Error: Taker user or contract not found during batch update preparation.");
            return;
        }

        // Simulate in-memory UserBalance and UserContract objects for calculations
        const currentTakerBalance: UserBalance = { available: takerDbUser.balance, locked: 0 }; // Locked is transient
        const currentTakerContract = { ...takerDbContract };

        // Apply initial lock from checkAndLockFundsAndAssets (which already saved to DB)
        // Now, apply the changes from fills
        for (const fill of fills) {
            const makerDbUser = userMap.get(fill.otherUserId);
            const makerDbContract = userContractMap.get(fill.otherUserId);

            if (!makerDbUser || !makerDbContract) {
                console.error("Error: Maker user or contract not found during batch update preparation.");
                continue;
            }

            const currentMakerBalance: UserBalance = { available: makerDbUser.balance, locked: 0 }; // Locked is transient
            const currentMakerContract = { ...makerDbContract };

            if (orderType === "bid") { // Taker is buyer (userId), Maker is seller (fill.otherUserId)
                // Taker (buyer)
                currentTakerBalance.locked -= fill.qty * fill.price; // Release locked funds
                if (outcome === "yes") {
                    currentTakerContract.yesContracts += fill.qty;
                } else {
                    currentTakerContract.noContracts += fill.qty;
                }

                // Maker (seller)
                if (outcome === "yes") {
                    currentMakerContract.lockedYesContracts -= fill.qty; // Release locked contracts
                } else {
                    currentMakerContract.lockedNoContracts -= fill.qty; // Release locked contracts
                }
                currentMakerBalance.available += fill.qty * fill.price; // Receive funds

            } else { // Taker is seller (userId), Maker is buyer (fill.otherUserId)
                // Taker (seller)
                if (outcome === "yes") {
                    currentTakerContract.lockedYesContracts -= fill.qty; // Release locked contracts
                } else {
                    currentTakerContract.lockedNoContracts -= fill.qty; // Release locked contracts
                }
                currentTakerBalance.available += fill.qty * fill.price; // Receive funds

                // Maker (buyer)
                currentMakerBalance.locked -= fill.qty * fill.price; // Release locked funds
                if (outcome === "yes") {
                    currentMakerContract.yesContracts += fill.qty;
                } else {
                    currentMakerContract.noContracts += fill.qty;
                }
            }

            // Update maps with calculated values
            userMap.set(userId, { ...takerDbUser, balance: currentTakerBalance.available });
            userContractMap.set(userId, currentTakerContract);
            userMap.set(fill.otherUserId, { ...makerDbUser, balance: currentMakerBalance.available });
            userContractMap.set(fill.otherUserId, currentMakerContract);
        }

        // Collect all final updates
        for (const [id, user] of userMap.entries()) {
            balanceUpdates.push({ id: user.id, data: { balance: user.balance } });
        }
        for (const [userId, contract] of userContractMap.entries()) {
            contractUpdates.push({
                id: contract.id, data: {
                    yesContracts: contract.yesContracts,
                    noContracts: contract.noContracts,
                    lockedYesContracts: contract.lockedYesContracts,
                    lockedNoContracts: contract.lockedNoContracts,
                }
            });
        }

        // Execute batch updates
        await Promise.all([
            ...balanceUpdates.map(update => tx.user.update({ where: { id: update.id }, data: update.data })),
            ...contractUpdates.map(update => tx.userContract.update({ where: { id: update.id }, data: update.data }))
        ]);

        //----------------------------v2-close----------------------------------------

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
                //Recheck
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
        RedisManager.getInstance().publishMessage(`depth@${market} - ${outcome}`, {
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
            RedisManager.getInstance().publishMessage(`trade@${market} - ${outcome}`, {
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
    // onRamp(userId: string, amount: number) {
    //     const userBalance = this.balances.get(userId);
    //     if (!userBalance) {
    //         this.balances.set(userId, {
    //             available: amount,
    //             locked: 0,
    //             yesContracts: 0,
    //             noContracts: 0,
    //             lockedYesContracts: 0,
    //             lockedNoContracts: 0,
    //         });
    //     } else {
    //         userBalance.available += amount;
    //     }
    // }

    async onRamp(userId: string, amount: number) {
        const user = await prisma.user.findUnique({
            where: {
                id: userId
            }
        });

        if (!user) {
            console.error(`User not found for on-ramp: ${userId}`)
            throw new Error(`User not found for on-ramp: ${userId}`);
        }

        const newBalance = user.balance + amount;
        await prisma.user.update({
            data: {
                balance: newBalance
            },
            where: {
                id: userId
            }
        })
        const cachedBalance = this.balances.get(userId);
        if (cachedBalance) {
            cachedBalance.available = newBalance;
            this.balances.set(userId, cachedBalance);
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
        RedisManager.getInstance().publishMessage(`depth@${market}-${outcome}`, {
            stream: `depth@${market}-${outcome}`,
            data: {
                b: depth.bids,
                a: depth.asks,
                e: "depth",
            },
        });
    }

    private async getUserBalance(userId: string, tx?: Prisma.TransactionClient): Promise<UserBalance> {
        let userBalance = this.balances.get(userId);

        if (!userBalance) {
            //for secure transaction...
            const client = tx || prisma;
            const user = await client.user.findUnique({
                where: {
                    id: userId,
                }
            });
            if (!user) {
                // Auth must be soo good that this should not happen
                console.warn(`User ${userId} not found in DB. Initializing with default balance.`);

                userBalance = {
                    available: 0,
                    locked: 0,
                    // yesContracts: 0,
                    // noContracts: 0,
                    // lockedYesContracts: 0,
                    // lockedNoContracts: 0,
                }
            } else {
                //contracts to be persistent or not...think...
                userBalance = {
                    available: user.balance,
                    locked: 0,
                    //     yesContracts: 0,
                    //     noContracts: 0,
                    //     lockedYesContracts: 0,
                    //     lockedNoContracts: 0,
                    // };
                }
                this.balances.set(userId, userBalance);
            }
        }
        return userBalance;
    }

    private async saveUserBalance(userId: string, balance: UserBalance, tx?: Prisma.TransactionClient) {
        this.balances.set(userId, balance);
        //what are  ledger/contract tables
        try {
            //for transactions
            const client = tx || prisma
            await client.user.update({
                where: {
                    id: userId,
                },
                data: {
                    balance: balance.available
                }
            })
        } catch (error) {
            console.error(`Failed to save balance for user ${userId} to DB:`, error)
        }
    }

    private async getUserContract(userId: string, eventId: string, tx?: Prisma.TransactionClient): Promise<any> {
        const client = tx || prisma;
        let userContract = await client.userContract.findUnique({
            where: {
                userId_eventId: {
                    userId: userId,
                    eventId: eventId,
                },
            },
        });

        if (!userContract) {
            userContract = await client.userContract.create({
                data: {
                    userId: userId,
                    eventId: eventId,
                    yesContracts: 0,
                    noContracts: 0,
                    lockedYesContracts: 0,
                    lockedNoContracts: 0,
                },
            });
        }
        return userContract;
    }

    private async saveUserContract(contract: any, tx?: Prisma.TransactionClient) {
        try {
            const client = tx || prisma;
            await client.userContract.update({
                where: { id: contract.id },
                data: {
                    yesContracts: contract.yesContracts,
                    noContracts: contract.noContracts,
                    lockedYesContracts: contract.lockedYesContracts,
                    lockedNoContracts: contract.lockedNoContracts,
                },
            });
        } catch (error) {
            console.error(`Failed to save user contract for user ${contract.userId} and event ${contract.eventId} to DB:`, error);
        }
    }
    //core -> synthetic market maker...
    private async runSyntheticMarketMaker() {
        console.log("Running synthetic market maker...");
        for (const [marketId, orderbooks] of this.marketOrderbooks.entries()) {
            const { yes: yesOrderbook, no: noOrderbook } = orderbooks;

            // Get current market prices
            const P_yes = yesOrderbook.getMarketPrice();
            const P_no = noOrderbook.getMarketPrice();

            // Calculate implied fair price for the 'no' side based on 'yes' price
            const P_no_fair = 100 - P_yes;

            // Cancel previous synthetic orders for this market
            const existingSyntheticOrders = this.syntheticOrders.get(marketId);
            if (existingSyntheticOrders) {
                await prisma.$transaction(async (tx) => {
                    if (existingSyntheticOrders.yesBidId) {
                        const order = yesOrderbook.bids.find(o => o.orderId === existingSyntheticOrders.yesBidId);
                        if (order) {
                            yesOrderbook.cancelBid(order);
                            // Also need to release locked funds for the market maker if the order was not filled
                            const userBalance = await this.getUserBalance(SYNTHETIC_MARKET_MAKER_USER_ID, tx);
                            if (userBalance) {
                                userBalance.available += (order.quantity - order.filled) * order.price;
                                userBalance.locked -= (order.quantity - order.filled) * order.price;
                                await this.saveUserBalance(SYNTHETIC_MARKET_MAKER_USER_ID, userBalance, tx);
                            }
                        }
                    }
                    if (existingSyntheticOrders.yesAskId) {
                        const order = yesOrderbook.asks.find(o => o.orderId === existingSyntheticOrders.yesAskId);
                        if (order) {
                            yesOrderbook.cancelAsk(order);
                            // Release locked contracts for the market maker
                            const userContract = await this.getUserContract(SYNTHETIC_MARKET_MAKER_USER_ID, marketId, tx);
                            if (userContract) {
                                userContract.yesContracts += (order.quantity - order.filled);
                                userContract.lockedYesContracts -= (order.quantity - order.filled);
                                await this.saveUserContract(userContract, tx);
                            }
                        }
                    }
                    if (existingSyntheticOrders.noBidId) {
                        const order = noOrderbook.bids.find(o => o.orderId === existingSyntheticOrders.noBidId);
                        if (order) {
                            noOrderbook.cancelBid(order);
                            // Release locked funds for the market maker
                            const userBalance = await this.getUserBalance(SYNTHETIC_MARKET_MAKER_USER_ID, tx);
                            if (userBalance) {
                                userBalance.available += (order.quantity - order.filled) * order.price;
                                userBalance.locked -= (order.quantity - order.filled) * order.price;
                                await this.saveUserBalance(SYNTHETIC_MARKET_MAKER_USER_ID, userBalance, tx);
                            }
                        }
                    }
                    if (existingSyntheticOrders.noAskId) {
                        const order = noOrderbook.asks.find(o => o.orderId === existingSyntheticOrders.noAskId);
                        if (order) {
                            noOrderbook.cancelAsk(order);
                            // Release locked contracts for the market maker
                            const userContract = await this.getUserContract(SYNTHETIC_MARKET_MAKER_USER_ID, marketId, tx);
                            if (userContract) {
                                userContract.noContracts += (order.quantity - order.filled);
                                userContract.lockedNoContracts -= (order.quantity - order.filled);
                                await this.saveUserContract(userContract, tx);
                            }
                        }
                    }
                });
                this.syntheticOrders.delete(marketId); // Clear old IDs
            }

            // Place new synthetic orders
            const newSyntheticOrderIds: { yesBidId?: string, yesAskId?: string, noBidId?: string, noAskId?: string } = {};

            await prisma.$transaction(async (tx) => {
                // Ensure market maker has enough balance/contracts for initial orders
                // For simplicity, we'll assume the market maker has infinite funds/contracts for now,
                // or you can pre-fund the SYNTHETIC_MARKET_MAKER_USER_ID in your database.
                // A more robust solution would involve a dedicated market maker balance management.

                // Place synthetic orders for "yes" outcome
                const yesBidPrice = Math.max(0, P_yes - MARKET_MAKER_SPREAD);
                const yesAskPrice = Math.min(100, P_yes + MARKET_MAKER_SPREAD);

                const yesBuyOrder = await this.createOrders(
                    marketId,
                    yesBidPrice,
                    SYNTHETIC_ORDER_QUANTITY,
                    "bid",
                    sides.YES,
                    SYNTHETIC_MARKET_MAKER_USER_ID,
                    tx
                );
                newSyntheticOrderIds.yesBidId = yesBuyOrder.orderId;

                const yesSellOrder = await this.createOrders(
                    marketId,
                    yesAskPrice,
                    SYNTHETIC_ORDER_QUANTITY,
                    "ask",
                    sides.YES,
                    SYNTHETIC_MARKET_MAKER_USER_ID,
                    tx
                );
                newSyntheticOrderIds.yesAskId = yesSellOrder.orderId;

                // Place synthetic orders for "no" outcome
                const noBidPrice = Math.max(0, P_no_fair - MARKET_MAKER_SPREAD);
                const noAskPrice = Math.min(100, P_no_fair + MARKET_MAKER_SPREAD);

                const noBuyOrder = await this.createOrders(
                    marketId,
                    noBidPrice,
                    SYNTHETIC_ORDER_QUANTITY,
                    "bid",
                    sides.NO,
                    SYNTHETIC_MARKET_MAKER_USER_ID,
                    tx
                );
                newSyntheticOrderIds.noBidId = noBuyOrder.orderId;

                const noSellOrder = await this.createOrders(
                    marketId,
                    noAskPrice,
                    SYNTHETIC_ORDER_QUANTITY,
                    "ask",
                    sides.NO,
                    SYNTHETIC_MARKET_MAKER_USER_ID,
                    tx
                );
                newSyntheticOrderIds.noAskId = noSellOrder.orderId;
            });

            this.syntheticOrders.set(marketId, newSyntheticOrderIds);
            console.log(`Synthetic orders placed for market ${marketId}. P_yes: ${P_yes}, P_no_fair: ${P_no_fair}`);
        }
    }
}