import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import crypto from 'crypto';
import { executeMigration } from '@/lib/migration-execution';import { DatabaseConnectionService } from '@/lib/database-connection';
const WebhookPayloadSchema = z.object({
  action: z.enum(['migrate', 'query']),
  connectionId: z.string(),
  data: z.object({
    name: z.string().optional(),
    type: z.enum(['PRISMA', 'DRIZZLE', 'RAW_SQL']).optional(),
    content: z.string(),
    query: z.string().optional(),
    description: z.string().optional(),
    autoExecute: z.boolean().default(true),
  }),
  metadata: z.object({
    commit: z.string().optional(),
    branch: z.string().optional(),
    author: z.string().optional(),
    pipeline: z.string().optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Get the webhook ID from the URL
    const url = new URL(request.url);
    const webhookId = url.pathname.split('/').pop();

    if (!webhookId) {
      return NextResponse.json({ error: 'Invalid webhook URL' }, { status: 400 });
    }

    // Find the webhook
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
      include: { createdBy: true },
    });

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    // Verify webhook signature if configured
    if (webhook.secret) {
      const signature = request.headers.get('x-webhook-signature');
      const body = await request.text();

      if (!signature) {
        return NextResponse.json({ error: 'Missing webhook signature' }, { status: 401 });
      }

      const expectedSignature = crypto
        .createHmac('sha256', webhook.secret)
        .update(body)
        .digest('hex');

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    }

    // Parse the payload
    const payload = WebhookPayloadSchema.parse(JSON.parse(await request.text()));

    const userId = webhook.createdById;

    if (payload.action === 'migrate') {
      // Handle migration request
      const { name, type = 'RAW_SQL', content, description, autoExecute = true } = payload.data;

      if (!name) {
        return NextResponse.json({ error: 'Migration name is required' }, { status: 400 });
      }

      // Check if user has access to the connection
      const connection = await prisma.databaseConnection.findFirst({
        where: {
          id: payload.connectionId,
          OR: [
            { createdById: userId }, // User's own connection
            { team: { members: { some: { userId } } } }, // Team connection
          ],
        },
      });

      if (!connection) {
        return NextResponse.json({ error: 'Connection not found or access denied' }, { status: 404 });
      }

      // Create the migration
      const migration = await prisma.migration.create({
        data: {
          name,
          version: Date.now().toString(),
          type,
          filePath: `webhook/${name}.sql`,
          content,
          status: 'PENDING',
          teamId: connection.teamId,
          databaseConnectionId: payload.connectionId,
          createdById: userId,
          notes: description || `CI/CD: ${payload.metadata?.commit || 'Unknown commit'}`,
        },
      });

      if (autoExecute) {
        // Execute the migration
        const migrationWithConnection = await prisma.migration.findUnique({
          where: { id: migration.id },
          include: { databaseConnection: true },
        });

        if (!migrationWithConnection) {
          throw new Error('Migration not found');
        }

        const result = await executeMigration(migrationWithConnection, false);

        if (result.success) {
          await prisma.migration.update({
            where: { id: migration.id },
            data: {
              status: 'EXECUTED',
              executedAt: new Date(),
            },
          });
        } else {
          await prisma.migration.update({
            where: { id: migration.id },
            data: {
              status: 'FAILED',
              executedAt: new Date(),
            },
          });
          throw new Error(`Migration execution failed: ${result.error}`);
        }
      }

      return NextResponse.json({
        success: true,
        migration: {
          id: migration.id,
          name: migration.name,
          status: migration.status,
          createdAt: migration.createdAt,
        },
      });

    } else if (payload.action === 'query') {
      // Handle query request
      const { query, description } = payload.data;

      if (!query) {
        return NextResponse.json({ error: 'Query is required' }, { status: 400 });
      }

      // Check if user has access to the connection
      const connection = await prisma.databaseConnection.findFirst({
        where: {
          id: payload.connectionId,
          OR: [
            { createdById: userId }, // User's own connection
            { team: { members: { some: { userId } } } }, // Team connection
          ],
        },
      });

      if (!connection) {
        return NextResponse.json({ error: 'Connection not found or access denied' }, { status: 404 });
      }

      // Execute the query
      const result = await DatabaseConnectionService.executeQuery(
        connection,
        query,
        payload.connectionId
      );

      return NextResponse.json({
        success: true,
        message: 'Query executed successfully',
        query,
        result: result,
      });

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Webhook error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid webhook payload', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}