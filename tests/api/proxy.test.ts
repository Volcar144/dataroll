import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  createMockApiKey,
  createMockConnection,
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
    pendingQuery: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/database-connection', () => ({
  DatabaseConnectionService: {
    executeQuery: vi.fn(),
  },
}))

vi.mock('@/lib/notifications', () => ({
  NotificationService: vi.fn().mockImplementation(() => ({
    notifyQueryApprovalRequest: vi.fn(),
  })),
}))

vi.mock('@/lib/auto-approval', () => ({
  AutoApprovalService: vi.fn().mockImplementation(() => ({
    checkAutoApproval: vi.fn().mockResolvedValue(false),
  })),
}))

vi.mock('@/lib/email', () => ({
  EmailService: vi.fn(),
}))

// Import after mocking
import { POST } from '@/app/api/proxy/route'
import { prisma } from '@/lib/prisma'
import { DatabaseConnectionService } from '@/lib/database-connection'
import { AutoApprovalService } from '@/lib/auto-approval'

function createMockRequest(body: any, options: { apiKey?: string } = {}): NextRequest {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  
  if (options.apiKey) {
    headers['authorization'] = `Bearer ${options.apiKey}`
  }

  return new NextRequest('http://localhost:3000/api/proxy', {
    method: 'POST',
    body: JSON.stringify(body),
    headers,
  })
}

describe('Proxy API Route', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  describe('POST /api/proxy', () => {
    it('should return 401 when no authorization header', async () => {
      const request = createMockRequest({
        connectionId: 'cltest000conn000001',
        query: 'SELECT 1',
      })
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(401)
      expect(json.error).toBe('Missing or invalid API key')
    })

    it('should return 401 for invalid API key', async () => {
      vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(null)

      const request = createMockRequest(
        {
          connectionId: 'cltest000conn000001',
          query: 'SELECT 1',
        },
        { apiKey: 'invalid-key' }
      )
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(401)
      expect(json.error).toBe('Invalid API key')
    })

    it('should return 404 when connection not found', async () => {
      const mockApiKey = createMockApiKey()
      vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(mockApiKey as any)
      vi.mocked(prisma.databaseConnection.findFirst).mockResolvedValue(null)

      const request = createMockRequest(
        {
          connectionId: 'non-existent',
          query: 'SELECT 1',
        },
        { apiKey: 'test-api-key' }
      )
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(404)
      expect(json.error).toBe('Connection not found or access denied')
    })

    it('should return 400 for invalid request data', async () => {
      const mockApiKey = createMockApiKey()
      vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(mockApiKey as any)

      const request = createMockRequest(
        {
          // missing connectionId and query
        },
        { apiKey: 'test-api-key' }
      )
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(400)
      expect(json.error).toBe('Invalid request data')
    })

    it('should submit query for review when auto-approval is disabled', async () => {
      const mockApiKey = createMockApiKey()
      const mockConnection = createMockConnection()
      const mockPendingQuery = {
        id: 'cltest000pending001',
        query: 'SELECT * FROM users',
        connectionId: 'cltest000conn000001',
        userId: 'cltest000user000001',
        status: 'PENDING',
      }

      vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(mockApiKey as any)
      vi.mocked(prisma.databaseConnection.findFirst).mockResolvedValue(mockConnection as any)
      vi.mocked(prisma.pendingQuery.create).mockResolvedValue(mockPendingQuery as any)

      // Mock AutoApprovalService to return false (no auto-approval)
      const mockCheckAutoApproval = vi.fn().mockResolvedValue(false)
      vi.mocked(AutoApprovalService).mockImplementation(() => ({
        checkAutoApproval: mockCheckAutoApproval,
      }) as any)

      const request = createMockRequest(
        {
          connectionId: 'cltest000conn000001',
          query: 'SELECT * FROM users',
        },
        { apiKey: 'test-api-key' }
      )
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.status).toBe('PENDING_REVIEW')
      expect(json.queryId).toBeDefined()
    })

    it('should auto-execute query when auto-approval is enabled', async () => {
      const mockApiKey = createMockApiKey()
      const mockConnection = createMockConnection()
      const mockPendingQuery = {
        id: 'cltest000pending001',
        query: 'SELECT * FROM users',
        connectionId: 'cltest000conn000001',
        userId: 'cltest000user000001',
        status: 'APPROVED',
      }
      const queryResult = [{ id: 1, name: 'Test' }]

      vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(mockApiKey as any)
      vi.mocked(prisma.databaseConnection.findFirst).mockResolvedValue(mockConnection as any)
      vi.mocked(prisma.pendingQuery.create).mockResolvedValue(mockPendingQuery as any)
      vi.mocked(prisma.pendingQuery.update).mockResolvedValue({ ...mockPendingQuery, status: 'EXECUTED' } as any)
      vi.mocked(DatabaseConnectionService.executeQuery).mockResolvedValue(queryResult as any)

      // Mock AutoApprovalService to return true (auto-approval enabled)
      const mockCheckAutoApproval = vi.fn().mockResolvedValue(true)
      vi.mocked(AutoApprovalService).mockImplementation(() => ({
        checkAutoApproval: mockCheckAutoApproval,
      }) as any)

      const request = createMockRequest(
        {
          connectionId: 'cltest000conn000001',
          query: 'SELECT * FROM users',
        },
        { apiKey: 'test-api-key' }
      )
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.status).toBe('EXECUTED')
      expect(json.result).toEqual(queryResult)
    })

    it('should handle query execution failure after auto-approval', async () => {
      const mockApiKey = createMockApiKey()
      const mockConnection = createMockConnection()
      const mockPendingQuery = {
        id: 'cltest000pending001',
        query: 'INVALID SQL',
        connectionId: 'cltest000conn000001',
        userId: 'cltest000user000001',
        status: 'APPROVED',
      }

      vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(mockApiKey as any)
      vi.mocked(prisma.databaseConnection.findFirst).mockResolvedValue(mockConnection as any)
      vi.mocked(prisma.pendingQuery.create).mockResolvedValue(mockPendingQuery as any)
      vi.mocked(prisma.pendingQuery.update).mockResolvedValue({ ...mockPendingQuery, status: 'FAILED' } as any)
      vi.mocked(DatabaseConnectionService.executeQuery).mockRejectedValue(new Error('SQL syntax error'))

      // Mock AutoApprovalService to return true (auto-approval enabled)
      const mockCheckAutoApproval = vi.fn().mockResolvedValue(true)
      vi.mocked(AutoApprovalService).mockImplementation(() => ({
        checkAutoApproval: mockCheckAutoApproval,
      }) as any)

      const request = createMockRequest(
        {
          connectionId: 'cltest000conn000001',
          query: 'INVALID SQL',
        },
        { apiKey: 'test-api-key' }
      )
      const response = await POST(request)
      const json = await getJsonResponse(response)

      expect(response.status).toBe(200)
      expect(json.success).toBe(false)
      expect(json.status).toBe('FAILED')
      expect(json.error).toBe('SQL syntax error')
    })
  })
})
