import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockSession,
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

vi.mock('@/lib/permissions', () => ({
  requirePermission: vi.fn(),
  Permission: {
    SCHEDULE_MIGRATION: 'schedule_migration',
  },
}))

vi.mock('@/lib/migrations-scheduler', () => ({
  cancelScheduledExecution: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}))

// Import after mocking
import { DELETE } from '@/app/api/scheduled-executions/[executionId]/route'
import { auth } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'
import { cancelScheduledExecution } from '@/lib/migrations-scheduler'

function createMockRequest(body: any): Request {
  return new Request('http://localhost:3000/api/scheduled-executions/exec-123', {
    method: 'DELETE',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

describe('Scheduled Executions API Routes', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  describe('DELETE /api/scheduled-executions/[executionId]', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null)

      const request = createMockRequest({ teamId: 'cltest000team000001' })
      const response = await DELETE(request, {
        params: Promise.resolve({ executionId: 'exec-123' }),
      })
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe('Unauthorized')
    })

    it('should return 400 when teamId is missing', async () => {
      const mockSession = createMockSession()
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)

      const request = createMockRequest({})
      const response = await DELETE(request, {
        params: Promise.resolve({ executionId: 'exec-123' }),
      })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe('teamId is required')
    })

    it('should return 403 when user lacks permission', async () => {
      const mockSession = createMockSession()
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(requirePermission).mockRejectedValue(
        new Error('User does not have schedule_migration permission')
      )

      const request = createMockRequest({ teamId: 'cltest000team000001' })
      const response = await DELETE(request, {
        params: Promise.resolve({ executionId: 'exec-123' }),
      })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.error).toBe('Forbidden')
    })

    it('should return 404 when execution not found', async () => {
      const mockSession = createMockSession()
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(requirePermission).mockResolvedValue(undefined)
      vi.mocked(cancelScheduledExecution).mockRejectedValue(
        new Error('Scheduled execution not found')
      )

      const request = createMockRequest({ teamId: 'cltest000team000001' })
      const response = await DELETE(request, {
        params: Promise.resolve({ executionId: 'non-existent' }),
      })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toContain('not found')
    })

    it('should cancel scheduled execution successfully', async () => {
      const mockSession = createMockSession()
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(requirePermission).mockResolvedValue(undefined)
      vi.mocked(cancelScheduledExecution).mockResolvedValue(undefined)

      const request = createMockRequest({ teamId: 'cltest000team000001' })
      const response = await DELETE(request, {
        params: Promise.resolve({ executionId: 'exec-123' }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.message).toBe('Scheduled execution canceled')
    })

    it('should handle unexpected errors', async () => {
      const mockSession = createMockSession()
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(requirePermission).mockResolvedValue(undefined)
      vi.mocked(cancelScheduledExecution).mockRejectedValue(new Error('Database error'))

      const request = createMockRequest({ teamId: 'cltest000team000001' })
      const response = await DELETE(request, {
        params: Promise.resolve({ executionId: 'exec-123' }),
      })
      const json = await response.json()

      expect(response.status).toBe(500)
      expect(json.error).toBe('Database error')
    })
  })
})
