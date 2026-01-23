import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
import { logger } from "@/lib/logger"
import { Pool } from "pg"
import mysql from "mysql2/promise"
import { AuditAction } from "@prisma/client"
import { decryptCredentials } from "@/lib/encryption"

// Dangerous SQL patterns that should be blocked for safety
const DANGEROUS_PATTERNS = [
  /DROP\s+DATABASE/i,
  /DROP\s+SCHEMA/i,
  /TRUNCATE\s+(?!.*ONLY)/i,
  /;\s*DROP/i,
  /;\s*DELETE\s+FROM\s+\w+\s*$/i,
  /;\s*UPDATE\s+\w+\s+SET\s+.*$/i,
]

// Read-only patterns
const READ_ONLY_PATTERNS = [
  /^SELECT\s/i,
  /^EXPLAIN\s/i,
  /^SHOW\s/i,
  /^DESCRIBE\s/i,
  /^DESC\s/i,
  /^WITH\s.*SELECT/i,
]

function isDangerousQuery(query: string): { dangerous: boolean; reason?: string } {
  const trimmedQuery = query.trim()
  
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(trimmedQuery)) {
      return { 
        dangerous: true, 
        reason: `Query contains potentially dangerous pattern: ${pattern.toString()}`
      }
    }
  }
  
  return { dangerous: false }
}

function isReadOnlyQuery(query: string): boolean {
  const trimmedQuery = query.trim()
  return READ_ONLY_PATTERNS.some(pattern => pattern.test(trimmedQuery))
}

async function executePostgresQuery(
  connectionString: string, 
  query: string,
  timeout: number = 30000
): Promise<{ columns: string[]; rows: any[]; rowCount: number }> {
  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 10000,
    statement_timeout: timeout,
    query_timeout: timeout,
    max: 1,
  })
  
  try {
    const result = await pool.query(query)
    const columns = result.fields?.map(f => f.name) || []
    const rows = result.rows || []
    const rowCount = result.rowCount ?? rows.length
    return { columns, rows, rowCount }
  } finally {
    await pool.end()
  }
}

async function executeMySQLQuery(
  config: { host: string; port: number; user: string; password: string; database: string },
  query: string,
  timeout: number = 30000
): Promise<{ columns: string[]; rows: any[]; rowCount: number }> {
  const connection = await mysql.createConnection({
    ...config,
    connectTimeout: 10000,
  })
  
  try {
    await connection.query(`SET SESSION MAX_EXECUTION_TIME = ${timeout}`)
    const [rows, fields] = await connection.query(query)
    const columns = Array.isArray(fields) ? fields.map((f: any) => f.name) : []
    const resultRows = Array.isArray(rows) ? rows : []
    return { columns, rows: resultRows, rowCount: resultRows.length }
  } finally {
    await connection.end()
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    
    if (!session?.user) {
      return NextResponse.json(
        { error: { message: "Authentication required" } },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { connectionId, query, timeout = 30000, readOnly = false } = body
    
    if (!connectionId || !query) {
      return NextResponse.json(
        { error: { message: "Connection ID and query are required" } },
        { status: 400 }
      )
    }
    
    // Check for dangerous patterns
    const dangerCheck = isDangerousQuery(query)
    if (dangerCheck.dangerous) {
      logger.warn({ 
        msg: "Dangerous query blocked",
        userId: session.user.id,
        connectionId,
        reason: dangerCheck.reason,
      })
      
      return NextResponse.json(
        { error: { message: `Query blocked: ${dangerCheck.reason}` } },
        { status: 400 }
      )
    }
    
    // If read-only mode, verify query is read-only
    if (readOnly && !isReadOnlyQuery(query)) {
      return NextResponse.json(
        { error: { message: "Only SELECT/EXPLAIN/SHOW queries are allowed in read-only mode" } },
        { status: 400 }
      )
    }
    
    // Fetch connection using Prisma
    const connection = await prisma.databaseConnection.findUnique({
      where: { id: connectionId },
    })
    
    if (!connection) {
      return NextResponse.json(
        { error: { message: "Connection not found" } },
        { status: 404 }
      )
    }
    
    // Verify team membership
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: connection.teamId,
        userId: session.user.id,
      },
    })
    
    if (!teamMember) {
      return NextResponse.json(
        { error: { message: "Access denied" } },
        { status: 403 }
      )
    }
    
    // Decrypt connection credentials
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production'
    const host = connection.host
    const port = connection.port || 5432
    const database = connection.database
    const username = connection.username
    
    let password: string
    try {
      // Try to decrypt the password (it might be encrypted with salt:iv:data format)
      const decrypted = await decryptCredentials(connection.password, ENCRYPTION_KEY)
      password = decrypted.password
    } catch (decryptError) {
      // If decryption fails, the password might be stored unencrypted (legacy data)
      // Fall back to using the raw password
      logger.info({ 
        msg: 'Using unencrypted password (legacy connection or decryption failed)',
        connectionId,
      })
      password = connection.password
    }
    
    // Execute query based on connection type
    let result: { columns: string[]; rows: any[]; rowCount: number }
    const startTime = Date.now()
    
    try {
      if (connection.type === "POSTGRESQL") {
        const connectionString = `postgresql://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${database}${connection.ssl ? '?sslmode=require' : ''}`
        result = await executePostgresQuery(connectionString, query, timeout)
      } else if (connection.type === "MYSQL") {
        result = await executeMySQLQuery(
          { host, port, user: username, password, database },
          query,
          timeout
        )
      } else {
        return NextResponse.json(
          { error: { message: `Unsupported database type: ${connection.type}` } },
          { status: 400 }
        )
      }
    } catch (error) {
      const duration = Date.now() - startTime
      
      logger.error({ 
        msg: "Query execution failed",
        userId: session.user.id,
        connectionId,
        duration,
        error: error instanceof Error ? error.message : String(error),
      })
      
      // Log failed query attempt
      await createAuditLog({
        action: AuditAction.CONNECTION_UPDATED,
        resource: "connection",
        resourceId: connectionId,
        details: {
          operation: "query_failed",
          queryPreview: query.slice(0, 100),
          duration,
          error: error instanceof Error ? error.message : String(error),
        },
        teamId: connection.teamId,
        userId: session.user.id,
      })
      
      return NextResponse.json(
        { error: { message: error instanceof Error ? error.message : "Query execution failed" } },
        { status: 500 }
      )
    }
    
    const duration = Date.now() - startTime
    
    // Log successful query
    await createAuditLog({
      action: AuditAction.CONNECTION_UPDATED,
      resource: "connection",
      resourceId: connectionId,
      details: {
        operation: "query_success",
        queryPreview: query.slice(0, 100),
        rowCount: result.rowCount,
        duration,
        readOnly: isReadOnlyQuery(query),
      },
      teamId: connection.teamId,
      userId: session.user.id,
    })
    
    logger.info({ 
      msg: "Query executed successfully",
      userId: session.user.id,
      connectionId,
      rowCount: result.rowCount,
      duration,
    })
    
    return NextResponse.json({
      data: {
        columns: result.columns,
        rows: result.rows,
        rowCount: result.rowCount,
        duration,
      },
    })
  } catch (error) {
    logger.error({ 
      msg: "Query endpoint error",
      error: error instanceof Error ? error.message : String(error),
    })
    
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 }
    )
  }
}
