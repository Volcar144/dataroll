import { Client as PostgresClient } from 'pg'
import { prisma } from "@/lib/prisma";
import mysql from 'mysql2/promise'
import Database from 'better-sqlite3'
import { z } from 'zod'
import { recordDatabaseError } from "@/lib/database-monitoring";

// Connection test schemas
export const ConnectionTestSchema = z.object({
  type: z.enum(['POSTGRESQL', 'MYSQL', 'SQLITE']),
  host: z.string().optional(),
  port: z.number().optional(),
  database: z.string(),
  username: z.string().optional(),
  password: z.string().optional(),
  ssl: z.boolean().default(false),
  url: z.string().optional(),
  connectionId: z.string().optional(), // For error recording
})

export type ConnectionTestData = z.infer<typeof ConnectionTestSchema>

// ORM detection result
export interface ORMDetectionResult {
  detectedORM: 'PRISMA' | 'DRIZZLE' | 'UNKNOWN'
  confidence: number
  evidence: string[]
}

// Database connection service
export class DatabaseConnectionService {
  // Test database connection
  static async testConnection(data: ConnectionTestData): Promise<{ success: boolean; error?: string; latency?: number }> {
    const startTime = Date.now()

    try {
      switch (data.type) {
        case 'POSTGRESQL':
          return await this.testPostgresConnection(data)
        case 'MYSQL':
          return await this.testMySQLConnection(data)
        case 'SQLITE':
          return await this.testSQLiteConnection(data)
        default:
          return { success: false, error: 'Unsupported database type' }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection test failed'
      const latency = Date.now() - startTime

      // Record error if connectionId is provided
      if (data.connectionId) {
        await recordDatabaseError({
          connectionId: data.connectionId,
          operation: 'connection_test',
          errorType: 'connection_failed',
          message: errorMessage,
        }).catch(console.error) // Don't throw if error recording fails
      }

      return {
        success: false,
        error: errorMessage,
        latency
      }
    }
  }

  // Execute a query on a database connection
  static async executeQuery(
    connection: any,
    query: string,
    connectionId?: string
  ): Promise<{ success: boolean; error?: string; changes?: string[]; rowCount?: number }> {
    try {
      switch (connection.type) {
        case 'POSTGRESQL':
          return await this.executePostgresQuery(connection, query)
        case 'MYSQL':
          return await this.executeMySQLQuery(connection, query)
        case 'SQLITE':
          return await this.executeSQLiteQuery(connection, query)
        default:
          return { success: false, error: 'Unsupported database type' }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Query execution failed'

      // Record error if connectionId is provided
      if (connectionId) {
        await recordDatabaseError({
          connectionId,
          operation: 'query_execution',
          errorType: 'query_error',
          message: errorMessage,
          details: query,
        }).catch(console.error) // Don't throw if error recording fails
      }

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  private static async testPostgresConnection(data: ConnectionTestData): Promise<{ success: boolean; error?: string; latency?: number }> {
    const startTime = Date.now()
    let client: PostgresClient | null = null

    try {
      if (data.url) {
        client = new PostgresClient(data.url)
      } else {
        client = new PostgresClient({
          host: data.host,
          port: data.port,
          database: data.database,
          user: data.username,
          password: data.password,
          ssl: data.ssl,
          connectionTimeoutMillis: 5000,
        })
      }

      await client.connect()
      await client.query('SELECT 1')
      await client.end()

      return {
        success: true,
        latency: Date.now() - startTime
      }
    } catch (error) {
      if (client) {
        await client.end()
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PostgreSQL connection failed',
        latency: Date.now() - startTime
      }
    }
  }

  private static async testMySQLConnection(data: ConnectionTestData): Promise<{ success: boolean; error?: string; latency?: number }> {
    const startTime = Date.now()
    let connection: any = null

    try {
      if (data.url) {
        connection = await mysql.createConnection(data.url)
      } else {
        connection = await mysql.createConnection({
          host: data.host,
          port: data.port,
          database: data.database,
          user: data.username,
          password: data.password,
          ssl: data.ssl ? {} : undefined,
          connectTimeout: 5000,
        })
      }

      await connection.execute('SELECT 1')
      await connection.end()

      return {
        success: true,
        latency: Date.now() - startTime
      }
    } catch (error) {
      if (connection) {
        await connection.end()
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'MySQL connection failed',
        latency: Date.now() - startTime
      }
    }
  }

  private static async testSQLiteConnection(data: ConnectionTestData): Promise<{ success: boolean; error?: string; latency?: number }> {
    const startTime = Date.now()
    let db: Database.Database | null = null

    try {
      if (data.url) {
        db = new Database(data.url.replace('sqlite://', ''))
      } else {
        db = new Database(data.database)
      }

      db.prepare('SELECT 1').get()
      db.close()

      return {
        success: true,
        latency: Date.now() - startTime
      }
    } catch (error) {
      if (db) {
        db.close()
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SQLite connection failed',
        latency: Date.now() - startTime
      }
    }
  }

  private static async executePostgresQuery(
    connection: any,
    query: string
  ): Promise<{ success: boolean; error?: string; changes?: string[]; rowCount?: number }> {
    let client: PostgresClient | null = null

    try {
      // Decrypt password if needed
      const password = connection.password.startsWith('encrypted:')
        ? await this.decryptPassword(connection.password)
        : connection.password

      if (connection.url) {
        client = new PostgresClient(connection.url)
      } else {
        client = new PostgresClient({
          host: connection.host,
          port: connection.port,
          database: connection.database,
          user: connection.username,
          password,
          ssl: connection.ssl,
        })
      }

      await client.connect()

      // Split query into individual statements
      const statements = query.split(';').filter(stmt => stmt.trim())

      const changes: string[] = []
      let totalRowCount = 0

      for (const statement of statements) {
        if (statement.trim()) {
          const result = await client.query(statement.trim())
          if (result.command) {
            changes.push(`${result.command} affected ${result.rowCount || 0} rows`)
            totalRowCount += result.rowCount || 0
          }
        }
      }

      await client.end()

      return {
        success: true,
        changes,
        rowCount: totalRowCount,
      }
    } catch (error) {
      if (client) {
        await client.end()
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PostgreSQL query execution failed',
      }
    }
  }

  private static async executeMySQLQuery(
    connection: any,
    query: string
  ): Promise<{ success: boolean; error?: string; changes?: string[]; rowCount?: number }> {
    let mysqlConnection: any = null

    try {
      // Decrypt password if needed
      const password = connection.password.startsWith('encrypted:')
        ? await this.decryptPassword(connection.password)
        : connection.password

      if (connection.url) {
        mysqlConnection = await mysql.createConnection(connection.url)
      } else {
        mysqlConnection = await mysql.createConnection({
          host: connection.host,
          port: connection.port,
          database: connection.database,
          user: connection.username,
          password,
          ssl: connection.ssl ? {} : undefined,
        })
      }

      // Split query into individual statements
      const statements = query.split(';').filter(stmt => stmt.trim())

      const changes: string[] = []
      let totalRowCount = 0

      for (const statement of statements) {
        if (statement.trim()) {
          const [result] = await mysqlConnection.execute(statement.trim())
          if (result) {
            changes.push(`Query executed, affected ${result.affectedRows || 0} rows`)
            totalRowCount += result.affectedRows || 0
          }
        }
      }

      await mysqlConnection.end()

      return {
        success: true,
        changes,
        rowCount: totalRowCount,
      }
    } catch (error) {
      if (mysqlConnection) {
        await mysqlConnection.end()
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'MySQL query execution failed',
      }
    }
  }

  private static async executeSQLiteQuery(
    connection: any,
    query: string
  ): Promise<{ success: boolean; error?: string; changes?: string[]; rowCount?: number }> {
    let db: Database.Database | null = null

    try {
      if (connection.url) {
        db = new Database(connection.url.replace('sqlite://', ''))
      } else {
        db = new Database(connection.database)
      }

      // Split query into individual statements
      const statements = query.split(';').filter(stmt => stmt.trim())

      const changes: string[] = []
      let totalRowCount = 0

      for (const statement of statements) {
        if (statement.trim()) {
          const result = db.prepare(statement.trim()).run()
          changes.push(`Query executed, affected ${result.changes} rows`)
          totalRowCount += result.changes
        }
      }

      db.close()

      return {
        success: true,
        changes,
        rowCount: totalRowCount,
      }
    } catch (error) {
      if (db) {
        db.close()
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SQLite query execution failed',
      }
    }
  }

  private static async decryptPassword(encryptedPassword: string): Promise<string> {
    // This should use the same encryption logic as in your encryption.ts file
    // For now, return a placeholder implementation
    const encrypted = encryptedPassword.replace('encrypted:', '')
    // In production, you'd decrypt using your encryption service
    return encrypted // Placeholder - should be properly decrypted
  }

  // Detect ORM type from database schema/metadata
  static async detectORM(data: ConnectionTestData): Promise<ORMDetectionResult> {
    try {
      switch (data.type) {
        case 'POSTGRESQL':
          return await this.detectORMFromPostgres(data)
        case 'MYSQL':
          return await this.detectORMFromMySQL(data)
        case 'SQLITE':
          return await this.detectORMFromSQLite(data)
        default:
          return {
            detectedORM: 'UNKNOWN',
            confidence: 0,
            evidence: ['Unsupported database type']
          }
      }
    } catch (error) {
      return {
        detectedORM: 'UNKNOWN',
        confidence: 0,
        evidence: [error instanceof Error ? error.message : 'ORM detection failed']
      }
    }
  }

  private static async detectORMFromPostgres(data: ConnectionTestData): Promise<ORMDetectionResult> {
    let client: PostgresClient | null = null
    const evidence: string[] = []

    try {
      if (data.url) {
        client = new PostgresClient(data.url)
      } else {
        client = new PostgresClient({
          host: data.host,
          port: data.port,
          database: data.database,
          user: data.username,
          password: data.password,
          ssl: data.ssl,
        })
      }

      await client.connect()

      // Check for Prisma-specific tables/patterns
      const prismaTables = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name LIKE '_prisma_migrations'
        OR table_name LIKE '%_prisma_%'
      `)

      if (prismaTables.rows.length > 0) {
        evidence.push('Found Prisma migration tables')
      }

      // Check for Drizzle-specific patterns
      const drizzleTables = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name LIKE '__drizzle_migrations'
        OR table_name LIKE '%_drizzle_%'
      `)

      if (drizzleTables.rows.length > 0) {
        evidence.push('Found Drizzle migration tables')
      }

      // Check table naming conventions
      const tables = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        LIMIT 10
      `)

      const tableNames = tables.rows.map(row => row.table_name)
      const prismaPatterns = tableNames.filter(name =>
        name.includes('_') && name.split('_').length > 1
      )
      const drizzlePatterns = tableNames.filter(name =>
        name.includes('__') || name.match(/^[a-z]+[A-Z]/)
      )

      if (prismaPatterns.length > drizzlePatterns.length) {
        evidence.push('Table naming suggests Prisma conventions')
      } else if (drizzlePatterns.length > prismaPatterns.length) {
        evidence.push('Table naming suggests Drizzle conventions')
      }

      await client.end()

      // Determine ORM based on evidence
      if (evidence.some(e => e.includes('Prisma'))) {
        return {
          detectedORM: 'PRISMA',
          confidence: 0.8,
          evidence
        }
      } else if (evidence.some(e => e.includes('Drizzle'))) {
        return {
          detectedORM: 'DRIZZLE',
          confidence: 0.8,
          evidence
        }
      }

      return {
        detectedORM: 'UNKNOWN',
        confidence: 0.5,
        evidence: [...evidence, 'Could not determine ORM type with high confidence']
      }

    } catch (error) {
      if (client) {
        await client.end()
      }
      return {
        detectedORM: 'UNKNOWN',
        confidence: 0,
        evidence: [error instanceof Error ? error.message : 'ORM detection failed']
      }
    }
  }

  private static async detectORMFromMySQL(data: ConnectionTestData): Promise<ORMDetectionResult> {
    // Similar implementation for MySQL
    return {
      detectedORM: 'UNKNOWN',
      confidence: 0.5,
      evidence: ['MySQL ORM detection not fully implemented']
    }
  }

  private static async detectORMFromSQLite(data: ConnectionTestData): Promise<ORMDetectionResult> {
    // Similar implementation for SQLite
    return {
      detectedORM: 'UNKNOWN',
      confidence: 0.5,
      evidence: ['SQLite ORM detection not fully implemented']
    }
  }
}