"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@repo/db";
import { UserContract, Event } from "@prisma/client";


type UserContractWithEvent = UserContract & {
  event: Pick<Event, 'id' | 'title' | 'eventId'>;
};

export async function getUserContracts() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return {
        success: false,
        message: "User not authenticated",
        contracts: [],
      };
    }

    const contracts = await prisma.userContract.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            // there are two ids, this is dev implemented id...
            eventId: true,
          },
        },
      },
    });

    return {
      success: true,
      message: "User contracts fetched successfully",
      contracts: contracts as UserContractWithEvent[],
    };
  } catch (error) {
    console.error("Error fetching user contracts:", error);
    return {
      success: false,
      message: "Failed to fetch user contracts due to an internal error.",
      contracts: [],
    };
  }
}
