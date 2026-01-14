import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { DatabaseConnectionService, ConnectionTestSchema } from '@/lib/database-connection'
import { ApiResponseSchema } from '@/lib/validation'
import { logger } from '@/lib/telemetry'
import { formatError } from '@/lib/errors'

// POST /api/connections/detect-orm - Detect ORM type from database
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

    logger.info('Detecting ORM type', {
      userId: session.user.id,
      databaseType: validatedData.type,
      host: validatedData.host,
      database: validatedData.database,
    })

    // Detect ORM
    const result = await DatabaseConnectionService.detectORM(validatedData)

    logger.info('ORM detection completed', {
      userId: session.user.id,
      detectedORM: result.detectedORM,
      confidence: result.confidence,
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    logger.error('ORM detection error', error instanceof Error ? error : undefined, formatError(error).error, {
      userId: session?.user?.id,
    })

    return NextResponse.json(
      { error: { code: 'ORM_DETECTION_FAILED', message: 'Failed to detect ORM type' } },
      { status: 500 }
    )
  }
}