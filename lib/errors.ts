// Standardized error handling for the dataroll application

export class DatarollError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly details?: any

  constructor(message: string, code: string, statusCode: number = 500, details?: any) {
    super(message)
    this.name = 'DatarollError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

export class ValidationError extends DatarollError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends DatarollError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends DatarollError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends DatarollError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends DatarollError {
  constructor(message: string, details?: any) {
    super(message, 'CONFLICT', 409, details)
    this.name = 'ConflictError'
  }
}

export class DatabaseConnectionError extends DatarollError {
  constructor(message: string, details?: any) {
    super(message, 'DATABASE_CONNECTION_ERROR', 500, details)
    this.name = 'DatabaseConnectionError'
  }
}

export class MigrationError extends DatarollError {
  constructor(message: string, details?: any) {
    super(message, 'MIGRATION_ERROR', 500, details)
    this.name = 'MigrationError'
  }
}

export class EncryptionError extends DatarollError {
  constructor(message: string, details?: any) {
    super(message, 'ENCRYPTION_ERROR', 500, details)
    this.name = 'EncryptionError'
  }
}

// Error response formatting
export interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: any
  }
}

export function formatError(error: unknown): ErrorResponse {
  if (error instanceof DatarollError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    }
  }

  if (error instanceof Error) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
    }
  }

  return {
    error: {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
    },
  }
}

// HTTP status code mapping for common errors
export function getStatusCode(error: unknown): number {
  if (error instanceof DatarollError) {
    return error.statusCode
  }

  if (error instanceof ValidationError) return 400
  if (error instanceof AuthenticationError) return 401
  if (error instanceof AuthorizationError) return 403
  if (error instanceof NotFoundError) return 404
  if (error instanceof ConflictError) return 409

  return 500
}

// Utility function to check if error is a specific type
export function isDatarollError(error: unknown): error is DatarollError {
  return error instanceof DatarollError
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError
}

export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError
}

export function isAuthorizationError(error: unknown): error is AuthorizationError {
  return error instanceof AuthorizationError
}

// Development vs Production error handling
export function getErrorMessage(error: unknown, isDevelopment: boolean = false): string {
  if (error instanceof DatarollError) {
    return isDevelopment ? `${error.message} (${error.code})` : error.message
  }

  if (error instanceof Error) {
    return isDevelopment ? `${error.message} (${error.name})` : 'An internal error occurred'
  }

  return 'An unknown error occurred'
}