import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma";
import { passkey } from "@better-auth/passkey"
import { twoFactor, haveIBeenPwned, organization, deviceAuthorization, apiKey } from "better-auth/plugins"
import { prisma } from "@/lib/prisma"

// Initialize BetterAuth with comprehensive configuratio
export const auth = betterAuth({
    appName: "dataroll",
    baseURL: "https://fun-five-psi.vercel.app/",
    basePath: "/api/auth",
    secret: process.env.BETTER_AUTH_SECRET,
      database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
    
    // Core authentication
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        minPasswordLength: 12,
        maxPasswordLength: 128,
        autoSignIn: true,
    },
    
    // Social OAuth providers
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
        github: {
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        },
        discord: {
            clientId: process.env.DISCORD_CLIENT_ID!,
            clientSecret: process.env.DISCORD_CLIENT_SECRET!,
        },
    },
    
    // Session configuration
    session: {
        strategy: "database",
        duration: 60 * 60 * 24 * 30, // 30 days
        updateAge: 60 * 60 * 24, // 24 hours
    },
    
    // Plugins configuration
    plugins: [
        // Check password against known breaches
        haveIBeenPwned({
            customPasswordCompromisedMessage: "This password has been compromised. Please choose a different one."
        }),
        
        // Passkey/WebAuthn support
        passkey({
            rpID: process.env.NODE_ENV === "production" ? "your-domain.com" : "localhost",
            rpName: "dataroll",
            origin: process.env.BETTER_AUTH_URL || "http://localhost:3000",
            authenticatorSelection: {
                residentKey: "preferred",
                userVerification: "preferred"
            }
        }),
        
        // 2FA (TOTP + Backup codes) - toggleable per user
        twoFactor({
            issuer: "dataroll",
            skipVerificationOnEnable: false
        }),

        // Organization management
        organization({
            allowUserToCreateOrganization: true,
            teams: {
                enabled: true,
                maximumTeams: 10,
                allowRemovingAllTeams: false
            }
        }),

        // Device authorization for CLI login
        deviceAuthorization({
            verificationUri: "/device",
        }),

        // API key management for CLI authentication
        apiKey({
            enableSessionForAPIKeys: true,
            defaultPrefix: "dataroll_",
        })
    ],
    
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
