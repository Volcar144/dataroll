import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getJsonResponse, resetAllMocks } from './test-utils'

// Mock dependencies before importing route handlers
vi.mock('@/lib/csrf', () => ({
  generateCSRFToken: vi.fn().mockReturnValue('test-csrf-token'),
}))

// Import after mocking
import { GET } from '@/app/api/csrf/route'
import { generateCSRFToken } from '@/lib/csrf'

describe('CSRF API Route', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  describe('GET /api/csrf', () => {
    it('should return a CSRF token', async () => {
      const response = await GET()
      const json = await getJsonResponse(response)

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.token).toBe('test-csrf-token')
    })

    it('should set csrf-token cookie', async () => {
      const response = await GET()
      
      const setCookieHeader = response.headers.get('set-cookie')
      expect(setCookieHeader).toContain('csrf-token=test-csrf-token')
      expect(setCookieHeader).toContain('HttpOnly')
      // Next.js may use different case for SameSite
      expect(setCookieHeader?.toLowerCase()).toContain('samesite=lax')
      expect(setCookieHeader).toContain('Path=/')
    })

    it('should call generateCSRFToken', async () => {
      await GET()

      expect(generateCSRFToken).toHaveBeenCalled()
    })

    it('should have max-age of 5 minutes', async () => {
      const response = await GET()
      
      const setCookieHeader = response.headers.get('set-cookie')
      expect(setCookieHeader).toContain('Max-Age=300') // 60 * 5 = 300 seconds
    })
  })
})
