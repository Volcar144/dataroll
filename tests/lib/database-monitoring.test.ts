import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    databaseError: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    databaseConnection: {
      update: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/database-connection', () => ({
  DatabaseConnectionService: {
    testConnection: vi.fn(),
  },
}))

vi.mock('@/lib/telemetry', () => ({
  Logger: {
    getInstance: () => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
  },
}))

import {
  recordDatabaseError,
  updateConnectionHealthStatus,
  performHealthCheck,
  getDatabaseErrors,
  getConnectionHealthStatus,
  performTeamHealthChecks,
} from '@/lib/database-monitoring'
import { prisma } from '@/lib/prisma'
import { DatabaseConnectionService } from '@/lib/database-connection'

describe('Database Monitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('recordDatabaseError', () => {
    it('should create error record in database', async () => {
      vi.mocked(prisma.databaseError.create).mockResolvedValue({} as any)
      vi.mocked(prisma.databaseConnection.update).mockResolvedValue({} as any)

      await recordDatabaseError({
        connectionId: 'conn-123',
        operation: 'query_execution',
        errorType: 'timeout',
        message: 'Query timed out after 30s',
        details: 'SELECT * FROM large_table',
      })

      expect(prisma.databaseError.create).toHaveBeenCalledWith({
        data: {
          connectionId: 'conn-123',
          operation: 'query_execution',
          errorType: 'timeout',
          message: 'Query timed out after 30s',
          details: 'SELECT * FROM large_table',
        },
      })
    })

    it('should update connection health status to UNHEALTHY', async () => {
      vi.mocked(prisma.databaseError.create).mockResolvedValue({} as any)
      vi.mocked(prisma.databaseConnection.update).mockResolvedValue({} as any)

      await recordDatabaseError({
        connectionId: 'conn-123',
        operation: 'connection_test',
        errorType: 'connection_failed',
        message: 'Connection refused',
      })

      expect(prisma.databaseConnection.update).toHaveBeenCalledWith({
        where: { id: 'conn-123' },
        data: {
          healthStatus: 'UNHEALTHY',
          lastHealthCheck: expect.any(Date),
        },
      })
    })

    it('should handle database create failure gracefully', async () => {
      vi.mocked(prisma.databaseError.create).mockRejectedValue(new Error('DB write failed'))

      // Should not throw
      await expect(
        recordDatabaseError({
          connectionId: 'conn-123',
          operation: 'test',
          errorType: 'error',
          message: 'Test',
        })
      ).resolves.not.toThrow()
    })
  })

  describe('updateConnectionHealthStatus', () => {
    it('should update connection to HEALTHY', async () => {
      vi.mocked(prisma.databaseConnection.update).mockResolvedValue({} as any)

      await updateConnectionHealthStatus('conn-123', 'HEALTHY')

      expect(prisma.databaseConnection.update).toHaveBeenCalledWith({
        where: { id: 'conn-123' },
        data: {
          healthStatus: 'HEALTHY',
          lastHealthCheck: expect.any(Date),
        },
      })
    })

    it('should update connection to UNHEALTHY', async () => {
      vi.mocked(prisma.databaseConnection.update).mockResolvedValue({} as any)

      await updateConnectionHealthStatus('conn-123', 'UNHEALTHY')

      expect(prisma.databaseConnection.update).toHaveBeenCalledWith({
        where: { id: 'conn-123' },
        data: {
          healthStatus: 'UNHEALTHY',
          lastHealthCheck: expect.any(Date),
        },
      })
    })

    it('should update connection to UNKNOWN', async () => {
      vi.mocked(prisma.databaseConnection.update).mockResolvedValue({} as any)

      await updateConnectionHealthStatus('conn-123', 'UNKNOWN')

      expect(prisma.databaseConnection.update).toHaveBeenCalledWith({
        where: { id: 'conn-123' },
        data: {
          healthStatus: 'UNKNOWN',
          lastHealthCheck: expect.any(Date),
        },
      })
    })

    it('should handle update failure gracefully', async () => {
      vi.mocked(prisma.databaseConnection.update).mockRejectedValue(new Error('Update failed'))

      await expect(
        updateConnectionHealthStatus('conn-123', 'HEALTHY')
      ).resolves.not.toThrow()
    })
  })

  describe('performHealthCheck', () => {
    it('should return success for healthy connection', async () => {
      vi.mocked(prisma.databaseConnection.findUnique).mockResolvedValue({
        id: 'conn-123',
        type: 'POSTGRESQL',
        host: 'localhost',
        port: 5432,
        database: 'test',
        username: 'user',
        password: 'pass',
        ssl: false,
        url: null,
      } as any)

      vi.mocked(DatabaseConnectionService.testConnection).mockResolvedValue({
        success: true,
        latency: 50,
      })

      vi.mocked(prisma.databaseConnection.update).mockResolvedValue({} as any)

      const result = await performHealthCheck('conn-123')

      expect(result.success).toBe(true)
      expect(result.latency).toBe(50)
    })

    it('should return failure for unhealthy connection', async () => {
      vi.mocked(prisma.databaseConnection.findUnique).mockResolvedValue({
        id: 'conn-123',
        type: 'POSTGRESQL',
        host: 'localhost',
        port: 5432,
        database: 'test',
        username: 'user',
        password: 'pass',
        ssl: false,
        url: null,
      } as any)

      vi.mocked(DatabaseConnectionService.testConnection).mockResolvedValue({
        success: false,
        error: 'Connection refused',
      })

      vi.mocked(prisma.databaseConnection.update).mockResolvedValue({} as any)
      vi.mocked(prisma.databaseError.create).mockResolvedValue({} as any)

      const result = await performHealthCheck('conn-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Connection refused')
    })

    it('should throw when connection not found', async () => {
      vi.mocked(prisma.databaseConnection.findUnique).mockResolvedValue(null)

      const result = await performHealthCheck('nonexistent')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Connection not found')
    })

    it('should record error on health check failure', async () => {
      vi.mocked(prisma.databaseConnection.findUnique).mockResolvedValue({
        id: 'conn-123',
        type: 'MYSQL',
        host: 'localhost',
        port: 3306,
        database: 'test',
        username: 'user',
        password: 'pass',
        ssl: false,
        url: null,
      } as any)

      vi.mocked(DatabaseConnectionService.testConnection).mockResolvedValue({
        success: false,
        error: 'Access denied',
      })

      vi.mocked(prisma.databaseConnection.update).mockResolvedValue({} as any)
      vi.mocked(prisma.databaseError.create).mockResolvedValue({} as any)

      await performHealthCheck('conn-123')

      expect(prisma.databaseError.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          connectionId: 'conn-123',
          operation: 'health_check',
          errorType: 'connection_failed',
          message: 'Access denied',
        }),
      })
    })

    it('should handle exceptions during health check', async () => {
      vi.mocked(prisma.databaseConnection.findUnique).mockRejectedValue(
        new Error('Database error')
      )

      vi.mocked(prisma.databaseConnection.update).mockResolvedValue({} as any)
      vi.mocked(prisma.databaseError.create).mockResolvedValue({} as any)

      const result = await performHealthCheck('conn-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })
  })

  describe('getDatabaseErrors', () => {
    it('should return errors with pagination', async () => {
      const mockErrors = [
        { id: 'err-1', operation: 'query', errorType: 'timeout' },
        { id: 'err-2', operation: 'connection', errorType: 'refused' },
      ]

      vi.mocked(prisma.databaseError.findMany).mockResolvedValue(mockErrors as any)
      vi.mocked(prisma.databaseError.count).mockResolvedValue(100)

      const result = await getDatabaseErrors('conn-123', { limit: 10, offset: 0 })

      expect(result.errors).toEqual(mockErrors)
      expect(result.total).toBe(100)
      expect(result.hasMore).toBe(true)
    })

    it('should filter by operation', async () => {
      vi.mocked(prisma.databaseError.findMany).mockResolvedValue([])
      vi.mocked(prisma.databaseError.count).mockResolvedValue(0)

      await getDatabaseErrors('conn-123', { operation: 'query_execution' })

      expect(prisma.databaseError.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { connectionId: 'conn-123', operation: 'query_execution' },
        })
      )
    })

    it('should filter by errorType', async () => {
      vi.mocked(prisma.databaseError.findMany).mockResolvedValue([])
      vi.mocked(prisma.databaseError.count).mockResolvedValue(0)

      await getDatabaseErrors('conn-123', { errorType: 'timeout' })

      expect(prisma.databaseError.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { connectionId: 'conn-123', errorType: 'timeout' },
        })
      )
    })

    it('should use default pagination', async () => {
      vi.mocked(prisma.databaseError.findMany).mockResolvedValue([])
      vi.mocked(prisma.databaseError.count).mockResolvedValue(0)

      await getDatabaseErrors('conn-123')

      expect(prisma.databaseError.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
        })
      )
    })

    it('should calculate hasMore correctly', async () => {
      vi.mocked(prisma.databaseError.findMany).mockResolvedValue([])
      vi.mocked(prisma.databaseError.count).mockResolvedValue(50)

      const result = await getDatabaseErrors('conn-123', { limit: 50, offset: 0 })

      expect(result.hasMore).toBe(false)
    })
  })

  describe('getConnectionHealthStatus', () => {
    it('should return health status with error count', async () => {
      vi.mocked(prisma.databaseConnection.findUnique).mockResolvedValue({
        id: 'conn-123',
        name: 'Production DB',
        healthStatus: 'HEALTHY',
        lastHealthCheck: new Date('2024-01-15'),
        _count: {
          errors: 5,
        },
      } as any)

      const result = await getConnectionHealthStatus('conn-123')

      expect(result.id).toBe('conn-123')
      expect(result.name).toBe('Production DB')
      expect(result.healthStatus).toBe('HEALTHY')
      expect(result.recentErrorsCount).toBe(5)
    })

    it('should throw when connection not found', async () => {
      vi.mocked(prisma.databaseConnection.findUnique).mockResolvedValue(null)

      await expect(getConnectionHealthStatus('nonexistent')).rejects.toThrow(
        'Connection not found'
      )
    })
  })

  describe('performTeamHealthChecks', () => {
    it('should perform health checks on all active connections', async () => {
      vi.mocked(prisma.databaseConnection.findMany).mockResolvedValue([
        { id: 'conn-1', name: 'DB 1' },
        { id: 'conn-2', name: 'DB 2' },
      ] as any)

      vi.mocked(prisma.databaseConnection.findUnique).mockResolvedValue({
        id: 'conn-1',
        type: 'POSTGRESQL',
        host: 'localhost',
        port: 5432,
        database: 'test',
        username: 'user',
        password: 'pass',
        ssl: false,
        url: null,
      } as any)

      vi.mocked(DatabaseConnectionService.testConnection).mockResolvedValue({
        success: true,
        latency: 30,
      })

      vi.mocked(prisma.databaseConnection.update).mockResolvedValue({} as any)

      await performTeamHealthChecks('team-123')

      expect(prisma.databaseConnection.findMany).toHaveBeenCalledWith({
        where: {
          teamId: 'team-123',
          isActive: true,
        },
        select: { id: true, name: true },
      })
    })

    it('should continue checking other connections when one fails', async () => {
      vi.mocked(prisma.databaseConnection.findMany).mockResolvedValue([
        { id: 'conn-1', name: 'DB 1' },
        { id: 'conn-2', name: 'DB 2' },
      ] as any)

      // First connection will fail to find
      let callCount = 0
      vi.mocked(prisma.databaseConnection.findUnique).mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          throw new Error('Connection error')
        }
        return {
          id: 'conn-2',
          type: 'POSTGRESQL',
          host: 'localhost',
          port: 5432,
          database: 'test',
          username: 'user',
          password: 'pass',
          ssl: false,
          url: null,
        } as any
      })

      vi.mocked(DatabaseConnectionService.testConnection).mockResolvedValue({
        success: true,
      })

      vi.mocked(prisma.databaseConnection.update).mockResolvedValue({} as any)
      vi.mocked(prisma.databaseError.create).mockResolvedValue({} as any)

      // Should not throw
      await expect(performTeamHealthChecks('team-123')).resolves.not.toThrow()
    })

    it('should do nothing for team with no connections', async () => {
      vi.mocked(prisma.databaseConnection.findMany).mockResolvedValue([])

      await performTeamHealthChecks('team-123')

      expect(prisma.databaseConnection.findUnique).not.toHaveBeenCalled()
    })
  })
})
