"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { addToOrderQueue } from "@trade/order-queue";
import { ON_RAMP } from "@trade/types";
import { v4 as uuidv4 } from "uuid";

export async function rechargeBalance(amount: number) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return {
        success: false,
        message: "User not authenticated",
      };
    }

    if (amount <= 0) {
      return {
        success: false,
        message: "Recharge amount must be positive.",
      };
    }

    const userId = session.user.id;
    const txnId = uuidv4(); // Generate a unique transaction ID

    const messageForEngine = {
      type: ON_RAMP,
      data: {
        amount: amount,
        userId: userId,
        txnId: txnId, // Pass the transaction ID
      },
    };

    await addToOrderQueue({
      clientId: uuidv4(), // A new client ID for this specific request
      message: messageForEngine,
    });

    return {
      success: true,
      message: `Recharge of ₹${amount} initiated successfully.`,
    };
  } catch (error) {
    console.error("Error initiating balance recharge:", error);
    return {
      success: false,
      message: "Failed to initiate recharge due to an internal error.",
    };
  }
}
