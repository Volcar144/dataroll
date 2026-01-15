import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Pool } from 'pg';

const QueryRequestSchema = z.object({
  query: z.string(),
  params: z.array(z.any()).optional(),
  connectionId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    // Get the API key from the Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid API key' }, { status: 401 });
    }

    const apiKey = authHeader.substring(7);

    // Find the user by API key
    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: { user: true },
    });

    if (!apiKeyRecord) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const userId = apiKeyRecord.userId;

    // Parse the request body
    const body = await QueryRequestSchema.parse(await request.json());

    // Check if user has access to the connection
    const connection = await prisma.databaseConnection.findFirst({
      where: {
        id: body.connectionId,
        OR: [
          { userId }, // User's own connection
          { team: { members: { some: { userId } } } }, // Team connection
        ],
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found or access denied' }, { status: 404 });
    }

    // Create a pending query for review
    const pendingQuery = await prisma.pendingQuery.create({
      data: {
        query: body.query,
        params: body.params || [],
        connectionId: body.connectionId,
        userId,
        status: 'PENDING',
      },
    });

    // TODO: Send notification to team/admin for approval
    // TODO: Auto-approve based on rules/policies

    return NextResponse.json({
      success: true,
      queryId: pendingQuery.id,
      status: 'PENDING_REVIEW',
      message: 'Query submitted for review. It will be executed once approved.',
    });

  } catch (error) {
    console.error('Proxy API error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Generate a proxy database URL for a connection
export async function generateProxyUrl(connectionId: string, userId: string): Promise<string> {
  // Create a proxy connection record
  const proxyConnection = await prisma.proxyConnection.create({
    data: {
      connectionId,
      userId,
      proxyUrl: `postgresql://proxy:dataroll@${process.env.NEXT_PUBLIC_APP_URL?.replace('http', 'postgresql')}proxy/${connectionId}`,
    },
  });

  return proxyConnection.proxyUrl;
}