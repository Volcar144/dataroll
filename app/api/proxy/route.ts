import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Pool } from 'pg';
import { NotificationService } from '@/lib/notifications';
import { AutoApprovalService } from '@/lib/auto-approval';
import { EmailService } from '@/lib/email';
import { DatabaseConnectionService } from '@/lib/database-connection';

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
          { createdById: userId }, // User's own connection
          { team: { members: { some: { userId } } } }, // Team connection
        ],
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found or access denied' }, { status: 404 });
    }

    // Initialize services
    const emailService = process.env.SMTP_HOST ? new EmailService({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
      from: process.env.FROM_EMAIL || 'noreply@dataroll.com',
    }) : undefined;

    const notificationService = new NotificationService({
      emailService,
      slackWebhook: process.env.SLACK_WEBHOOK_URL,
    });

    const autoApprovalService = new AutoApprovalService();

    // Check if auto-approval is enabled
    const shouldAutoApprove = await autoApprovalService.checkAutoApproval(
      userId,
      body.connectionId,
      body.query
    );

    if (shouldAutoApprove) {
      // Auto-approve and execute the query
      const pendingQuery = await prisma.pendingQuery.create({
        data: {
          query: body.query,
          params: body.params || [],
          connectionId: body.connectionId,
          userId,
          status: 'APPROVED',
          approvedById: userId, // Auto-approved
          approvedAt: new Date(),
        },
      });

      // Execute the query immediately
      try {
        const result = await DatabaseConnectionService.executeQuery(
          connection,
          body.query,
          body.connectionId
        );

        // Update the pending query with results
        await prisma.pendingQuery.update({
          where: { id: pendingQuery.id },
          data: {
            status: 'EXECUTED',
            executedAt: new Date(),
            result: result,
          },
        });

        return NextResponse.json({
          success: true,
          queryId: pendingQuery.id,
          status: 'EXECUTED',
          result: result,
          message: 'Query auto-approved and executed successfully.',
        });
      } catch (error) {
        // Update with error
        await prisma.pendingQuery.update({
          where: { id: pendingQuery.id },
          data: {
            status: 'FAILED',
            executedAt: new Date(),
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });

        return NextResponse.json({
          success: false,
          queryId: pendingQuery.id,
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Query auto-approved but execution failed.',
        });
      }
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

    // Send notification to team/admin for approval
    await notificationService.notifyQueryApprovalRequest(
      pendingQuery.id,
      userId,
      body.connectionId,
      body.query
    );

    return NextResponse.json({
      success: true,
      queryId: pendingQuery.id,
      status: 'PENDING_REVIEW',
      message: 'Query submitted for review. It will be executed once approved.',
    });

  } catch (error) {
    console.error('Proxy API error:', error);
    if (error instanceof z.ZodError) {
    return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
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