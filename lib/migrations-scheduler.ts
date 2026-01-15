import { prisma } from "@/lib/prisma";
import { triggerWebhook } from "@/lib/webhooks";
import { createAuditLog } from "@/lib/audit";
import { executeMigration } from "@/lib/migration-execution";

export interface ScheduleMigrationOptions {
  migrationId: string;
  teamId: string;
  databaseConnectionId: string;
  scheduledFor: Date;
  scheduledById: string;
}

/**
 * Schedule a migration for execution at a specific time
 */
export async function scheduleMigration(
  options: ScheduleMigrationOptions
): Promise<any> {
  const migration = await prisma.migration.findUnique({
    where: { id: options.migrationId },
    include: { databaseConnection: true },
  });

  if (!migration) {
    throw new Error("Migration not found");
  }

  if (migration.teamId !== options.teamId) {
    throw new Error("Migration does not belong to this team");
  }

  if (migration.databaseConnectionId !== options.databaseConnectionId) {
    throw new Error(
      "Database connection does not match migration configuration"
    );
  }

  // Validate scheduled time is in the future
  if (options.scheduledFor <= new Date()) {
    throw new Error("Scheduled time must be in the future");
  }

  // Create scheduled execution
  const scheduled = await prisma.scheduledExecution.create({
    data: {
      migrationId: options.migrationId,
      teamId: options.teamId,
      databaseConnectionId: options.databaseConnectionId,
      scheduledById: options.scheduledById,
      scheduledFor: options.scheduledFor,
    },
  });

  // Create audit log
  await createAuditLog({
    action: "MIGRATION_CREATED",
    resource: "migration",
    resourceId: options.migrationId,
    details: {
      scheduledFor: options.scheduledFor.toISOString(),
    },
    teamId: options.teamId,
    userId: options.scheduledById,
  });

  // Trigger webhook
  await triggerWebhook(options.teamId, "migration.created", {
    migration: {
      id: migration.id,
      name: migration.name,
      version: migration.version,
    },
    scheduled: true,
    scheduledFor: options.scheduledFor.toISOString(),
  });

  return scheduled;
}

/**
 * Get scheduled executions for a team
 */
export async function getScheduledExecutions(
  teamId: string,
  options?: {
    limit?: number;
    offset?: number;
    status?: "PENDING" | "SUCCESS" | "FAILURE";
  }
) {
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  const where: any = {
    teamId,
    ...(options?.status && { status: options.status }),
  };

  const [executions, total] = await Promise.all([
    prisma.scheduledExecution.findMany({
      where,
      include: {
        migration: {
          select: {
            id: true,
            name: true,
            version: true,
          },
        },
        databaseConnection: {
          select: {
            id: true,
            name: true,
          },
        },
        scheduledBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        scheduledFor: "asc",
      },
      take: limit,
      skip: offset,
    }),
    prisma.scheduledExecution.count({ where }),
  ]);

  return {
    executions,
    total,
    hasMore: offset + limit < total,
  };
}

/**
 * Cancel a scheduled execution
 */
export async function cancelScheduledExecution(
  executionId: string,
  teamId: string,
  userId: string
): Promise<void> {
  const execution = await prisma.scheduledExecution.findUnique({
    where: { id: executionId },
  });

  if (!execution) {
    throw new Error("Scheduled execution not found");
  }

  if (execution.teamId !== teamId) {
    throw new Error("Scheduled execution does not belong to this team");
  }

  // Can only cancel pending executions
  if (execution.status !== "PENDING") {
    throw new Error(
      `Cannot cancel ${execution.status.toLowerCase()} execution`
    );
  }

  // Delete the scheduled execution
  await prisma.scheduledExecution.delete({
    where: { id: executionId },
  });

  // Create audit log
  await createAuditLog({
    action: "MIGRATION_CREATED",
    resource: "migration",
    resourceId: execution.migrationId,
    teamId,
    userId,
  });
}

/**
 * Process pending scheduled executions (called by a cron job)
 */
export async function processPendingScheduledExecutions(): Promise<void> {
  const now = new Date();

  const pendingExecutions = await prisma.scheduledExecution.findMany({
    where: {
      status: "PENDING",
      scheduledFor: {
        lte: now,
      },
    },
    include: {
      migration: true,
      databaseConnection: true,
    },
  });

  for (const execution of pendingExecutions) {
    try {
      // Execute migration
      const result = await executeMigration(execution.migration, false);

      if (result.success) {
        await prisma.scheduledExecution.update({
          where: { id: execution.id },
          data: {
            status: "SUCCESS",
            executedAt: new Date(),
          },
        });

        // Create audit log
        await createAuditLog({
          userId: execution.scheduledById,
          teamId: execution.teamId,
          action: "MIGRATION_EXECUTED",
          resource: "migration",
          resourceId: execution.migrationId,
          details: {
            scheduledExecutionId: execution.id,
            duration: result.duration,
            changes: result.changes,
          },
        });
      } else {
        await prisma.scheduledExecution.update({
          where: { id: execution.id },
          data: {
            status: "FAILURE",
            executedAt: new Date(),
          },
        });

        // Create audit log for failure
        await createAuditLog({
          userId: execution.scheduledById,
          teamId: execution.teamId,
          action: "MIGRATION_FAILED",
          resource: "migration",
          resourceId: execution.migrationId,
          details: {
            scheduledExecutionId: execution.id,
            error: result.error,
            duration: result.duration,
          },
        });
      }

      // Trigger webhook
      await triggerWebhook(
        execution.teamId,
        "migration.executed",
        {
          migration: {
            id: execution.migration.id,
            name: execution.migration.name,
          },
          scheduledExecution: execution.id,
        }
      );
    } catch (error) {
      console.error(`Failed to process scheduled execution ${execution.id}:`, error);

      // Mark as failure
      await prisma.scheduledExecution.update({
        where: { id: execution.id },
        data: {
          status: "FAILURE",
        },
      });

      // Trigger failure webhook
      await triggerWebhook(
        execution.teamId,
        "migration.failed",
        {
          migration: {
            id: execution.migration.id,
            name: execution.migration.name,
          },
          error: error instanceof Error ? error.message : "Unknown error",
        }
      );
    }
  }
}
