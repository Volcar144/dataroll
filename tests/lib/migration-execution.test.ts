import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock database connection service
vi.mock('@/lib/database-connection', () => ({
  DatabaseConnectionService: {
    executeQuery: vi.fn(),
  },
}))

import { executeMigration } from '@/lib/migration-execution'
import { DatabaseConnectionService } from '@/lib/database-connection'

describe('Migration Execution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('executeMigration', () => {
    describe('PRISMA migrations', () => {
      it('should execute Prisma migration successfully', async () => {
        vi.mocked(DatabaseConnectionService.executeQuery).mockResolvedValue({
          success: true,
          changes: ['Table created'],
        })

        const migration = {
          type: 'PRISMA',
          name: 'add_users_table',
          content: 'CREATE TABLE users (id INT PRIMARY KEY)',
          databaseConnection: { type: 'POSTGRESQL', host: 'localhost' },
          databaseConnectionId: 'conn-123',
        }

        const result = await executeMigration(migration, false)

        expect(result.success).toBe(true)
        expect(result.duration).toBeGreaterThanOrEqual(0)
        expect(result.changes).toContain('Table created')
      })

      it('should perform dry run for Prisma migration', async () => {
        const migration = {
          type: 'PRISMA',
          name: 'add_users_table',
          content: 'CREATE TABLE users (id INT PRIMARY KEY)',
          databaseConnection: { type: 'POSTGRESQL' },
        }

        const result = await executeMigration(migration, true)

        expect(result.success).toBe(true)
        expect(result.changes).toContain('Would execute Prisma migration: add_users_table')
        expect(DatabaseConnectionService.executeQuery).not.toHaveBeenCalled()
      })

      it('should handle Prisma migration failure', async () => {
        vi.mocked(DatabaseConnectionService.executeQuery).mockResolvedValue({
          success: false,
          error: 'Table already exists',
        })

        const migration = {
          type: 'PRISMA',
          name: 'add_users_table',
          content: 'CREATE TABLE users (id INT PRIMARY KEY)',
          databaseConnection: { type: 'POSTGRESQL' },
          databaseConnectionId: 'conn-123',
        }

        const result = await executeMigration(migration, false)

        expect(result.success).toBe(false)
        expect(result.error).toBe('Table already exists')
      })

      it('should handle Prisma execution exception', async () => {
        vi.mocked(DatabaseConnectionService.executeQuery).mockRejectedValue(
          new Error('Connection timeout')
        )

        const migration = {
          type: 'PRISMA',
          name: 'add_users_table',
          content: 'CREATE TABLE users (id INT PRIMARY KEY)',
          databaseConnection: { type: 'POSTGRESQL' },
          databaseConnectionId: 'conn-123',
        }

        const result = await executeMigration(migration, false)

        expect(result.success).toBe(false)
        expect(result.error).toBe('Connection timeout')
      })
    })

    describe('DRIZZLE migrations', () => {
      it('should execute Drizzle migration successfully', async () => {
        vi.mocked(DatabaseConnectionService.executeQuery).mockResolvedValue({
          success: true,
          changes: ['Index created'],
        })

        const migration = {
          type: 'DRIZZLE',
          name: 'add_index',
          content: 'CREATE INDEX idx_users_email ON users(email)',
          databaseConnection: { type: 'MYSQL' },
          databaseConnectionId: 'conn-123',
        }

        const result = await executeMigration(migration, false)

        expect(result.success).toBe(true)
        expect(result.changes).toContain('Index created')
      })

      it('should perform dry run for Drizzle migration', async () => {
        const migration = {
          type: 'DRIZZLE',
          name: 'add_index',
          content: 'CREATE INDEX idx_users_email ON users(email)',
          databaseConnection: { type: 'MYSQL' },
        }

        const result = await executeMigration(migration, true)

        expect(result.success).toBe(true)
        expect(result.changes).toContain('Would execute Drizzle migration: add_index')
      })

      it('should handle Drizzle migration failure', async () => {
        vi.mocked(DatabaseConnectionService.executeQuery).mockResolvedValue({
          success: false,
          error: 'Syntax error',
        })

        const migration = {
          type: 'DRIZZLE',
          name: 'broken_migration',
          content: 'CREAT TABL users',
          databaseConnection: { type: 'MYSQL' },
          databaseConnectionId: 'conn-123',
        }

        const result = await executeMigration(migration, false)

        expect(result.success).toBe(false)
        expect(result.error).toBe('Syntax error')
      })

      it('should handle Drizzle execution exception', async () => {
        vi.mocked(DatabaseConnectionService.executeQuery).mockRejectedValue(
          new Error('Database unavailable')
        )

        const migration = {
          type: 'DRIZZLE',
          name: 'add_index',
          content: 'CREATE INDEX idx ON table(col)',
          databaseConnection: { type: 'MYSQL' },
          databaseConnectionId: 'conn-123',
        }

        const result = await executeMigration(migration, false)

        expect(result.success).toBe(false)
        expect(result.error).toBe('Database unavailable')
      })
    })

    describe('RAW_SQL migrations', () => {
      it('should execute raw SQL migration successfully', async () => {
        vi.mocked(DatabaseConnectionService.executeQuery).mockResolvedValue({
          success: true,
          rowCount: 5,
        })

        const migration = {
          type: 'RAW_SQL',
          name: 'update_data',
          content: 'UPDATE users SET active = true WHERE created_at > NOW() - INTERVAL 30 DAY',
          databaseConnection: { type: 'SQLITE' },
          databaseConnectionId: 'conn-123',
        }

        const result = await executeMigration(migration, false)

        expect(result.success).toBe(true)
      })

      it('should perform dry run for raw SQL migration', async () => {
        const migration = {
          type: 'RAW_SQL',
          name: 'update_data',
          content: 'UPDATE users SET active = true',
          databaseConnection: { type: 'SQLITE' },
        }

        const result = await executeMigration(migration, true)

        expect(result.success).toBe(true)
        expect(result.changes).toContain('Would execute SQL migration: update_data')
      })

      it('should handle raw SQL failure', async () => {
        vi.mocked(DatabaseConnectionService.executeQuery).mockResolvedValue({
          success: false,
          error: 'Permission denied',
        })

        const migration = {
          type: 'RAW_SQL',
          name: 'drop_table',
          content: 'DROP TABLE important_data',
          databaseConnection: { type: 'POSTGRESQL' },
          databaseConnectionId: 'conn-123',
        }

        const result = await executeMigration(migration, false)

        expect(result.success).toBe(false)
        expect(result.error).toBe('Permission denied')
      })

      it('should handle raw SQL execution exception', async () => {
        vi.mocked(DatabaseConnectionService.executeQuery).mockRejectedValue(
          new Error('Query canceled')
        )

        const migration = {
          type: 'RAW_SQL',
          name: 'long_query',
          content: 'SELECT * FROM huge_table',
          databaseConnection: { type: 'POSTGRESQL' },
          databaseConnectionId: 'conn-123',
        }

        const result = await executeMigration(migration, false)

        expect(result.success).toBe(false)
        expect(result.error).toBe('Query canceled')
      })
    })

    describe('Unsupported migration types', () => {
      it('should fail for unsupported migration type', async () => {
        const migration = {
          type: 'UNKNOWN_TYPE',
          name: 'mystery_migration',
          content: 'DO SOMETHING',
          databaseConnection: {},
        }

        const result = await executeMigration(migration, false)

        expect(result.success).toBe(false)
        expect(result.error).toBe('Unsupported migration type: UNKNOWN_TYPE')
      })
    })

    describe('Timing and metrics', () => {
      it('should return execution duration', async () => {
        vi.mocked(DatabaseConnectionService.executeQuery).mockImplementation(
          () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 50))
        )

        const migration = {
          type: 'PRISMA',
          name: 'slow_migration',
          content: 'CREATE TABLE big_table (...)',
          databaseConnection: {},
          databaseConnectionId: 'conn-123',
        }

        const result = await executeMigration(migration, false)

        expect(result.duration).toBeGreaterThanOrEqual(40) // Allow some variance
      })

      it('should track duration even on failure', async () => {
        vi.mocked(DatabaseConnectionService.executeQuery).mockImplementation(
          () => new Promise((_, reject) => setTimeout(() => reject(new Error('Fail')), 30))
        )

        const migration = {
          type: 'RAW_SQL',
          name: 'failing_migration',
          content: 'INVALID SQL',
          databaseConnection: {},
          databaseConnectionId: 'conn-123',
        }

        const result = await executeMigration(migration, false)

        expect(result.success).toBe(false)
        expect(result.duration).toBeGreaterThanOrEqual(20)
      })
    })

    describe('Default changes message', () => {
      it('should use default message when no changes returned', async () => {
        vi.mocked(DatabaseConnectionService.executeQuery).mockResolvedValue({
          success: true,
          // No changes array
        })

        const migration = {
          type: 'PRISMA',
          name: 'silent_migration',
          content: 'CREATE TABLE t (id INT)',
          databaseConnection: {},
          databaseConnectionId: 'conn-123',
        }

        const result = await executeMigration(migration, false)

        expect(result.success).toBe(true)
        expect(result.changes).toContain('Migration executed successfully')
      })
    })
  })
})
