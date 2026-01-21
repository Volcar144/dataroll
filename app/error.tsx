"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import Link from "next/link"
import posthog from "posthog-js"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Track error in PostHog (client-side only)
    try {
      posthog.captureException(error, {
        $exception_type: error.name,
        $exception_message: error.message,
        $exception_stack_trace_raw: error.stack,
        digest: error.digest,
      })
    } catch (err) {
      console.error('Failed to track error', err)
    }
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/20 ring-1 ring-rose-500/30">
            <AlertTriangle className="h-8 w-8 text-rose-400" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">Something went wrong</h1>
          <p className="text-sm text-slate-400">
            An unexpected error occurred. Our team has been notified and will investigate.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-4 space-y-2">
            <p className="text-xs font-mono text-rose-300 break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-slate-500">
                Error ID: <span className="text-slate-400 font-mono">{error.digest}</span>
              </p>
            )}
            {process.env.NODE_ENV === 'development' && error.stack && (
              <details className="text-xs text-slate-400">
                <summary className="cursor-pointer hover:text-slate-300 transition-colors">Stack trace</summary>
                <pre className="mt-2 overflow-auto max-h-32 text-slate-500 text-xs">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 text-emerald-950 px-4 py-2 font-semibold hover:bg-emerald-400 transition-colors shadow-lg"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 px-4 py-2 font-semibold hover:bg-slate-700 transition-colors"
          >
            <Home className="h-4 w-4" />
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
