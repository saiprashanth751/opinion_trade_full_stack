import { CredentialsProvider } from "next-auth/providers";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@repo/db/"

export const authOptions = {
    adapter: PrismaAdapter(prisma),
}

