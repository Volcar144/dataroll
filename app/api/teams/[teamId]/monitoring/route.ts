import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { performTeamHealthChecks } from '@/lib/database-monitoring'

// POST /api/teams/[teamId]/monitoring/health-check - Perform health checks for all team connections
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  let session: any = null
  try {
    session = await getSession(request)
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const { teamId } = await params

    // Verify user is a member of the team
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: session.user.id,
      },
    })

    if (!teamMember) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Team not found or access denied' } },
        { status: 404 }
      )
    }

    // Perform health checks for all active connections in the team
    await performTeamHealthChecks(teamId)

    return NextResponse.json({
      success: true,
      message: 'Health checks completed for all team connections',
    })
  } catch (error) {
    console.error('Team health check API error:', error)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to perform team health checks'
        }
      },
      { status: 500 }
    )
  }
}