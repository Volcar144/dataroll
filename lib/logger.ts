'use server';

import pino from 'pino';
import { transport as pinoLogflareTransport } from 'pino-logflare';

const logflareApiKey = process.env.LOGFLARE_API_KEY;
const logflareSourceToken = process.env.LOGFLARE_SOURCE_TOKEN;

let logger: pino.Logger;

if (logflareApiKey && logflareSourceToken) {
  const transport = pino.transport({
    target: 'pino-logflare',
    options: {
      apiKey: logflareApiKey,
      sourceToken: logflareSourceToken,
      // Optionally add onError/onPreparePayload here
    },
  });
  logger = pino(transport);
} else {
  logger = pino();
}

export default logger;