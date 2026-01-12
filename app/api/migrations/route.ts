import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { 
  CreateMigrationSchema, 
  ExecuteMigrationSchema,
  RollbackMigrationSchema,
  ApiResponseSchema
} from '@/lib/validation'
import { logger, migrationLogger } from '@/lib/telemetry'
import { formatError } from '@/lib/errors'
import crypto from 'crypto'

// GET /api/migrations - List migrations for a team
export async function GET(request: NextRequest) {
  let session: any = null
  try {
    session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const connectionId = searchParams.get('connectionId')
    const status = searchParams.get('status')

    if (!teamId) {
      return NextResponse.json(
        { error: { code: 'MISSING_TEAM_ID', message: 'Team ID is required' } },
        { status: 400 }
      )
    }

    // Verify user has access to this team
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: session.user.id,
      },
    })

    if (!teamMember) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied to team' } },
        { status: 403 }
      )
    }

    const whereClause: any = { teamId }
    
    if (connectionId) {
      whereClause.databaseConnectionId = connectionId
    }
    
    if (status) {
      whereClause.status = status
    }

    const migrations = await prisma.migration.findMany({
      where: whereClause,
      include: {
        databaseConnection: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        executions: {
          orderBy: {
            executedAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const response = {
      success: true,
      data: migrations,
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Failed to list migrations', error instanceof Error ? error : undefined, {
      userId: session?.user?.id,
      teamId: new URL(request.url).searchParams.get('teamId'),
    })

    return NextResponse.json(formatError(error), { status: 500 })
  }
}

// POST /api/migrations - Create a new migration
export async function POST(request: NextRequest) {
  let session: any = null
  try {
    session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = CreateMigrationSchema.parse(body)

    // Verify user has access to the team and connection
    const [teamMember, connection] = await Promise.all([
      prisma.teamMember.findFirst({
        where: {
          teamId: validatedData.teamId,
          userId: session.user.id,
        },
      }),
      prisma.databaseConnection.findFirst({
        where: {
          id: validatedData.databaseConnectionId,
          teamId: validatedData.teamId,
          isActive: true,
        },
      }),
    ])

    if (!teamMember) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied to team' } },
        { status: 403 }
      )
    }

    if (!connection) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Database connection not found' } },
        { status: 404 }
      )
    }

    // Generate checksum for the migration content
    const checksum = crypto
      .createHash('sha256')
      .update(validatedData.content)
      .digest('hex')

    // Check for duplicate version + connection combination
    const existingMigration = await prisma.migration.findFirst({
      where: {
        version: validatedData.version,
        databaseConnectionId: validatedData.databaseConnectionId,
        teamId: validatedData.teamId,
      },
    })

    if (existingMigration) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: 'Migration version already exists for this connection' } },
        { status: 409 }
      )
    }

    const migration = await prisma.migration.create({
      data: {
        ...validatedData,
        checksum,
        createdById: session.user.id,
      },
      include: {
        databaseConnection: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    migrationLogger.created(migration.id, migration.version, {
      userId: session.user.id,
      teamId: validatedData.teamId,
    })

    const response = {
      success: true,
      data: migration,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    logger.error('Failed to create migration', error instanceof Error ? error : undefined, {
      userId: session?.user?.id,
    })

    return NextResponse.json(formatError(error), { status: 500 })
  }
}