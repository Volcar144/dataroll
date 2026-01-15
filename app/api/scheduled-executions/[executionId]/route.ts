import { auth } from "@/lib/auth";
import { requirePermission, Permission } from "@/lib/permissions";
import { cancelScheduledExecution } from "@/lib/migrations-scheduler";
import { headers } from "next/headers";

/**
 * DELETE /api/scheduled-executions/[executionId]
 * Cancel a scheduled execution
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ executionId: string }> }
) {
  const { executionId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { teamId } = body;

    if (!teamId) {
      return Response.json({ error: "teamId is required" }, { status: 400 });
    }

    // Check permission
    await requirePermission(
      session.user.id,
      teamId,
      Permission.SCHEDULE_MIGRATION
    );

    await cancelScheduledExecution(executionId, teamId, session.user.id);

    return Response.json(
      {
        success: true,
        message: "Scheduled execution canceled",
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("does not have")) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
      if (error.message.includes("not found")) {
        return Response.json({ error: error.message }, { status: 404 });
      }
    }

    console.error("Error canceling scheduled execution:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
