import { authClient, signUp, useSession } from "@/lib/auth-client"
import { z } from "zod"

// Validation schemas for authentication
export const SignInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(12, "Password must be at least 12 characters"),
  twoFactorCode: z.string().optional(),
})

export const SignUpSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(12, "Password must be at least 12 characters").max(128, "Password must be less than 128 characters"),
})

export const TwoFactorSetupSchema = z.object({
  code: z.string().length(6, "2FA code must be 6 digits"),
})

export type SignInData = z.infer<typeof SignInSchema>
export type SignUpData = z.infer<typeof SignUpSchema>
export type TwoFactorSetupData = z.infer<typeof TwoFactorSetupSchema>

// Enhanced authentication service
export class AuthService {
  // Sign in with email/password and optional 2FA
  static async signInWithEmail(data: SignInData) {
    try {
      const validatedData = SignInSchema.parse(data)

      // First attempt sign in
      const result = await authClient.signIn.email({
        email: validatedData.email,
        password: validatedData.password,
      })

      // Check if 2FA is required
      if (result.data && "twoFactorRedirect" in result.data && result.data.twoFactorRedirect) {
        // If 2FA code is provided, verify it
        if (validatedData.twoFactorCode) {
          const verifyResult = await authClient.twoFactor.verifyTotp({
            code: validatedData.twoFactorCode,
          })
          if (verifyResult.error) {
            return {
              success: false,
              error: verifyResult.error.message || "Invalid 2FA code",
            }
          }
          return {
            success: true,
            data: verifyResult.data,
          }
        } else {
          // Return to indicate 2FA is needed
          return {
            success: false,
            requiresTwoFactor: true,
            error: "Two-factor authentication required",
          }
        }
      }

      return {
        success: true,
        data: result.data,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Sign in failed",
      }
    }
  }

  // Sign up with email/password
  static async signUpWithEmail(data: SignUpData) {
    try {
      const validatedData = SignUpSchema.parse(data)

      const result = await signUp.email({
        email: validatedData.email,
        password: validatedData.password,
        name: validatedData.name,
      })

      if (result.error) {
        return {
          success: false,
          error: result.error.message || "Sign up failed",
        }
      }

      return {
        success: true,
        data: result.data,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      }
    }
  }

  // Sign in with passkey
  static async signInWithPasskey() {
    try {
      const result = await authClient.signIn.passkey({})

      if (result.error) {
        return {
          success: false,
          error: result.error.message || "Passkey authentication failed",
        }
      }

      return {
        success: true,
        data: result.data,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      }
    }
  }

  // Add a new passkey
  static async addPasskey(name: string, authenticatorAttachment?: "platform" | "cross-platform") {
    try {
      const result = await authClient.passkey.addPasskey({
        name: name,
        authenticatorAttachment: authenticatorAttachment,
      })

      if (result.error) {
        return {
          success: false,
          error: result.error.message || "Failed to add passkey",
        }
      }

      return {
        success: true,
        data: result.data,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      }
    }
  }

  // Enable 2FA
  static async enableTwoFactor(password: string) {
    try {
      const result = await authClient.twoFactor.enable({
        password,
      })

      if (result.error) {
        return {
          success: false,
          error: result.error.message || "Failed to enable 2FA",
        }
      }

      return {
        success: true,
        data: result.data,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      }
    }
  }

  // Disable 2FA
  static async disableTwoFactor(password: string) {
    try {
      const result = await authClient.twoFactor.disable({
        password,
      })

      if (result.error) {
        return {
          success: false,
          error: result.error.message || "Failed to disable 2FA",
        }
      }

      return {
        success: true,
        data: result.data,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      }
    }
  }

  // Verify 2FA code
  static async verifyTwoFactor(code: string) {
    try {
      const result = await authClient.twoFactor.verifyTotp({
        code,
      })

      if (result.error) {
        return {
          success: false,
          error: result.error.message || "Invalid 2FA code",
        }
      }

      return {
        success: true,
        data: result.data,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      }
    }
  }

  // Sign in with social provider
  static async signInWithSocial(provider: "google" | "github" | "discord") {
    try {
      const result = await authClient.signIn.social({
        provider,
      })

      if (result.error) {
        return {
          success: false,
          error: result.error.message || "Social sign in failed",
        }
      }

      return {
        success: true,
        data: result.data,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      }
    }
  }

  // Organization methods
  static async createOrganization(data: { name: string; slug: string; logo?: string; metadata?: Record<string, unknown> }) {
    try {
      const result = await authClient.organization.create(data)

      if (result.error) {
        return {
          success: false,
          error: result.error.message || "Failed to create organization",
        }
      }

      return {
        success: true,
        data: result.data,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      }
    }
  }

  static async listOrganizations() {
    try {
      const result = await authClient.organization.list()

      if (result.error) {
        return {
          success: false,
          error: result.error.message || "Failed to list organizations",
        }
      }

      return {
        success: true,
        data: result.data,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      }
    }
  }

  static async setActiveOrganization(organizationId: string | null) {
    try {
      const result = await authClient.organization.setActive({
        organizationId,
      })

      if (result.error) {
        return {
          success: false,
          error: result.error.message || "Failed to set active organization",
        }
      }

      return {
        success: true,
        data: result.data,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      }
    }
  }

  // static async addMemberToOrganization(data: { userId?: string | null; role: string | string[]; organizationId?: string; teamId?: string }) {
  //   try {
  //     const result = await organization.addMember(data)

  //     if (result.error) {
  //       return {
  //         success: false,
  //         error: result.error.message || "Failed to add member to organization",
  //       }
  //     }

  //     return {
  //       success: true,
  //       data: result.data,
  //     }
  //   } catch (error) {
  //     return {
  //       success: false,
  //       error: error instanceof Error ? error.message : "An unexpected error occurred",
  //     }
  //   }
  // }

  // static async createInvitation(data: { email: string; role: string | string[]; organizationId?: string; resend?: boolean; teamId?: string }) {
  //   try {
  //     const result = await organization.createInvitation(data)

  //     if (result.error) {
  //       return {
  //         success: false,
  //         error: result.error.message || "Failed to create invitation",
  //       }
  //     }

  //     return {
  //       success: true,
  //       data: result.data,
  //     }
  //   } catch (error) {
  //     return {
  //       success: false,
  //       error: error instanceof Error ? error.message : "An unexpected error occurred",
  //     }
  //   }
  // }
}

// Re-export client utilities
export { authClient, useSession }
export type { Session, User } from "better-auth"