/**
 * Serverless PITR (Point-in-Time Recovery) Service
 * 
 * This service provides actual database rollback capabilities:
 * - Generates rollback SQL from migration content
 * - Stores snapshots in the database (not filesystem)
 * - Executes rollbacks against PostgreSQL/MySQL databases
 * - Tracks rollback history and status
 * 
 * Fully serverless compatible - no filesystem operations.
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { Pool } from 'pg'
import mysql from 'mysql2/promise'

// Types
export interface MigrationSnapshot {
  migrationId: string
  timestamp: string
  schemaVersion: string
  affectedTables: string[]
  rollbackSql: string | null
  preState?: Record<string, any>
  metadata?: Record<string, any>
}

export interface RollbackOptions {
  migrationId: string
  userId: string
  reason?: string
  dryRun?: boolean // If true, return SQL without executing
}

export interface RollbackResult {
  success: boolean
  rollbackId?: string
  rollbackType: 'sql_reversal' | 'provider_pitr'
  message: string
  rollbackSql?: string
  duration: number
  affectedTables?: string[]
  error?: string
}

export interface ConnectionConfig {
  type: 'POSTGRESQL' | 'MYSQL'
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl?: boolean
}

/**
 * Serverless PITR Service
 */
export class PITRService {
  
  /**
   * Generate rollback SQL from migration SQL
   * Analyzes DDL statements and creates reverse operations
   */
  static generateRollbackSQL(originalSql: string): string | null {
    const lines = originalSql
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('--'))

    const rollbackStatements: string[] = []

    for (const line of lines) {
      const upperLine = line.toUpperCase()

      // CREATE TABLE -> DROP TABLE
      if (upperLine.includes('CREATE TABLE')) {
        const tableMatch = line.match(/CREATE TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?(\w+)["'`]?/i)
        if (tableMatch) {
          rollbackStatements.push(`DROP TABLE IF EXISTS "${tableMatch[1]}" CASCADE;`)
        }
      }
      
      // ALTER TABLE ADD COLUMN -> ALTER TABLE DROP COLUMN
      else if (upperLine.includes('ALTER TABLE') && upperLine.includes('ADD COLUMN')) {
        const alterMatch = line.match(/ALTER TABLE\s+["'`]?(\w+)["'`]?\s+ADD\s+(?:COLUMN\s+)?["'`]?(\w+)["'`]?/i)
        if (alterMatch) {
          rollbackStatements.push(`ALTER TABLE "${alterMatch[1]}" DROP COLUMN IF EXISTS "${alterMatch[2]}";`)
        }
      }
      
      // ALTER TABLE ADD CONSTRAINT -> ALTER TABLE DROP CONSTRAINT
      else if (upperLine.includes('ALTER TABLE') && upperLine.includes('ADD CONSTRAINT')) {
        const constraintMatch = line.match(/ALTER TABLE\s+["'`]?(\w+)["'`]?\s+ADD\s+CONSTRAINT\s+["'`]?(\w+)["'`]?/i)
        if (constraintMatch) {
          rollbackStatements.push(`ALTER TABLE "${constraintMatch[1]}" DROP CONSTRAINT IF EXISTS "${constraintMatch[2]}";`)
        }
      }
      
      // CREATE INDEX -> DROP INDEX
      else if (upperLine.includes('CREATE INDEX') || upperLine.includes('CREATE UNIQUE INDEX')) {
        const indexMatch = line.match(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?(\w+)["'`]?/i)
        if (indexMatch) {
          rollbackStatements.push(`DROP INDEX IF EXISTS "${indexMatch[1]}";`)
        }
      }
      
      // CREATE VIEW -> DROP VIEW
      else if (upperLine.includes('CREATE VIEW') || upperLine.includes('CREATE OR REPLACE VIEW')) {
        const viewMatch = line.match(/CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+["'`]?(\w+)["'`]?/i)
        if (viewMatch) {
          rollbackStatements.push(`DROP VIEW IF EXISTS "${viewMatch[1]}";`)
        }
      }
      
      // CREATE FUNCTION -> DROP FUNCTION
      else if (upperLine.includes('CREATE FUNCTION') || upperLine.includes('CREATE OR REPLACE FUNCTION')) {
        const funcMatch = line.match(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+["'`]?(\w+)["'`]?/i)
        if (funcMatch) {
          rollbackStatements.push(`DROP FUNCTION IF EXISTS "${funcMatch[1]}";`)
        }
      }
      
      // CREATE TRIGGER -> DROP TRIGGER
      else if (upperLine.includes('CREATE TRIGGER')) {
        const triggerMatch = line.match(/CREATE\s+TRIGGER\s+["'`]?(\w+)["'`]?\s+.*ON\s+["'`]?(\w+)["'`]?/i)
        if (triggerMatch) {
          rollbackStatements.push(`DROP TRIGGER IF EXISTS "${triggerMatch[1]}" ON "${triggerMatch[2]}";`)
        }
      }

      // CREATE SEQUENCE -> DROP SEQUENCE
      else if (upperLine.includes('CREATE SEQUENCE')) {
        const seqMatch = line.match(/CREATE\s+SEQUENCE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?(\w+)["'`]?/i)
        if (seqMatch) {
          rollbackStatements.push(`DROP SEQUENCE IF EXISTS "${seqMatch[1]}";`)
        }
      }

      // CREATE TYPE -> DROP TYPE
      else if (upperLine.includes('CREATE TYPE')) {
        const typeMatch = line.match(/CREATE\s+TYPE\s+["'`]?(\w+)["'`]?/i)
        if (typeMatch) {
          rollbackStatements.push(`DROP TYPE IF EXISTS "${typeMatch[1]}";`)
        }
      }
    }

    // Reverse order so dependencies are dropped correctly
    return rollbackStatements.length > 0 
      ? rollbackStatements.reverse().join('\n') 
      : null
  }

  /**
   * Extract affected tables from SQL
   */
  static extractAffectedTables(sql: string): string[] {
    const tables = new Set<string>()
    
    const patterns = [
      /(?:CREATE|ALTER|DROP)\s+TABLE\s+(?:IF\s+(?:NOT\s+)?EXISTS\s+)?["'`]?(\w+)["'`]?/gi,
      /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|TRUNCATE)\s+["'`]?(\w+)["'`]?/gi,
      /(?:FROM|JOIN)\s+["'`]?(\w+)["'`]?/gi,
    ]
    
    for (const pattern of patterns) {
      let match
      while ((match = pattern.exec(sql)) !== null) {
        const reserved = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'SET', 'VALUES']
        if (match[1] && !reserved.includes(match[1].toUpperCase())) {
          tables.add(match[1].toLowerCase())
        }
      }
    }
    
    return Array.from(tables)
  }

  /**
   * Create a snapshot object (for API compatibility)
   */
  static createSnapshot(
    migrationId: string,
    sql: string,
    schemaVersion: string
  ): MigrationSnapshot {
    const rollbackSql = this.generateRollbackSQL(sql)
    const affectedTables = this.extractAffectedTables(sql)
    
    return {
      migrationId,
      timestamp: new Date().toISOString(),
      schemaVersion,
      affectedTables,
      rollbackSql,
      metadata: {
        originalSqlLength: sql.length,
        statementCount: sql.split(';').filter(s => s.trim()).length,
      },
    }
  }

  /**
   * Create and persist a migration snapshot to database
   */
  static async createAndSaveSnapshot(
    migrationId: string,
    sql: string,
    schemaVersion: string,
    userId: string,
    connectionConfig?: ConnectionConfig
  ): Promise<MigrationSnapshot> {
    const rollbackSql = this.generateRollbackSQL(sql)
    const affectedTables = this.extractAffectedTables(sql)
    
    // Optionally capture pre-state of affected tables
    let preState: Record<string, any> | undefined
    if (connectionConfig && affectedTables.length > 0) {
      try {
        preState = await this.captureTableSchemas(connectionConfig, affectedTables)
      } catch (error) {
        logger.warn({ msg: 'Failed to capture pre-state', error: String(error) })
      }
    }

    // Store snapshot in database
    const snapshot = await prisma.migrationSnapshot.upsert({
      where: { migrationId },
      create: {
        migrationId,
        schemaVersion,
        rollbackSql: rollbackSql || '',
        affectedTables,
        preState: preState ? JSON.stringify(preState) : null,
        metadata: JSON.stringify({
          originalSqlLength: sql.length,
          statementCount: sql.split(';').filter(s => s.trim()).length,
          createdAt: new Date().toISOString(),
        }),
        createdBy: userId,
      },
      update: {
        schemaVersion,
        rollbackSql: rollbackSql || '',
        affectedTables,
        preState: preState ? JSON.stringify(preState) : null,
        metadata: JSON.stringify({
          originalSqlLength: sql.length,
          statementCount: sql.split(';').filter(s => s.trim()).length,
          updatedAt: new Date().toISOString(),
        }),
      },
    })
    
    logger.info({ 
      msg: 'Migration snapshot created',
      migrationId,
      affectedTables,
      hasRollbackSql: !!rollbackSql,
    })

    return {
      migrationId,
      timestamp: snapshot.createdAt.toISOString(),
      schemaVersion,
      affectedTables,
      rollbackSql,
      preState,
      metadata: snapshot.metadata ? JSON.parse(snapshot.metadata) : undefined,
    }
  }

  /**
   * Capture current schema of tables (for PostgreSQL)
   */
  static async captureTableSchemas(
    config: ConnectionConfig,
    tables: string[]
  ): Promise<Record<string, any>> {
    if (config.type !== 'POSTGRESQL') {
      return {} // Only PostgreSQL supported for now
    }

    const connectionString = `postgresql://${encodeURIComponent(config.username)}:${encodeURIComponent(config.password)}@${config.host}:${config.port}/${config.database}${config.ssl ? '?sslmode=require' : ''}`
    
    const pool = new Pool({
      connectionString,
      max: 1,
      connectionTimeoutMillis: 10000,
    })

    try {
      const schemas: Record<string, any> = {}
      
      for (const table of tables) {
        const result = await pool.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [table])
        
        if (result.rows.length > 0) {
          schemas[table] = {
            columns: result.rows,
            capturedAt: new Date().toISOString(),
          }
        }
      }
      
      return schemas
    } finally {
      await pool.end()
    }
  }

  /**
   * Prepare rollback (returns SQL without executing)
   */
  static async prepareRollback(
    snapshot: MigrationSnapshot,
    reason?: string
  ): Promise<RollbackResult> {
    const startTime = Date.now()

    if (!snapshot.rollbackSql) {
      return {
        success: false,
        rollbackType: 'sql_reversal',
        message: 'Unable to generate rollback SQL. Consider using your database provider\'s PITR feature.',
        duration: Date.now() - startTime,
        error: 'No rollback SQL available for this migration type',
      }
    }

    logger.info({ 
      msg: 'Rollback SQL prepared',
      migrationId: snapshot.migrationId,
      affectedTables: snapshot.affectedTables,
      reason,
    })

    return {
      success: true,
      rollbackType: 'sql_reversal',
      message: 'Rollback SQL generated successfully. Review and execute using the execute endpoint.',
      rollbackSql: snapshot.rollbackSql,
      duration: Date.now() - startTime,
      affectedTables: snapshot.affectedTables,
    }
  }

  /**
   * Execute PITR rollback
   */
  static async executeRollback(options: RollbackOptions): Promise<RollbackResult> {
    const startTime = Date.now()
    const { migrationId, userId, reason, dryRun = false } = options

    // Get migration with snapshot and connection
    const migration = await prisma.migration.findUnique({
      where: { id: migrationId },
      include: {
        databaseConnection: true,
        snapshot: true,
      },
    })

    if (!migration) {
      return {
        success: false,
        rollbackType: 'sql_reversal',
        message: 'Migration not found',
        duration: Date.now() - startTime,
        error: 'Migration not found',
      }
    }

    // Get or generate rollback SQL
    let rollbackSql: string | null = migration.snapshot?.rollbackSql || null
    
    if (!rollbackSql) {
      // Generate rollback SQL from migration content
      rollbackSql = this.generateRollbackSQL(migration.content)
    }

    if (!rollbackSql) {
      return {
        success: false,
        rollbackType: 'sql_reversal',
        message: 'Unable to generate rollback SQL for this migration. The migration may contain statements that cannot be automatically reversed.',
        duration: Date.now() - startTime,
        error: 'No rollback SQL available',
      }
    }

    const affectedTables = migration.snapshot?.affectedTables || this.extractAffectedTables(migration.content)

    // If dry run, just return the SQL
    if (dryRun) {
      return {
        success: true,
        rollbackType: 'sql_reversal',
        message: 'Dry run complete. Review the rollback SQL before executing.',
        rollbackSql,
        duration: Date.now() - startTime,
        affectedTables,
      }
    }

    // Create rollback record
    const rollbackRecord = await prisma.migrationRollback.create({
      data: {
        migrationId,
        snapshotId: migration.snapshot?.id,
        reason,
        rollbackSql,
        status: 'executing',
        rolledBackBy: userId,
      },
    })

    try {
      // Execute rollback against the database
      const conn = migration.databaseConnection
      
      // Validate database type is supported
      if (conn.type !== 'POSTGRESQL' && conn.type !== 'MYSQL') {
        throw new Error(`Unsupported database type for rollback: ${conn.type}. Only PostgreSQL and MySQL are supported.`)
      }
      
      const connectionConfig: ConnectionConfig = {
        type: conn.type,
        host: conn.host,
        port: conn.port || 5432,
        database: conn.database,
        username: conn.username,
        password: conn.password,
        ssl: conn.ssl,
      }

      await this.executeSql(connectionConfig, rollbackSql)

      // Update migration status
      await prisma.migration.update({
        where: { id: migrationId },
        data: { 
          status: 'ROLLED_BACK',
          rolledBackAt: new Date(),
        },
      })

      // Update rollback record
      const duration = Date.now() - startTime
      await prisma.migrationRollback.update({
        where: { id: rollbackRecord.id },
        data: {
          status: 'success',
          duration,
          completedAt: new Date(),
        },
      })

      logger.info({ 
        msg: 'PITR rollback executed successfully',
        migrationId,
        rollbackId: rollbackRecord.id,
        duration,
      })

      return {
        success: true,
        rollbackId: rollbackRecord.id,
        rollbackType: 'sql_reversal',
        message: 'Rollback executed successfully',
        rollbackSql,
        duration,
        affectedTables,
      }

    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      // Update rollback record with error
      await prisma.migrationRollback.update({
        where: { id: rollbackRecord.id },
        data: {
          status: 'failed',
          error: errorMessage,
          duration,
          completedAt: new Date(),
        },
      })

      logger.error({ 
        msg: 'PITR rollback failed',
        migrationId,
        rollbackId: rollbackRecord.id,
        error: errorMessage,
      })

      return {
        success: false,
        rollbackId: rollbackRecord.id,
        rollbackType: 'sql_reversal',
        message: 'Rollback execution failed',
        rollbackSql,
        duration,
        error: errorMessage,
        affectedTables,
      }
    }
  }

  /**
   * Execute SQL against a database
   */
  private static async executeSql(config: ConnectionConfig, sql: string): Promise<void> {
    if (config.type === 'POSTGRESQL') {
      await this.executePostgresSql(config, sql)
    } else if (config.type === 'MYSQL') {
      await this.executeMysqlSql(config, sql)
    } else {
      throw new Error(`Unsupported database type: ${config.type}`)
    }
  }

  /**
   * Execute SQL against PostgreSQL
   */
  private static async executePostgresSql(config: ConnectionConfig, sql: string): Promise<void> {
    const connectionString = `postgresql://${encodeURIComponent(config.username)}:${encodeURIComponent(config.password)}@${config.host}:${config.port}/${config.database}${config.ssl ? '?sslmode=require' : ''}`
    
    const pool = new Pool({
      connectionString,
      max: 1,
      connectionTimeoutMillis: 10000,
    })

    const client = await pool.connect()

    try {
      // Execute in a transaction for atomicity
      await client.query('BEGIN')
      
      // Split into individual statements and execute
      const statements = sql.split(';').filter(s => s.trim())
      for (const statement of statements) {
        if (statement.trim()) {
          await client.query(statement)
        }
      }
      
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
      await pool.end()
    }
  }

  /**
   * Execute SQL against MySQL
   */
  private static async executeMysqlSql(config: ConnectionConfig, sql: string): Promise<void> {
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      connectTimeout: 10000,
    })

    try {
      // Start transaction
      await connection.beginTransaction()
      
      // Split into individual statements and execute
      const statements = sql.split(';').filter(s => s.trim())
      for (const statement of statements) {
        if (statement.trim()) {
          await connection.query(statement)
        }
      }
      
      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      await connection.end()
    }
  }

  /**
   * Get rollback history for a migration
   */
  static async getRollbackHistory(migrationId: string) {
    return prisma.migrationRollback.findMany({
      where: { migrationId },
      orderBy: { rolledBackAt: 'desc' },
      include: {
        rollbackUser: {
          select: { id: true, name: true, email: true },
        },
      },
    })
  }

  /**
   * Get snapshot for a migration
   */
  static async getSnapshot(migrationId: string) {
    return prisma.migrationSnapshot.findUnique({
      where: { migrationId },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    })
  }

  /**
   * Get provider-specific PITR instructions
   */
  static getPITRInstructions(provider: string): string {
    const instructions: Record<string, string> = {
      'vercel-postgres': `
Vercel Postgres includes automatic daily backups.
To restore using provider PITR:
1. Go to your Vercel Dashboard > Storage > Your Database
2. Click "Backups" tab
3. Select a backup point and click "Restore"

For automated rollback, use the "Execute Rollback" option above.
      `.trim(),
      
      'neon': `
Neon provides instant branching for point-in-time recovery.
To restore using provider PITR:
1. Go to your Neon Console > Your Project
2. Click "Branches" > "Create Branch"
3. Select "From a point in time" and choose your target timestamp

For automated rollback, use the "Execute Rollback" option above.
      `.trim(),
      
      'supabase': `
Supabase provides Point-in-Time Recovery on Pro plans.
To restore using provider PITR:
1. Go to your Supabase Dashboard > Project Settings > Database
2. Click "Backups" section
3. Use PITR to restore to a specific timestamp

For automated rollback, use the "Execute Rollback" option above.
      `.trim(),
      
      'planetscale': `
PlanetScale provides automatic backups and safe migrations.
To restore using provider PITR:
1. Go to your PlanetScale Dashboard > Your Database
2. Click "Backups" tab
3. Select a backup and click "Restore"

For automated rollback, use the "Execute Rollback" option above.
      `.trim(),
      
      'default': `
For full data restoration, contact your database provider for PITR options.
Most managed database services include:
- Automatic daily backups
- Point-in-time recovery to any moment
- One-click restore functionality

For schema rollback, use the "Execute Rollback" option above.
      `.trim(),
    }
    
    return instructions[provider] || instructions['default']
  }
}

/**
 * Detect database provider from connection URL
 */
export function detectDatabaseProvider(connectionUrl: string): string {
  const url = connectionUrl.toLowerCase()
  if (url.includes('neon.tech') || url.includes('neon')) return 'neon'
  if (url.includes('supabase')) return 'supabase'
  if (url.includes('planetscale')) return 'planetscale'
  if (url.includes('vercel-storage') || url.includes('postgres.vercel')) return 'vercel-postgres'
  return 'default'
}
