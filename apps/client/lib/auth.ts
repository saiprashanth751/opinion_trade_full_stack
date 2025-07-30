import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@repo/db/client";
import { DefaultSession, NextAuthOptions } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name?: string | null;
    emailVerified?: Date | null;
    balance: number;
    role: string;
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      email: string;
      emailVerified?: Date | null;
      balance: number;
      role: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    emailVerified?: Date | null;
    balance: number;
    role: string;
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "login",
      name: "Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const { email, password } = loginSchema.parse(credentials);

          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user) {
            return null;
          }

          if (!user.emailVerified) {
            throw new Error("Please verify your email before signing in");
          }

          const isPasswordValid = await bcrypt.compare(password, user.password);
          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            emailVerified: user.emailVerified,
            balance: user.balance,
            role: user.role,
          };
        } catch (error) {
          console.error("Login error:", error);
          if (error instanceof Error && error.message.includes("verify your email")) {
            throw error; // Re-throw the specific error message
          }
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.emailVerified = user.emailVerified;
        token.balance = user.balance;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.emailVerified = token.emailVerified;
        session.user.balance = token.balance;
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};