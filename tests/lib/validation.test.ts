import { describe, it, expect } from 'vitest'
import {
  CreateUserSchema,
  CreateTeamSchema,
  CreateDatabaseConnectionSchema,
  CreateMigrationSchema,
} from '@/lib/validation'

describe('Validation Schemas', () => {
  describe('CreateUserSchema', () => {
    it('should validate a valid user', () => {
      const user = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'securePassword123',
      }

      const result = CreateUserSchema.safeParse(user)
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const user = {
        name: 'John Doe',
        email: 'invalid-email',
        password: 'securePassword123',
      }

      const result = CreateUserSchema.safeParse(user)
      expect(result.success).toBe(false)
    })

    it('should reject short password', () => {
      const user = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'short',
      }

      const result = CreateUserSchema.safeParse(user)
      expect(result.success).toBe(false)
    })
  })

  describe('CreateTeamSchema', () => {
    it('should validate a valid team', () => {
      const team = {
        name: 'My Team',
        description: 'A great team',
      }

      const result = CreateTeamSchema.safeParse(team)
      expect(result.success).toBe(true)
    })

    it('should allow missing description', () => {
      const team = {
        name: 'My Team',
      }

      const result = CreateTeamSchema.safeParse(team)
      expect(result.success).toBe(true)
    })

    it('should reject empty name', () => {
      const team = {
        name: '',
      }

      const result = CreateTeamSchema.safeParse(team)
      expect(result.success).toBe(false)
    })
  })

  describe('CreateDatabaseConnectionSchema', () => {
    it('should validate a valid PostgreSQL connection', () => {
      const connection = {
        name: 'Production DB',
        type: 'POSTGRESQL' as const,
        host: 'localhost',
        port: 5432,
        database: 'myapp',
        username: 'postgres',
        password: 'password',
        ssl: false,
        teamId: 'cltest123',
      }

      const result = CreateDatabaseConnectionSchema.safeParse(connection)
      expect(result.success).toBe(true)
    })

    it('should reject invalid database type', () => {
      const connection = {
        name: 'Production DB',
        type: 'MONGODB', // Invalid type
        host: 'localhost',
        database: 'myapp',
        username: 'user',
        password: 'password',
        teamId: 'team_123',
      }

      const result = CreateDatabaseConnectionSchema.safeParse(connection)
      expect(result.success).toBe(false)
    })
  })

  describe('CreateMigrationSchema', () => {
    it('should validate a valid migration', () => {
      const migration = {
        name: 'add-users-table',
        version: '20240101000000',
        type: 'PRISMA' as const,
        filePath: 'migrations/add-users-table.sql',
        content: 'CREATE TABLE users (id SERIAL PRIMARY KEY);',
        teamId: 'cltest123',
        databaseConnectionId: 'cltest456',
      }

      const result = CreateMigrationSchema.safeParse(migration)
      expect(result.success).toBe(true)
    })

    it('should reject invalid migration type', () => {
      const migration = {
        name: 'add-users-table',
        type: 'INVALID_TYPE',
        content: 'CREATE TABLE users (id SERIAL PRIMARY KEY);',
        teamId: 'team_123',
        databaseConnectionId: 'conn_123',
      }

      const result = CreateMigrationSchema.safeParse(migration)
      expect(result.success).toBe(false)
    })
  })
})
