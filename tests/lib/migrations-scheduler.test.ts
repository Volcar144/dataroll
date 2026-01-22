import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    migration: {
      findUnique: vi.fn(),
    },
    scheduledExecution: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/webhooks', () => ({
  triggerWebhook: vi.fn(),
}))

vi.mock('@/lib/audit', () => ({
  createAuditLog: vi.fn(),
}))

vi.mock('@/lib/migration-execution', () => ({
  executeMigration: vi.fn(),
}))

import {
  scheduleMigration,
  getScheduledExecutions,
  cancelScheduledExecution,
  processPendingScheduledExecutions,
} from '@/lib/migrations-scheduler'
import { prisma } from '@/lib/prisma'
import { triggerWebhook } from '@/lib/webhooks'
import { createAuditLog } from '@/lib/audit'
import { executeMigration } from '@/lib/migration-execution'

describe('Migration Scheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('scheduleMigration', () => {
    it('should schedule a migration successfully', async () => {
      const futureDate = new Date(Date.now() + 60000) // 1 minute in the future

      vi.mocked(prisma.migration.findUnique).mockResolvedValue({
        id: 'mig-123',
        name: 'Add users table',
        version: '1',
        teamId: 'team-123',
        databaseConnectionId: 'conn-123',
        databaseConnection: { id: 'conn-123' },
      } as any)

      vi.mocked(prisma.scheduledExecution.create).mockResolvedValue({
        id: 'sched-123',
        migrationId: 'mig-123',
        teamId: 'team-123',
        scheduledFor: futureDate,
      } as any)

      const result = await scheduleMigration({
        migrationId: 'mig-123',
        teamId: 'team-123',
        databaseConnectionId: 'conn-123',
        scheduledFor: futureDate,
        scheduledById: 'user-123',
      })

      expect(prisma.scheduledExecution.create).toHaveBeenCalled()
      expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'MIGRATION_CREATED',
        resource: 'migration',
        resourceId: 'mig-123',
      }))
      expect(triggerWebhook).toHaveBeenCalledWith('team-123', 'migration.created', expect.any(Object))
      expect(result.id).toBe('sched-123')
    })

    it('should throw when migration not found', async () => {
      vi.mocked(prisma.migration.findUnique).mockResolvedValue(null)

      await expect(
        scheduleMigration({
          migrationId: 'nonexistent',
          teamId: 'team-123',
          databaseConnectionId: 'conn-123',
          scheduledFor: new Date(Date.now() + 60000),
          scheduledById: 'user-123',
        })
      ).rejects.toThrow('Migration not found')
    })

    it('should throw when migration belongs to different team', async () => {
      vi.mocked(prisma.migration.findUnique).mockResolvedValue({
        id: 'mig-123',
        teamId: 'other-team',
        databaseConnectionId: 'conn-123',
        databaseConnection: {},
      } as any)

      await expect(
        scheduleMigration({
          migrationId: 'mig-123',
          teamId: 'team-123',
          databaseConnectionId: 'conn-123',
          scheduledFor: new Date(Date.now() + 60000),
          scheduledById: 'user-123',
        })
      ).rejects.toThrow('Migration does not belong to this team')
    })

    it('should throw when connection does not match', async () => {
      vi.mocked(prisma.migration.findUnique).mockResolvedValue({
        id: 'mig-123',
        teamId: 'team-123',
        databaseConnectionId: 'other-conn',
        databaseConnection: {},
      } as any)

      await expect(
        scheduleMigration({
          migrationId: 'mig-123',
          teamId: 'team-123',
          databaseConnectionId: 'conn-123',
          scheduledFor: new Date(Date.now() + 60000),
          scheduledById: 'user-123',
        })
      ).rejects.toThrow('Database connection does not match migration configuration')
    })

    it('should throw when scheduled time is in the past', async () => {
      vi.mocked(prisma.migration.findUnique).mockResolvedValue({
        id: 'mig-123',
        teamId: 'team-123',
        databaseConnectionId: 'conn-123',
        databaseConnection: {},
      } as any)

      await expect(
        scheduleMigration({
          migrationId: 'mig-123',
          teamId: 'team-123',
          databaseConnectionId: 'conn-123',
          scheduledFor: new Date(Date.now() - 60000), // 1 minute in the past
          scheduledById: 'user-123',
        })
      ).rejects.toThrow('Scheduled time must be in the future')
    })
  })

  describe('getScheduledExecutions', () => {
    it('should return scheduled executions with pagination', async () => {
      const mockExecutions = [
        {
          id: 'sched-1',
          migrationId: 'mig-1',
          migration: { id: 'mig-1', name: 'Migration 1', version: '1' },
          databaseConnection: { id: 'conn-1', name: 'Test DB' },
          scheduledBy: { name: 'User', email: 'user@example.com' },
        },
      ]

      vi.mocked(prisma.scheduledExecution.findMany).mockResolvedValue(mockExecutions as any)
      vi.mocked(prisma.scheduledExecution.count).mockResolvedValue(1)

      const result = await getScheduledExecutions('team-123', { limit: 10, offset: 0 })

      expect(result.executions).toEqual(mockExecutions)
      expect(result.total).toBe(1)
      expect(result.hasMore).toBe(false)
    })

    it('should filter by status', async () => {
      vi.mocked(prisma.scheduledExecution.findMany).mockResolvedValue([])
      vi.mocked(prisma.scheduledExecution.count).mockResolvedValue(0)

      await getScheduledExecutions('team-123', { status: 'PENDING' })

      expect(prisma.scheduledExecution.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { teamId: 'team-123', status: 'PENDING' },
        })
      )
    })

    it('should use default pagination', async () => {
      vi.mocked(prisma.scheduledExecution.findMany).mockResolvedValue([])
      vi.mocked(prisma.scheduledExecution.count).mockResolvedValue(0)

      await getScheduledExecutions('team-123')

      expect(prisma.scheduledExecution.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
        })
      )
    })

    it('should correctly calculate hasMore', async () => {
      vi.mocked(prisma.scheduledExecution.findMany).mockResolvedValue([])
      vi.mocked(prisma.scheduledExecution.count).mockResolvedValue(100)

      const result = await getScheduledExecutions('team-123', { limit: 10, offset: 0 })

      expect(result.hasMore).toBe(true)
    })
  })

  describe('cancelScheduledExecution', () => {
    it('should cancel a pending execution', async () => {
      vi.mocked(prisma.scheduledExecution.findUnique).mockResolvedValue({
        id: 'sched-123',
        teamId: 'team-123',
        migrationId: 'mig-123',
        status: 'PENDING',
      } as any)

      await cancelScheduledExecution('sched-123', 'team-123', 'user-123')

      expect(prisma.scheduledExecution.delete).toHaveBeenCalledWith({
        where: { id: 'sched-123' },
      })
      expect(createAuditLog).toHaveBeenCalled()
    })

    it('should throw when execution not found', async () => {
      vi.mocked(prisma.scheduledExecution.findUnique).mockResolvedValue(null)

      await expect(
        cancelScheduledExecution('nonexistent', 'team-123', 'user-123')
      ).rejects.toThrow('Scheduled execution not found')
    })

    it('should throw when execution belongs to different team', async () => {
      vi.mocked(prisma.scheduledExecution.findUnique).mockResolvedValue({
        id: 'sched-123',
        teamId: 'other-team',
        status: 'PENDING',
      } as any)

      await expect(
        cancelScheduledExecution('sched-123', 'team-123', 'user-123')
      ).rejects.toThrow('Scheduled execution does not belong to this team')
    })

    it('should throw when execution is not pending', async () => {
      vi.mocked(prisma.scheduledExecution.findUnique).mockResolvedValue({
        id: 'sched-123',
        teamId: 'team-123',
        status: 'SUCCESS',
      } as any)

      await expect(
        cancelScheduledExecution('sched-123', 'team-123', 'user-123')
      ).rejects.toThrow('Cannot cancel success execution')
    })

    it('should throw for failed executions', async () => {
      vi.mocked(prisma.scheduledExecution.findUnique).mockResolvedValue({
        id: 'sched-123',
        teamId: 'team-123',
        status: 'FAILURE',
      } as any)

      await expect(
        cancelScheduledExecution('sched-123', 'team-123', 'user-123')
      ).rejects.toThrow('Cannot cancel failure execution')
    })
  })

  describe('processPendingScheduledExecutions', () => {
    it('should process pending executions that are due', async () => {
      vi.mocked(prisma.scheduledExecution.findMany).mockResolvedValue([
        {
          id: 'sched-1',
          teamId: 'team-123',
          migrationId: 'mig-1',
          scheduledById: 'user-123',
          migration: { id: 'mig-1', name: 'Migration 1' },
          databaseConnection: {},
        },
      ] as any)

      vi.mocked(executeMigration).mockResolvedValue({
        success: true,
        duration: 100,
        changes: ['Table created'],
      })

      await processPendingScheduledExecutions()

      expect(executeMigration).toHaveBeenCalled()
      expect(prisma.scheduledExecution.update).toHaveBeenCalledWith({
        where: { id: 'sched-1' },
        data: {
          status: 'SUCCESS',
          executedAt: expect.any(Date),
        },
      })
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MIGRATION_EXECUTED',
        })
      )
      expect(triggerWebhook).toHaveBeenCalledWith('team-123', 'migration.executed', expect.any(Object))
    })

    it('should handle failed migrations', async () => {
      vi.mocked(prisma.scheduledExecution.findMany).mockResolvedValue([
        {
          id: 'sched-1',
          teamId: 'team-123',
          migrationId: 'mig-1',
          scheduledById: 'user-123',
          migration: { id: 'mig-1', name: 'Migration 1' },
          databaseConnection: {},
        },
      ] as any)

      vi.mocked(executeMigration).mockResolvedValue({
        success: false,
        duration: 50,
        error: 'Syntax error',
      })

      await processPendingScheduledExecutions()

      expect(prisma.scheduledExecution.update).toHaveBeenCalledWith({
        where: { id: 'sched-1' },
        data: {
          status: 'FAILURE',
          executedAt: expect.any(Date),
        },
      })
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'MIGRATION_FAILED',
        })
      )
    })

    it('should handle exceptions during execution', async () => {
      vi.mocked(prisma.scheduledExecution.findMany).mockResolvedValue([
        {
          id: 'sched-1',
          teamId: 'team-123',
          migrationId: 'mig-1',
          scheduledById: 'user-123',
          migration: { id: 'mig-1', name: 'Migration 1' },
          databaseConnection: {},
        },
      ] as any)

      vi.mocked(executeMigration).mockRejectedValue(new Error('Connection lost'))

      await processPendingScheduledExecutions()

      expect(prisma.scheduledExecution.update).toHaveBeenCalledWith({
        where: { id: 'sched-1' },
        data: {
          status: 'FAILURE',
        },
      })
      expect(triggerWebhook).toHaveBeenCalledWith(
        'team-123',
        'migration.failed',
        expect.objectContaining({
          error: 'Connection lost',
        })
      )
    })

    it('should do nothing when no pending executions', async () => {
      vi.mocked(prisma.scheduledExecution.findMany).mockResolvedValue([])

      await processPendingScheduledExecutions()

      expect(executeMigration).not.toHaveBeenCalled()
    })

    it('should process multiple pending executions', async () => {
      vi.mocked(prisma.scheduledExecution.findMany).mockResolvedValue([
        {
          id: 'sched-1',
          teamId: 'team-123',
          migrationId: 'mig-1',
          scheduledById: 'user-123',
          migration: { id: 'mig-1', name: 'Migration 1' },
          databaseConnection: {},
        },
        {
          id: 'sched-2',
          teamId: 'team-456',
          migrationId: 'mig-2',
          scheduledById: 'user-456',
          migration: { id: 'mig-2', name: 'Migration 2' },
          databaseConnection: {},
        },
      ] as any)

      vi.mocked(executeMigration).mockResolvedValue({
        success: true,
        duration: 100,
      })

      await processPendingScheduledExecutions()

      expect(executeMigration).toHaveBeenCalledTimes(2)
    })
  })
})
