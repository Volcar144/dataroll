import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission, Permission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { headers } from "next/headers";

/**
 * POST /api/approvals/[approvalId]/approve
 * Approve a migration
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ approvalId: string }> }
) {
  const { approvalId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { teamId, comments } = body;

    if (!teamId) {
      return Response.json({ error: "teamId is required" }, { status: 400 });
    }

    // Check permission
    await requirePermission(
      session.user.id,
      teamId,
      Permission.APPROVE_MIGRATION
    );

    const approval = await prisma.migrationApproval.findUnique({
      where: { id: approvalId },
      include: { migration: true },
    });

    if (!approval) {
      return Response.json({ error: "Approval not found" }, { status: 404 });
    }

    if (approval.migration.teamId !== teamId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    if (approval.status !== "PENDING") {
      return Response.json(
        { error: `Approval has already been ${approval.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Update approval
    const updatedApproval = await prisma.migrationApproval.update({
      where: { id: approvalId },
      data: {
        status: "APPROVED",
        approvedById: session.user.id,
        comments,
        approvedAt: new Date(),
      },
    });

    // Create audit log
    await createAuditLog({
      action: "MIGRATION_EXECUTED",
      resource: "migration",
      resourceId: approval.migrationId,
      details: {
        approverComments: comments,
        approved: true,
      },
      teamId,
      userId: session.user.id,
    });

    return Response.json(
      {
        success: true,
        message: "Migration approved",
        approval: {
          id: updatedApproval.id,
          status: updatedApproval.status,
          approvedAt: updatedApproval.approvedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("does not have")) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Error approving migration:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
