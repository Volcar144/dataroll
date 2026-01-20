"use client"

import posthog from "posthog-js"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Capture the error in PostHog
    posthog.captureException(error, {
      $exception_type: error.name,
      $exception_message: error.message,
      $exception_stack_trace_raw: error.stack,
      digest: error.digest,
    })
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-lg dark:bg-zinc-900">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Something went wrong!
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            We've been notified and are looking into it.
          </p>
          {error.digest && (
            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <Button
            onClick={reset}
            className="w-full"
          >
            Try again
          </Button>
          <Button
            onClick={() => window.location.href = '/'}
            variant="outline"
            className="w-full"
          >
            Go back home
          </Button>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 rounded border border-zinc-200 p-4 dark:border-zinc-700">
            <summary className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Error details (dev only)
            </summary>
            <pre className="mt-2 overflow-auto text-xs text-zinc-600 dark:text-zinc-400">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}
