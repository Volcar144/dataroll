"use client"

import posthog from "posthog-js"
import NextError from "next/error"
import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Capture the global error in PostHog
    posthog.captureException(error, {
      $exception_type: error.name,
      $exception_message: error.message,
      $exception_stack_trace_raw: error.stack,
      digest: error.digest,
      context: 'global-error-boundary',
    })
  }, [error])

  return (
    // global-error must include html and body tags
    <html>
      <body>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
            Application Error
          </h1>
          <p style={{ marginBottom: '1rem', color: '#666' }}>
            We've encountered a critical error and are working to fix it.
          </p>
          {error.digest && (
            <p style={{ fontSize: '0.875rem', color: '#999', marginBottom: '1rem' }}>
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#000',
              color: '#fff',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
        {/* Fallback to Next.js default error page */}
        {process.env.NODE_ENV === 'development' && (
          <NextError statusCode={0} />
        )}
      </body>
    </html>
  )
}
