import { auth } from "@/lib/auth"
import { captureServerException } from "@/lib/posthog-server"
import { NextRequest, NextResponse } from "next/server"

// Wrap BetterAuth handlers with error tracking
async function handleRequest(request: NextRequest) {
  try {
    return await auth.handler(request)
  } catch (error) {
    // Log to PostHog
    await captureServerException(
      error instanceof Error ? error : new Error(String(error)),
      undefined,
      {
        path: request.nextUrl.pathname,
        method: request.method,
        context: 'auth_handler'
      }
    )
    
    // Also log to console for immediate visibility
    console.error('[AUTH ERROR]', {
      path: request.nextUrl.pathname,
      method: request.method,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json(
      { error: { message: "Authentication service error" } },
      { status: 500 }
    )
  }
}

export const GET = handleRequest
export const POST = handleRequest