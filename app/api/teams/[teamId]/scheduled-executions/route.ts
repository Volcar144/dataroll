import { auth } from "@/lib/auth";
import { requirePermission, Permission } from "@/lib/permissions";
import {
  getScheduledExecutions,
  cancelScheduledExecution,
} from "@/lib/migrations-scheduler";
import { headers } from "next/headers";

/**
 * GET /api/teams/[teamId]/scheduled-executions
 * Get scheduled executions for a team
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check permission
    await requirePermission(
      session.user.id,
      teamId,
      Permission.VIEW_MIGRATION_DETAILS
    );

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const status = url.searchParams.get("status") as
      | "PENDING"
      | "SUCCESS"
      | "FAILURE"
      | null;

    const result = await getScheduledExecutions(teamId, {
      limit,
      offset,
      ...(status && { status }),
    });

    return Response.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes("does not have")) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Error fetching scheduled executions:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
