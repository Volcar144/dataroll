import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const QueryRequestSchema = z.object({
  query: z.string(),
  params: z.array(z.any()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { proxyId: string } }
) {
  try {
    const proxyId = params.proxyId;

    // Find the proxy connection
    const proxyConnection = await prisma.proxyConnection.findUnique({
      where: { id: proxyId },
      include: { connection: true, user: true },
    });

    if (!proxyConnection || !proxyConnection.isActive) {
      return NextResponse.json({ error: 'Invalid or inactive proxy connection' }, { status: 404 });
    }

    const body = await QueryRequestSchema.parse(await request.json());

    // Create a pending query for review
    const pendingQuery = await prisma.pendingQuery.create({
      data: {
        query: body.query,
        params: body.params || [],
        connectionId: proxyConnection.connectionId,
        userId: proxyConnection.userId,
        status: 'PENDING',
      },
    });

    // TODO: Check if auto-approval is enabled for this connection/user
    // TODO: Send notifications for review

    return NextResponse.json({
      success: true,
      queryId: pendingQuery.id,
      status: 'PENDING_REVIEW',
      message: 'Query submitted for review. It will be executed once approved.',
    });

  } catch (error) {
    console.error('Proxy query error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET endpoint to check proxy status
export async function GET(
  request: NextRequest,
  { params }: { params: { proxyId: string } }
) {
  try {
    const proxyId = params.proxyId;

    const proxyConnection = await prisma.proxyConnection.findUnique({
      where: { id: proxyId },
      include: {
        connection: {
          select: {
            id: true,
            name: true,
            type: true,
            environment: true,
            healthStatus: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!proxyConnection) {
      return NextResponse.json({ error: 'Proxy connection not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      proxy: {
        id: proxyConnection.id,
        isActive: proxyConnection.isActive,
        createdAt: proxyConnection.createdAt,
        connection: proxyConnection.connection,
        user: proxyConnection.user,
      },
    });

  } catch (error) {
    console.error('Proxy status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}