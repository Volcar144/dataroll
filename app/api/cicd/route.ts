import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { executeMigration } from '@/lib/migration-execution';
import { DatabaseConnectionService } from '@/lib/database-connection';
import { createAuditLog } from '@/lib/audit';
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

      // Audit log for CI/CD migration creation
      await createAuditLog({
        action: 'MIGRATION_CREATED',
        resource: 'migration',
        resourceId: migration.id,
        details: { name: validatedData.name, type: validatedData.type, via: 'CI/CD API' },
        teamId: connection.teamId,
        userId,
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
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
          
          await createAuditLog({
            action: 'MIGRATION_EXECUTED',
            resource: 'migration',
            resourceId: migration.id,
            details: { name: validatedData.name, via: 'CI/CD API', autoExecute: true },
            teamId: connection.teamId,
            userId,
            ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
          });
        } else {
          await prisma.migration.update({
            where: { id: migration.id },
            data: {
              status: 'FAILED',
              executedAt: new Date(),
            },
          });
          
          await createAuditLog({
            action: 'MIGRATION_EXECUTED',
            resource: 'migration',
            resourceId: migration.id,
            details: { name: validatedData.name, via: 'CI/CD API', autoExecute: true, failed: true, error: result.error },
            teamId: connection.teamId,
            userId,
            ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
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

      // Audit log for query execution via CI/CD
      await createAuditLog({
        action: 'CONNECTION_UPDATED',
        resource: 'database_connection',
        resourceId: connection.id,
        details: { via: 'CI/CD API', queryLength: validatedData.query.length, action: 'query_execution' },
        teamId: connection.teamId,
        userId,
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });

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
    const logger = await import('@/lib/logger');
    const { captureServerException } = await import('@/lib/posthog-server');
    
    logger.default.error('CI/CD API error:');
    logger.default.error(error);
    
    if (error instanceof Error) {
      await captureServerException(error, 'api-cicd', {
        context: 'CI/CD API',
        endpoint: '/api/cicd',
        method: request.method,
      });
    }
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ 
      error: 'Internal server error', 
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}