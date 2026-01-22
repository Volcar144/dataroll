'use server';

import pino from 'pino';

// Create Logflare transport if credentials are available
function createLogger() {
  const apiKey = process.env.LOGFLARE_API_KEY;

  // If Logflare credentials are configured, use pino with Logflare transport
  if (apiKey) {
    const transport = pino.transport({
      target: 'pino-logflare',
      options: {
        apiKey,
        sourceName: "dataroll.all",
        // Batch logs for better performance (send every 10 logs or after timeout)
        size: 10,
      },
    });

    return pino(
      {
        level: process.env.LOG_LEVEL || 'info',
        base: {
          env: process.env.NODE_ENV,
          app: 'dataroll',
        },
      },
      transport
    );
  }

  // Fallback to console logging in development or when Logflare isn't configured
  return pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
    base: {
      env: process.env.NODE_ENV,
      app: 'dataroll',
    },
  });
}

export const logger = createLogger();

export default logger;