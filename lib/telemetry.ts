// Basic logging and telemetry setup for dataroll

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: Date
  level: LogLevel
  message: string
  data?: any
  error?: Error
  requestId?: string
  userId?: string
  teamId?: string
}

export class Logger {
  private static instance: Logger
  private minLevel: LogLevel

  constructor(minLevel: LogLevel = LogLevel.INFO) {
    this.minLevel = minLevel
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel
  }

  private formatLogEntry(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString()
    const level = LogLevel[entry.level]
    const context = [
      entry.requestId && `req:${entry.requestId}`,
      entry.userId && `user:${entry.userId}`,
      entry.teamId && `team:${entry.teamId}`,
    ].filter(Boolean).join(' ')

    let message = `[${timestamp}] ${level}`
    if (context) message += ` ${context}`
    message += `: ${entry.message}`

    if (entry.data) {
      message += ` ${JSON.stringify(entry.data)}`
    }

    if (entry.error) {
      message += `\n${entry.error.stack}`
    }

    return message
  }

  private async writeLog(entry: LogEntry): Promise<void> {
    const formattedMessage = this.formatLogEntry(entry)
    
    // In development, also log to console
    if (process.env.NODE_ENV === 'development') {
      switch (entry.level) {
        case LogLevel.DEBUG:
          console.debug(formattedMessage)
          break
        case LogLevel.INFO:
          console.info(formattedMessage)
          break
        case LogLevel.WARN:
          console.warn(formattedMessage)
          break
        case LogLevel.ERROR:
          console.error(formattedMessage)
          break
      }
    }

    // In production, you would send to your logging service
    // For now, we'll just write to stdout
    if (process.env.NODE_ENV === 'production') {
      process.stdout.write(formattedMessage + '\n')
    }
  }

  debug(message: string, data?: any, context?: Partial<LogEntry>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.writeLog({
        timestamp: new Date(),
        level: LogLevel.DEBUG,
        message,
        data,
        ...context,
      })
    }
  }

  info(message: string, data?: any, context?: Partial<LogEntry>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.writeLog({
        timestamp: new Date(),
        level: LogLevel.INFO,
        message,
        data,
        ...context,
      })
    }
  }

  warn(message: string, data?: any, context?: Partial<LogEntry>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.writeLog({
        timestamp: new Date(),
        level: LogLevel.WARN,
        message,
        data,
        ...context,
      })
    }
  }

  error(message: string, error?: Error, data?: any, context?: Partial<LogEntry>): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.writeLog({
        timestamp: new Date(),
        level: LogLevel.ERROR,
        message,
        data,
        error,
        ...context,
      })
    }
  }
}

// Create and export a singleton logger
export const logger = Logger.getInstance()

// Context helpers for request tracking
export interface RequestContext {
  requestId: string
  userId?: string
  teamId?: string
  ipAddress?: string
  userAgent?: string
}

let currentContext: RequestContext | null = null

export function setRequestContext(context: RequestContext): void {
  currentContext = context
}

export function getRequestContext(): RequestContext | null {
  return currentContext
}

export function clearRequestContext(): void {
  currentContext = null
}

// Logging helpers for different operations
export const authLogger = {
  login: (email: string, success: boolean, context?: Partial<LogEntry>) => {
    logger.info(`User login attempt: ${email}`, { success }, {
      userId: context?.userId,
      teamId: context?.teamId,
      ...context,
    })
  },
  logout: (userId: string, context?: Partial<LogEntry>) => {
    logger.info('User logout', { userId }, context)
  },
  signup: (email: string, success: boolean, context?: Partial<LogEntry>) => {
    logger.info(`User signup: ${email}`, { success }, context)
  },
}

export const dbLogger = {
  connection: {
    success: (connectionId: string, type: string, context?: Partial<LogEntry>) => {
      logger.info('Database connection successful', { connectionId, type }, context)
    },
    failure: (connectionId: string, type: string, error: Error, context?: Partial<LogEntry>) => {
      logger.error('Database connection failed', error, { connectionId, type }, context)
    },
  },
  query: {
    execution: (sql: string, duration: number, success: boolean, context?: Partial<LogEntry>) => {
      logger.debug('Database query', { sql: sql.substring(0, 100), duration, success }, context)
    },
  },
}

export const migrationLogger = {
  created: (migrationId: string, version: string, context?: Partial<LogEntry>) => {
    logger.info('Migration created', { migrationId, version }, context)
  },
  executed: (migrationId: string, duration: number, success: boolean, context?: Partial<LogEntry>) => {
    if (success) {
      logger.info('Migration executed successfully', { migrationId, duration }, context)
    } else {
      logger.error('Migration execution failed', undefined, { migrationId, duration }, context)
    }
  },
  rolledBack: (migrationId: string, reason: string, context?: Partial<LogEntry>) => {
    logger.info('Migration rolled back', { migrationId, reason }, context)
  },
}

export const securityLogger = {
  unauthorized: (action: string, resource: string, context?: Partial<LogEntry>) => {
    logger.warn('Unauthorized access attempt', { action, resource }, context)
  },
  suspicious: (description: string, details?: any, context?: Partial<LogEntry>) => {
    logger.warn('Suspicious activity detected', { description, details }, context)
  },
}