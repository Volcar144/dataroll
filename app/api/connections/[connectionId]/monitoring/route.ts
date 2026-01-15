import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  getDatabaseErrors,
  getConnectionHealthStatus,
  performHealthCheck
} from '@/lib/database-monitoring'
import { ApiResponseSchema } from '@/lib/validation'

// GET /api/connections/[connectionId]/monitoring - Get connection monitoring data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> }
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

    const { connectionId } = await params

    // Verify access to the connection
    const connection = await prisma.databaseConnection.findFirst({
      where: {
        id: connectionId,
        team: {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
      },
    })

    if (!connection) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Connection not found or access denied' } },
        { status: 404 }
      )
    }

    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    if (action === 'health') {
      // Get health status
      const healthStatus = await getConnectionHealthStatus(connectionId)
      return NextResponse.json({
        success: true,
        data: healthStatus,
      })
    } else if (action === 'errors') {
      // Get database errors
      const limit = parseInt(url.searchParams.get('limit') || '50')
      const offset = parseInt(url.searchParams.get('offset') || '0')
      const operation = url.searchParams.get('operation') || undefined
      const errorType = url.searchParams.get('errorType') || undefined

      const errors = await getDatabaseErrors(connectionId, {
        limit,
        offset,
        operation,
        errorType,
      })

      return NextResponse.json({
        success: true,
        data: errors,
      })
    } else {
      // Get both health status and recent errors
      const [healthStatus, errors] = await Promise.all([
        getConnectionHealthStatus(connectionId),
        getDatabaseErrors(connectionId, { limit: 10 }),
      ])

      return NextResponse.json({
        success: true,
        data: {
          health: healthStatus,
          recentErrors: errors,
        },
      })
    }
  } catch (error) {
    console.error('Monitoring API error:', error)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get monitoring data'
        }
      },
      { status: 500 }
    )
  }
}

// POST /api/connections/[connectionId]/monitoring - Perform health check
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> }
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

    const { connectionId } = await params

    // Verify access to the connection
    const connection = await prisma.databaseConnection.findFirst({
      where: {
        id: connectionId,
        team: {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
      },
    })

    if (!connection) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Connection not found or access denied' } },
        { status: 404 }
      )
    }

    // Perform health check
    const result = await performHealthCheck(connectionId)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Health check API error:', error)
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to perform health check'
        }
      },
      { status: 500 }
    )
  }
}