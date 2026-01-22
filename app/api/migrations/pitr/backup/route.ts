import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { PITRService, detectDatabaseProvider } from '@/lib/pitr-service'
import { createAuditLog } from '@/lib/audit'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { AuditAction } from '@prisma/client'
import { decryptCredentials } from '@/lib/encryption'

// Schema for snapshot/metadata request
const CreateSnapshotSchema = z.object({
  migrationId: z.string(),
  description: z.string().optional(),
  capturePreState: z.boolean().optional().default(false), // Whether to capture current table schemas
})

/**
 * POST /api/migrations/pitr/backup
 * Create and persist a migration snapshot for PITR
 * 
 * This creates a recoverable snapshot that can be used for rollback.
 * The snapshot is stored in the database, not the filesystem.
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
    const validatedData = CreateSnapshotSchema.parse(body)

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

    // Get database provider info
    const connectionUrl = migration.databaseConnection.url || 
      `${migration.databaseConnection.type.toLowerCase()}://${migration.databaseConnection.host}`
    const provider = detectDatabaseProvider(connectionUrl)

    // Build connection config if we need to capture pre-state
    let connectionConfig = undefined
    if (validatedData.capturePreState) {
      // Decrypt the password before use
      const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production'
      let decryptedPassword: string
      try {
        const decrypted = await decryptCredentials(migration.databaseConnection.password, ENCRYPTION_KEY)
        decryptedPassword = decrypted.password
      } catch {
        // If decryption fails, assume it might not be encrypted
        decryptedPassword = migration.databaseConnection.password
      }
      
      connectionConfig = {
        type: migration.databaseConnection.type as 'POSTGRESQL' | 'MYSQL',
        host: migration.databaseConnection.host,
        port: migration.databaseConnection.port || 5432,
        database: migration.databaseConnection.database,
        username: migration.databaseConnection.username,
        password: decryptedPassword,
        ssl: migration.databaseConnection.ssl,
      }
    }

    // Create and persist the snapshot
    const snapshot = await PITRService.createAndSaveSnapshot(
      migration.id,
      migration.content,
      migration.version || '1.0.0',
      session.user.id,
      connectionConfig
    )

    // Log audit event
    await createAuditLog({
      action: AuditAction.MIGRATION_CREATED,
      resource: 'migration_snapshot',
      resourceId: validatedData.migrationId,
      details: {
        operation: 'snapshot_persisted',
        affectedTables: snapshot.affectedTables,
        hasRollbackSql: !!snapshot.rollbackSql,
        hasPreState: !!snapshot.preState,
        description: validatedData.description,
        provider,
      },
      teamId: migration.teamId,
      userId: session.user.id,
    })

    logger.info({ 
      msg: 'Migration snapshot persisted',
      migrationId: validatedData.migrationId,
      userId: session.user.id,
      affectedTables: snapshot.affectedTables,
      hasPreState: !!snapshot.preState,
    })

    return NextResponse.json({
      success: true,
      data: {
        snapshot,
        provider,
        pitrInstructions: PITRService.getPITRInstructions(provider),
        message: 'Snapshot created and stored. You can now rollback this migration using the restore endpoint.',
        capabilities: {
          canRollbackSchema: !!snapshot.rollbackSql,
          hasPreState: !!snapshot.preState,
          providerPITR: ['neon', 'supabase', 'vercel-postgres', 'planetscale'].includes(provider),
        },
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { message: 'Invalid request data', details: error.issues } },
        { status: 400 }
      )
    }

    logger.error({ msg: 'Snapshot creation failed', error: String(error) })
    return NextResponse.json(
      { error: { message: 'Failed to create snapshot' } },
      { status: 500 }
    )
  }
}

/**
 * GET /api/migrations/pitr/backup?migrationId=xxx
 * Get snapshot/rollback info for a migration
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
        snapshot: {
          include: {
            creator: {
              select: { id: true, name: true, email: true },
            },
          },
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

    const connectionUrl = migration.databaseConnection.url || 
      `${migration.databaseConnection.type.toLowerCase()}://${migration.databaseConnection.host}`
    const provider = detectDatabaseProvider(connectionUrl)

    // If snapshot exists in DB, use it; otherwise generate one
    let snapshot
    if (migration.snapshot) {
      snapshot = {
        migrationId: migration.snapshot.migrationId,
        timestamp: migration.snapshot.createdAt.toISOString(),
        schemaVersion: migration.snapshot.schemaVersion,
        affectedTables: migration.snapshot.affectedTables,
        rollbackSql: migration.snapshot.rollbackSql,
        preState: migration.snapshot.preState ? JSON.parse(migration.snapshot.preState) : undefined,
        metadata: migration.snapshot.metadata ? JSON.parse(migration.snapshot.metadata) : undefined,
        createdBy: migration.snapshot.creator,
      }
    } else {
      // Generate snapshot on-the-fly
      snapshot = PITRService.createSnapshot(
        migration.id,
        migration.content,
        migration.version || '1.0.0'
      )
    }

    return NextResponse.json({
      data: {
        migrationId: migration.id,
        migrationName: migration.name,
        status: migration.status,
        snapshot,
        isPersisted: !!migration.snapshot,
        provider,
        pitrInstructions: PITRService.getPITRInstructions(provider),
        supportedFeatures: {
          sqlRollback: !!snapshot.rollbackSql,
          providerPITR: ['neon', 'supabase', 'vercel-postgres', 'planetscale'].includes(provider),
        },
      },
    })
  } catch (error) {
    logger.error({ msg: 'Failed to get snapshot info', error: String(error) })
    return NextResponse.json(
      { error: { message: 'Failed to get snapshot information' } },
      { status: 500 }
    )
  }
}
