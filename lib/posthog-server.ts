import { PostHog } from 'posthog-node';

let posthogClient: PostHog | null = null;

export function getPostHogClient() {
  if (!posthogClient) {
    posthogClient = new PostHog(
      process.env.NEXT_PUBLIC_POSTHOG_KEY!,
      {
        host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        flushAt: 1,
        flushInterval: 0
      }
    );
  }
  return posthogClient;
}

export async function shutdownPostHog() {
  if (posthogClient) {
    await posthogClient.shutdown();
  }
}

// Helper to capture exceptions server-side
export async function captureServerException(
  error: Error,
  distinctId?: string,
  additionalProperties?: Record<string, any>
) {
  const posthog = getPostHogClient();
  
  await posthog.captureException(error, {
    distinct_id: distinctId,
    $exception_type: error.name,
    $exception_message: error.message,
    $exception_stack_trace_raw: error.stack,
    ...additionalProperties,
  });
}
