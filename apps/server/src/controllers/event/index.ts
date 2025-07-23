import { Request, Response } from "express"
import { TEvent } from "@trade/types"
import  prisma  from "@repo/db/client"
import { AsyncWrapper } from "../../utils/asynCatch"
import { slugify, eventCodeGenerator } from "../../utils/utils"
import { SuccessResponse, SuccessResponseType } from "../../utils/wrappers/success.res"
import { ErrorHandler } from "../../utils/wrappers/error.res"
import dotenv from "dotenv"

dotenv.config();

// when the client sends the request body (req.body), it should not include the slug. By using Omit<TEvent, "slug">, you are explicitly telling TypeScript that the req.body object will have all the properties of TEvent except for slug. generated on the server-side using the slugify utility function (let slug = slugify(title);).
export const createEventhandler = AsyncWrapper( async (req: Request<{}, {}, Omit<TEvent, "slug">>, res: Response) => {
    const {
        title,
        description,
        start_date,
        end_date,
        initialYesPrice,   
        initialNoPrice,
        sot,
        quantity
    } = req.body;

    let slug = slugify(title);
    let eventCode = eventCodeGenerator().toString();

    //validate that initialYesPrice + initialNoPrice equals 100..the actual game :)
    //prices -> precentage -> 70 => 0.70
    const PRICE_SUM_TARGET = 100;
    const EPSILON = 0.0001; // for comparision

    //CHECK: did you implement this architecture globally

    if(Math.abs(initialYesPrice + initialNoPrice - PRICE_SUM_TARGET) > EPSILON) {
        throw new ErrorHandler (
            `Initial YES and NO prices must sum to ${PRICE_SUM_TARGET}. Provided: YES=${initialYesPrice}, NO=${initialNoPrice}, Sum=${initialYesPrice + initialNoPrice}`,
            "BAD_REQUEST"
        )
    }

    const isEventExists = await prisma.event.findFirst({
        where: {
            slug: slug
        }
    })

    if(isEventExists){
        throw new ErrorHandler("Event already exists", "BAD_REQUEST");
    }

    const event = await prisma.event.create({
        data: {
            eventId: eventCode,
            title,
            slug,
            description,
            start_date,
            end_date,
            initialYesPrice,
            initialNoPrice,
            sot,
            expiresAt: end_date,
            quantity
        }
    });

    const SYNTHETIC_MARKET_MAKER_USER_ID = process.env.SYNTHETIC_MARKET_MAKER_USER_ID as string;
    await prisma.userContract.create({
        data: {
            userId: SYNTHETIC_MARKET_MAKER_USER_ID,
            eventId: event.id,
            yesContracts: 1000000,
            noContracts: 1000000,
            lockedYesContracts: 0,
            lockedNoContracts: 0
        }
    })

    let response = new SuccessResponse("Event created successfully", 201);
    return res.json({
        response,
        eventId: eventCode
    });
});

// Get trade summary for an event

type TTradeSummary = {
    order_book_details: {
        orderbook_config: {
            socket_events: {
                subscribe_msg_name: string;
                unsubscribe_msg_name: string;
                listener_msg_name: string;
                subscription_data: string;
            }
        }
    }
}

export const getTradeSummaryHandler = AsyncWrapper(async(req, res: Response<SuccessResponseType>) => {
    const { eventId } = req.query;

    const event = await prisma.event.findUnique({
        where:{
            eventId: eventId as unknown as string,
        }
    })

    if(!event){
        throw new ErrorHandler("Event not found", "NOT_FOUND");
    }

    let response = new SuccessResponse(
        "Trade summary fetched successfully", 
        200,
    {
        order_book_details: {
            orderbook_config: {
                socket_events: {
                    subscribe_msg_name: "subscribe_orderbook",
                    unsubscribe_msg_name: "unsubscribe_orderbook",
                    listener_msg_name: `event_orderbook_${eventId}`,
                    subscription_data: `${eventId}`,
                }
            }
        }
    })

    return res.status(200).json(response.serialize());
})