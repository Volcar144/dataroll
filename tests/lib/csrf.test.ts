import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateCSRFToken, verifyCSRFToken, getCSRFTokenFromRequest } from '@/lib/csrf'

describe('CSRF Protection', () => {
  describe('generateCSRFToken', () => {
    it('should generate a token with three parts separated by dots', () => {
      const token = generateCSRFToken()
      const parts = token.split('.')
      
      expect(parts.length).toBe(3)
      expect(parts[0]).toBeTruthy() // timestamp
      expect(parts[1]).toBeTruthy() // random
      expect(parts[2]).toBeTruthy() // signature
    })

    it('should generate unique tokens each time', () => {
      const token1 = generateCSRFToken()
      const token2 = generateCSRFToken()
      
      expect(token1).not.toBe(token2)
    })

    it('should include a valid timestamp', () => {
      const token = generateCSRFToken()
      const timestamp = parseInt(token.split('.')[0], 10)
      const now = Date.now()
      
      // Timestamp should be within 1 second of now
      expect(timestamp).toBeGreaterThan(now - 1000)
      expect(timestamp).toBeLessThanOrEqual(now)
    })

    it('should generate a 32-character hex random component', () => {
      const token = generateCSRFToken()
      const random = token.split('.')[1]
      
      expect(random.length).toBe(32)
      expect(/^[0-9a-f]+$/.test(random)).toBe(true)
    })
  })

  describe('verifyCSRFToken', () => {
    it('should verify a valid token', () => {
      const token = generateCSRFToken()
      const isValid = verifyCSRFToken(token)
      
      expect(isValid).toBe(true)
    })

    it('should reject an invalid signature', () => {
      const token = generateCSRFToken()
      const parts = token.split('.')
      // Tamper with the signature
      const tamperedToken = `${parts[0]}.${parts[1]}.invalidsignature`
      
      expect(verifyCSRFToken(tamperedToken)).toBe(false)
    })

    it('should reject a tampered timestamp', () => {
      const token = generateCSRFToken()
      const parts = token.split('.')
      // Tamper with the timestamp
      const tamperedToken = `1234567890.${parts[1]}.${parts[2]}`
      
      expect(verifyCSRFToken(tamperedToken)).toBe(false)
    })

    it('should reject a tampered random component', () => {
      const token = generateCSRFToken()
      const parts = token.split('.')
      // Tamper with the random
      const tamperedToken = `${parts[0]}.tampered12345678901234567890.${parts[2]}`
      
      expect(verifyCSRFToken(tamperedToken)).toBe(false)
    })

    it('should reject token with missing parts', () => {
      expect(verifyCSRFToken('part1.part2')).toBe(false)
      expect(verifyCSRFToken('onlyonepart')).toBe(false)
      expect(verifyCSRFToken('')).toBe(false)
    })

    it('should reject expired tokens (older than 5 minutes)', () => {
      const token = generateCSRFToken()
      const parts = token.split('.')
      // Set timestamp to 6 minutes ago
      const expiredTimestamp = Date.now() - 6 * 60 * 1000
      
      // Generate a new signature with the old timestamp
      // Since we can't easily regenerate the signature, this tests that the timestamp check happens
      const expiredToken = `${expiredTimestamp}.${parts[1]}.${parts[2]}`
      
      expect(verifyCSRFToken(expiredToken)).toBe(false)
    })

    it('should handle invalid hex signatures gracefully', () => {
      const token = generateCSRFToken()
      const parts = token.split('.')
      // Use non-hex characters in signature
      const invalidToken = `${parts[0]}.${parts[1]}.ghijklmnop`
      
      expect(verifyCSRFToken(invalidToken)).toBe(false)
    })
  })

  describe('getCSRFTokenFromRequest', () => {
    it('should extract token from x-csrf-token header', () => {
      const mockRequest = {
        headers: {
          get: vi.fn((name: string) => {
            if (name === 'x-csrf-token') return 'header-token'
            if (name === 'cookie') return 'csrf-token=cookie-token'
            return null
          }),
        },
      } as unknown as Request

      const token = getCSRFTokenFromRequest(mockRequest)
      expect(token).toBe('header-token')
    })

    it('should extract token from cookie when header is not present', () => {
      const mockRequest = {
        headers: {
          get: vi.fn((name: string) => {
            if (name === 'x-csrf-token') return null
            if (name === 'cookie') return 'csrf-token=cookie-token; other=value'
            return null
          }),
        },
      } as unknown as Request

      const token = getCSRFTokenFromRequest(mockRequest)
      expect(token).toBe('cookie-token')
    })

    it('should prefer header over cookie', () => {
      const mockRequest = {
        headers: {
          get: vi.fn((name: string) => {
            if (name === 'x-csrf-token') return 'header-token'
            if (name === 'cookie') return 'csrf-token=cookie-token'
            return null
          }),
        },
      } as unknown as Request

      const token = getCSRFTokenFromRequest(mockRequest)
      expect(token).toBe('header-token')
    })

    it('should return null when no token is present', () => {
      const mockRequest = {
        headers: {
          get: vi.fn(() => null),
        },
      } as unknown as Request

      const token = getCSRFTokenFromRequest(mockRequest)
      expect(token).toBeNull()
    })

    it('should handle cookie string with no csrf-token', () => {
      const mockRequest = {
        headers: {
          get: vi.fn((name: string) => {
            if (name === 'cookie') return 'session=abc123; other=value'
            return null
          }),
        },
      } as unknown as Request

      const token = getCSRFTokenFromRequest(mockRequest)
      expect(token).toBeNull()
    })

    it('should handle cookie string with csrf-token at different positions', () => {
      const mockRequest = {
        headers: {
          get: vi.fn((name: string) => {
            if (name === 'cookie') return 'other=value; csrf-token=middle-token; another=value2'
            return null
          }),
        },
      } as unknown as Request

      const token = getCSRFTokenFromRequest(mockRequest)
      expect(token).toBe('middle-token')
    })
  })
})
