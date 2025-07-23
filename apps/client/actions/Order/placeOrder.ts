"use server"

import { authOptions } from "@/lib/auth";
import { orderType, sides } from "@trade/types";
import { getServerSession } from "next-auth";
import axios from "axios"
import { _success } from "zod/v4/core";

interface placeOrderParams {
    eventId: string;
    price: number;
    quantity: number;
    action: orderType; //"buy" or "sell"
    outcome: sides; //"yes" or "no"
}

export const placeOrder = async ({ eventId, price, quantity, action, outcome }: placeOrderParams) => {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            return {
                succes: false,
                message: "User not authenticated"
            };
        }

        // console.log("EventID: ", eventId)
        // console.log("Outcome: ", outcome)

        const userId = session.user.id;

        const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/order/initiate`, {
            eventId,
            l1_expected_price: price,
            l1_order_quantity: quantity,
            action,
            outcome,
            userId
        });

        return {
            success: true,
            message: response.data.message || "Order Placed Successfully"
        }
    } catch (error) {
        console.error("Error placing order: ", error);
        if (axios.isAxiosError(error) && error.response) {
            return {
                success: false,
                message: error.response.data.message || "Failed to place order."
            }
        }
        return { success: false, message: "An unexpected error occurred." };
    }
}