import { prisma } from "@/lib/prisma";
import { DatabaseConnectionService } from "@/lib/database-connection";
import { Logger } from "@/lib/telemetry";

export interface DatabaseErrorInput {
  connectionId: string;
  operation: string;
  errorType: string;
  message: string;
  details?: string;
}

/**
 * Record a database error
 */
export async function recordDatabaseError(input: DatabaseErrorInput): Promise<void> {
  try {
    await prisma.databaseError.create({
      data: {
        connectionId: input.connectionId,
        operation: input.operation,
        errorType: input.errorType,
        message: input.message,
        details: input.details,
      },
    });

    // Update connection health status to unhealthy
    await updateConnectionHealthStatus(input.connectionId, "UNHEALTHY");

    Logger.getInstance().error("Database error recorded", undefined, {
      connectionId: input.connectionId,
      operation: input.operation,
      errorType: input.errorType,
      message: input.message,
    });
  } catch (error) {
    Logger.getInstance().error("Failed to record database error", error instanceof Error ? error : undefined, { input });
  }
}

/**
 * Update connection health status
 */
export async function updateConnectionHealthStatus(
  connectionId: string,
  status: "HEALTHY" | "UNHEALTHY" | "UNKNOWN"
): Promise<void> {
  try {
    await prisma.databaseConnection.update({
      where: { id: connectionId },
      data: {
        healthStatus: status,
        lastHealthCheck: new Date(),
      },
    });
  } catch (error) {
    Logger.getInstance().error("Failed to update connection health status", error instanceof Error ? error : undefined, {
      connectionId,
      status,
    });
  }
}

/**
 * Perform health check on a database connection
 */
export async function performHealthCheck(connectionId: string): Promise<{
  success: boolean;
  latency?: number;
  error?: string;
}> {
  try {
    const connection = await prisma.databaseConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new Error("Connection not found");
    }

    const testData = {
      type: connection.type,
      host: connection.host,
      port: connection.port || undefined,
      database: connection.database,
      username: connection.username,
      password: connection.password,
      ssl: connection.ssl,
      url: connection.url || undefined,
      connectionId: connection.id,
    };

    const result = await DatabaseConnectionService.testConnection(testData);

    // Update health status based on result
    const status = result.success ? "HEALTHY" : "UNHEALTHY";
    await updateConnectionHealthStatus(connectionId, status);

    if (!result.success && result.error) {
      // Record the error
      await recordDatabaseError({
        connectionId,
        operation: "health_check",
        errorType: "connection_failed",
        message: result.error,
      });
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Health check failed";

    await updateConnectionHealthStatus(connectionId, "UNHEALTHY");

    await recordDatabaseError({
      connectionId,
      operation: "health_check",
      errorType: "health_check_error",
      message: errorMessage,
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * Get database errors for a connection
 */
export async function getDatabaseErrors(
  connectionId: string,
  options?: {
    limit?: number;
    offset?: number;
    operation?: string;
    errorType?: string;
  }
) {
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  const where: any = { connectionId };

  if (options?.operation) {
    where.operation = options.operation;
  }

  if (options?.errorType) {
    where.errorType = options.errorType;
  }

  const [errors, total] = await Promise.all([
    prisma.databaseError.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.databaseError.count({ where }),
  ]);

  return {
    errors,
    total,
    hasMore: offset + limit < total,
  };
}

/**
 * Get connection health status
 */
export async function getConnectionHealthStatus(connectionId: string) {
  const connection = await prisma.databaseConnection.findUnique({
    where: { id: connectionId },
    select: {
      id: true,
      name: true,
      healthStatus: true,
      lastHealthCheck: true,
      _count: {
        select: {
          errors: {
            where: {
              occurredAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
              },
            },
          },
        },
      },
    },
  });

  if (!connection) {
    throw new Error("Connection not found");
  }

  return {
    id: connection.id,
    name: connection.name,
    healthStatus: connection.healthStatus,
    lastHealthCheck: connection.lastHealthCheck,
    recentErrorsCount: connection._count.errors,
  };
}

/**
 * Perform health checks for all active connections in a team
 */
export async function performTeamHealthChecks(teamId: string): Promise<void> {
  const connections = await prisma.databaseConnection.findMany({
    where: {
      teamId,
      isActive: true,
    },
    select: { id: true, name: true },
  });

  for (const connection of connections) {
    try {
      await performHealthCheck(connection.id);
      Logger.getInstance().info("Health check completed", {
        connectionId: connection.id,
        connectionName: connection.name,
      });
    } catch (error) {
      Logger.getInstance().error("Health check failed", error instanceof Error ? error : undefined, {
        connectionId: connection.id,
        connectionName: connection.name,
      });
    }
  }
}