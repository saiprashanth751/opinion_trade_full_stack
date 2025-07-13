import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@repo/db/client"
import { DefaultSession, NextAuthOptions } from "next-auth";

declare module "next-auth" {
    interface User {
        id?: string,
        phoneNumber?: string,
        isVerified?: boolean,
        balance?: number,
    }

    interface Session {
        user: DefaultSession["user"] & {
            id?: string,
            phoneNumber?: string,
            isVerified?: boolean,
            balance?: number,
        };
    }
}

declare module "next-auth/jwt" {
    interface JWT{
        id?: string,
        phoneNumber?: string,
        isVerified?: boolean,
        balance?: number,
    }
}

export const authOptions:NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                phoneNumber: {
                    label: "Phone",
                    type: "text",
                    placeholder: "Enter you 10 digit Mobile Number"
                },
            },

            async authorize(credentials, req) {
                const isUserExists = await prisma.user.findFirst({
                    where: {
                        phoneNumber: credentials?.phoneNumber,
                    },
                    include: {
                        OTP: {
                            select: {
                                isVerified: true,
                            }
                        }
                    }
                });

                const isUserVerified = isUserExists?.OTP && isUserExists.OTP.length > 0 ? isUserExists.OTP[0].isVerified : false;

                if (isUserExists) {
                    return {
                        id: isUserExists?.id,
                        phoneNumber: isUserExists?.phoneNumber,
                        balance: isUserExists?.balance,
                        role: isUserExists?.role,
                        isVerified: isUserVerified
                    };
                }

                const user = await prisma.user.create({
                    data: {
                        phoneNumber: credentials?.phoneNumber as string,
                        role: "USER",
                        balance: 0,
                    }
                })

                await prisma.oTP.update({
                    where: {
                        otpID: credentials?.phoneNumber
                    },
                    data: {
                        userId: user.id,
                    },
                });

                // Need to know more about this (... => usecases)
                if (user) {
                    return {
                        ...user,  //Interesting concept !!
                        isVerified: true
                    };
                } else {
                    return null;
                }
            }
        })
    ],
    callbacks: {
        async signIn({ user, credentials }) {
            if (!user.isVerified) {
                return false;
            }

            const isUserExists = await prisma.user.findUnique({
                where: {
                    phoneNumber: credentials?.phoneNumber as string,
                },
            })

            if (isUserExists) {
                return true;
            }

            return false;
        },

        async jwt({ token, user }) {
            if (user) {
                token.phoneNumber = user.phoneNumber;
                token.isVerified = user.isVerified;
                token.id = user.id;
                token.balance = user.balance;
            }
            return token;
        },

        async session({ session, token }) {
            if (token) {
                session.user.phoneNumber = token.phoneNumber;
                session.user.isVerified = token.isVerified;
                session.user.id = token.id;
                session.user.balance = token.balance;
            }
            return session;
        },
    },

    pages: {
        signIn: "/auth/signin",
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET || "secret",
}satisfies NextAuthOptions
