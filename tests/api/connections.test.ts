import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockRequest,
  createMockSession,
  createMockTeamMember,
  createMockConnection,
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
    databaseConnection: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/encryption', () => ({
  encryptCredentials: vi.fn().mockResolvedValue('encrypted-password'),
  decryptCredentials: vi.fn().mockResolvedValue({ password: 'decrypted' }),
}))

vi.mock('@/lib/posthog-server', () => ({
  getPostHogClient: () => ({
    capture: vi.fn(),
  }),
  captureServerException: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: vi.fn(),
}))

vi.mock('@/lib/csrf', () => ({
  verifyCSRFToken: vi.fn().mockReturnValue(true),
  getCSRFTokenFromRequest: vi.fn().mockReturnValue('valid-csrf-token'),
}))

vi.mock('@/lib/telemetry', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  securityLogger: {
    unauthorized: vi.fn(),
    suspicious: vi.fn(),
    access: vi.fn(),
  },
}))

// Import after mocking
import { GET, POST } from '@/app/api/connections/route'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

describe('Connections API Route', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  describe('GET /api/connections', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(getSession).mockResolvedValue(null)

      const request = createMockRequest('/api/connections', {
        searchParams: { teamId: 'cltest000team000001' },
      })
      const response = await GET(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(401)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 400 when teamId is missing', async () => {
      const mockSession = createMockSession()
      vi.mocked(getSession).mockResolvedValue(mockSession)

      const request = createMockRequest('/api/connections')
      const response = await GET(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(400)
      expect(json.error.code).toBe('MISSING_TEAM_ID')
    })

    it('should return 403 when user is not team member', async () => {
      const mockSession = createMockSession()
      vi.mocked(getSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue(null)

      const request = createMockRequest('/api/connections', {
        searchParams: { teamId: 'cltest000team000001' },
      })
      const response = await GET(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(403)
      expect(json.error.code).toBe('FORBIDDEN')
    })

    it('should return connections for team member', async () => {
      const mockSession = createMockSession()
      const mockConnections = [
        createMockConnection({ id: 'conn-1', name: 'Production DB' }),
        createMockConnection({ id: 'conn-2', name: 'Staging DB' }),
      ]

      vi.mocked(getSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue(createMockTeamMember() as any)
      vi.mocked(prisma.databaseConnection.findMany).mockResolvedValue(mockConnections as any)

      const request = createMockRequest('/api/connections', {
        searchParams: { teamId: 'cltest000team000001' },
      })
      const response = await GET(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toHaveLength(2)
    })

    it('should filter by active status', async () => {
      const mockSession = createMockSession()
      vi.mocked(getSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue(createMockTeamMember() as any)
      vi.mocked(prisma.databaseConnection.findMany).mockResolvedValue([])

      const request = createMockRequest('/api/connections', {
        searchParams: { teamId: 'cltest000team000001', active: 'true' },
      })
      await GET(request)

      expect(prisma.databaseConnection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            teamId: 'cltest000team000001',
            isActive: true,
          }),
        })
      )
    })
  })

  describe('POST /api/connections', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(getSession).mockResolvedValue(null)

      const request = createMockRequest('/api/connections', {
        method: 'POST',
        body: {
          name: 'New Connection',
          type: 'POSTGRESQL',
          host: 'localhost',
          port: 5432,
          database: 'mydb',
          username: 'user',
          password: 'pass',
          teamId: 'cltest000team000001',
        },
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(401)
      expect(json.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 403 when user is not team member', async () => {
      const mockSession = createMockSession()
      vi.mocked(getSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue(null)

      const request = createMockRequest('/api/connections', {
        method: 'POST',
        headers: {
          'x-csrf-token': 'valid-token',
        },
        body: {
          name: 'New Connection',
          type: 'POSTGRESQL',
          host: 'localhost',
          port: 5432,
          database: 'mydb',
          username: 'user',
          password: 'pass',
          teamId: 'cltest000team000001',
        },
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(403)
      expect(json.error.code).toBe('FORBIDDEN')
    })

    it('should create a new connection', async () => {
      const mockSession = createMockSession()
      const mockConnection = createMockConnection({ name: 'New Connection' })

      vi.mocked(getSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue(createMockTeamMember() as any)
      vi.mocked(prisma.databaseConnection.create).mockResolvedValue(mockConnection as any)

      const request = createMockRequest('/api/connections', {
        method: 'POST',
        headers: {
          'x-csrf-token': 'valid-token',
        },
        body: {
          name: 'New Connection',
          type: 'POSTGRESQL',
          host: 'localhost',
          port: 5432,
          database: 'mydb',
          username: 'user',
          password: 'pass',
          teamId: 'cltest000team000001',
        },
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(201)
      expect(json.success).toBe(true)
      expect(json.data.name).toBe('New Connection')
    })

    it('should reject invalid connection data', async () => {
      const mockSession = createMockSession()
      vi.mocked(getSession).mockResolvedValue(mockSession)

      const request = createMockRequest('/api/connections', {
        method: 'POST',
        headers: {
          'x-csrf-token': 'valid-token',
        },
        body: {
          name: '', // Invalid empty name
          type: 'INVALID_TYPE',
        },
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(500)
      expect(json.error).toBeDefined()
    })
  })
})
