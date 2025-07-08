import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST };


// NEXT WHAT
// Core - >  apps/client/app/(lobby)/auth/signin/page.tsx
// Core Dependency -> apps/client/components/landing/Auth/Singin.tsx
// Many other sub dependencies as you go on.