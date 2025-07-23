// We are implementing asynchronous processing in this page. That is we are passing the request to another service to process the request instead of processing it here.
// For that we are using redis...


//Are you sure that you have implemented all the routes??
import { orderType, sides } from "@trade/types";
import { AsyncWrapper } from "../../utils/asynCatch";
import { addToOrderQueue } from "@trade/order-queue";
import { Request } from "express";
import { v4 as uuidv4 } from "uuid";
import { SuccessResponse } from "../../utils/wrappers/success.res";

type TPlaceOrderReq = {
    event_id: string; //might be string. Need to check
    l1_expected_price: number;
    l1_order_quantity: number;
    action: orderType; // type: buy or sell
    outcome: sides; //type: yes or no
    userId: string;
}

export const placeHandler = AsyncWrapper(async (req: Request<{}, {}, TPlaceOrderReq>, res) => {
    const {event_id, l1_expected_price, l1_order_quantity, action, outcome, userId} = req.body;

    const messageForEngine = {
        type: "CREATE_ORDER",
        data: {
            market: event_id,
            price: l1_expected_price,
            quantity: l1_order_quantity,
            action,
            outcome,
            userId: userId,
        }
    }
//optimally-> this would come from user session/auth instead of uuid
    await addToOrderQueue({
        clientId: uuidv4(),
        message: messageForEngine
    });
    let response = new SuccessResponse("Order placed successfully", 201);
    return res.status(201).json(response);

})