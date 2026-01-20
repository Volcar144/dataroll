// instrumentation.ts - Server-side error capture for Next.js
export function register() {
  // No-op for initialization
}

export const onRequestError = async (err: Error, request: any, context: any) => {
  // Only run in Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getPostHogClient } = require('./lib/posthog-server')
    const posthog = getPostHogClient()
    
    let distinctId: string | undefined = undefined
    
    // Try to extract distinct_id from PostHog cookie
    if (request.headers.cookie) {
      try {
        // Normalize multiple cookie arrays to string
        const cookieString = Array.isArray(request.headers.cookie) 
          ? request.headers.cookie.join('; ') 
          : request.headers.cookie

        // Match PostHog cookie pattern (ph_<project_key>_posthog)
        const postHogCookieMatch = cookieString.match(/ph_phc_.*?_posthog=([^;]+)/)

        if (postHogCookieMatch && postHogCookieMatch[1]) {
          const decodedCookie = decodeURIComponent(postHogCookieMatch[1])
          const postHogData = JSON.parse(decodedCookie)
          distinctId = postHogData.distinct_id
        }
      } catch (e) {
        console.error('Error parsing PostHog cookie:', e)
      }
    }

    // Capture the exception with additional context
    await posthog.captureException(err, {
      distinct_id: distinctId,
      $exception_type: err.name,
      $exception_message: err.message,
      $exception_stack_trace_raw: err.stack,
      request_url: request.url,
      request_method: request.method,
      context: 'server-side-request',
    })
  }
}
