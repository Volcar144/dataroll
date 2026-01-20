// Example: Using PostHog error tracking in API routes

import { NextRequest, NextResponse } from 'next/server'
import { captureServerException } from '@/lib/posthog-server'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Your API logic here
    const session = await getSession({ headers: request.headers })
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Simulate some logic that might throw an error
    const result = await someOperationThatMightFail()
    
    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    // Capture the error in PostHog
    const session = await getSession({ headers: request.headers })
    await captureServerException(
      error instanceof Error ? error : new Error(String(error)),
      session?.user?.id, // distinct_id from session
      {
        endpoint: '/api/example',
        method: request.method,
        url: request.url,
      }
    )

    console.error('API Error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

async function someOperationThatMightFail() {
  // Your logic here
  return { message: 'Success' }
}
