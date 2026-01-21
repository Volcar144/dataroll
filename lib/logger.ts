import pino from 'pino';

const logflareApiKey = process.env.LOGFLARE_API_KEY;


let logger: pino.Logger;

if (logflareApiKey) {
  const transport = pino.transport({
    target: 'pino-logflare',
    options: {
      apiKey: logflareApiKey,
      sourceName: "dataroll.all",
      // Optionally add onError/onPreparePayload here
    },
  });
  logger = pino(transport);
} else {
  logger = pino();
}

export default logger;
