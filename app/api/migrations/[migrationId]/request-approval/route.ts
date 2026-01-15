import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission, Permission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { headers } from "next/headers";

/**
 * POST /api/migrations/[migrationId]/request-approval
 * Request approval for a migration
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ migrationId: string }> }
) {
  const { migrationId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { teamId, reason } = body;

    if (!teamId) {
      return Response.json({ error: "teamId is required" }, { status: 400 });
    }

    // Check permission
    await requirePermission(
      session.user.id,
      teamId,
      Permission.SCHEDULE_MIGRATION
    );

    // Get migration
    const migration = await prisma.migration.findUnique({
      where: { id: migrationId },
      include: { databaseConnection: true },
    });

    if (!migration) {
      return Response.json({ error: "Migration not found" }, { status: 404 });
    }

    if (migration.teamId !== teamId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if connection requires approval
    if (!migration.databaseConnection.requiresApproval) {
      return Response.json(
        { error: "This connection does not require approval" },
        { status: 400 }
      );
    }

    // Check if approval already exists
    const existingApproval = await prisma.migrationApproval.findFirst({
      where: {
        migrationId,
        status: "PENDING",
      },
    });

    if (existingApproval) {
      return Response.json(
        { error: "Approval request already exists" },
        { status: 409 }
      );
    }

    // Create approval request
    const approval = await prisma.migrationApproval.create({
      data: {
        migrationId,
        requestedById: session.user.id,
        status: "PENDING",
      },
    });

    // Create audit log
    await createAuditLog({
      action: "MIGRATION_CREATED",
      resource: "migration",
      resourceId: migrationId,
      details: {
        reason,
        requiresApproval: true,
      },
      teamId,
      userId: session.user.id,
    });

    return Response.json(
      {
        success: true,
        approval: {
          id: approval.id,
          status: approval.status,
          requestedAt: approval.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("does not have")) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Error requesting approval:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
