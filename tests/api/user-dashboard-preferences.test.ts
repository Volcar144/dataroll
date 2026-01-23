import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  createMockSession,
  getJsonResponse,
  resetAllMocks,
} from './test-utils'

// Mock dependencies before importing route handlers
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  },
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}))

// Import after mocking
import { GET, POST } from '@/app/api/user/dashboard-preferences/route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function createMockNextRequest(options: {
  method?: string
  body?: any
} = {}): NextRequest {
  const { method = 'GET', body } = options
  
  return new NextRequest('http://localhost:3000/api/user/dashboard-preferences', {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

describe('User Dashboard Preferences API Route', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  describe('GET /api/user/dashboard-preferences', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null)

      const request = createMockNextRequest()
      const response = await GET(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(401)
      expect(json.error).toBe('Unauthorized')
    })

    it('should return 404 when user not found', async () => {
      const mockSession = createMockSession()
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const request = createMockNextRequest()
      const response = await GET(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(404)
      expect(json.error).toBe('User not found')
    })

    it('should return default preferences when none exist', async () => {
      const mockSession = createMockSession()
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: mockSession.user.id } as any)
      vi.mocked(prisma.$queryRaw).mockResolvedValue([])

      const request = createMockNextRequest()
      const response = await GET(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(200)
      expect(json.widgets).toEqual([])
    })

    it('should return existing preferences', async () => {
      const mockSession = createMockSession()
      const mockWidgets = [
        { id: 'widget-1', type: 'chart', x: 0, y: 0 },
        { id: 'widget-2', type: 'stats', x: 1, y: 0 },
      ]
      
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: mockSession.user.id } as any)
      vi.mocked(prisma.$queryRaw).mockResolvedValue([
        { value: JSON.stringify({ widgets: mockWidgets }) },
      ])

      const request = createMockNextRequest()
      const response = await GET(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(200)
      expect(json.widgets).toEqual(mockWidgets)
    })
  })

  describe('POST /api/user/dashboard-preferences', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null)

      const request = createMockNextRequest({
        method: 'POST',
        body: { widgets: [] },
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(401)
      expect(json.error).toBe('Unauthorized')
    })

    it('should return 400 when widgets is missing', async () => {
      const mockSession = createMockSession()
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)

      const request = createMockNextRequest({
        method: 'POST',
        body: {},
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(400)
      expect(json.error).toBe('Invalid widgets data')
    })

    it('should return 400 when widgets is not an array', async () => {
      const mockSession = createMockSession()
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)

      const request = createMockNextRequest({
        method: 'POST',
        body: { widgets: 'not-an-array' },
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(400)
      expect(json.error).toBe('Invalid widgets data')
    })

    it('should return 400 for invalid widget structure', async () => {
      const mockSession = createMockSession()
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)

      const request = createMockNextRequest({
        method: 'POST',
        body: {
          widgets: [
            { id: 'widget-1' }, // missing type, x, y
          ],
        },
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(400)
      expect(json.error).toBe('Invalid widget structure')
    })

    it('should save preferences successfully', async () => {
      const mockSession = createMockSession()
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.$executeRaw).mockResolvedValue(1)

      const request = createMockNextRequest({
        method: 'POST',
        body: {
          widgets: [
            { id: 'widget-1', type: 'chart', x: 0, y: 0 },
            { id: 'widget-2', type: 'stats', x: 1, y: 0 },
          ],
        },
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
    })
  })
})
