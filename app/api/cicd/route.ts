import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { executeMigration } from '@/lib/migration-execution';import { DatabaseConnectionService } from '@/lib/database-connection';
const MigrationRequestSchema = z.object({
  connectionId: z.string(),
  name: z.string(),
  type: z.enum(['PRISMA', 'DRIZZLE', 'RAW_SQL']),
  content: z.string(),
  description: z.string().optional(),
  autoExecute: z.boolean().default(true),
});

const QueryRequestSchema = z.object({
  connectionId: z.string(),
  query: z.string(),
  description: z.string().optional(),
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
    const body = await request.json();
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'migrate';

    if (action === 'migrate') {
      // Handle migration request
      const validatedData = MigrationRequestSchema.parse(body);

      // Check if user has access to the connection
      const connection = await prisma.databaseConnection.findFirst({
        where: {
          id: validatedData.connectionId,
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
          name: validatedData.name,
          version: Date.now().toString(),
          type: validatedData.type,
          filePath: `ci/${validatedData.name}.sql`,
          content: validatedData.content,
          status: 'PENDING',
          teamId: connection.teamId,
          databaseConnectionId: validatedData.connectionId,
          createdById: userId,
          notes: validatedData.description,
        },
      });

      if (validatedData.autoExecute) {
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

    } else if (action === 'query') {
      // Handle query request
      const validatedData = QueryRequestSchema.parse(body);

      // Check if user has access to the connection
      const connection = await prisma.databaseConnection.findFirst({
        where: {
          id: validatedData.connectionId,
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
        validatedData.query,
        validatedData.connectionId
      );

      return NextResponse.json({
        success: true,
        message: 'Query executed successfully',
        query: validatedData.query,
        result: result,
      });

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('CI/CD API error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}