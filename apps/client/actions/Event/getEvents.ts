"use server"
import prisma from "@repo/db"

export async function getEvents() {
    try {
        const events = prisma.event.findMany();
        return events;
    } catch (error) {
        console.error("Error fetching events", error);
        return [];
    }
}