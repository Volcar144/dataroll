import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockRequest,
  createMockApiKey,
  createMockConnection,
  createMockMigration,
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
    apiKey: {
      findUnique: vi.fn(),
    },
    databaseConnection: {
      findFirst: vi.fn(),
    },
    migration: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/migration-execution', () => ({
  executeMigration: vi.fn(),
}))

vi.mock('@/lib/database-connection', () => ({
  DatabaseConnectionService: {
    executeQuery: vi.fn(),
  },
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@/lib/posthog-server', () => ({
  captureServerException: vi.fn(),
}))

// Import after mocking
import { POST } from '@/app/api/cicd/route'
import { prisma } from '@/lib/prisma'
import { executeMigration } from '@/lib/migration-execution'
import { DatabaseConnectionService } from '@/lib/database-connection'

describe('CI/CD API Route', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  describe('POST /api/cicd', () => {
    it('should return 401 when no authorization header', async () => {
      const request = createMockRequest('/api/cicd', {
        method: 'POST',
        body: { connectionId: 'conn-1', name: 'test', type: 'RAW_SQL', content: 'SELECT 1' },
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(401)
      expect(json.error).toBe('Missing or invalid API key')
    })

    it('should return 401 for invalid API key', async () => {
      vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(null)

      const request = createMockRequest('/api/cicd', {
        method: 'POST',
        headers: { authorization: 'Bearer invalid-key' },
        body: { connectionId: 'conn-1', name: 'test', type: 'RAW_SQL', content: 'SELECT 1' },
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(401)
      expect(json.error).toBe('Invalid API key')
    })

    describe('migrate action', () => {
      it('should return 404 when connection not found', async () => {
        const mockApiKey = createMockApiKey()
        vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(mockApiKey as any)
        vi.mocked(prisma.databaseConnection.findFirst).mockResolvedValue(null)

        const request = createMockRequest('/api/cicd?action=migrate', {
          method: 'POST',
          headers: { authorization: 'Bearer test-api-key' },
          body: {
            connectionId: 'non-existent',
            name: 'test-migration',
            type: 'RAW_SQL',
            content: 'CREATE TABLE test (id INT);',
          },
        })
        const response = await POST(request)
        const json = await getJsonResponse(response)

        expect(response.status).toBe(404)
        expect(json.error).toBe('Connection not found or access denied')
      })

      it('should create migration without auto-execute', async () => {
        const mockApiKey = createMockApiKey()
        const mockConnection = createMockConnection()
        const mockMigration = createMockMigration({ status: 'PENDING' })

        vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(mockApiKey as any)
        vi.mocked(prisma.databaseConnection.findFirst).mockResolvedValue(mockConnection as any)
        vi.mocked(prisma.migration.create).mockResolvedValue(mockMigration as any)

        const request = createMockRequest('/api/cicd?action=migrate', {
          method: 'POST',
          headers: { authorization: 'Bearer test-api-key' },
          body: {
            connectionId: 'cltest000conn000001',
            name: 'test-migration',
            type: 'RAW_SQL',
            content: 'CREATE TABLE test (id INT);',
            autoExecute: false,
          },
        })
        const response = await POST(request)
        const json = await getJsonResponse(response)

        expect(response.status).toBe(200)
        expect(json.success).toBe(true)
        expect(json.migration.name).toBe('add-users-table')
      })

      it('should create and execute migration with auto-execute', async () => {
        const mockApiKey = createMockApiKey()
        const mockConnection = createMockConnection()
        const mockMigration = {
          ...createMockMigration({ status: 'PENDING' }),
          databaseConnection: mockConnection,
        }

        vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(mockApiKey as any)
        vi.mocked(prisma.databaseConnection.findFirst).mockResolvedValue(mockConnection as any)
        vi.mocked(prisma.migration.create).mockResolvedValue(mockMigration as any)
        vi.mocked(prisma.migration.findUnique).mockResolvedValue(mockMigration as any)
        vi.mocked(prisma.migration.update).mockResolvedValue({ ...mockMigration, status: 'EXECUTED' } as any)
        vi.mocked(executeMigration).mockResolvedValue({ success: true })

        const request = createMockRequest('/api/cicd?action=migrate', {
          method: 'POST',
          headers: { authorization: 'Bearer test-api-key' },
          body: {
            connectionId: 'cltest000conn000001',
            name: 'test-migration',
            type: 'RAW_SQL',
            content: 'CREATE TABLE test (id INT);',
            autoExecute: true,
          },
        })
        const response = await POST(request)
        const json = await getJsonResponse(response)

        expect(response.status).toBe(200)
        expect(json.success).toBe(true)
        expect(executeMigration).toHaveBeenCalled()
      })

      it('should handle migration execution failure', async () => {
        const mockApiKey = createMockApiKey()
        const mockConnection = createMockConnection()
        const mockMigration = {
          ...createMockMigration({ status: 'PENDING' }),
          databaseConnection: mockConnection,
        }

        vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(mockApiKey as any)
        vi.mocked(prisma.databaseConnection.findFirst).mockResolvedValue(mockConnection as any)
        vi.mocked(prisma.migration.create).mockResolvedValue(mockMigration as any)
        vi.mocked(prisma.migration.findUnique).mockResolvedValue(mockMigration as any)
        vi.mocked(prisma.migration.update).mockResolvedValue({ ...mockMigration, status: 'FAILED' } as any)
        vi.mocked(executeMigration).mockResolvedValue({ success: false, error: 'SQL syntax error' })

        const request = createMockRequest('/api/cicd?action=migrate', {
          method: 'POST',
          headers: { authorization: 'Bearer test-api-key' },
          body: {
            connectionId: 'cltest000conn000001',
            name: 'test-migration',
            type: 'RAW_SQL',
            content: 'INVALID SQL;',
            autoExecute: true,
          },
        })
        const response = await POST(request)
        const json = await getJsonResponse(response)

        expect(response.status).toBe(500)
        expect(json.error).toBe('Internal server error')
        expect(json.message).toContain('Migration execution failed')
      })
    })

    describe('query action', () => {
      it('should return 404 when connection not found', async () => {
        const mockApiKey = createMockApiKey()
        vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(mockApiKey as any)
        vi.mocked(prisma.databaseConnection.findFirst).mockResolvedValue(null)

        const request = createMockRequest('/api/cicd?action=query', {
          method: 'POST',
          headers: { authorization: 'Bearer test-api-key' },
          body: {
            connectionId: 'non-existent',
            query: 'SELECT * FROM users;',
          },
        })
        const response = await POST(request)
        const json = await getJsonResponse(response)

        expect(response.status).toBe(404)
        expect(json.error).toBe('Connection not found or access denied')
      })

      it('should execute query successfully', async () => {
        const mockApiKey = createMockApiKey()
        const mockConnection = createMockConnection()
        const queryResult = [{ id: 1, name: 'Test' }]

        vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(mockApiKey as any)
        vi.mocked(prisma.databaseConnection.findFirst).mockResolvedValue(mockConnection as any)
        vi.mocked(DatabaseConnectionService.executeQuery).mockResolvedValue(queryResult as any)

        const request = createMockRequest('/api/cicd?action=query', {
          method: 'POST',
          headers: { authorization: 'Bearer test-api-key' },
          body: {
            connectionId: 'cltest000conn000001',
            query: 'SELECT * FROM users;',
          },
        })
        const response = await POST(request)
        const json = await getJsonResponse(response)

        expect(response.status).toBe(200)
        expect(json.success).toBe(true)
        expect(json.result).toEqual(queryResult)
      })
    })

    it('should return 400 for invalid action', async () => {
      const mockApiKey = createMockApiKey()
      vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(mockApiKey as any)

      const request = createMockRequest('/api/cicd?action=invalid', {
        method: 'POST',
        headers: { authorization: 'Bearer test-api-key' },
        body: { connectionId: 'conn-1' },
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(400)
      expect(json.error).toBe('Invalid action')
    })

    it('should return 400 for invalid request data', async () => {
      const mockApiKey = createMockApiKey()
      vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(mockApiKey as any)

      const request = createMockRequest('/api/cicd?action=migrate', {
        method: 'POST',
        headers: { authorization: 'Bearer test-api-key' },
        body: {
          // missing required fields
          name: 'test',
        },
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(400)
      expect(json.error).toBe('Invalid request data')
    })
  })
})
