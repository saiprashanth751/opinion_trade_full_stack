"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@repo/db";
import { Trade, Event } from "@prisma/client";

// Define a more specific type for the returned trades, including event details
type TradeWithEvent = Trade & {
  event: Pick<Event, 'id' | 'title' | 'eventId'>;
};

export async function getTradeHistory() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return {
        success: false,
        message: "User not authenticated",
        trades: [],
      };
    }

    const trades = await prisma.trade.findMany({
      where: {
        OR: [
          { buyerId: session.user.id },
          { sellerId: session.user.id },
        ],
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            eventId: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc', // Order by most recent trades first
      },
    });

    return {
      success: true,
      message: "User trade history fetched successfully",
      trades: trades as TradeWithEvent[],
    };
  } catch (error) {
    console.error("Error fetching user trade history:", error);
    return {
      success: false,
      message: "Failed to fetch user trade history due to an internal error.",
      trades: [],
    };
  }
}
