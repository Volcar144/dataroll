import { PrismaAdapter } from "@auth/prisma-adapter"
import { betterAuth } from "better-auth"
import { prisma } from "@/lib/prisma"
import type { NextRequest } from "next/server"

export const { auth, handlers, signIn, signOut } = betterAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database",
    duration: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // 24 hours
  },
  cookies: {
    sessionToken: {
      name: "better-auth.session-token",
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      },
    },
  },
  trustHost: true,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  // Enable password authentication
  password: {
    // Password validation options
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: false, // Allow passwords without symbols
  },
  // Email verification for security
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      // TODO: Implement email sending
      console.log("Verification email for", user.email, "URL:", url)
    },
  },
  // Custom callbacks for additional logic
  callbacks: {
    // Add user role to session
    session: async ({ session, user }) => {
      if (session?.user && user) {
        // Get user's primary team and role
        const teamMember = await prisma.teamMember.findFirst({
          where: { userId: user.id },
          include: { team: true }
        })
        
        session.user.id = user.id
        session.user.role = teamMember?.role || null
        session.user.teamId = teamMember?.teamId || null
      }
      return session
    },
    // Add team information to user
    user: async ({ user, account, profile }) => {
      // This runs after user is created/updated
      return user
    },
  },
  // Custom pages for auth
  pages: {
    signIn: "/auth/signin",
    signUp: "/auth/signup",
    error: "/auth/error",
  },
  // Custom forms
  forms: {
    signIn: {
      default: {
        email: {
          label: "Email address",
          placeholder: "you@example.com",
          type: "email",
          required: true,
        },
        password: {
          label: "Password",
          placeholder: "Enter your password",
          type: "password",
          required: true,
        },
      },
    },
    signUp: {
      default: {
        email: {
          label: "Email address",
          placeholder: "you@example.com",
          type: "email",
          required: true,
        },
        name: {
          label: "Full name",
          placeholder: "John Doe",
          type: "text",
          required: true,
        },
        password: {
          label: "Password",
          placeholder: "Create a strong password",
          type: "password",
          required: true,
        },
        confirmPassword: {
          label: "Confirm password",
          placeholder: "Confirm your password",
          type: "password",
          required: true,
        },
      },
    },
  },
})

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