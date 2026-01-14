import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { DatabaseConnectionService } from '@/lib/database-connection'
import { prisma } from '@/lib/prisma'
import { decryptCredentials } from '@/lib/encryption'
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
    const { connectionId } = body

    if (!connectionId) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'Connection ID is required' } },
        { status: 400 }
      )
    }

    // Fetch the connection and verify access
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

    // Decrypt the credentials
    const decryptedCredentials = await decryptCredentials(
      connection.password,
      process.env.ENCRYPTION_KEY || 'default-encryption-key'
    )

    const testData = {
      type: connection.type,
      host: connection.host,
      port: connection.port || undefined,
      database: connection.database,
      username: decryptedCredentials.username || connection.username,
      password: decryptedCredentials.password,
      ssl: connection.ssl,
      url: connection.url || undefined,
    }

    logger.info('Testing database connection', {
      userId: session.user.id,
      connectionId,
      databaseType: testData.type,
    })

    // Test the connection
    const result = await DatabaseConnectionService.testConnection(testData)

    if (result.success) {
      logger.info('Database connection test successful', {
        userId: session.user.id,
        connectionId,
        databaseType: testData.type,
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
        connectionId,
        databaseType: testData.type,
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