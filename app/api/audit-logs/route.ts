import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { 
  AuditLogSchema,
  PaginationSchema,
  ApiResponseSchema
} from '@/lib/validation'
import { logger } from '@/lib/telemetry'
import { formatError } from '@/lib/errors'

// GET /api/audit-logs - List audit logs for a team
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
    const action = searchParams.get('action')
    const userId = searchParams.get('userId')
    const resource = searchParams.get('resource')
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

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

    // Build where clause for filtering
    const whereClause: any = { teamId }
    
    if (action) {
      whereClause.action = action
    }
    
    if (userId) {
      whereClause.userId = userId
    }
    
    if (resource) {
      whereClause.resource = {
        contains: resource,
        mode: 'insensitive',
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit
    const total = await prisma.auditLog.count({ where: whereClause })
    const totalPages = Math.ceil(total / limit)

    const auditLogs = await prisma.auditLog.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc',
      },
      skip,
      take: limit,
    })

    const response = {
      success: true,
      data: auditLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Failed to list audit logs', error instanceof Error ? error : undefined, {
      userId: session?.user?.id,
      teamId: new URL(request.url).searchParams.get('teamId'),
    })

    return NextResponse.json(formatError(error), { status: 500 })
  }
}

// POST /api/audit-logs - Create an audit log entry (for internal use)
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
    const validatedData = AuditLogSchema.parse(body)

    // Verify user has access to the team
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: validatedData.teamId,
        userId: session.user.id,
      },
    })

    if (!teamMember) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied to team' } },
        { status: 403 }
      )
    }

    const auditLog = await prisma.auditLog.create({
      data: {
        ...validatedData,
        userId: session.user.id, // Use current user's ID
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    const response = {
      success: true,
      data: auditLog,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    logger.error('Failed to create audit log', error instanceof Error ? error : undefined, {
      userId: session?.user?.id,
    })

    return NextResponse.json(formatError(error), { status: 500 })
  }
}