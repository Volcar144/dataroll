import { betterAuth } from "better-auth"
import { prisma } from "@/lib/prisma"
import { PrismaAdapter } from "@auth/prisma-adapter"

// Initialize BetterAuth
export const auth = betterAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database",
    duration: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // 24 hours
  },
  trustHost: true,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: false,
  },
})

// Export session getter and handlers using type assertion
export const getSession = (auth as any).getSession.bind(auth)
export const handlers = (auth as any).handleAuth.bind(auth)

// Type definitions for session user
declare module "better-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role?: string | null
      teamId?: string | null
    }
  }
}