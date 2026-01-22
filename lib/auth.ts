import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma";
import { passkey } from "@better-auth/passkey"
import { twoFactor, haveIBeenPwned, organization, deviceAuthorization, apiKey } from "better-auth/plugins"
import { prisma } from "@/lib/prisma"
import { sendPasswordResetEmail } from "@/lib/email"

const betterAuthBaseUrl = (process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "https://fun-five-psi.vercel.app").replace(/\/+$/, "")
const betterAuthHost = betterAuthBaseUrl.replace(/^https?:\/\//, "").split("/")[0]

// Initialize BetterAuth with comprehensive configuration
export const auth = betterAuth({
    appName: "dataroll",
    baseURL: betterAuthBaseUrl,
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
        // Password reset configuration
        sendResetPassword: async ({ user, url, token }, request) => {
            // Don't await to prevent timing attacks
            void sendPasswordResetEmail(user.email, url, user.name || 'User');
        },
        resetPasswordTokenExpiresIn: 3600, // 1 hour
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
            customPasswordCompromisedMessage: "This password has been found in a data breach and cannot be used. Please choose a different, stronger password (minimum 12 characters)."
        }),
        
        // Passkey/WebAuthn support
        passkey({
            rpID: process.env.NODE_ENV === "production" ? betterAuthHost : "localhost",
            rpName: "dataroll",
            origin: betterAuthBaseUrl,
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

        // Organization management - DISABLED to avoid conflicts with custom team system
        // organization({
        //     allowUserToCreateOrganization: true,
        //     teams: {
        //         enabled: true,
        //         maximumTeams: 10,
        //         allowRemovingAllTeams: false
        //     }
        // }),

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
