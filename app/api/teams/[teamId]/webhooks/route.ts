import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission, Permission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { headers } from "next/headers";
import crypto from "crypto";

/**
 * POST /api/teams/[teamId]/webhooks
 * Create a new webhook
 */
export async function POST(
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
    await requirePermission(session.user.id, teamId, Permission.CREATE_WEBHOOK);

    const body = await request.json();
    const { name, url, events } = body;

    if (!name || !url || !events || !Array.isArray(events)) {
      return Response.json(
        { error: "name, url, and events array are required" },
        { status: 400 }
      );
    }

    if (events.length === 0) {
      return Response.json(
        { error: "At least one event must be selected" },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return Response.json(
        { error: "Invalid webhook URL" },
        { status: 400 }
      );
    }

    // Generate secret
    const secret = crypto.randomBytes(32).toString("hex");

    // Create webhook
    const webhook = await prisma.webhook.create({
      data: {
        teamId,
        name,
        url,
        secret,
        events,
        createdById: session.user.id,
      },
    });

    // Create audit log
    await createAuditLog({
      action: "CONNECTION_CREATED",
      resource: "webhook",
      resourceId: webhook.id,
      details: {
        name,
        url,
        events,
      },
      teamId,
      userId: session.user.id,
    });

    return Response.json(
      {
        success: true,
        webhook: {
          id: webhook.id,
          name: webhook.name,
          url: webhook.url,
          events: webhook.events,
          secret: webhook.secret, // Only returned on creation
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("does not have")) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Error creating webhook:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/teams/[teamId]/webhooks
 * Get all webhooks for a team
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
    await requirePermission(session.user.id, teamId, Permission.CREATE_WEBHOOK);

    const webhooks = await prisma.webhook.findMany({
      where: { teamId },
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        createdAt: true,
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return Response.json({ webhooks });
  } catch (error) {
    if (error instanceof Error && error.message.includes("does not have")) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Error fetching webhooks:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
