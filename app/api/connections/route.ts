import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { 
  CreateDatabaseConnectionSchema, 
  UpdateDatabaseConnectionSchema,
  TestConnectionSchema,
  ApiResponseSchema,
  EmptyResponseSchema
} from '@/lib/validation'
import { encryptCredentials } from '@/lib/encryption'
import { logger, securityLogger } from '@/lib/telemetry'
import { formatError } from '@/lib/errors'

// GET /api/connections - List database connections for current user's team
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
    const active = searchParams.get('active')

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
      securityLogger.unauthorized('view_connections', `team:${teamId}`, {
        userId: session.user.id,
        teamId,
      })
      
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied to team' } },
        { status: 403 }
      )
    }

    const connections = await prisma.databaseConnection.findMany({
      where: {
        teamId,
        ...(active !== null ? { isActive: active === 'true' } : {}),
      },
      select: {
        id: true,
        name: true,
        type: true,
        host: true,
        port: true,
        database: true,
        username: true,
        ssl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const response = {
      success: true,
      data: connections,
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Failed to list database connections', error instanceof Error ? error : undefined, {
      userId: session?.user?.id,
      teamId: new URL(request.url).searchParams.get('teamId'),
    })

    return NextResponse.json(formatError(error), { status: 500 })
  }
}

// POST /api/connections - Create a new database connection
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
    const validatedData = CreateDatabaseConnectionSchema.parse(body)

    // Verify user has access to the team
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: validatedData.teamId,
        userId: session.user.id,
      },
    })

    if (!teamMember) {
      securityLogger.unauthorized('create_connection', `team:${validatedData.teamId}`, {
        userId: session.user.id,
        teamId: validatedData.teamId,
      })
      
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied to team' } },
        { status: 403 }
      )
    }

    // Encrypt the password before storing
    const encryptedPassword = await encryptCredentials(
      { password: validatedData.password },
      process.env.ENCRYPTION_KEY || 'default-encryption-key'
    )

    const connection = await prisma.databaseConnection.create({
      data: {
        ...validatedData,
        password: encryptedPassword,
        createdById: session.user.id,
      },
      select: {
        id: true,
        name: true,
        type: true,
        host: true,
        port: true,
        database: true,
        username: true,
        ssl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Log the creation
    logger.info('Database connection created', {
      connectionId: connection.id,
      name: connection.name,
      type: connection.type,
    }, {
      userId: session.user.id,
      teamId: validatedData.teamId,
    })

    const response = {
      success: true,
      data: connection,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    logger.error('Failed to create database connection', error instanceof Error ? error : undefined, {
      userId: session?.user?.id,
    })

    return NextResponse.json(formatError(error), { status: 500 })
  }
}