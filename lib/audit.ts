import { prisma } from "@/lib/prisma";
import { AuditAction } from "@prisma/client";

export type IAuditAction = AuditAction;

export interface AuditLogInput {
  action: AuditAction;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  teamId: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId,
        details: input.details ? JSON.stringify(input.details) : null,
        teamId: input.teamId,
        userId: input.userId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  } catch (error) {
    // Log error but don't throw - audit logging shouldn't break the main operation
    const logger = (await import('./logger')).default;
    logger.error({ msg: "Failed to create audit log", error });
    const { captureServerException } = await import('./posthog-server');
    await captureServerException(error instanceof Error ? error : new Error('Unknown error in audit log'), input.userId, { action: input.action, resource: input.resource, teamId: input.teamId });
    if (typeof console !== 'undefined') {
      // Fallback for environments where logger may not print
      console.error("Failed to create audit log:", error);
    }
  }
}

/**
 * Get audit logs for a team
 */
export async function getTeamAuditLogs(
  teamId: string,
  options?: {
    limit?: number;
    offset?: number;
    action?: AuditAction;
    userId?: string;
    resource?: string;
  }
) {
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  const where: any = { teamId };

  if (options?.action) {
    where.action = options.action;
  }

  if (options?.userId) {
    where.userId = options.userId;
  }

  if (options?.resource) {
    where.resource = options.resource;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    hasMore: offset + limit < total,
  };
}

/**
 * Get audit logs for a specific resource
 */
export async function getResourceAuditLogs(
  teamId: string,
  resource: string,
  resourceId: string
) {
  return prisma.auditLog.findMany({
    where: {
      teamId,
      resource,
      resourceId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Export audit logs as JSON
 */
export async function exportAuditLogs(
  teamId: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
    action?: AuditAction;
    userId?: string;
  }
) {
  const where: any = { teamId };

  if (options?.startDate) {
    where.createdAt = {
      ...where.createdAt,
      gte: options.startDate,
    };
  }

  if (options?.endDate) {
    where.createdAt = {
      ...where.createdAt,
      lte: options.endDate,
    };
  }

  if (options?.action) {
    where.action = options.action;
  }

  if (options?.userId) {
    where.userId = options.userId;
  }

  const logs = await prisma.auditLog.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return logs;
}
