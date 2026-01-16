import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { NotificationService } from '@/lib/notifications';
import { AutoApprovalService } from '@/lib/auto-approval';
import { EmailService } from '@/lib/email';
import { DatabaseConnectionService } from '@/lib/database-connection';

const QueryRequestSchema = z.object({
  query: z.string(),
  params: z.array(z.any()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ proxyId: string }> }
) {
  try {
    const { proxyId } = await params;

    // Find the proxy connection
    const proxyConnection = await prisma.proxyConnection.findUnique({
      where: { id: proxyId },
      include: { connection: true, user: true },
    });

    if (!proxyConnection || !proxyConnection.isActive) {
      return NextResponse.json({ error: 'Invalid or inactive proxy connection' }, { status: 404 });
    }

    const body = await QueryRequestSchema.parse(await request.json());

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

    // Check if auto-approval is enabled for this connection/user
    const shouldAutoApprove = await autoApprovalService.checkAutoApproval(
      proxyConnection.userId,
      proxyConnection.connectionId,
      body.query
    );

    if (shouldAutoApprove) {
      // Auto-approve and execute the query
      const pendingQuery = await prisma.pendingQuery.create({
        data: {
          query: body.query,
          params: body.params || [],
          connectionId: proxyConnection.connectionId,
          userId: proxyConnection.userId,
          status: 'APPROVED',
          approvedById: proxyConnection.userId, // Auto-approved
          approvedAt: new Date(),
        },
      });

      // Execute the query immediately
      try {
        const result = await DatabaseConnectionService.executeQuery(
          proxyConnection.connection,
          body.query,
          proxyConnection.connectionId
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
        connectionId: proxyConnection.connectionId,
        userId: proxyConnection.userId,
        status: 'PENDING',
      },
    });

    // Send notifications for review
    await notificationService.notifyQueryApprovalRequest(
      pendingQuery.id,
      proxyConnection.userId,
      proxyConnection.connectionId,
      body.query
    );

    return NextResponse.json({
      success: true,
      queryId: pendingQuery.id,
      status: 'PENDING_REVIEW',
      message: 'Query submitted for review. It will be executed once approved.',
    });

  } catch (error) {
    console.error('Proxy query error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET endpoint to check proxy status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ proxyId: string }> }
) {
  try {
    const { proxyId } = await params;

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