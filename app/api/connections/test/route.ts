import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { DatabaseConnectionService, ConnectionTestSchema } from '@/lib/database-connection'
import { ApiResponseSchema } from '@/lib/validation'
import { logger } from '@/lib/telemetry'
import { formatError } from '@/lib/errors'

// POST /api/connections/test - Test database connection
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
    const validatedData = ConnectionTestSchema.parse(body)

    logger.info('Testing database connection', {
      userId: session.user.id,
      databaseType: validatedData.type,
      host: validatedData.host,
      database: validatedData.database,
    })

    // Test the connection
    const result = await DatabaseConnectionService.testConnection(validatedData)

    if (result.success) {
      logger.info('Database connection test successful', {
        userId: session.user.id,
        databaseType: validatedData.type,
        latency: result.latency,
      })

      return NextResponse.json({
        success: true,
        data: {
          connected: true,
          latency: result.latency,
        },
      })
    } else {
      logger.warn('Database connection test failed', {
        userId: session.user.id,
        databaseType: validatedData.type,
        error: result.error,
      })

      return NextResponse.json({
        success: true,
        data: {
          connected: false,
          error: result.error,
          latency: result.latency,
        },
      })
    }
  } catch (error) {
    logger.error('Database connection test error', error instanceof Error ? error : undefined, formatError(error).error, {
      userId: session?.user?.id,
    })

    return NextResponse.json(
      { error: { code: 'CONNECTION_TEST_FAILED', message: 'Failed to test database connection' } },
      { status: 500 }
    )
  }
}