import { createAuthClient } from "better-auth/react"
import { passkeyClient } from "@better-auth/passkey/client"
import { twoFactorClient, organizationClient, deviceAuthorizationClient } from "better-auth/client/plugins"

// Create BetterAuth client instance with all plugins
export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || "https://fun-five-psi.vercel.app",
    plugins: [
        // Passkey/WebAuthn support
        passkeyClient(),
        
        // 2FA client plugin
        twoFactorClient(),

        deviceAuthorizationClient(),

        // Organization client plugin
        organizationClient({
            teams: {
                enabled: true
            }
        })
    ]
})

// Export client-side auth utilities
export const { 
    signIn, 
    signUp, 
    signOut, 
    useSession, 
    getSession,
    passkey,
    twoFactor,
    organization
} = authClient

// Re-export specific client methods for convenience
export const auth = authClient

// Types for better TypeScript support
export type { Session, User } from "better-auth"
