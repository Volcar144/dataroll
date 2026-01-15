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
    switch (migration.type) {
      case 'PRISMA':
        return await executePrismaMigration(migration, dryRun);

      case 'DRIZZLE':
        return await executeDrizzleMigration(migration, dryRun);

      case 'RAW_SQL':
        return await executeRawSqlMigration(migration, dryRun);

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
  dryRun: boolean
): Promise<MigrationExecutionResult> {
  const startTime = Date.now();

  try {
    if (dryRun) {
      const duration = Date.now() - startTime;
      return {
        success: true,
        duration,
        changes: [`Would execute Prisma migration: ${migration.name}`],
      };
    }

    const result = await DatabaseConnectionService.executeQuery(
      migration.databaseConnection,
      migration.content,
      migration.databaseConnectionId
    );

    const duration = Date.now() - startTime;

    if (result.success) {
      return {
        success: true,
        duration,
        changes: result.changes || [`Migration executed successfully`],
      };
    } else {
      return {
        success: false,
        duration,
        error: result.error,
      };
    }
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
  dryRun: boolean
): Promise<MigrationExecutionResult> {
  const startTime = Date.now();

  try {
    if (dryRun) {
      const duration = Date.now() - startTime;
      return {
        success: true,
        duration,
        changes: [`Would execute Drizzle migration: ${migration.name}`],
      };
    }

    const result = await DatabaseConnectionService.executeQuery(
      migration.databaseConnection,
      migration.content,
      migration.databaseConnectionId
    );

    const duration = Date.now() - startTime;

    if (result.success) {
      return {
        success: true,
        duration,
        changes: result.changes || [`Migration executed successfully`],
      };
    } else {
      return {
        success: false,
        duration,
        error: result.error,
      };
    }
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
  dryRun: boolean
): Promise<MigrationExecutionResult> {
  const startTime = Date.now();

  try {
    if (dryRun) {
      const duration = Date.now() - startTime;
      return {
        success: true,
        duration,
        changes: [`Would execute SQL migration: ${migration.name}`],
      };
    }

    const result = await DatabaseConnectionService.executeQuery(
      migration.databaseConnection,
      migration.content,
      migration.databaseConnectionId
    );

    const duration = Date.now() - startTime;

    if (result.success) {
      return {
        success: true,
        duration,
        changes: result.changes || [`Migration executed successfully`],
      };
    } else {
      return {
        success: false,
        duration,
        error: result.error,
      };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      duration,
      error: error instanceof Error ? error.message : 'Failed to execute raw SQL migration',
    };
  }
}