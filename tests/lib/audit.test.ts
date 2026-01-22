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

  describe('getTeamAuditLogs', () => {
    it('should return logs with pagination info', async () => {
      const mockFindMany = vi.mocked(prisma.auditLog.findMany)
      const mockCount = vi.mocked(prisma.auditLog.count)
      
      mockFindMany.mockResolvedValue([
        { id: 'log1', action: AuditAction.USER_LOGIN },
        { id: 'log2', action: AuditAction.TEAM_CREATED },
      ] as any)
      mockCount.mockResolvedValue(100)

      const { getTeamAuditLogs } = await import('@/lib/audit')
      const result = await getTeamAuditLogs('team_123', { limit: 10, offset: 0 })

      expect(result.logs).toHaveLength(2)
      expect(result.total).toBe(100)
      expect(result.hasMore).toBe(true)
    })

    it('should filter by action', async () => {
      const mockFindMany = vi.mocked(prisma.auditLog.findMany)
      const mockCount = vi.mocked(prisma.auditLog.count)
      
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)

      const { getTeamAuditLogs } = await import('@/lib/audit')
      await getTeamAuditLogs('team_123', { action: AuditAction.MIGRATION_EXECUTED })

      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          teamId: 'team_123',
          action: AuditAction.MIGRATION_EXECUTED,
        }),
      }))
    })

    it('should filter by userId', async () => {
      const mockFindMany = vi.mocked(prisma.auditLog.findMany)
      const mockCount = vi.mocked(prisma.auditLog.count)
      
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)

      const { getTeamAuditLogs } = await import('@/lib/audit')
      await getTeamAuditLogs('team_123', { userId: 'user_456' })

      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          teamId: 'team_123',
          userId: 'user_456',
        }),
      }))
    })

    it('should filter by resource', async () => {
      const mockFindMany = vi.mocked(prisma.auditLog.findMany)
      const mockCount = vi.mocked(prisma.auditLog.count)
      
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)

      const { getTeamAuditLogs } = await import('@/lib/audit')
      await getTeamAuditLogs('team_123', { resource: 'Migration' })

      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          teamId: 'team_123',
          resource: 'Migration',
        }),
      }))
    })

    it('should use default pagination values', async () => {
      const mockFindMany = vi.mocked(prisma.auditLog.findMany)
      const mockCount = vi.mocked(prisma.auditLog.count)
      
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)

      const { getTeamAuditLogs } = await import('@/lib/audit')
      await getTeamAuditLogs('team_123')

      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
        take: 50,
        skip: 0,
      }))
    })
  })

  describe('getResourceAuditLogs', () => {
    it('should return logs for a specific resource', async () => {
      const mockFindMany = vi.mocked(prisma.auditLog.findMany)
      mockFindMany.mockResolvedValue([
        { id: 'log1', action: AuditAction.MIGRATION_EXECUTED, resourceId: 'mig_123' },
      ] as any)

      const { getResourceAuditLogs } = await import('@/lib/audit')
      const result = await getResourceAuditLogs('team_123', 'Migration', 'mig_123')

      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          teamId: 'team_123',
          resource: 'Migration',
          resourceId: 'mig_123',
        },
      }))
      expect(result).toHaveLength(1)
    })
  })

  describe('exportAuditLogs', () => {
    it('should export all logs for a team', async () => {
      const mockFindMany = vi.mocked(prisma.auditLog.findMany)
      mockFindMany.mockResolvedValue([
        { id: 'log1' },
        { id: 'log2' },
      ] as any)

      const { exportAuditLogs } = await import('@/lib/audit')
      const result = await exportAuditLogs('team_123')

      expect(result).toHaveLength(2)
    })

    it('should filter by date range', async () => {
      const mockFindMany = vi.mocked(prisma.auditLog.findMany)
      mockFindMany.mockResolvedValue([])

      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-12-31')

      const { exportAuditLogs } = await import('@/lib/audit')
      await exportAuditLogs('team_123', { startDate, endDate })

      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        }),
      }))
    })

    it('should filter by action and user', async () => {
      const mockFindMany = vi.mocked(prisma.auditLog.findMany)
      mockFindMany.mockResolvedValue([])

      const { exportAuditLogs } = await import('@/lib/audit')
      await exportAuditLogs('team_123', {
        action: AuditAction.USER_LOGIN,
        userId: 'user_456',
      })

      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          action: AuditAction.USER_LOGIN,
          userId: 'user_456',
        }),
      }))
    })
  })
})
