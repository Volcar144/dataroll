"use client"

import { useState } from "react"
import posthog from "posthog-js"
import { Button } from "@/components/ui/button"

export default function ErrorTrackingTest() {
  const [lastError, setLastError] = useState<string>("")

  const testClientError = () => {
    try {
      const error = new Error("Test client-side error from test page")
      posthog.captureException(error, {
        test: true,
        source: "error-tracking-test-page",
        timestamp: new Date().toISOString(),
      })
      setLastError("Client-side error captured! Check PostHog dashboard.")
    } catch (e) {
      setLastError("Failed to capture error: " + String(e))
    }
  }

  const testErrorBoundary = () => {
    throw new Error("Test error boundary - this will trigger app/error.tsx")
  }

  const testServerError = async () => {
    try {
      const response = await fetch("/api/test-error-tracking")
      const data = await response.json()
      setLastError(data.message || "Server error captured!")
    } catch (e) {
      setLastError("Failed to test server error: " + String(e))
    }
  }

  return (
    <div className="container mx-auto p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">PostHog Error Tracking Test</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Test error tracking functionality on both client and server side.
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-xl font-semibold mb-4">Test Scenarios</h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <Button
                onClick={testClientError}
                variant="outline"
                className="w-48"
              >
                Test Client Error
              </Button>
              <div className="flex-1">
                <p className="text-sm font-medium">Manual Client-Side Capture</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Captures an error using posthog.captureException()
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Button
                onClick={testErrorBoundary}
                variant="outline"
                className="w-48"
              >
                Test Error Boundary
              </Button>
              <div className="flex-1">
                <p className="text-sm font-medium">Error Boundary Capture</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Throws an error to trigger the error.tsx boundary
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Button
                onClick={testServerError}
                variant="outline"
                className="w-48"
              >
                Test Server Error
              </Button>
              <div className="flex-1">
                <p className="text-sm font-medium">Server-Side Error Capture</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Triggers an error in an API route
                </p>
              </div>
            </div>
          </div>
        </div>

        {lastError && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
            <p className="text-sm font-medium text-green-900 dark:text-green-100">
              {lastError}
            </p>
          </div>
        )}

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            ℹ️ Verify in PostHog
          </h3>
          <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
            <li>Go to your PostHog dashboard (https://eu.posthog.com)</li>
            <li>Click on "Error Tracking" in the sidebar</li>
            <li>Look for the test errors you just triggered</li>
            <li>Check that stack traces and custom properties are visible</li>
          </ol>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="text-sm font-medium mb-2">Environment Info</h3>
          <div className="text-xs space-y-1 text-zinc-600 dark:text-zinc-400">
            <p>PostHog Host: {process.env.NEXT_PUBLIC_POSTHOG_HOST || "Not set"}</p>
            <p>PostHog Key: {process.env.NEXT_PUBLIC_POSTHOG_KEY ? "✓ Set" : "✗ Not set"}</p>
            <p>Environment: {process.env.NODE_ENV}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
