import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { PITRService, detectDatabaseProvider, MigrationSnapshot } from '@/lib/pitr-service'
import { createAuditLog } from '@/lib/audit'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { AuditAction } from '@prisma/client'

// Schema for PITR restore request
const PITRRestoreSchema = z.object({
  migrationId: z.string(),
  execute: z.boolean().optional().default(false), // If true, actually execute the rollback
  dryRun: z.boolean().optional().default(false),  // If true, return SQL without executing
  reason: z.string().optional(),
})

/**
 * POST /api/migrations/pitr/restore
 * Prepare or execute a PITR rollback for a migration
 * 
 * With execute=false (default): Only prepares rollback SQL
 * With execute=true: Actually executes the rollback against the database
 * With dryRun=true: Returns what would be executed without executing
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    
    if (!session?.user) {
      return NextResponse.json(
        { error: { message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = PITRRestoreSchema.parse(body)

    // Get the migration with its connection
    const migration = await prisma.migration.findUnique({
      where: { id: validatedData.migrationId },
      include: {
        databaseConnection: true,
        snapshot: true,
      },
    })

    if (!migration) {
      return NextResponse.json(
        { error: { message: 'Migration not found' } },
        { status: 404 }
      )
    }

    // Verify team membership
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: migration.teamId,
        userId: session.user.id,
      },
    })

    if (!teamMember) {
      return NextResponse.json(
        { error: { message: 'Access denied' } },
        { status: 403 }
      )
    }

    // Check role for execution (require admin or owner for actual execution)
    if (validatedData.execute && !validatedData.dryRun) {
      if (!['OWNER', 'ADMIN'].includes(teamMember.role)) {
        return NextResponse.json(
          { error: { message: 'Only team owners and admins can execute rollbacks' } },
          { status: 403 }
        )
      }
    }

    // Get database provider for PITR instructions
    const connectionUrl = migration.databaseConnection.url || 
      `${migration.databaseConnection.type.toLowerCase()}://${migration.databaseConnection.host}`
    const provider = detectDatabaseProvider(connectionUrl)
    const pitrInstructions = PITRService.getPITRInstructions(provider)

    // If execute is true, perform actual rollback
    if (validatedData.execute) {
      const rollbackResult = await PITRService.executeRollback({
        migrationId: validatedData.migrationId,
        userId: session.user.id,
        reason: validatedData.reason,
        dryRun: validatedData.dryRun,
      })

      // Log the rollback execution
      await createAuditLog({
        action: AuditAction.MIGRATION_ROLLED_BACK,
        resource: 'migration',
        resourceId: validatedData.migrationId,
        details: {
          operation: validatedData.dryRun ? 'rollback_dry_run' : 'rollback_executed',
          success: rollbackResult.success,
          rollbackId: rollbackResult.rollbackId,
          affectedTables: rollbackResult.affectedTables,
          duration: rollbackResult.duration,
          reason: validatedData.reason,
          error: rollbackResult.error,
        },
        teamId: migration.teamId,
        userId: session.user.id,
      })

      logger.info({ 
        msg: validatedData.dryRun ? 'PITR dry run completed' : 'PITR rollback executed',
        migrationId: validatedData.migrationId,
        userId: session.user.id,
        success: rollbackResult.success,
        rollbackId: rollbackResult.rollbackId,
      })

      return NextResponse.json({
        success: rollbackResult.success,
        data: {
          migrationId: migration.id,
          migrationName: migration.name,
          rollbackId: rollbackResult.rollbackId,
          rollbackSql: rollbackResult.rollbackSql,
          affectedTables: rollbackResult.affectedTables,
          duration: rollbackResult.duration,
          dryRun: validatedData.dryRun,
          message: rollbackResult.message,
          error: rollbackResult.error,
          provider,
          pitrInstructions: rollbackResult.success ? undefined : pitrInstructions,
        },
      })
    }

    // Otherwise, just prepare rollback SQL (no execution)
    const snapshot: MigrationSnapshot = PITRService.createSnapshot(
      migration.id,
      migration.content,
      migration.version || '1.0.0'
    )

    const rollbackResult = await PITRService.prepareRollback(
      snapshot,
      validatedData.reason
    )

    // Log the rollback preparation
    await createAuditLog({
      action: AuditAction.MIGRATION_ROLLED_BACK,
      resource: 'migration',
      resourceId: validatedData.migrationId,
      details: {
        operation: 'rollback_prepared',
        affectedTables: snapshot.affectedTables,
        rollbackType: rollbackResult.rollbackType,
        reason: validatedData.reason,
        provider,
      },
      teamId: migration.teamId,
      userId: session.user.id,
    })

    logger.info({ 
      msg: 'PITR rollback prepared',
      migrationId: validatedData.migrationId,
      userId: session.user.id,
      affectedTables: snapshot.affectedTables,
    })

    return NextResponse.json({
      success: rollbackResult.success,
      data: {
        migrationId: migration.id,
        migrationName: migration.name,
        rollbackSql: rollbackResult.rollbackSql,
        affectedTables: snapshot.affectedTables,
        provider,
        pitrInstructions,
        message: rollbackResult.message,
        note: 'Set execute=true to actually run the rollback, or use dryRun=true to preview.',
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { message: 'Invalid request data', details: error.issues } },
        { status: 400 }
      )
    }

    logger.error({ msg: 'PITR restore failed', error: String(error) })
    return NextResponse.json(
      { error: { message: 'Failed to process rollback request' } },
      { status: 500 }
    )
  }
}

/**
 * GET /api/migrations/pitr/restore?migrationId=xxx
 * Get rollback information for a migration
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    
    if (!session?.user) {
      return NextResponse.json(
        { error: { message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const migrationId = searchParams.get('migrationId')

    if (!migrationId) {
      return NextResponse.json(
        { error: { message: 'Migration ID is required' } },
        { status: 400 }
      )
    }

    const migration = await prisma.migration.findUnique({
      where: { id: migrationId },
      include: {
        databaseConnection: true,
        rollbacks: {
          orderBy: { rolledBackAt: 'desc' },
          take: 5,
        },
      },
    })

    if (!migration) {
      return NextResponse.json(
        { error: { message: 'Migration not found' } },
        { status: 404 }
      )
    }

    // Verify team membership
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: migration.teamId,
        userId: session.user.id,
      },
    })

    if (!teamMember) {
      return NextResponse.json(
        { error: { message: 'Access denied' } },
        { status: 403 }
      )
    }

    // Create snapshot and generate rollback SQL
    const snapshot = PITRService.createSnapshot(
      migration.id,
      migration.content,
      migration.version || '1.0.0'
    )

    const connectionUrl = migration.databaseConnection.url || 
      `${migration.databaseConnection.type.toLowerCase()}://${migration.databaseConnection.host}`
    const provider = detectDatabaseProvider(connectionUrl)

    return NextResponse.json({
      data: {
        migrationId: migration.id,
        migrationName: migration.name,
        status: migration.status,
        executedAt: migration.executedAt,
        rollbackSql: snapshot.rollbackSql,
        affectedTables: snapshot.affectedTables,
        previousRollbacks: migration.rollbacks,
        provider,
        pitrInstructions: PITRService.getPITRInstructions(provider),
      },
    })
  } catch (error) {
    logger.error({ msg: 'Failed to get rollback info', error: String(error) })
    return NextResponse.json(
      { error: { message: 'Failed to get rollback information' } },
      { status: 500 }
    )
  }
}
