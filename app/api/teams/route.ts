import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { 
  CreateTeamSchema, 
  UpdateTeamSchema,
  ApiResponseSchema,
  EmptyResponseSchema
} from '@/lib/validation'
import { logger } from '@/lib/telemetry'
import { formatError } from '@/lib/errors'

// GET /api/teams - List teams for current user
export async function GET(request: NextRequest) {
  let session: any = null
  try {
    session = await getSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const teams = await prisma.team.findMany({
      where: {
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
      include: {
        members: {
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
        },
        _count: {
          select: {
            members: true,
            databaseConnections: true,
            migrations: true,
          },
        },
      },
    })

    const response = {
      success: true,
      data: teams,
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Failed to list teams', error instanceof Error ? error : undefined, {
      userId: session?.user?.id,
    })

    return NextResponse.json(formatError(error), { status: 500 })
  }
}

// POST /api/teams - Create a new team
export async function POST(request: NextRequest) {
  let session: any = null
  try {
    session = await getSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = CreateTeamSchema.parse(body)

    // Generate a unique slug from the team name
    const slug = validatedData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).substr(2, 5)

    const team = await prisma.$transaction(async (tx: any) => {
      // Create the team
      const newTeam = await tx.team.create({
        data: {
          ...validatedData,
          slug,
          createdById: session.user.id,
        },
      })

      // Add the creator as an owner
      await tx.teamMember.create({
        data: {
          teamId: newTeam.id,
          userId: session.user.id,
          role: 'OWNER',
        },
      })

      return newTeam
    })

    logger.info('Team created', {
      teamId: team.id,
      name: team.name,
    }, {
      userId: session.user.id,
    })

    const response = {
      success: true,
      data: team,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    logger.error('Failed to create team', error instanceof Error ? error : undefined, {
      userId: session?.user?.id,
    })

    return NextResponse.json(formatError(error), { status: 500 })
  }
}