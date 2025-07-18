// We are implementing asynchronous processing in this page. That is we are passing the request to another service to process the request instead of processing it here.
// For that we are using redis...

import { sides } from "@trade/types";
import { AsyncWrapper } from "../../utils/asynCatch";
import { addToOrderQueue } from "@trade/order-queue";
import { Request } from "express";
import { uuidv4 } from "zod/v4";
import { SuccessResponse } from "../../utils/wrappers/success.res";

type TPlaceOrderReq = {
    event_id: number;
    l1_expected_price: number;
    l1_order_quantity: number;
    offer_type: sides;
    userid: string;
}

export const placeHandler = AsyncWrapper(async (req: Request<{}, {}, TPlaceOrderReq>, res) => {
    const {event_id, l1_expected_price, l1_order_quantity, offer_type, userid} = req.body;

    const data = {
        type: uuidv4(),
        data: {
            market: event_id,
            price: l1_expected_price,
            type: "CREATE_ORDER", // Learn. Point to comeback.
            quantity: l1_order_quantity,
            side: offer_type,
            userId: userid.toString()
        }
    }

    await addToOrderQueue(data);
    let response = new SuccessResponse("Order places successfully", 201);
    return res.status(201).json(response);

})