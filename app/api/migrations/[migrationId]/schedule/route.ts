import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission, Permission } from "@/lib/permissions";
import { scheduleMigration } from "@/lib/migrations-scheduler";
import { headers } from "next/headers";

/**
 * POST /api/migrations/[migrationId]/schedule
 * Schedule a migration for execution
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
    const { teamId, databaseConnectionId, scheduledFor } = body;

    if (!teamId || !databaseConnectionId || !scheduledFor) {
      return Response.json(
        {
          error:
            "teamId, databaseConnectionId, and scheduledFor are required",
        },
        { status: 400 }
      );
    }

    // Check permission
    await requirePermission(
      session.user.id,
      teamId,
      Permission.SCHEDULE_MIGRATION
    );

    const scheduledForDate = new Date(scheduledFor);
    if (isNaN(scheduledForDate.getTime())) {
      return Response.json(
        { error: "Invalid scheduledFor date" },
        { status: 400 }
      );
    }

    // Schedule migration
    const scheduled = await scheduleMigration({
      migrationId,
      teamId,
      databaseConnectionId,
      scheduledFor: scheduledForDate,
      scheduledById: session.user.id,
    });

    return Response.json(
      {
        success: true,
        scheduled: {
          id: scheduled.id,
          migrationId: scheduled.migrationId,
          scheduledFor: scheduled.scheduledFor,
          status: scheduled.status,
        },
      },
      { status: 201 }
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

    console.error("Error scheduling migration:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
