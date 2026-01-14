import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ExecuteMigrationSchema, ApiResponseSchema } from '@/lib/validation'
import { logger, migrationLogger } from '@/lib/telemetry'
import { formatError } from '@/lib/errors'
import { DatabaseConnectionService } from '@/lib/database-connection'
import crypto from 'crypto'

interface MigrationExecutionResult {
  success: boolean
  duration: number
  error?: string
  changes?: string[]
}

// POST /api/migrations/execute - Execute a migration
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
    const validatedData = ExecuteMigrationSchema.parse(body)

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
          status: { in: ['PENDING', 'FAILED'] },
        },
        include: {
          databaseConnection: true,
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
        { error: { code: 'NOT_FOUND', message: 'Migration not found or not executable' } },
        { status: 404 }
      )
    }

    // Check if migration is already executing
    if (migration.status === 'EXECUTING') {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: 'Migration is already executing' } },
        { status: 409 }
      )
    }

    // Verify checksum if provided
    if (validatedData.checksum) {
      const currentChecksum = crypto
        .createHash('sha256')
        .update(migration.content)
        .digest('hex')

      if (currentChecksum !== validatedData.checksum) {
        return NextResponse.json(
          { error: { code: 'CHECKSUM_MISMATCH', message: 'Migration content has changed since creation' } },
          { status: 409 }
        )
      }
    }

    // Update migration status to executing
    await prisma.migration.update({
      where: { id: validatedData.migrationId },
      data: { status: 'EXECUTING' },
    })

    let executionResult: MigrationExecutionResult

    try {
      // Execute the migration
      executionResult = await executeMigration(migration, validatedData.dryRun)

      if (validatedData.dryRun) {
        // For dry run, just return the preview without updating status
        await prisma.migration.update({
          where: { id: validatedData.migrationId },
          data: { status: 'PENDING' },
        })

        return NextResponse.json({
          success: true,
          data: {
            dryRun: true,
            changes: executionResult.changes,
            duration: executionResult.duration,
          },
        })
      }

      // Update migration status and execution time
      await prisma.migration.update({
        where: { id: validatedData.migrationId },
        data: {
          status: executionResult.success ? 'EXECUTED' : 'FAILED',
          executedAt: new Date(),
        },
      })

      // Record the execution
      await prisma.migrationExecution.create({
        data: {
          migrationId: validatedData.migrationId,
          status: executionResult.success ? 'SUCCESS' : 'FAILURE',
          duration: executionResult.duration,
          error: executionResult.error,
          executedBy: session.user.id,
        },
      })

      migrationLogger.executed(
        validatedData.migrationId,
        executionResult.duration,
        executionResult.success,
        {
          userId: session.user.id,
          teamId,
          dryRun: validatedData.dryRun,
        }
      )

      const response = {
        success: true,
        data: {
          success: executionResult.success,
          duration: executionResult.duration,
          error: executionResult.error,
          changes: executionResult.changes,
        },
      }

      return NextResponse.json(response)
    } catch (error) {
      // Update migration status to failed
      await prisma.migration.update({
        where: { id: validatedData.migrationId },
        data: { status: 'FAILED' },
      })

      // Record the failed execution
      await prisma.migrationExecution.create({
        data: {
          migrationId: validatedData.migrationId,
          status: 'FAILURE',
          duration: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
          executedBy: session.user.id,
        },
      })

      throw error
    }
  } catch (error) {
    logger.error('Failed to execute migration', error instanceof Error ? error : undefined, {
      userId: session?.user?.id,
    })

    return NextResponse.json(formatError(error), { status: 500 })
  }
}

async function executeMigration(
  migration: any,
  dryRun: boolean = false
): Promise<MigrationExecutionResult> {
  const startTime = Date.now()

  try {
    const connectionService = new DatabaseConnectionService()

    switch (migration.type) {
      case 'PRISMA':
        return await executePrismaMigration(migration, connectionService, dryRun)

      case 'DRIZZLE':
        return await executeDrizzleMigration(migration, connectionService, dryRun)

      case 'RAW_SQL':
        return await executeRawSqlMigration(migration, connectionService, dryRun)

      default:
        throw new Error(`Unsupported migration type: ${migration.type}`)
    }
  } catch (error) {
    const duration = Date.now() - startTime
    return {
      success: false,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

async function executePrismaMigration(
  migration: any,
  connectionService: DatabaseConnectionService,
  dryRun: boolean
): Promise<MigrationExecutionResult> {
  const startTime = Date.now()

  try {
    // For Prisma migrations, we need to use the Prisma CLI or direct database execution
    // This is a simplified implementation - in production you'd want more robust handling

    if (dryRun) {
      // For dry run, parse the migration and show what would be executed
      const changes = parsePrismaMigration(migration.content)
      return {
        success: true,
        duration: Date.now() - startTime,
        changes,
      }
    }

    // Execute the migration using the connection
    const result = await DatabaseConnectionService.executeQuery(
      migration.databaseConnection,
      migration.content
    )

    return {
      success: true,
      duration: Date.now() - startTime,
      changes: result.changes || [],
    }
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Prisma migration execution failed',
    }
  }
}

async function executeDrizzleMigration(
  migration: any,
  connectionService: DatabaseConnectionService,
  dryRun: boolean
): Promise<MigrationExecutionResult> {
  const startTime = Date.now()

  try {
    if (dryRun) {
      // Parse Drizzle migration for preview
      const changes = parseDrizzleMigration(migration.content)
      return {
        success: true,
        duration: Date.now() - startTime,
        changes,
      }
    }

    // Execute Drizzle migration
    const result = await DatabaseConnectionService.executeQuery(
      migration.databaseConnection,
      migration.content
    )

    return {
      success: true,
      duration: Date.now() - startTime,
      changes: result.changes || [],
    }
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Drizzle migration execution failed',
    }
  }
}

async function executeRawSqlMigration(
  migration: any,
  connectionService: DatabaseConnectionService,
  dryRun: boolean
): Promise<MigrationExecutionResult> {
  const startTime = Date.now()

  try {
    if (dryRun) {
      // For raw SQL, we can show the SQL that would be executed
      return {
        success: true,
        duration: Date.now() - startTime,
        changes: [migration.content],
      }
    }

    // Execute raw SQL
    const result = await DatabaseConnectionService.executeQuery(
      migration.databaseConnection,
      migration.content
    )

    return {
      success: true,
      duration: Date.now() - startTime,
      changes: result.changes || [],
    }
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Raw SQL execution failed',
    }
  }
}

function parsePrismaMigration(content: string): string[] {
  // Simple parsing for Prisma migration preview
  const lines = content.split('\n')
  const changes: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('--')) {
      changes.push(trimmed.substring(2).trim())
    } else if (trimmed.includes('CREATE TABLE') || trimmed.includes('ALTER TABLE') || trimmed.includes('DROP TABLE')) {
      changes.push(trimmed)
    }
  }

  return changes.length > 0 ? changes : ['Migration changes preview not available']
}

function parseDrizzleMigration(content: string): string[] {
  // Simple parsing for Drizzle migration preview
  const lines = content.split('\n')
  const changes: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('import')) {
      if (trimmed.includes('table(') || trimmed.includes('sql`') || trimmed.includes('db.')) {
        changes.push(trimmed)
      }
    }
  }

  return changes.length > 0 ? changes : ['Migration changes preview not available']
}