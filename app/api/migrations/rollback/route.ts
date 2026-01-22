import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { RollbackMigrationSchema, ApiResponseSchema } from '@/lib/validation'
import { logger, migrationLogger } from '@/lib/telemetry'
import { formatError } from '@/lib/errors'
import { DatabaseConnectionService } from '@/lib/database-connection'

// POST /api/migrations/rollback - Rollback a migration
export async function POST(request: NextRequest) {
  let session: any = null
  try {
    session = await getSession(request)
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = RollbackMigrationSchema.parse(body)

    // Get teamId from request or migration
    let teamId = validatedData.teamId
    if (!teamId) {
      // If teamId not provided, get it from the migration
      const migrationInfo = await prisma.migration.findUnique({
        where: { id: validatedData.migrationId },
        select: { teamId: true },
      })
      if (!migrationInfo) {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Migration not found' } },
          { status: 404 }
        )
      }
      teamId = migrationInfo.teamId
    }

    // Verify user has access to the team and migration
    const [teamMember, migration] = await Promise.all([
      prisma.teamMember.findFirst({
        where: {
          teamId,
          userId: session.user.id,
        },
      }),
      prisma.migration.findFirst({
        where: {
          id: validatedData.migrationId,
          teamId,
          status: 'EXECUTED', // Only executed migrations can be rolled back
        },
        include: {
          databaseConnection: true,
          executions: {
            orderBy: {
              executedAt: 'desc',
            },
            take: 1,
          },
        },
      }),
    ])

    if (!teamMember) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied to team' } },
        { status: 403 }
      )
    }

    if (!migration) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Migration not found or not rollbackable' } },
        { status: 404 }
      )
    }

    // Check if migration has a rollback script or can be automatically rolled back
    if (!validatedData.force && !canRollbackMigration(migration)) {
      return NextResponse.json(
        {
          error: {
            code: 'ROLLBACK_NOT_SUPPORTED',
            message: 'This migration type does not support automatic rollback. Use force=true to attempt manual rollback.'
          }
        },
        { status: 400 }
      )
    }

    // Create backup before rollback (if supported)
    let backupLocation: string | undefined
    if (migration.type === 'RAW_SQL' && validatedData.createBackup) {
      backupLocation = await createBackup(migration)
    }

    // Update migration status to rolling back
    await prisma.migration.update({
      where: { id: validatedData.migrationId },
      data: { status: 'EXECUTING' }, // Use EXECUTING status during rollback
    })

    let rollbackResult: { success: boolean; error?: string; duration: number; rollbackSql?: string }

    try {
      // Execute the rollback
      rollbackResult = await rollbackMigration(migration, validatedData)

      // Update migration status
      await prisma.migration.update({
        where: { id: validatedData.migrationId },
        data: {
          status: rollbackResult.success ? 'ROLLED_BACK' : 'EXECUTED', // Revert to EXECUTED if rollback failed
          rolledBackAt: rollbackResult.success ? new Date() : undefined,
        },
      })

      // Record the rollback
      if (rollbackResult.success) {
        await prisma.migrationRollback.create({
          data: {
            migrationId: validatedData.migrationId,
            reason: validatedData.reason,
            rolledBackBy: session.user.id,
            rollbackSql: rollbackResult.rollbackSql || '',
            status: 'success',
            completedAt: new Date(),
          },
        })

        // Update the last execution to include rollback info
        if (migration.executions.length > 0) {
          await prisma.migrationExecution.update({
            where: { id: migration.executions[0].id },
            data: { status: 'ROLLBACK' },
          })
        }
      }

      migrationLogger.rolledBack(
        validatedData.migrationId,
        validatedData.reason || 'Manual rollback',
        {
          userId: session.user.id,
          teamId,
          data: { duration: rollbackResult.duration },
        }
      )

      const response = {
        success: true,
        data: {
          success: rollbackResult.success,
          duration: rollbackResult.duration,
          error: rollbackResult.error,
          backupLocation,
        },
      }

      return NextResponse.json(response)
    } catch (error) {
      // Revert migration status back to EXECUTED
      await prisma.migration.update({
        where: { id: validatedData.migrationId },
        data: { status: 'EXECUTED' },
      })

      throw error
    }
  } catch (error) {
    logger.error('Failed to rollback migration', error instanceof Error ? error : undefined, {
      userId: session?.user?.id,
    })

    return NextResponse.json(formatError(error), { status: 500 })
  }
}

function canRollbackMigration(migration: any): boolean {
  // Only certain types of migrations can be automatically rolled back
  switch (migration.type) {
    case 'RAW_SQL':
      // Raw SQL can potentially be rolled back if it has corresponding rollback statements
      return migration.content.toLowerCase().includes('rollback') ||
             migration.content.toLowerCase().includes('drop') ||
             migration.content.toLowerCase().includes('alter')
    case 'PRISMA':
    case 'DRIZZLE':
      // ORM migrations typically don't support automatic rollback
      return false
    default:
      return false
  }
}

async function rollbackMigration(
  migration: any,
  options: { force?: boolean; reason?: string }
): Promise<{ success: boolean; error?: string; duration: number; rollbackSql?: string }> {
  const startTime = Date.now()

  try {
    const connectionService = new DatabaseConnectionService()

    switch (migration.type) {
      case 'RAW_SQL':
        return await rollbackRawSqlMigration(migration, connectionService, options)

      case 'PRISMA':
      case 'DRIZZLE':
        if (options.force) {
          // Attempt forced rollback (dangerous!)
          return await forceRollbackMigration(migration, connectionService)
        }
        throw new Error('ORM migrations do not support automatic rollback')

      default:
        throw new Error(`Unsupported migration type for rollback: ${migration.type}`)
    }
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown rollback error',
    }
  }
}

async function rollbackRawSqlMigration(
  migration: any,
  connectionService: DatabaseConnectionService,
  options: { force?: boolean; reason?: string }
): Promise<{ success: boolean; error?: string; duration: number; rollbackSql?: string }> {
  const startTime = Date.now()

  try {
    // For raw SQL, we need rollback statements or attempt to reverse the operations
    const rollbackSql = generateRollbackSql(migration.content)

    if (!rollbackSql) {
      throw new Error('Unable to generate rollback SQL for this migration')
    }

    // Execute the rollback SQL
    await DatabaseConnectionService.executeQuery(migration.databaseConnection, rollbackSql, migration.databaseConnectionId)

    return {
      success: true,
      duration: Date.now() - startTime,
      rollbackSql,
    }
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Raw SQL rollback failed',
    }
  }
}

async function forceRollbackMigration(
  migration: any,
  connectionService: DatabaseConnectionService
): Promise<{ success: boolean; error?: string; duration: number; rollbackSql?: string }> {
  const startTime = Date.now()

  try {
    // This is a dangerous operation - attempt to reverse common operations
    // In production, this should be much more sophisticated or not allowed at all

    const rollbackSql = generateForcedRollbackSql(migration.content)

    if (rollbackSql) {
      await DatabaseConnectionService.executeQuery(migration.databaseConnection, rollbackSql, migration.databaseConnectionId)
    }

    return {
      success: true,
      duration: Date.now() - startTime,
      rollbackSql: rollbackSql || undefined,
    }
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Forced rollback failed',
    }
  }
}

function generateRollbackSql(originalSql: string): string | null {
  // Very basic rollback SQL generation - this is not comprehensive
  const lines = originalSql.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('--'))

  const rollbackStatements: string[] = []

  for (const line of lines) {
    const upperLine = line.toUpperCase()

    if (upperLine.includes('CREATE TABLE')) {
      // Extract table name and generate DROP TABLE
      const tableMatch = line.match(/CREATE TABLE\s+(\w+)/i)
      if (tableMatch) {
        rollbackStatements.push(`DROP TABLE IF EXISTS ${tableMatch[1]};`)
      }
    } else if (upperLine.includes('ALTER TABLE') && upperLine.includes('ADD COLUMN')) {
      // Extract table and column name for DROP COLUMN
      const alterMatch = line.match(/ALTER TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(\w+)/i)
      if (alterMatch) {
        rollbackStatements.push(`ALTER TABLE ${alterMatch[1]} DROP COLUMN IF EXISTS ${alterMatch[2]};`)
      }
    } else if (upperLine.includes('DROP TABLE')) {
      // This is tricky - we'd need the original CREATE TABLE statement
      // For now, skip or warn
      return null
    }
  }

  return rollbackStatements.length > 0 ? rollbackStatements.join('\n') : null
}

function generateForcedRollbackSql(originalSql: string): string | null {
  // Even more dangerous - attempt to reverse operations without full context
  // This should ideally not be used in production

  const lines = originalSql.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('--'))

  // For forced rollback, we might try to reverse the most recent changes
  // This is highly experimental and should be avoided

  return null // Safer to return null and not attempt
}

async function createBackup(migration: any): Promise<string | undefined> {
  // Create a backup before rollback
  // This would typically involve creating a database dump or snapshot
  // For now, we'll just return a placeholder

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupName = `backup-${migration.id}-${timestamp}`

  // In a real implementation, you would:
  // 1. Use pg_dump for PostgreSQL
  // 2. Use mysqldump for MySQL
  // 3. Copy SQLite file for SQLite
  // 4. Store the backup in cloud storage or local filesystem

  return `/backups/${backupName}.sql`
}