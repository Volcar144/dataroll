import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockRequest,
  createMockSession,
  createMockTeamMember,
  createMockConnection,
  createMockMigration,
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
      findFirst: vi.fn(),
    },
    migration: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/posthog-server', () => ({
  getPostHogClient: () => ({
    capture: vi.fn(),
  }),
  captureServerException: vi.fn(),
}))

vi.mock('@/lib/telemetry', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  migrationLogger: {
    created: vi.fn(),
    executed: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
  },
}))

// Import after mocking
import { GET, POST } from '@/app/api/migrations/route'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

describe('Migrations API Route', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  describe('GET /api/migrations', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(getSession).mockResolvedValue(null)

      const request = createMockRequest('/api/migrations', {
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

      const request = createMockRequest('/api/migrations')
      const response = await GET(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(400)
      expect(json.error.code).toBe('MISSING_TEAM_ID')
    })

    it('should return 403 when user is not team member', async () => {
      const mockSession = createMockSession()
      vi.mocked(getSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue(null)

      const request = createMockRequest('/api/migrations', {
        searchParams: { teamId: 'cltest000team000001' },
      })
      const response = await GET(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(403)
      expect(json.error.code).toBe('FORBIDDEN')
    })

    it('should return migrations for team member', async () => {
      const mockSession = createMockSession()
      const mockMigrations = [
        {
          ...createMockMigration({ id: 'mig-1', name: 'Migration 1' }),
          databaseConnection: { id: 'conn-1', name: 'DB 1', type: 'POSTGRESQL' },
          createdBy: { id: 'user-1', name: 'User 1', email: 'user1@test.com' },
          executions: [],
        },
        {
          ...createMockMigration({ id: 'mig-2', name: 'Migration 2' }),
          databaseConnection: { id: 'conn-1', name: 'DB 1', type: 'POSTGRESQL' },
          createdBy: { id: 'user-1', name: 'User 1', email: 'user1@test.com' },
          executions: [{ id: 'exec-1', executedAt: new Date() }],
        },
      ]

      vi.mocked(getSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue(createMockTeamMember() as any)
      vi.mocked(prisma.migration.findMany).mockResolvedValue(mockMigrations as any)

      const request = createMockRequest('/api/migrations', {
        searchParams: { teamId: 'cltest000team000001' },
      })
      const response = await GET(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toHaveLength(2)
    })

    it('should filter by connectionId', async () => {
      const mockSession = createMockSession()
      vi.mocked(getSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue(createMockTeamMember() as any)
      vi.mocked(prisma.migration.findMany).mockResolvedValue([])

      const request = createMockRequest('/api/migrations', {
        searchParams: { teamId: 'cltest000team000001', connectionId: 'conn-123' },
      })
      await GET(request)

      expect(prisma.migration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            teamId: 'cltest000team000001',
            databaseConnectionId: 'conn-123',
          }),
        })
      )
    })

    it('should filter by status', async () => {
      const mockSession = createMockSession()
      vi.mocked(getSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue(createMockTeamMember() as any)
      vi.mocked(prisma.migration.findMany).mockResolvedValue([])

      const request = createMockRequest('/api/migrations', {
        searchParams: { teamId: 'cltest000team000001', status: 'PENDING' },
      })
      await GET(request)

      expect(prisma.migration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            teamId: 'cltest000team000001',
            status: 'PENDING',
          }),
        })
      )
    })
  })

  describe('POST /api/migrations', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(getSession).mockResolvedValue(null)

      const request = createMockRequest('/api/migrations', {
        method: 'POST',
        body: {
          name: 'add-users-table',
          version: '20240101000000',
          type: 'PRISMA',
          filePath: 'migrations/add-users.sql',
          content: 'CREATE TABLE users (id SERIAL PRIMARY KEY);',
          teamId: 'cltest000team000001',
          databaseConnectionId: 'cltest000conn000001',
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
      vi.mocked(prisma.databaseConnection.findFirst).mockResolvedValue(null)

      const request = createMockRequest('/api/migrations', {
        method: 'POST',
        body: {
          name: 'add-users-table',
          version: '20240101000000',
          type: 'PRISMA',
          filePath: 'migrations/add-users.sql',
          content: 'CREATE TABLE users (id SERIAL PRIMARY KEY);',
          teamId: 'cltest000team000001',
          databaseConnectionId: 'cltest000conn000001',
        },
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(403)
      expect(json.error.code).toBe('FORBIDDEN')
    })

    it('should return 404 when connection not found', async () => {
      const mockSession = createMockSession()
      vi.mocked(getSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue(createMockTeamMember() as any)
      vi.mocked(prisma.databaseConnection.findFirst).mockResolvedValue(null)

      const request = createMockRequest('/api/migrations', {
        method: 'POST',
        body: {
          name: 'add-users-table',
          version: '20240101000000',
          type: 'PRISMA',
          filePath: 'migrations/add-users.sql',
          content: 'CREATE TABLE users (id SERIAL PRIMARY KEY);',
          teamId: 'cltest000team000001',
          databaseConnectionId: 'cltest000nonexist01',
        },
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(404)
      expect(json.error.code).toBe('NOT_FOUND')
    })

    it('should return 409 when migration version already exists', async () => {
      const mockSession = createMockSession()
      const mockConnection = createMockConnection()

      vi.mocked(getSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue(createMockTeamMember() as any)
      vi.mocked(prisma.databaseConnection.findFirst).mockResolvedValue(mockConnection as any)
      vi.mocked(prisma.migration.findFirst).mockResolvedValue(createMockMigration() as any)

      const request = createMockRequest('/api/migrations', {
        method: 'POST',
        body: {
          name: 'add-users-table',
          version: '20240101000000',
          type: 'PRISMA',
          filePath: 'migrations/add-users.sql',
          content: 'CREATE TABLE users (id SERIAL PRIMARY KEY);',
          teamId: 'cltest000team000001',
          databaseConnectionId: 'cltest000conn000001',
        },
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(409)
      expect(json.error.code).toBe('CONFLICT')
    })

    it('should create a new migration', async () => {
      const mockSession = createMockSession()
      const mockConnection = createMockConnection()
      const mockMigration = {
        ...createMockMigration({ name: 'add-users-table' }),
        databaseConnection: { id: 'conn-1', name: 'DB 1', type: 'POSTGRESQL' },
        createdBy: { id: 'user-1', name: 'User 1', email: 'user1@test.com' },
      }

      vi.mocked(getSession).mockResolvedValue(mockSession)
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue(createMockTeamMember() as any)
      vi.mocked(prisma.databaseConnection.findFirst).mockResolvedValue(mockConnection as any)
      vi.mocked(prisma.migration.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.migration.create).mockResolvedValue(mockMigration as any)

      const request = createMockRequest('/api/migrations', {
        method: 'POST',
        body: {
          name: 'add-users-table',
          version: '20240101000000',
          type: 'PRISMA',
          filePath: 'migrations/add-users.sql',
          content: 'CREATE TABLE users (id SERIAL PRIMARY KEY);',
          teamId: 'cltest000team000001',
          databaseConnectionId: 'cltest000conn000001',
        },
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(201)
      expect(json.success).toBe(true)
      expect(json.data.name).toBe('add-users-table')
    })

    it('should reject invalid migration data', async () => {
      const mockSession = createMockSession()
      vi.mocked(getSession).mockResolvedValue(mockSession)

      const request = createMockRequest('/api/migrations', {
        method: 'POST',
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
