import pino from 'pino';

// Detect if we're running in a serverless environment
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY;

// OpenTelemetry logger instance (lazy loaded)
let otelLogger: any = null;

// Get OpenTelemetry logger for emitting structured logs to exporters
async function getOTelLogger() {
  if (otelLogger) return otelLogger;
  
  try {
    const { logs } = await import('@opentelemetry/api-logs');
    otelLogger = logs.getLogger('dataroll', '1.0.0');
    return otelLogger;
  } catch {
    return null;
  }
}

// Emit log to OpenTelemetry (non-blocking)
function emitToOTel(level: string, message: string, attributes: Record<string, any> = {}) {
  getOTelLogger().then(logger => {
    if (!logger) return;
    
    try {
      const severityMap: Record<string, number> = {
        'trace': 1,
        'debug': 5,
        'info': 9,
        'warn': 13,
        'error': 17,
        'fatal': 21,
      };
      
      logger.emit({
        severityNumber: severityMap[level] || 9,
        severityText: level.toUpperCase(),
        body: message,
        attributes: {
          ...attributes,
          'service.name': 'dataroll',
          'deployment.environment': process.env.NODE_ENV || 'development',
        },
      });
    } catch {
      // Silently ignore OTel errors
    }
  }).catch(() => {});
}

// Create a pino logger that also emits to OpenTelemetry
function createLogger() {
  // Base pino configuration
  const baseConfig = {
    level: process.env.LOG_LEVEL || 'info',
    base: {
      env: process.env.NODE_ENV,
      app: 'dataroll',
    },
    formatters: {
      level: (label: string) => ({ level: label }),
    },
    // Hook into pino to also emit to OpenTelemetry
    hooks: {
      logMethod(inputArgs: any[], method: any, level: number) {
        // Map pino level numbers to level names
        const levelNames: Record<number, string> = {
          10: 'trace',
          20: 'debug',
          30: 'info',
          40: 'warn',
          50: 'error',
          60: 'fatal',
        };
        
        const levelName = levelNames[level] || 'info';
        
        // Extract message and attributes from pino args
        let message = '';
        let attributes: Record<string, any> = {};
        
        if (typeof inputArgs[0] === 'string') {
          message = inputArgs[0];
          if (inputArgs[1] && typeof inputArgs[1] === 'object') {
            attributes = inputArgs[1];
          }
        } else if (typeof inputArgs[0] === 'object') {
          attributes = { ...inputArgs[0] };
          message = attributes.msg || attributes.message || JSON.stringify(attributes);
          delete attributes.msg;
          delete attributes.message;
        }
        
        // Emit to OpenTelemetry exporters (Logflare + PostHog)
        emitToOTel(levelName, message, attributes);
        
        // Continue with normal pino logging
        return method.apply(this, inputArgs);
      },
    },
  };

  // In development, use pretty printing if available
  if (process.env.NODE_ENV === 'development' && !isServerless) {
    try {
      return pino({
        ...baseConfig,
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        },
      });
    } catch {
      // Fall through to default
    }
  }

  // Default: simple JSON logging
  return pino(baseConfig);
}

export const logger = createLogger();

export default logger;