import { NextRequest, NextResponse } from 'next/server'
import { captureServerException } from '@/lib/posthog-server'

export async function GET(request: NextRequest) {
  try {
    // Simulate an error
    throw new Error("Test server-side error from API route")
  } catch (error) {
    // Capture the error
    await captureServerException(
      error instanceof Error ? error : new Error(String(error)),
      undefined, // No user ID for this test
      {
        test: true,
        source: "test-error-tracking-api",
        endpoint: "/api/test-error-tracking",
        timestamp: new Date().toISOString(),
      }
    )

    console.log("Server error captured in PostHog")
    
    return NextResponse.json({
      message: "Server error captured! Check PostHog dashboard.",
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
