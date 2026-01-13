/**
 * BetterAuth Configuration with Complete Plugin Support
 * 
 * This file demonstrates how to add all the BetterAuth plugins including passkey, haveIBeenPwned, and twoFactor.
 * 
 * To enable these plugins, uncomment the plugin imports and configuration below.
 * 
 * Note: Some plugins may require additional database tables or configuration.
 * Check the BetterAuth documentation for specific plugin requirements.
 */

import { betterAuth } from "better-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
// Uncomment these imports to enable plugins:
// import { passkey } from "@better-auth/passkey"
// import { twoFactor, haveIBeenPwned } from "better-auth/plugins"

// Initialize BetterAuth with comprehensive configuration and all plugins
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
    
    // Plugins configuration - Uncomment to enable
    // plugins: [
    //     // Check password against known breaches
    //     haveIBeenPwned({
    //         customPasswordCompromisedMessage: "This password has been compromised. Please choose a different one."
    //     }),
    //     
    //     // Passkey/WebAuthn support
    //     passkey({
    //         rpID: process.env.NODE_ENV === "production" ? "your-domain.com" : "localhost",
    //         rpName: "dataroll",
    //         origin: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    //         authenticatorSelection: {
    //             residentKey: "preferred",
    //             userVerification: "preferred"
    //         }
    //     }),
    //     
    //     // 2FA (TOTP + Backup codes) - toggleable per user
    //     twoFactor({
    //         issuer: "dataroll",
    //         skipVerificationOnEnable: false
    //     })
    // ],
    
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