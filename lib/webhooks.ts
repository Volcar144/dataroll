import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export type WebhookEvent =
  | "migration.created"
  | "migration.executed"
  | "migration.failed"
  | "migration.rolled_back"
  | "migration.approved"
  | "migration.rejected"
  | "team.member_invited"
  | "team.member_joined"
  | "team.member_removed"
  | "connection.created"
  | "connection.deleted"
  | "connection.tested";

export interface WebhookPayload {
  event: WebhookEvent;
  teamId: string;
  timestamp: string;
  data: Record<string, any>;
}

/**
 * Trigger a webhook event
 */
export async function triggerWebhook(
  teamId: string,
  event: WebhookEvent,
  data: Record<string, any>
): Promise<void> {
  const webhooks = await prisma.webhook.findMany({
    where: {
      teamId,
      isActive: true,
      events: {
        hasSome: [event],
      },
    },
  });

  for (const webhook of webhooks) {
    // Create webhook delivery
    const payload: WebhookPayload = {
      event,
      teamId,
      timestamp: new Date().toISOString(),
      data,
    };

    // Generate signature
    const signature = generateWebhookSignature(
      JSON.stringify(payload),
      webhook.secret
    );

    // Queue delivery
    try {
      const delivery = await prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          payload: JSON.stringify(payload),
          signature,
          status: "PENDING",
        },
      });

      // Send webhook asynchronously
      sendWebhook(webhook.url, payload, signature).catch((error) => {
        console.error(`Failed to send webhook: ${error}`);
        // Mark as failed
        prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: { status: "FAILED", error: error.message },
        }).catch(console.error);
      });
    } catch (error) {
      console.error("Failed to queue webhook delivery:", error);
    }
  }
}

/**
 * Send webhook to URL
 */
async function sendWebhook(
  url: string,
  payload: WebhookPayload,
  signature: string
): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Signature": signature,
      "X-Webhook-Event": payload.event,
      "User-Agent": "DataRoll-Webhook/1.0",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `Webhook delivery failed with status ${response.status}`
    );
  }
}

/**
 * Generate webhook signature
 */
export function generateWebhookSignature(
  payload: string,
  secret: string
): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateWebhookSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Get webhook details
 */
export async function getWebhook(webhookId: string) {
  return prisma.webhook.findUnique({
    where: { id: webhookId },
    select: {
      id: true,
      name: true,
      url: true,
      events: true,
      isActive: true,
      createdAt: true,
    },
  });
}

/**
 * Get webhook delivery history
 */
export async function getWebhookDeliveries(
  webhookId: string,
  options?: {
    limit?: number;
    offset?: number;
    status?: "PENDING" | "DELIVERED" | "FAILED";
  }
) {
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  const where: any = { webhookId };

  if (options?.status) {
    where.status = options.status;
  }

  const [deliveries, total] = await Promise.all([
    prisma.webhookDelivery.findMany({
      where,
      select: {
        id: true,
        status: true,
        error: true,
        createdAt: true,
        deliveredAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    }),
    prisma.webhookDelivery.count({ where }),
  ]);

  return {
    deliveries,
    total,
    hasMore: offset + limit < total,
  };
}

/**
 * Retry webhook delivery
 */
export async function retryWebhookDelivery(
  deliveryId: string,
  webhook: any
): Promise<void> {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
  });

  if (!delivery) {
    throw new Error("Delivery not found");
  }

  const payload = JSON.parse(delivery.payload);

  try {
    await sendWebhook(webhook.url, payload, delivery.signature);

    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: "DELIVERED",
        deliveredAt: new Date(),
        error: null,
      },
    });
  } catch (error) {
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    throw error;
  }
}
