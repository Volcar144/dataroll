'use server';

// Simple logger wrapper that uses console by default
// In production, this can be extended to use pino with Logflare
const logger = {
  error: (data: any) => {
    console.error('[ERROR]', typeof data === 'string' ? data : JSON.stringify(data));
  },
  info: (data: any) => {
    console.info('[INFO]', typeof data === 'string' ? data : JSON.stringify(data));
  },
  debug: (data: any) => {
    console.debug('[DEBUG]', typeof data === 'string' ? data : JSON.stringify(data));
  },
  warn: (data: any) => {
    console.warn('[WARN]', typeof data === 'string' ? data : JSON.stringify(data));
  },
};

export default logger;