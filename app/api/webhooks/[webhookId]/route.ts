import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission, Permission } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";
import { headers } from "next/headers";

/**
 * PATCH /api/webhooks/[webhookId]
 * Update a webhook
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ webhookId: string }> }
) {
  const { webhookId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) {
      return Response.json({ error: "Webhook not found" }, { status: 404 });
    }

    // Check permission
    await requirePermission(
      session.user.id,
      webhook.teamId,
      Permission.UPDATE_WEBHOOK
    );

    const body = await request.json();
    const { name, url, events, isActive } = body;

    if (url) {
      try {
        new URL(url);
      } catch {
        return Response.json(
          { error: "Invalid webhook URL" },
          { status: 400 }
        );
      }
    }

    if (events && Array.isArray(events) && events.length === 0) {
      return Response.json(
        { error: "At least one event must be selected" },
        { status: 400 }
      );
    }

    // Update webhook
    const updated = await prisma.webhook.update({
      where: { id: webhookId },
      data: {
        ...(name && { name }),
        ...(url && { url }),
        ...(events && { events }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    // Create audit log
    await createAuditLog({
      action: "CONNECTION_UPDATED",
      resource: "webhook",
      resourceId: webhookId,
      details: {
        changes: {
          ...(name && { name }),
          ...(url && { url }),
          ...(events && { events }),
          ...(isActive !== undefined && { isActive }),
        },
      },
      teamId: webhook.teamId,
      userId: session.user.id,
    });

    return Response.json(
      {
        success: true,
        webhook: {
          id: updated.id,
          name: updated.name,
          url: updated.url,
          events: updated.events,
          isActive: updated.isActive,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("does not have")) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Error updating webhook:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/webhooks/[webhookId]
 * Delete a webhook
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ webhookId: string }> }
) {
  const { webhookId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) {
      return Response.json({ error: "Webhook not found" }, { status: 404 });
    }

    // Check permission
    await requirePermission(
      session.user.id,
      webhook.teamId,
      Permission.DELETE_WEBHOOK
    );

    // Delete webhook (cascade will delete deliveries)
    await prisma.webhook.delete({
      where: { id: webhookId },
    });

    // Create audit log
    await createAuditLog({
      action: "CONNECTION_DELETED",
      resource: "webhook",
      resourceId: webhookId,
      teamId: webhook.teamId,
      userId: session.user.id,
    });

    return Response.json(
      {
        success: true,
        message: "Webhook deleted",
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("does not have")) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Error deleting webhook:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
