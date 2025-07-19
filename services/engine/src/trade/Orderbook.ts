// This is one of the core parts of the project. The Orderbook.

import { v4 as uuidv4 } from "uuid";

export interface Order {
    price: number;
    quantity: number;
    filled: number;
    orderId: string;
    type: "bid" | "ask";
    userId: string;
}

export interface Fill {
    price: number;
    qty: number;
    tradeId: string;
    otherUserId: string;
    marketOrderId: string;
}

export class Orderbook {
    bids: Order[];
    asks: Order[];
    market: string;
    lastTradeId: number;
    currentPrice: number;

    constructor(bids: Order[], asks: Order[], market:string, lastTradeId: number, currentPrice:number){
        this.bids = bids;
        this.asks = asks;
        this.market = market;
        this.lastTradeId = lastTradeId;
        this.currentPrice = currentPrice || 0;
    }

    // Typescript class methods...
    addOrder(order: Order){
        if(order.type === "bid"){
            console.log("Order in orderbook", order)
            //match Bid to Ask
            const {executedQty, fills} = this.matchBid(order);
            //fill
            order.filled = executedQty;
            if(executedQty === order.quantity){
                return {
                    executedQty,
                    fills
                };
            }

            this.bids.push(order);
            return {
                executedQty,
                fills,
            };
        } else {
            //match Ask to Bid
            const {executedQty, fills} = this.matchAsk(order);
            //fill
            order.filled = executedQty;
            if(executedQty === order.quantity){
                return {
                    executedQty,
                    fills,
                };
            }
            this.asks.push(order);
            return {
                executedQty,
                fills,
            } 
        }
    }

    // Understanding the orderbook in the real-word trading systems is the great way to implement these methods. It is very interesting. 
    
    matchBid(order: Order) : { fills: Fill[]; executedQty: number} {
        const fills: Fill[] = [];
        let executedQty = 0;
        // TODO: Sort your array because it helps you to match the perfect orders.
        for(let i=0; i<this.asks.length; i++){
            if(this.asks[i]?.price! <= order.price && executedQty < order.quantity){
                const filledQty = Math.min(order.quantity - executedQty, this.asks[i]?.quantity!);

                executedQty += filledQty;
                //@ts-ignore
                this.asks[i].filled+= filledQty;
                fills.push({
                    price: this.asks[i]?.price!,
                    qty: filledQty,
                    tradeId: uuidv4(),
                    otherUserId: this.asks[i]?.userId!,
                    marketOrderId: this.asks[i]?.orderId!
                })
            }
        }

        // If the quantity to be filled is completed...

        for(let i=0; i<this.asks.length; i++){
            if(this.asks[i]?.filled === this.asks[i]?.quantity){
                this.asks.splice(i, 1);
                i--;
            }
        }
        console.log("executedQty", executedQty, " fills", fills)
        return {
            fills,
            executedQty
        }
    }

    matchAsk(order: Order) : {fills: Fill[]; executedQty: number} {
        let fills: Fill[]  = [];
        let executedQty = 0;
        
        for(let i=0; i<this.bids.length; i++){
            if(this.bids[i]?.price! >= order.price && executedQty < order.quantity){
                const filledQty = Math.min(order.quantity - executedQty, this.bids[i]?.quantity!);

                executedQty += filledQty;
                //@ts-ignore
                this.bids[i].filled += filledQty;

                fills.push({
                    price: this.bids[i]?.price!,
                    qty: filledQty,
                    tradeId: uuidv4(),
                    otherUserId: this.bids[i]?.userId!,
                    marketOrderId: this.bids[i]?.orderId!
                })
            }
        }

        //For filled
        for(let i=0; i<this.bids.length; i++){
            if(this.bids[i]?.quantity === this.bids[i]?.filled){
                this.bids.splice(i, 1);
                i--;
            }
        }
        console.log("executedQty", executedQty, " fills", fills)
        return {
            fills,
            executedQty
        };
    }

    getMarketDepth() {
        const bids: [string, string][] = [];
        const asks: [string, string][] = [];

        const bidsObj: {[key: string]: number} = {}
        const asksObj: {[key: string]: number} = {}

        //depth of the bids
        for(let i=0; i<this.bids.length; i++){
            const order = this.bids[i];
            const bidsObjPriceKey = order?.price.toString()!;

            if(!bidsObj[bidsObjPriceKey]){
                bidsObj[bidsObjPriceKey] = 0;
            }
            bidsObj[bidsObjPriceKey] += order?.quantity!;
        }
        
        //depth of the asks
        for(let i=0; i<this.asks.length; i++){
            const order = this.asks[i];
            const asksObjPriceKey = order?.price.toString()!;

            if(!asksObj[asksObjPriceKey]){
                asksObj[asksObjPriceKey] = 0;
            }
            asksObj[asksObjPriceKey] += order?.quantity!;
        }

        for(const price in bidsObj){
            bids.push([price, bidsObj[price]?.toString()!]);
        }

        for(const price in asksObj){
            asks.push([price, asksObj[price]?.toString()!]);
        }

        return {
            bids,
            asks,
        }
    }

    getOpenOrders(userId: string): Order[] {
        const bids = this.bids.filter(bid => bid.userId === userId);
        const asks = this.asks.filter(ask => ask.userId === userId);

        //using the spread to return everything...
        //first pushes all bids into the array and then the asks, making a single resultant order array...
        return [...bids, ...asks];
    }

    cancelBid(order: Order) {
        const index = this.bids.findIndex(bid => bid.orderId === order.orderId);
        if(index !== -1){
            const price = this.bids[index]?.price;
            this.bids.splice(index, 1);
            return price;
        }
    }

    cancelAsk(order: Order) {
        const index = this.asks.findIndex(ask => ask.orderId === order.orderId);
        if(index !== -1){
            const price = this.asks[index]?.price!;
            this.asks.splice(index, 1);
            return price;
        }
    }

    getSnapshot() {
        return {
            bids: this.bids,
            asks: this.asks,
            lastTradeId: this.lastTradeId,
            currentPrice: this.currentPrice
        }
    }
}

