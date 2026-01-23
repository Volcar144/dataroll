import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockSession,
  createMockTeamMember,
  createMockMigration,
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
    teamMember: {
      findUnique: vi.fn(),
    },
    migrationApproval: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/permissions', () => ({
  requirePermission: vi.fn(),
  Permission: {
    APPROVE_MIGRATION: 'approve_migration',
  },
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: vi.fn(),
}))

vi.mock('@/lib/posthog-server', () => ({
  getPostHogClient: () => ({
    capture: vi.fn(),
  }),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}))

// Import after mocking
import { POST as ApprovePost } from '@/app/api/approvals/[approvalId]/approve/route'
import { POST as RejectPost } from '@/app/api/approvals/[approvalId]/reject/route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'

function createMockApproval(overrides: {
  id?: string
  status?: string
  migrationId?: string
  migration?: any
} = {}) {
  return {
    id: overrides.id || 'cltest000approval01',
    status: overrides.status || 'PENDING',
    migrationId: overrides.migrationId || 'cltest000mig0000001',
    requestedById: 'cltest000user000001',
    approvedById: null,
    comments: null,
    approvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    migration: overrides.migration || {
      ...createMockMigration(),
      teamId: 'cltest000team000001',
    },
  }
}

function createMockRequest(body: any): Request {
  return new Request('http://localhost:3000/api/approvals/test/approve', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

describe('Approvals API Routes', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  describe('POST /api/approvals/[approvalId]/approve', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null)

      const request = createMockRequest({ teamId: 'cltest000team000001' })
      const response = await ApprovePost(request, {
        params: Promise.resolve({ approvalId: 'cltest000approval01' }),
      })
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe('Unauthorized')
    })

    it('should return 400 when teamId is missing', async () => {
      const mockSession = createMockSession()
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)

      const request = createMockRequest({})
      const response = await ApprovePost(request, {
        params: Promise.resolve({ approvalId: 'cltest000approval01' }),
      })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe('teamId is required')
    })

    it('should return 403 when user lacks permission', async () => {
      const mockSession = createMockSession()
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(requirePermission).mockRejectedValue(
        new Error('User does not have approve_migration permission')
      )

      const request = createMockRequest({ teamId: 'cltest000team000001' })
      const response = await ApprovePost(request, {
        params: Promise.resolve({ approvalId: 'cltest000approval01' }),
      })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.error).toBe('Forbidden')
    })

    it('should return 404 when approval not found', async () => {
      const mockSession = createMockSession()
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(requirePermission).mockResolvedValue(undefined)
      vi.mocked(prisma.migrationApproval.findUnique).mockResolvedValue(null)

      const request = createMockRequest({ teamId: 'cltest000team000001' })
      const response = await ApprovePost(request, {
        params: Promise.resolve({ approvalId: 'non-existent' }),
      })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe('Approval not found')
    })

    it('should return 403 when approval is from different team', async () => {
      const mockSession = createMockSession()
      const mockApproval = createMockApproval({
        migration: { teamId: 'different-team' },
      })

      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(requirePermission).mockResolvedValue(undefined)
      vi.mocked(prisma.migrationApproval.findUnique).mockResolvedValue(mockApproval as any)

      const request = createMockRequest({ teamId: 'cltest000team000001' })
      const response = await ApprovePost(request, {
        params: Promise.resolve({ approvalId: 'cltest000approval01' }),
      })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.error).toBe('Forbidden')
    })

    it('should return 400 when approval is already processed', async () => {
      const mockSession = createMockSession()
      const mockApproval = createMockApproval({ status: 'APPROVED' })

      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(requirePermission).mockResolvedValue(undefined)
      vi.mocked(prisma.migrationApproval.findUnique).mockResolvedValue(mockApproval as any)

      const request = createMockRequest({ teamId: 'cltest000team000001' })
      const response = await ApprovePost(request, {
        params: Promise.resolve({ approvalId: 'cltest000approval01' }),
      })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toContain('already been')
    })

    it('should approve migration successfully', async () => {
      const mockSession = createMockSession()
      const mockApproval = createMockApproval()

      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(requirePermission).mockResolvedValue(undefined)
      vi.mocked(prisma.migrationApproval.findUnique).mockResolvedValue(mockApproval as any)
      vi.mocked(prisma.migrationApproval.update).mockResolvedValue({
        ...mockApproval,
        status: 'APPROVED',
        approvedAt: new Date(),
      } as any)

      const request = createMockRequest({
        teamId: 'cltest000team000001',
        comments: 'Looks good!',
      })
      const response = await ApprovePost(request, {
        params: Promise.resolve({ approvalId: 'cltest000approval01' }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.message).toBe('Migration approved')
      expect(json.approval.status).toBe('APPROVED')
    })
  })

  describe('POST /api/approvals/[approvalId]/reject', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null)

      const request = createMockRequest({
        teamId: 'cltest000team000001',
        reason: 'Not ready',
      })
      const response = await RejectPost(request, {
        params: Promise.resolve({ approvalId: 'cltest000approval01' }),
      })
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe('Unauthorized')
    })

    it('should return 400 when teamId is missing', async () => {
      const mockSession = createMockSession()
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)

      const request = createMockRequest({ reason: 'Not ready' })
      const response = await RejectPost(request, {
        params: Promise.resolve({ approvalId: 'cltest000approval01' }),
      })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe('teamId is required')
    })

    it('should return 400 when reason is missing', async () => {
      const mockSession = createMockSession()
      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)

      const request = createMockRequest({ teamId: 'cltest000team000001' })
      const response = await RejectPost(request, {
        params: Promise.resolve({ approvalId: 'cltest000approval01' }),
      })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe('reason is required')
    })

    it('should reject migration successfully', async () => {
      const mockSession = createMockSession()
      const mockApproval = createMockApproval()

      vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)
      vi.mocked(requirePermission).mockResolvedValue(undefined)
      vi.mocked(prisma.migrationApproval.findUnique).mockResolvedValue(mockApproval as any)
      vi.mocked(prisma.migrationApproval.update).mockResolvedValue({
        ...mockApproval,
        status: 'REJECTED',
      } as any)

      const request = createMockRequest({
        teamId: 'cltest000team000001',
        reason: 'Needs more testing',
      })
      const response = await RejectPost(request, {
        params: Promise.resolve({ approvalId: 'cltest000approval01' }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.message).toBe('Migration approval rejected')
      expect(json.approval.status).toBe('REJECTED')
    })
  })
})
