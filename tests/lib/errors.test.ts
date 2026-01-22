import { describe, it, expect } from 'vitest'
import {
  DatarollError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  formatError,
  getStatusCode,
  isDatarollError,
  isValidationError,
  isAuthenticationError,
  isAuthorizationError,
  getErrorMessage,
} from '@/lib/errors'

describe('Error Classes', () => {
  describe('DatarollError', () => {
    it('should create a custom error', () => {
      const error = new DatarollError('Test error', 'TEST_CODE', 500, { detail: 'info' })

      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_CODE')
      expect(error.statusCode).toBe(500)
      expect(error.details).toEqual({ detail: 'info' })
      expect(error.name).toBe('DatarollError')
    })
  })

  describe('ValidationError', () => {
    it('should create a validation error with 400 status', () => {
      const error = new ValidationError('Invalid input', { field: 'email' })

      expect(error.message).toBe('Invalid input')
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.statusCode).toBe(400)
      expect(error.details).toEqual({ field: 'email' })
    })
  })

  describe('AuthenticationError', () => {
    it('should create an authentication error with 401 status', () => {
      const error = new AuthenticationError()

      expect(error.message).toBe('Authentication required')
      expect(error.code).toBe('AUTHENTICATION_ERROR')
      expect(error.statusCode).toBe(401)
    })

    it('should accept custom message', () => {
      const error = new AuthenticationError('Invalid token')

      expect(error.message).toBe('Invalid token')
    })
  })

  describe('AuthorizationError', () => {
    it('should create an authorization error with 403 status', () => {
      const error = new AuthorizationError()

      expect(error.message).toBe('Insufficient permissions')
      expect(error.code).toBe('AUTHORIZATION_ERROR')
      expect(error.statusCode).toBe(403)
    })
  })

  describe('NotFoundError', () => {
    it('should create a not found error with 404 status', () => {
      const error = new NotFoundError('User')

      expect(error.message).toBe('User not found')
      expect(error.code).toBe('NOT_FOUND')
      expect(error.statusCode).toBe(404)
    })
  })

  describe('getStatusCode', () => {
    it('should return correct status codes for DatarollError types', () => {
      expect(getStatusCode(new ValidationError('test'))).toBe(400)
      expect(getStatusCode(new AuthenticationError())).toBe(401)
      expect(getStatusCode(new AuthorizationError())).toBe(403)
      expect(getStatusCode(new NotFoundError('User'))).toBe(404)
      expect(getStatusCode(new ConflictError('test'))).toBe(409)
    })

    it('should return 500 for generic errors', () => {
      expect(getStatusCode(new Error('test'))).toBe(500)
      expect(getStatusCode('string error')).toBe(500)
    })
  })

  describe('Type Guards', () => {
    it('should correctly identify DatarollError', () => {
      const error = new ValidationError('test')
      expect(isDatarollError(error)).toBe(true)
      expect(isDatarollError(new Error('test'))).toBe(false)
    })

    it('should correctly identify ValidationError', () => {
      expect(isValidationError(new ValidationError('test'))).toBe(true)
      expect(isValidationError(new AuthenticationError())).toBe(false)
    })

    it('should correctly identify AuthenticationError', () => {
      expect(isAuthenticationError(new AuthenticationError())).toBe(true)
      expect(isAuthenticationError(new ValidationError('test'))).toBe(false)
    })

    it('should correctly identify AuthorizationError', () => {
      expect(isAuthorizationError(new AuthorizationError())).toBe(true)
      expect(isAuthorizationError(new NotFoundError('User'))).toBe(false)
    })
  })

  describe('getErrorMessage', () => {
    it('should return message in production mode', () => {
      const error = new ValidationError('Invalid data')
      expect(getErrorMessage(error, false)).toBe('Invalid data')
    })

    it('should include code in development mode', () => {
      const error = new ValidationError('Invalid data')
      expect(getErrorMessage(error, true)).toBe('Invalid data (VALIDATION_ERROR)')
    })

    it('should handle generic errors in production', () => {
      const error = new Error('Something broke')
      expect(getErrorMessage(error, false)).toBe('An internal error occurred')
    })

    it('should show details in development', () => {
      const error = new Error('Something broke')
      expect(getErrorMessage(error, true)).toBe('Something broke (Error)')
    })

    it('should handle unknown errors', () => {
      expect(getErrorMessage('string error', false)).toBe('An unknown error occurred')
      expect(getErrorMessage('string error', true)).toBe('An unknown error occurred')
    })
  })

  describe('formatError', () => {
    it('should format DatarollError correctly', () => {
      const error = new ValidationError('Invalid data', { field: 'name' })
      const formatted = formatError(error)

      expect(formatted).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid data',
          details: { field: 'name' },
        },
      })
    })

    it('should format generic Error correctly', () => {
      const error = new Error('Something went wrong')
      const formatted = formatError(error)

      expect(formatted).toEqual({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Something went wrong',
        },
      })
    })

    it('should format unknown errors', () => {
      const formatted = formatError('string error')

      expect(formatted).toEqual({
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unknown error occurred',
        },
      })
    })
  })
})
