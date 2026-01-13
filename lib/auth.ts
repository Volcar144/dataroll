import { betterAuth } from "better-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

// Initialize BetterAuth with comprehensive configuration
export const auth = betterAuth({
    appName: "dataroll",
    baseURL: process.env.BETTER_AUTH_URL,
    basePath: "/api/auth",
    secret: process.env.BETTER_AUTH_SECRET,
    database: PrismaAdapter(prisma),
    
    // Core authentication
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        minPasswordLength: 12,
        maxPasswordLength: 128,
        autoSignIn: true,
    },
    
    // Session configuration
    session: {
        strategy: "database",
        duration: 60 * 60 * 24 * 30, // 30 days
        updateAge: 60 * 60 * 24, // 24 hours
    },
    
    // User configuration
    user: {
        changeEmail: { enabled: true },
        deleteUser: { enabled: true }
    },
    
    // Additional security settings
    trustHost: true,
})

// Export handler for API routes
export const handlers = auth.handler

// Export getSession function for server-side session management
export const getSession = auth.api.getSession