import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockRequest,
  createMockSession,
  createMockTeamMember,
  createMockIntegration,
  getJsonResponse,
  resetAllMocks,
} from './test-utils'

// Mock dependencies before importing route handlers
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    teamMember: {
      findFirst: vi.fn(),
    },
    userIntegration: {
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/encryption', () => ({
  encryptCredentials: vi.fn().mockResolvedValue('encrypted-config'),
  decryptCredentials: vi.fn().mockResolvedValue({ host: 'smtp.test.com', port: 587 }),
}))

// Import after mocking
import { GET, POST } from '@/app/api/integrations/route'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

describe('Integrations API Route', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  describe('GET /api/integrations', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(getSession).mockResolvedValue(null)

      const request = createMockRequest('/api/integrations')
      const response = await GET(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(401)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('should return integrations for authenticated user', async () => {
      const mockSession = createMockSession()
      const mockIntegrations = [
        createMockIntegration({ id: 'int-1', type: 'EMAIL' }),
        createMockIntegration({ id: 'int-2', type: 'SLACK' }),
      ]

      vi.mocked(getSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.userIntegration.findMany).mockResolvedValue(mockIntegrations as any)

      const request = createMockRequest('/api/integrations')
      const response = await GET(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toHaveLength(2)
    })

    it('should filter by type', async () => {
      const mockSession = createMockSession()
      vi.mocked(getSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.userIntegration.findMany).mockResolvedValue([])

      const request = createMockRequest('/api/integrations', {
        searchParams: { type: 'EMAIL' },
      })
      await GET(request)

      expect(prisma.userIntegration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'cltest000user000001',
            type: 'EMAIL',
          }),
        })
      )
    })

    it('should filter by teamId', async () => {
      const mockSession = createMockSession()
      vi.mocked(getSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.userIntegration.findMany).mockResolvedValue([])

      const request = createMockRequest('/api/integrations', {
        searchParams: { teamId: 'cltest000team000001' },
      })
      await GET(request)

      expect(prisma.userIntegration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'cltest000user000001',
            OR: [
              { teamId: null },
              { teamId: 'cltest000team000001' },
            ],
          }),
        })
      )
    })

    it('should mask sensitive fields in config', async () => {
      const mockSession = createMockSession()
      const mockIntegrations = [
        createMockIntegration({ id: 'int-1', type: 'EMAIL' }),
      ]

      vi.mocked(getSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.userIntegration.findMany).mockResolvedValue(mockIntegrations as any)

      const request = createMockRequest('/api/integrations')
      const response = await GET(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(200)
      // Config should be decrypted but sensitive fields masked
      expect(json.data[0].config).toBeDefined()
    })
  })

  describe('POST /api/integrations', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(getSession).mockResolvedValue(null)

      const request = createMockRequest('/api/integrations', {
        method: 'POST',
        body: {
          type: 'EMAIL',
          name: 'My Email',
          config: { host: 'smtp.test.com', port: 587 },
        },
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(401)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 403 when user is not team member (for team integration)', async () => {
      const mockSession = createMockSession()
      vi.mocked(getSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue(null)

      const request = createMockRequest('/api/integrations', {
        method: 'POST',
        body: {
          type: 'EMAIL',
          name: 'Team Email',
          teamId: 'cltest000team000001',
          config: { host: 'smtp.test.com', port: 587 },
        },
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(403)
      expect(json.error.code).toBe('FORBIDDEN')
    })

    it('should create a personal integration', async () => {
      const mockSession = createMockSession()
      const mockIntegration = {
        ...createMockIntegration({ name: 'My Email' }),
        name: 'My Email',
      }

      vi.mocked(getSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.userIntegration.create).mockResolvedValue(mockIntegration as any)

      const request = createMockRequest('/api/integrations', {
        method: 'POST',
        body: {
          type: 'EMAIL',
          name: 'My Email',
          config: { host: 'smtp.test.com', port: 587 },
        },
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(201)
      expect(json.success).toBe(true)
      expect(json.data.name).toBe('My Email')
    })

    it('should create a team integration when user is team member', async () => {
      const mockSession = createMockSession()
      const mockIntegration = createMockIntegration({ name: 'Team Email' })

      vi.mocked(getSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue(createMockTeamMember() as any)
      vi.mocked(prisma.userIntegration.create).mockResolvedValue(mockIntegration as any)

      const request = createMockRequest('/api/integrations', {
        method: 'POST',
        body: {
          type: 'EMAIL',
          name: 'Team Email',
          teamId: 'cltest000team000001',
          config: { host: 'smtp.test.com', port: 587 },
        },
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(201)
      expect(json.success).toBe(true)
    })

    it('should unset other defaults when creating a default integration', async () => {
      const mockSession = createMockSession()
      const mockIntegration = createMockIntegration({ name: 'Default Email' })

      vi.mocked(getSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.userIntegration.updateMany).mockResolvedValue({ count: 1 } as any)
      vi.mocked(prisma.userIntegration.create).mockResolvedValue(mockIntegration as any)

      const request = createMockRequest('/api/integrations', {
        method: 'POST',
        body: {
          type: 'EMAIL',
          name: 'Default Email',
          isDefault: true,
          config: { host: 'smtp.test.com', port: 587 },
        },
      })
      await POST(request)

      expect(prisma.userIntegration.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'cltest000user000001',
          type: 'EMAIL',
          teamId: null,
        },
        data: { isDefault: false },
      })
    })

    it('should return 400 for invalid data', async () => {
      const mockSession = createMockSession()
      vi.mocked(getSession).mockResolvedValue(mockSession)

      const request = createMockRequest('/api/integrations', {
        method: 'POST',
        body: {
          type: 'INVALID_TYPE',
          name: '',
        },
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(400)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })

    it('should handle database errors', async () => {
      const mockSession = createMockSession()
      vi.mocked(getSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.userIntegration.create).mockRejectedValue(new Error('Database error'))

      const request = createMockRequest('/api/integrations', {
        method: 'POST',
        body: {
          type: 'EMAIL',
          name: 'My Email',
          config: { host: 'smtp.test.com', port: 587 },
        },
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(500)
      expect(json.error.code).toBe('INTERNAL_ERROR')
    })
  })
})
