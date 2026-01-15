import { prisma } from '@/lib/prisma';
import { DatabaseConnectionService } from '@/lib/database-connection';

export interface MigrationExecutionResult {
  success: boolean;
  duration: number;
  error?: string;
  changes?: string[];
}

/**
 * Execute a migration
 */
export async function executeMigration(
  migration: any,
  dryRun: boolean = false
): Promise<MigrationExecutionResult> {
  const startTime = Date.now();

  try {
    const connectionService = new DatabaseConnectionService();

    switch (migration.type) {
      case 'PRISMA':
        return await executePrismaMigration(migration, connectionService, dryRun);

      case 'DRIZZLE':
        return await executeDrizzleMigration(migration, connectionService, dryRun);

      case 'RAW_SQL':
        return await executeRawSqlMigration(migration, connectionService, dryRun);

      default:
        throw new Error(`Unsupported migration type: ${migration.type}`);
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function executePrismaMigration(
  migration: any,
  connectionService: DatabaseConnectionService,
  dryRun: boolean
): Promise<MigrationExecutionResult> {
  const startTime = Date.now();

  try {
    // Get database connection
    const connection = await connectionService.getConnection(migration.databaseConnectionId);

    if (dryRun) {
      // For dry run, parse the migration and show what would be executed
      const changes = parsePrismaMigration(migration.content);
      const duration = Date.now() - startTime;

      return {
        success: true,
        duration,
        changes,
      };
    }

    // Execute the migration
    const client = await connectionService.createClient(connection);
    await client.query(migration.content);
    await connectionService.closeClient(client);

    const duration = Date.now() - startTime;

    return {
      success: true,
      duration,
      changes: ['Migration executed successfully'],
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      duration,
      error: error instanceof Error ? error.message : 'Failed to execute Prisma migration',
    };
  }
}

async function executeDrizzleMigration(
  migration: any,
  connectionService: DatabaseConnectionService,
  dryRun: boolean
): Promise<MigrationExecutionResult> {
  const startTime = Date.now();

  try {
    // Get database connection
    const connection = await connectionService.getConnection(migration.databaseConnectionId);

    if (dryRun) {
      // For dry run, parse the migration and show what would be executed
      const changes = parseDrizzleMigration(migration.content);
      const duration = Date.now() - startTime;

      return {
        success: true,
        duration,
        changes,
      };
    }

    // Execute the migration
    const client = await connectionService.createClient(connection);
    await client.query(migration.content);
    await connectionService.closeClient(client);

    const duration = Date.now() - startTime;

    return {
      success: true,
      duration,
      changes: ['Migration executed successfully'],
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      duration,
      error: error instanceof Error ? error.message : 'Failed to execute Drizzle migration',
    };
  }
}

async function executeRawSqlMigration(
  migration: any,
  connectionService: DatabaseConnectionService,
  dryRun: boolean
): Promise<MigrationExecutionResult> {
  const startTime = Date.now();

  try {
    // Get database connection
    const connection = await connectionService.getConnection(migration.databaseConnectionId);

    if (dryRun) {
      // For dry run, split SQL statements and show preview
      const statements = migration.content
        .split(';')
        .map((stmt: string) => stmt.trim())
        .filter((stmt: string) => stmt.length > 0);

      const duration = Date.now() - startTime;

      return {
        success: true,
        duration,
        changes: statements.slice(0, 5).map((stmt: string) => stmt.substring(0, 100) + (stmt.length > 100 ? '...' : '')),
      };
    }

    // Execute the migration
    const client = await connectionService.createClient(connection);
    await client.query(migration.content);
    await connectionService.closeClient(client);

    const duration = Date.now() - startTime;

    return {
      success: true,
      duration,
      changes: ['SQL migration executed successfully'],
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      duration,
      error: error instanceof Error ? error.message : 'Failed to execute SQL migration',
    };
  }
}

function parsePrismaMigration(content: string): string[] {
  // Simple parsing for Prisma migrations
  const lines = content.split('\n');
  const changes: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('import')) {
      if (trimmed.includes('model ') || trimmed.includes('enum ') || trimmed.includes('@@')) {
        changes.push(trimmed);
      }
    }
  }

  return changes.length > 0 ? changes : ['Migration changes preview not available'];
}

function parseDrizzleMigration(content: string): string[] {
  // Simple parsing for Drizzle migrations
  const lines = content.split('\n');
  const changes: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('import')) {
      if (trimmed.includes('table(') || trimmed.includes('sql`') || trimmed.includes('db.')) {
        changes.push(trimmed);
      }
    }
  }

  return changes.length > 0 ? changes : ['Migration changes preview not available'];
}