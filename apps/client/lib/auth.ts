import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@repo/db/client"
import { DefaultSession, NextAuthOptions } from "next-auth";
import { adminAuth } from "@/lib/firebase-admin"

declare module "next-auth" {
    interface User {
        id?: string,
        phoneNumber?: string,
        isVerified?: boolean,
        balance?: number,
        firebaseUid?: string
    }

    interface Session {
        user: DefaultSession["user"] & {
            id?: string,
            phoneNumber?: string,
            isVerified?: boolean,
            balance?: number,
            firebaseUid?: string
        };
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id?: string,
        phoneNumber?: string,
        isVerified?: boolean,
        balance?: number,
        firebaseUid?: string
    }
}

export const authOptions: NextAuthOptions = {
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
                idToken: {
                    label: "Firebase ID Token",
                    type: "text"
                }
            },

            async authorize(credentials, req) {
                if (!credentials?.idToken) {
                    console.error("No Firebase ID token provided.");
                    return null;
                }

                try {
                    const decodedToken = await adminAuth.verifyIdToken(credentials.idToken)
                    const firebaseUid = decodedToken.uid;
                    const phoneNumber = decodedToken.phone_number;

                    if (!phoneNumber) {
                        console.error("Firebase ID token does not contain Phone Number.");
                        return null;
                    }

                    const isUserExists = await prisma.user.findUnique({
                        where: {
                            firebaseUid
                        }
                    })

                    if (isUserExists) {
                        return {
                            id: isUserExists.id,
                            phoneNumber: isUserExists.phoneNumber,
                            balance: isUserExists.balance,
                            role: isUserExists.role,
                            isVerified: true,
                            firebaseUid: isUserExists.firebaseUid,
                        };
                    }

                    const user = await prisma.user.create({
                        data: {
                            phoneNumber,
                            firebaseUid,
                            role: "USER",
                            balance: 0
                        }
                    })


                    return {
                        id: user.id,
                        firebaseUid: user.firebaseUid,
                        phoneNumber: user.phoneNumber,
                        balance: user.balance,
                        role: user.role,
                        isVerified: true,
                    };

                } catch (error) {
                    console.error("Error verifying Firebase ID token or managing user:", error)
                    return null;
                }

                // const isUserExists = await prisma.user.findFirst({
                //     where: {
                //         phoneNumber: credentials?.phoneNumber,
                //     },
                //     include: {
                //         OTP: {
                //             select: {
                //                 isVerified: true,
                //             }
                //         }
                //     }
                // });

                // const isUserVerified = isUserExists?.OTP && isUserExists.OTP.length > 0 ? isUserExists.OTP[0].isVerified : false;

                // if (isUserExists) {
                //     return {
                //         id: isUserExists?.id,
                //         phoneNumber: isUserExists?.phoneNumber,
                //         balance: isUserExists?.balance,
                //         role: isUserExists?.role,
                //         isVerified: isUserVerified
                //     };
                // }

                // const user = await prisma.user.create({
                //     data: {
                //         phoneNumber: credentials?.phoneNumber as string,
                //         role: "USER",
                //         balance: 0,
                //     }
                // })

                // await prisma.oTP.update({
                //     where: {
                //         otpID: credentials?.phoneNumber
                //     },
                //     data: {
                //         userId: user.id,
                //     },
                // });

                // Need to know more about this (... => usecases)
                // if (user) {
                //     return {
                //         ...user,  //Interesting concept !!
                //         isVerified: true
                //     };
                // } else {
                //     return null;
                // }
            }
        })
    ],

    callbacks: {
        // async signIn({ user, credentials }) {
        //     if (!user.isVerified) {
        //         return false;
        //     }

        //     const isUserExists = await prisma.user.findUnique({
        //         where: {
        //             phoneNumber: credentials?.phoneNumber as string,
        //         },
        //     })

        //     if (isUserExists) {
        //         return true;
        //     }

        //     return false;
        // },

        async jwt({ token, user }) {
            if (user) {
                token.phoneNumber = user.phoneNumber;
                token.isVerified = user.isVerified;
                token.id = user.id;
                token.balance = user.balance;
                token.firebaseUid = user.firebaseUid;
            }
            return token;
        },

        async session({ session, token }) {
            if (token) {
                session.user.phoneNumber = token.phoneNumber;
                session.user.isVerified = token.isVerified;
                session.user.id = token.id;
                session.user.balance = token.balance;
                session.user.firebaseUid = token.firebaseUid;
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
} satisfies NextAuthOptions
