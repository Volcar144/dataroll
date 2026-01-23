// instrumentation.ts - OpenTelemetry setup for Next.js with @vercel/otel
import { registerOTel } from '@vercel/otel';

export function register() {
  // Register OpenTelemetry with Vercel's optimized setup
  // This handles traces and spans automatically
  registerOTel({
    serviceName: 'dataroll',
    // We'll configure custom log exporters separately
  });

  // Set up custom log exporters for Logflare and PostHog
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    setupLogExporters();
  }
}

async function setupLogExporters() {
  try {
    const { logs } = await import('@opentelemetry/api-logs');
    const { LoggerProvider, SimpleLogRecordProcessor } = await import('@opentelemetry/sdk-logs');
    const { OTLPLogExporter } = await import('@opentelemetry/exporter-logs-otlp-http');

    const processors: any[] = [];

    // Logflare Exporter
    const logflareSourceId = process.env.LOGFLARE_SOURCE_ID;
    const logflareApiKey = process.env.LOGFLARE_API_KEY;
    
    if (logflareSourceId && logflareApiKey) {
      const logflareExporter = new OTLPLogExporter({
        url: 'https://otel.logflare.app:443/v1/logs',
        headers: {
          'x-source': logflareSourceId,
          'x-api-key': logflareApiKey,
        },
      });
      
      processors.push(new SimpleLogRecordProcessor(logflareExporter));
      console.log('[OTel] Logflare log exporter configured');
    }

    // PostHog Exporter
    const posthogApiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || '/ingest';
    
    if (posthogApiKey) {
      // PostHog uses their own OTLP endpoint with API key auth
      const posthogExporter = new OTLPLogExporter({
        url: `${posthogHost.replace('/i.posthog.com', '.i.posthog.com')}/i/v1/logs`,
        headers: {
          'Authorization': `Bearer ${posthogApiKey}`,
        },
      });
      
      processors.push(new SimpleLogRecordProcessor(posthogExporter));
      console.log('[OTel] PostHog log exporter configured');
    }

    if (processors.length > 0) {
      // Create logger provider with processors
      const loggerProvider = new LoggerProvider({
        processors,
      });

      // Set as global logger provider
      logs.setGlobalLoggerProvider(loggerProvider);
      console.log('[OTel] Log exporters initialized');
    }
  } catch (error) {
    console.error('[OTel] Failed to setup log exporters:', error);
  }
}

// Server-side error capture for Next.js
export const onRequestError = async (err: Error, request: any, context: any) => {
  // Only run in Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { getPostHogClient } = await import('./lib/posthog-server');
      const posthog = getPostHogClient();
      
      let distinctId: string | undefined = undefined;
      
      // Try to extract distinct_id from PostHog cookie
      if (request.headers?.cookie) {
        try {
          const cookieString = Array.isArray(request.headers.cookie) 
            ? request.headers.cookie.join('; ') 
            : request.headers.cookie;

          const postHogCookieMatch = cookieString.match(/ph_phc_.*?_posthog=([^;]+)/);

          if (postHogCookieMatch && postHogCookieMatch[1]) {
            const decodedCookie = decodeURIComponent(postHogCookieMatch[1]);
            const postHogData = JSON.parse(decodedCookie);
            distinctId = postHogData.distinct_id;
          }
        } catch (e) {
          // Ignore cookie parsing errors
        }
      }

      // Capture the exception with additional context
      posthog.capture({
        distinctId: distinctId || 'server',
        event: '$exception',
        properties: {
          $exception_type: err.name,
          $exception_message: err.message,
          $exception_stack_trace_raw: err.stack,
          request_url: request.url,
          request_method: request.method,
          context: 'server-side-request',
        },
      });
    } catch (e) {
      console.error('[OTel] Failed to capture exception:', e);
    }
  }
};
