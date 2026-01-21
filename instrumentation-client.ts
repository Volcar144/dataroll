import posthog from "posthog-js"

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: "/ingest",
  ui_host: "https://eu.posthog.com",
  // Include the defaults option as required by PostHog
  defaults: '2025-05-24',
  // Enables capturing unhandled exceptions via Error Tracking
  capture_exceptions: true,
  // Turn on debug in development mode
  debug: process.env.NODE_ENV === "development",
});

// Helper to capture exceptions with proper PostHog method
export function captureException(
  error: Error | string,
  additionalProperties?: Record<string, any>
) {
  const err = typeof error === 'string' ? new Error(error) : error;
  posthog.captureException(err, {
    ...(additionalProperties || {}),
  });
}

// IMPORTANT: Never combine this approach with other client-side PostHog initialization approaches,
// especially components like a PostHogProvider. instrumentation-client.ts is the correct solution
// for initializing client-side PostHog in Next.js 15.3+ apps.
