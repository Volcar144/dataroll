import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const GenerateProxyUrlSchema = z.object({
  connectionId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    // Get the session
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await GenerateProxyUrlSchema.parse(await request.json());

    // Check if user has access to the connection
    const connection = await prisma.databaseConnection.findFirst({
      where: {
        id: body.connectionId,
        OR: [
          { createdById: session.user.id },
          { team: { members: { some: { userId: session.user.id } } } },
        ],
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found or access denied' }, { status: 404 });
    }

    // Generate a unique proxy URL
    const proxyId = crypto.randomUUID();
    const proxyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/proxy/${proxyId}`;

    // Store the proxy connection
    await prisma.proxyConnection.create({
      data: {
        id: proxyId,
        connectionId: body.connectionId,
        userId: session.user.id,
        proxyUrl,
      },
    });

    return NextResponse.json({
      success: true,
      proxyUrl,
      connectionName: connection.name,
    });

  } catch (error) {
    console.error('Generate proxy URL error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}