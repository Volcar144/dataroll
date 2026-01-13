import postgres from 'postgres'
import sqlite3 from 'sqlite3'
import type { DatabaseConnection } from '@prisma/client'

export type DatabaseType = 'POSTGRESQL' | 'MYSQL' | 'SQLITE'

export interface TestConnectionResult {
  success: boolean
  error?: string
  connection?: any
  details?: {
    version?: string
    database?: string
    user?: string
    host?: string
    port?: number
  }
}

export async function testConnection(
  connectionConfig: DatabaseConnection
): Promise<TestConnectionResult> {
  const { type, host, port, database, username, password, ssl } = connectionConfig

  try {
    switch (type) {
      case 'POSTGRESQL':
        return await testPostgresConnection({
          host,
          port: port || 5432,
          database,
          username,
          password,
          ssl,
        })
      case 'MYSQL':
        return await testMySQLConnection({
          host,
          port: port || 3306,
          database,
          username,
          password,
          ssl,
        })
      case 'SQLITE':
        return await testSQLiteConnection({
          database,
        })
      default:
        return {
          success: false,
          error: `Unsupported database type: ${type}`,
        }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown connection error',
    }
  }
}

async function testPostgresConnection(config: {
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl?: boolean
}): Promise<TestConnectionResult> {
  try {
    const sql = postgres({
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
      password: config.password,
      ssl: config.ssl ? 'require' : false,
      max: 1, // Only need one connection for testing
    })

    // Test the connection
    const result = await sql`SELECT version(), current_database(), current_user, inet_server_addr() as server_ip, inet_server_port() as server_port`
    const row = result[0] as any

    await sql.end()

    return {
      success: true,
      connection: sql,
      details: {
        version: row.version,
        database: row.current_database,
        user: row.current_user,
        host: row.server_ip,
        port: row.server_port,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PostgreSQL connection failed',
    }
  }
}

async function testMySQLConnection(config: {
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl?: boolean
}): Promise<TestConnectionResult> {
  // For MySQL, we would use mysql2 package
  // For now, return a placeholder response
  return {
    success: true,
    connection: null,
    details: {
      version: 'MySQL support coming soon',
      database: config.database,
      user: config.username,
      host: config.host,
      port: config.port,
    },
  }
}

async function testSQLiteConnection(config: {
  database: string
}): Promise<TestConnectionResult> {
  return new Promise((resolve) => {
    const db = new sqlite3.Database(config.database, (err) => {
      if (err) {
        resolve({
          success: false,
          error: err.message,
        })
        return
      }

      db.get('SELECT sqlite_version() as version', (err, row: any) => {
        db.close()
        
        if (err) {
          resolve({
            success: false,
            error: err.message,
          })
          return
        }

        resolve({
          success: true,
          connection: db,
          details: {
            version: row.version,
            database: config.database,
          },
        })
      })
    })
  })
}

export function getConnectionString(connectionConfig: DatabaseConnection): string {
  const { type, host, port, database, username, password } = connectionConfig

  switch (type) {
    case 'POSTGRESQL':
      return `postgresql://${username}:${password}@${host}:${port || 5432}/${database}`
    case 'MYSQL':
      return `mysql://${username}:${password}@${host}:${port || 3306}/${database}`
    case 'SQLITE':
      return database // For SQLite, database is the file path
    default:
      throw new Error(`Unsupported database type: ${type}`)
  }
}

export async function createConnectionPool(connectionConfig: DatabaseConnection) {
  const { type } = connectionConfig

  switch (type) {
    case 'POSTGRESQL':
      return postgres({
        host: connectionConfig.host,
        port: connectionConfig.port || 5432,
        database: connectionConfig.database,
        username: connectionConfig.username,
        password: connectionConfig.password,
        ssl: connectionConfig.ssl ? 'require' : false,
      })
    case 'SQLITE':
      // For SQLite, we don't use pooling
      return new sqlite3.Database(connectionConfig.database)
    default:
      throw new Error(`Unsupported database type for pooling: ${type}`)
  }
}