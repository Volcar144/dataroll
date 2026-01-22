import { describe, it, expect } from 'vitest'
import {
  PaginationSchema,
  PaginatedResponseSchema,
  ApiResponseSchema,
  EmptyResponseSchema,
  ExecuteMigrationSchema,
  RollbackMigrationSchema,
  AuditLogSchema,
  UpdateDatabaseConnectionSchema,
} from '@/lib/validation'
import { z } from 'zod'

describe('Advanced Validation Schemas', () => {
  describe('PaginationSchema', () => {
    it('should validate pagination with defaults', () => {
      const result = PaginationSchema.parse({})
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
      expect(result.sortOrder).toBe('desc')
    })

    it('should validate custom pagination', () => {
      const result = PaginationSchema.parse({
        page: 5,
        limit: 50,
        sortBy: 'createdAt',
        sortOrder: 'asc',
      })
      expect(result.page).toBe(5)
      expect(result.limit).toBe(50)
      expect(result.sortBy).toBe('createdAt')
      expect(result.sortOrder).toBe('asc')
    })

    it('should reject invalid pagination', () => {
      expect(() => PaginationSchema.parse({ page: 0 })).toThrow()
      expect(() => PaginationSchema.parse({ limit: 0 })).toThrow()
      expect(() => PaginationSchema.parse({ limit: 101 })).toThrow()
    })
  })

  describe('PaginatedResponseSchema', () => {
    it('should validate paginated response', () => {
      const ItemSchema = z.object({ id: z.string(), name: z.string() })
      const ResponseSchema = PaginatedResponseSchema(ItemSchema)

      const result = ResponseSchema.parse({
        data: [{ id: '1', name: 'Item 1' }],
        pagination: {
          page: 1,
          limit: 20,
          total: 100,
          totalPages: 5,
          hasNext: true,
          hasPrev: false,
        },
      })

      expect(result.data).toHaveLength(1)
      expect(result.pagination.total).toBe(100)
    })
  })

  describe('ApiResponseSchema', () => {
    it('should validate success response', () => {
      const DataSchema = z.object({ id: z.string() })
      const ResponseSchema = ApiResponseSchema(DataSchema)

      const result = ResponseSchema.parse({
        success: true,
        data: { id: '123' },
      })

      expect(result.success).toBe(true)
      expect(result.data?.id).toBe('123')
    })

    it('should validate error response', () => {
      const DataSchema = z.object({ id: z.string() })
      const ResponseSchema = ApiResponseSchema(DataSchema)

      const result = ResponseSchema.parse({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
          details: { resourceId: '123' },
        },
      })

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('NOT_FOUND')
    })
  })

  describe('EmptyResponseSchema', () => {
    it('should validate empty success response', () => {
      const result = EmptyResponseSchema.parse({
        success: true,
        data: {},
      })
      expect(result.success).toBe(true)
    })
  })

  describe('ExecuteMigrationSchema', () => {
    it('should validate migration execution request', () => {
      const result = ExecuteMigrationSchema.parse({
        migrationId: 'cltest123',
        dryRun: true,
        checksum: 'abc123',
        teamId: 'clteam123',
      })

      expect(result.migrationId).toBe('cltest123')
      expect(result.dryRun).toBe(true)
    })

    it('should use defaults', () => {
      const result = ExecuteMigrationSchema.parse({
        migrationId: 'cltest123',
      })

      expect(result.dryRun).toBe(false)
    })
  })

  describe('RollbackMigrationSchema', () => {
    it('should validate rollback request', () => {
      const result = RollbackMigrationSchema.parse({
        migrationId: 'cltest123',
        reason: 'Bug found',
        force: true,
        createBackup: false,
      })

      expect(result.migrationId).toBe('cltest123')
      expect(result.force).toBe(true)
      expect(result.createBackup).toBe(false)
    })

    it('should use defaults', () => {
      const result = RollbackMigrationSchema.parse({
        migrationId: 'cltest123',
      })

      expect(result.force).toBe(false)
      expect(result.createBackup).toBe(true)
    })
  })

  describe('UpdateDatabaseConnectionSchema', () => {
    it('should validate partial updates', () => {
      const result = UpdateDatabaseConnectionSchema.parse({
        name: 'Updated Name',
      })

      expect(result.name).toBe('Updated Name')
      expect(result.host).toBeUndefined()
    })

    it('should validate multiple fields', () => {
      const result = UpdateDatabaseConnectionSchema.parse({
        name: 'Updated DB',
        host: 'new-host',
        port: 3306,
        ssl: true,
      })

      expect(result.name).toBe('Updated DB')
      expect(result.port).toBe(3306)
      expect(result.ssl).toBe(true)
    })

    it('should allow empty update object', () => {
      const result = UpdateDatabaseConnectionSchema.parse({})
      expect(result).toEqual({})
    })
  })

  describe('AuditLogSchema', () => {
    it('should validate complete audit log', () => {
      const result = AuditLogSchema.parse({
        id: 'cltest123',
        action: 'MIGRATION_EXECUTED',
        resource: 'Migration',
        resourceId: 'clmig123',
        details: JSON.stringify({ version: '1.0' }),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        createdAt: new Date(),
        teamId: 'clteam123',
        userId: 'cluser123',
      })

      expect(result.action).toBe('MIGRATION_EXECUTED')
      expect(result.resource).toBe('Migration')
    })

    it('should allow optional fields', () => {
      const result = AuditLogSchema.parse({
        id: 'cltest123',
        action: 'USER_LOGIN',
        resource: 'User',
        createdAt: new Date(),
        teamId: 'clteam123',
        userId: 'cluser123',
      })

      expect(result.resourceId).toBeUndefined()
      expect(result.ipAddress).toBeUndefined()
    })
  })
})
