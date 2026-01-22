import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuditAction } from '@prisma/client'

// Mock prisma and other dependencies before importing the module
vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
  },
}))

// Import after mocking
import { createAuditLog } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

describe('Audit Logging', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createAuditLog', () => {
    it('should create audit log with all fields', async () => {
      const mockCreate = vi.mocked(prisma.auditLog.create)
      mockCreate.mockResolvedValue({} as any)

      await createAuditLog({
        action: AuditAction.MIGRATION_EXECUTED,
        resource: 'Migration',
        resourceId: 'mig_123',
        details: { version: '1.0', status: 'success' },
        teamId: 'team_123',
        userId: 'user_123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      })

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          action: AuditAction.MIGRATION_EXECUTED,
          resource: 'Migration',
          resourceId: 'mig_123',
          details: JSON.stringify({ version: '1.0', status: 'success' }),
          teamId: 'team_123',
          userId: 'user_123',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
      })
    })

    it('should create audit log with minimal fields', async () => {
      const mockCreate = vi.mocked(prisma.auditLog.create)
      mockCreate.mockResolvedValue({} as any)

      await createAuditLog({
        action: AuditAction.USER_LOGIN,
        resource: 'User',
        teamId: 'team_123',
        userId: 'user_123',
      })

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          action: AuditAction.USER_LOGIN,
          resource: 'User',
          resourceId: undefined,
          details: null,
          teamId: 'team_123',
          userId: 'user_123',
          ipAddress: undefined,
          userAgent: undefined,
        },
      })
    })

    it('should not throw when audit log creation fails', async () => {
      const mockCreate = vi.mocked(prisma.auditLog.create)
      mockCreate.mockRejectedValue(new Error('Database error'))

      // Should not throw
      await expect(
        createAuditLog({
          action: AuditAction.MIGRATION_EXECUTED,
          resource: 'Migration',
          teamId: 'team_123',
          userId: 'user_123',
        })
      ).resolves.toBeUndefined()
    })

    it('should handle different audit actions', async () => {
      const mockCreate = vi.mocked(prisma.auditLog.create)
      mockCreate.mockResolvedValue({} as any)

      const actions = [
        AuditAction.USER_LOGIN,
        AuditAction.TEAM_CREATED,
        AuditAction.CONNECTION_CREATED,
        AuditAction.MIGRATION_EXECUTED,
        AuditAction.MIGRATION_ROLLED_BACK,
      ]

      for (const action of actions) {
        await createAuditLog({
          action,
          resource: 'Test',
          teamId: 'team_123',
          userId: 'user_123',
        })
      }

      expect(mockCreate).toHaveBeenCalledTimes(actions.length)
    })
  })
})
