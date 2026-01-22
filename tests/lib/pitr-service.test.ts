import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    migrationSnapshot: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    migration: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    migrationRollback: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    rollbackExecution: {
      create: vi.fn(),
    },
  },
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock pg Pool
vi.mock('pg', () => ({
  Pool: vi.fn(() => ({
    connect: vi.fn().mockResolvedValue({
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    }),
    query: vi.fn().mockResolvedValue({ rows: [] }),
    end: vi.fn(),
  })),
}))

// Mock mysql2/promise
vi.mock('mysql2/promise', () => ({
  default: {
    createConnection: vi.fn().mockResolvedValue({
      query: vi.fn().mockResolvedValue([]),
      beginTransaction: vi.fn(),
      commit: vi.fn(),
      rollback: vi.fn(),
      end: vi.fn(),
    }),
  },
}))

import { PITRService, detectDatabaseProvider } from '@/lib/pitr-service'
import { prisma } from '@/lib/prisma'

describe('PITRService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateRollbackSQL', () => {
    describe('CREATE TABLE', () => {
      it('should generate DROP TABLE for CREATE TABLE', () => {
        const sql = 'CREATE TABLE users (id INT PRIMARY KEY)'
        const rollback = PITRService.generateRollbackSQL(sql)

        expect(rollback).toContain('DROP TABLE IF EXISTS "users" CASCADE')
      })

      it('should handle CREATE TABLE IF NOT EXISTS', () => {
        const sql = 'CREATE TABLE IF NOT EXISTS posts (id INT PRIMARY KEY)'
        const rollback = PITRService.generateRollbackSQL(sql)

        expect(rollback).toContain('DROP TABLE IF EXISTS "posts" CASCADE')
      })

      it('should handle quoted table names', () => {
        const sql = 'CREATE TABLE "user_data" (id INT PRIMARY KEY)'
        const rollback = PITRService.generateRollbackSQL(sql)

        expect(rollback).toContain('DROP TABLE IF EXISTS "user_data" CASCADE')
      })
    })

    describe('ALTER TABLE ADD COLUMN', () => {
      it('should generate DROP COLUMN for ADD COLUMN', () => {
        const sql = 'ALTER TABLE users ADD COLUMN email VARCHAR(255)'
        const rollback = PITRService.generateRollbackSQL(sql)

        expect(rollback).toContain('ALTER TABLE "users" DROP COLUMN IF EXISTS "email"')
      })
    })

    describe('ALTER TABLE ADD CONSTRAINT', () => {
      it('should generate DROP CONSTRAINT for ADD CONSTRAINT', () => {
        const sql = 'ALTER TABLE posts ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)'
        const rollback = PITRService.generateRollbackSQL(sql)

        expect(rollback).toContain('DROP CONSTRAINT IF EXISTS "fk_user"')
      })
    })

    describe('CREATE INDEX', () => {
      it('should generate DROP INDEX for CREATE INDEX', () => {
        const sql = 'CREATE INDEX idx_users_email ON users(email)'
        const rollback = PITRService.generateRollbackSQL(sql)

        expect(rollback).toContain('DROP INDEX IF EXISTS "idx_users_email"')
      })

      it('should handle CREATE UNIQUE INDEX', () => {
        const sql = 'CREATE UNIQUE INDEX idx_unique_email ON users(email)'
        const rollback = PITRService.generateRollbackSQL(sql)

        expect(rollback).toContain('DROP INDEX IF EXISTS "idx_unique_email"')
      })

      it('should handle CREATE INDEX IF NOT EXISTS', () => {
        const sql = 'CREATE INDEX IF NOT EXISTS idx_test ON table(col)'
        const rollback = PITRService.generateRollbackSQL(sql)

        expect(rollback).toContain('DROP INDEX IF EXISTS "idx_test"')
      })
    })

    describe('CREATE VIEW', () => {
      it('should generate DROP VIEW for CREATE VIEW', () => {
        const sql = 'CREATE VIEW active_users AS SELECT * FROM users WHERE active = true'
        const rollback = PITRService.generateRollbackSQL(sql)

        expect(rollback).toContain('DROP VIEW IF EXISTS "active_users"')
      })

      it('should handle CREATE OR REPLACE VIEW', () => {
        const sql = 'CREATE OR REPLACE VIEW user_summary AS SELECT id, name FROM users'
        const rollback = PITRService.generateRollbackSQL(sql)

        expect(rollback).toContain('DROP VIEW IF EXISTS "user_summary"')
      })
    })

    describe('CREATE FUNCTION', () => {
      it('should generate DROP FUNCTION for CREATE FUNCTION', () => {
        const sql = 'CREATE FUNCTION get_user(id INT) RETURNS user AS $$ ... $$'
        const rollback = PITRService.generateRollbackSQL(sql)

        expect(rollback).toContain('DROP FUNCTION IF EXISTS "get_user"')
      })

      it('should handle CREATE OR REPLACE FUNCTION', () => {
        const sql = 'CREATE OR REPLACE FUNCTION calculate_total() RETURNS INT'
        const rollback = PITRService.generateRollbackSQL(sql)

        expect(rollback).toContain('DROP FUNCTION IF EXISTS "calculate_total"')
      })
    })

    describe('CREATE TRIGGER', () => {
      it('should generate DROP TRIGGER for CREATE TRIGGER', () => {
        const sql = 'CREATE TRIGGER audit_trigger AFTER INSERT ON users FOR EACH ROW EXECUTE ...'
        const rollback = PITRService.generateRollbackSQL(sql)

        expect(rollback).toContain('DROP TRIGGER IF EXISTS "audit_trigger" ON "users"')
      })
    })

    describe('CREATE SEQUENCE', () => {
      it('should generate DROP SEQUENCE for CREATE SEQUENCE', () => {
        const sql = 'CREATE SEQUENCE user_id_seq START 1'
        const rollback = PITRService.generateRollbackSQL(sql)

        expect(rollback).toContain('DROP SEQUENCE IF EXISTS "user_id_seq"')
      })

      it('should handle CREATE SEQUENCE IF NOT EXISTS', () => {
        const sql = 'CREATE SEQUENCE IF NOT EXISTS order_seq'
        const rollback = PITRService.generateRollbackSQL(sql)

        expect(rollback).toContain('DROP SEQUENCE IF EXISTS "order_seq"')
      })
    })

    describe('CREATE TYPE', () => {
      it('should generate DROP TYPE for CREATE TYPE', () => {
        const sql = "CREATE TYPE status AS ENUM ('active', 'inactive')"
        const rollback = PITRService.generateRollbackSQL(sql)

        expect(rollback).toContain('DROP TYPE IF EXISTS "status"')
      })
    })

    describe('Multiple statements', () => {
      it('should handle multiple DDL statements', () => {
        const sql = `
          CREATE TABLE users (id INT PRIMARY KEY);
          CREATE TABLE posts (id INT PRIMARY KEY);
          CREATE INDEX idx_users ON users(id);
        `
        const rollback = PITRService.generateRollbackSQL(sql)

        expect(rollback).toContain('DROP TABLE IF EXISTS "users"')
        expect(rollback).toContain('DROP TABLE IF EXISTS "posts"')
        expect(rollback).toContain('DROP INDEX IF EXISTS "idx_users"')
      })

      it('should reverse order for correct dependency handling', () => {
        const sql = `
          CREATE TABLE users (id INT);
          CREATE INDEX idx ON users(id);
        `
        const rollback = PITRService.generateRollbackSQL(sql)!
        const lines = rollback.split('\n')

        // Index should be dropped before table
        const indexPos = lines.findIndex(l => l.includes('DROP INDEX'))
        const tablePos = lines.findIndex(l => l.includes('DROP TABLE'))
        expect(indexPos).toBeLessThan(tablePos)
      })
    })

    describe('Edge cases', () => {
      it('should return null for non-DDL statements', () => {
        const sql = 'SELECT * FROM users; INSERT INTO logs VALUES (1, "test")'
        const rollback = PITRService.generateRollbackSQL(sql)

        expect(rollback).toBeNull()
      })

      it('should skip SQL comments', () => {
        const sql = `
          -- This is a comment
          CREATE TABLE users (id INT);
          -- Another comment
        `
        const rollback = PITRService.generateRollbackSQL(sql)

        expect(rollback).toContain('DROP TABLE IF EXISTS "users"')
        expect(rollback).not.toContain('comment')
      })

      it('should handle empty SQL', () => {
        const rollback = PITRService.generateRollbackSQL('')
        expect(rollback).toBeNull()
      })

      it('should handle whitespace-only SQL', () => {
        const rollback = PITRService.generateRollbackSQL('   \n\t  ')
        expect(rollback).toBeNull()
      })
    })
  })

  describe('extractAffectedTables', () => {
    it('should extract tables from CREATE TABLE', () => {
      const sql = 'CREATE TABLE users (id INT)'
      const tables = PITRService.extractAffectedTables(sql)

      expect(tables).toContain('users')
    })

    it('should extract tables from ALTER TABLE', () => {
      const sql = 'ALTER TABLE orders ADD COLUMN total DECIMAL'
      const tables = PITRService.extractAffectedTables(sql)

      expect(tables).toContain('orders')
    })

    it('should extract tables from DROP TABLE', () => {
      const sql = 'DROP TABLE IF EXISTS old_data'
      const tables = PITRService.extractAffectedTables(sql)

      expect(tables).toContain('old_data')
    })

    it('should extract tables from INSERT', () => {
      const sql = 'INSERT INTO audit_log VALUES (1, "test")'
      const tables = PITRService.extractAffectedTables(sql)

      expect(tables).toContain('audit_log')
    })

    it('should extract tables from UPDATE', () => {
      const sql = 'UPDATE users SET active = true WHERE id = 1'
      const tables = PITRService.extractAffectedTables(sql)

      expect(tables).toContain('users')
    })

    it('should extract tables from DELETE', () => {
      const sql = 'DELETE FROM sessions WHERE expired = true'
      const tables = PITRService.extractAffectedTables(sql)

      expect(tables).toContain('sessions')
    })

    it('should extract tables from TRUNCATE', () => {
      const sql = 'TRUNCATE temp_data'
      const tables = PITRService.extractAffectedTables(sql)

      expect(tables).toContain('temp_data')
    })

    it('should extract multiple tables', () => {
      const sql = `
        CREATE TABLE users (id INT);
        CREATE TABLE posts (id INT);
        ALTER TABLE comments ADD COLUMN text VARCHAR;
      `
      const tables = PITRService.extractAffectedTables(sql)

      expect(tables).toContain('users')
      expect(tables).toContain('posts')
      expect(tables).toContain('comments')
    })

    it('should not include SQL reserved words', () => {
      const sql = 'SELECT * FROM users WHERE status = "active"'
      const tables = PITRService.extractAffectedTables(sql)

      expect(tables).not.toContain('select')
      expect(tables).not.toContain('where')
      expect(tables).not.toContain('and')
    })

    it('should return unique tables only', () => {
      const sql = 'SELECT * FROM users; UPDATE users SET active = true'
      const tables = PITRService.extractAffectedTables(sql)

      const uniqueTables = [...new Set(tables)]
      expect(tables.length).toBe(uniqueTables.length)
    })

    it('should handle empty SQL', () => {
      const tables = PITRService.extractAffectedTables('')
      expect(tables).toEqual([])
    })
  })

  describe('createSnapshot', () => {
    it('should create a snapshot object', () => {
      const sql = 'CREATE TABLE users (id INT)'
      const snapshot = PITRService.createSnapshot('mig-123', sql, '1.0.0')

      expect(snapshot.migrationId).toBe('mig-123')
      expect(snapshot.schemaVersion).toBe('1.0.0')
      expect(snapshot.timestamp).toBeDefined()
      expect(snapshot.affectedTables).toContain('users')
      expect(snapshot.rollbackSql).toContain('DROP TABLE')
    })

    it('should include metadata', () => {
      const sql = 'CREATE TABLE t1 (id INT); CREATE TABLE t2 (id INT);'
      const snapshot = PITRService.createSnapshot('mig-456', sql, '2.0.0')

      expect(snapshot.metadata).toBeDefined()
      expect(snapshot.metadata?.originalSqlLength).toBe(sql.length)
      expect(snapshot.metadata?.statementCount).toBe(2)
    })

    it('should handle SQL with no rollback possible', () => {
      const sql = 'SELECT * FROM users'
      const snapshot = PITRService.createSnapshot('mig-789', sql, '1.0.0')

      expect(snapshot.rollbackSql).toBeNull()
    })
  })

  describe('createAndSaveSnapshot', () => {
    it('should create and save snapshot to database', async () => {
      vi.mocked(prisma.migrationSnapshot.upsert).mockResolvedValue({
        id: 'snap-123',
        migrationId: 'mig-123',
        schemaVersion: '1.0.0',
        rollbackSql: 'DROP TABLE users',
        affectedTables: ['users'],
        preState: null,
        metadata: JSON.stringify({ statementCount: 1 }),
        createdAt: new Date(),
        createdBy: 'user-123',
      } as any)

      const snapshot = await PITRService.createAndSaveSnapshot(
        'mig-123',
        'CREATE TABLE users (id INT)',
        '1.0.0',
        'user-123'
      )

      expect(prisma.migrationSnapshot.upsert).toHaveBeenCalled()
      expect(snapshot.migrationId).toBe('mig-123')
    })

    it('should use upsert to handle existing snapshots', async () => {
      vi.mocked(prisma.migrationSnapshot.upsert).mockResolvedValue({
        id: 'snap-123',
        migrationId: 'mig-123',
        createdAt: new Date(),
      } as any)

      await PITRService.createAndSaveSnapshot(
        'mig-123',
        'CREATE TABLE users (id INT)',
        '1.0.0',
        'user-123'
      )

      expect(prisma.migrationSnapshot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { migrationId: 'mig-123' },
          create: expect.any(Object),
          update: expect.any(Object),
        })
      )
    })
  })

  describe('prepareRollback', () => {
    it('should prepare rollback SQL from snapshot', async () => {
      const snapshot = {
        migrationId: 'mig-123',
        timestamp: new Date().toISOString(),
        schemaVersion: '1.0.0',
        affectedTables: ['users'],
        rollbackSql: 'DROP TABLE IF EXISTS "users" CASCADE;',
      }

      const result = await PITRService.prepareRollback(snapshot, 'Testing')

      expect(result.success).toBe(true)
      expect(result.rollbackSql).toContain('DROP TABLE')
      expect(result.rollbackType).toBe('sql_reversal')
      expect(result.affectedTables).toContain('users')
    })

    it('should return error when no rollback SQL available', async () => {
      const snapshot = {
        migrationId: 'mig-123',
        timestamp: new Date().toISOString(),
        schemaVersion: '1.0.0',
        affectedTables: ['users'],
        rollbackSql: null,
      }

      const result = await PITRService.prepareRollback(snapshot)

      expect(result.success).toBe(false)
      expect(result.error).toBe('No rollback SQL available for this migration type')
    })
  })

  describe('executeRollback', () => {
    it('should return error when migration not found', async () => {
      vi.mocked(prisma.migration.findUnique).mockResolvedValue(null)

      const result = await PITRService.executeRollback({
        migrationId: 'non-existent',
        userId: 'user-123',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Migration not found')
    })

    it('should return error when no rollback SQL available', async () => {
      vi.mocked(prisma.migration.findUnique).mockResolvedValue({
        id: 'mig-123',
        content: 'SELECT 1', // Non-DDL, no rollback possible
        snapshot: null,
        databaseConnection: {
          type: 'POSTGRESQL',
          host: 'localhost',
          port: 5432,
          database: 'test',
          username: 'user',
          password: 'pass',
          ssl: false,
        },
      } as any)

      const result = await PITRService.executeRollback({
        migrationId: 'mig-123',
        userId: 'user-123',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('No rollback SQL available')
    })

    it('should perform dry run when dryRun is true', async () => {
      vi.mocked(prisma.migration.findUnique).mockResolvedValue({
        id: 'mig-123',
        content: 'CREATE TABLE users (id INT)',
        snapshot: {
          rollbackSql: 'DROP TABLE IF EXISTS "users" CASCADE;',
          affectedTables: ['users'],
        },
        databaseConnection: {
          type: 'POSTGRESQL',
          host: 'localhost',
          port: 5432,
          database: 'test',
          username: 'user',
          password: 'pass',
          ssl: false,
        },
      } as any)

      const result = await PITRService.executeRollback({
        migrationId: 'mig-123',
        userId: 'user-123',
        dryRun: true,
      })

      expect(result.success).toBe(true)
      expect(result.message).toContain('Dry run')
      expect(result.rollbackSql).toBe('DROP TABLE IF EXISTS "users" CASCADE;')
    })

    it('should execute rollback successfully for PostgreSQL', async () => {
      vi.mocked(prisma.migration.findUnique).mockResolvedValue({
        id: 'mig-123',
        content: 'CREATE TABLE users (id INT)',
        snapshot: {
          id: 'snap-123',
          rollbackSql: 'DROP TABLE IF EXISTS "users" CASCADE;',
          affectedTables: ['users'],
        },
        databaseConnection: {
          type: 'POSTGRESQL',
          host: 'localhost',
          port: 5432,
          database: 'test',
          username: 'user',
          password: 'pass',
          ssl: false,
        },
      } as any)

      vi.mocked(prisma.migrationRollback.create).mockResolvedValue({
        id: 'rollback-123',
      } as any)

      vi.mocked(prisma.migrationRollback.update).mockResolvedValue({} as any)
      vi.mocked(prisma.migration.update).mockResolvedValue({} as any)

      const result = await PITRService.executeRollback({
        migrationId: 'mig-123',
        userId: 'user-123',
        reason: 'Bug found',
      })

      expect(result.success).toBe(true)
      expect(result.rollbackId).toBe('rollback-123')
      expect(prisma.migrationRollback.create).toHaveBeenCalled()
    })

    it('should return error for unsupported database types', async () => {
      vi.mocked(prisma.migration.findUnique).mockResolvedValue({
        id: 'mig-123',
        content: 'CREATE TABLE users (id INT)',
        snapshot: {
          id: 'snap-123',
          rollbackSql: 'DROP TABLE IF EXISTS "users" CASCADE;',
          affectedTables: ['users'],
        },
        databaseConnection: {
          type: 'SQLITE',
          host: 'localhost',
          port: 5432,
          database: 'test',
          username: 'user',
          password: 'pass',
          ssl: false,
        },
      } as any)

      vi.mocked(prisma.migrationRollback.create).mockResolvedValue({
        id: 'rollback-123',
      } as any)

      vi.mocked(prisma.migrationRollback.update).mockResolvedValue({} as any)

      const result = await PITRService.executeRollback({
        migrationId: 'mig-123',
        userId: 'user-123',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unsupported database type')
    })
  })

  describe('getRollbackHistory', () => {
    it('should return rollback history for a migration', async () => {
      const mockHistory = [
        { id: 'r1', migrationId: 'mig-123', status: 'success', rolledBackAt: new Date() },
        { id: 'r2', migrationId: 'mig-123', status: 'failed', rolledBackAt: new Date() },
      ]

      vi.mocked(prisma.migrationRollback.findMany).mockResolvedValue(mockHistory as any)

      const result = await PITRService.getRollbackHistory('mig-123')

      expect(result).toHaveLength(2)
      expect(prisma.migrationRollback.findMany).toHaveBeenCalledWith({
        where: { migrationId: 'mig-123' },
        orderBy: { rolledBackAt: 'desc' },
        include: {
          rollbackUser: {
            select: { id: true, name: true, email: true },
          },
        },
      })
    })
  })

  describe('getSnapshot', () => {
    it('should return snapshot for a migration', async () => {
      const mockSnapshot = {
        id: 'snap-123',
        migrationId: 'mig-123',
        rollbackSql: 'DROP TABLE users',
        createdAt: new Date(),
      }

      vi.mocked(prisma.migrationSnapshot.findUnique).mockResolvedValue(mockSnapshot as any)

      const result = await PITRService.getSnapshot('mig-123')

      expect(result).toEqual(mockSnapshot)
      expect(prisma.migrationSnapshot.findUnique).toHaveBeenCalledWith({
        where: { migrationId: 'mig-123' },
        include: {
          creator: {
            select: { id: true, name: true, email: true },
          },
        },
      })
    })
  })

  describe('getPITRInstructions', () => {
    it('should return instructions for vercel-postgres', () => {
      const instructions = PITRService.getPITRInstructions('vercel-postgres')
      expect(instructions).toContain('Vercel Postgres')
      expect(instructions).toContain('Backups')
    })

    it('should return instructions for neon', () => {
      const instructions = PITRService.getPITRInstructions('neon')
      expect(instructions).toContain('Neon')
      expect(instructions).toContain('branching')
    })

    it('should return instructions for supabase', () => {
      const instructions = PITRService.getPITRInstructions('supabase')
      expect(instructions).toContain('Supabase')
      expect(instructions).toContain('Point-in-Time Recovery')
    })

    it('should return instructions for planetscale', () => {
      const instructions = PITRService.getPITRInstructions('planetscale')
      expect(instructions).toContain('PlanetScale')
      expect(instructions).toContain('Backups')
    })

    it('should return default instructions for unknown provider', () => {
      const instructions = PITRService.getPITRInstructions('unknown')
      expect(instructions).toContain('contact your database provider')
    })
  })
})

describe('detectDatabaseProvider', () => {
  it('should detect neon from connection URL', () => {
    expect(detectDatabaseProvider('postgresql://user:pass@db.neon.tech/mydb')).toBe('neon')
    expect(detectDatabaseProvider('postgres://neon/database')).toBe('neon')
  })

  it('should detect supabase from connection URL', () => {
    expect(detectDatabaseProvider('postgresql://user:pass@db.supabase.co/postgres')).toBe('supabase')
  })

  it('should detect planetscale from connection URL', () => {
    expect(detectDatabaseProvider('mysql://user:pass@planetscale.com/db')).toBe('planetscale')
  })

  it('should detect vercel-postgres from connection URL', () => {
    expect(detectDatabaseProvider('postgres://user:pass@vercel-storage.com/db')).toBe('vercel-postgres')
    expect(detectDatabaseProvider('postgresql://user:pass@postgres.vercel.com/db')).toBe('vercel-postgres')
  })

  it('should return default for unknown providers', () => {
    expect(detectDatabaseProvider('postgresql://localhost/mydb')).toBe('default')
    expect(detectDatabaseProvider('mysql://localhost/mydb')).toBe('default')
  })
})
