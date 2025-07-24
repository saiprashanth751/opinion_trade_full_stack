"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@repo/db";

export async function getUserBalance() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return {
        success: false,
        message: "User not authenticated",
        balance: null,
      };
    }

    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        balance: true,
      },
    });

    if (!user) {
      return {
        success: false,
        message: "User not found",
        balance: null,
      };
    }

    return {
      success: true,
      message: "Balance fetched successfully",
      balance: user.balance,
    };
  } catch (error) {
    console.error("Error fetching user balance:", error);
    return {
      success: false,
      message: "Failed to fetch balance due to an internal error.",
      balance: null,
    };
  }
}
