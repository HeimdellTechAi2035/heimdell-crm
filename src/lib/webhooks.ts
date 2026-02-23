import { prisma } from "./db";

interface WebhookPayload {
  event: string;
  lead_id?: string;
  timestamp_utc: string;
  data: Record<string, unknown>;
}

export async function triggerWebhooks(
  eventType: string,
  payload: WebhookPayload
): Promise<void> {
  try {
    // Find active webhooks subscribed to this event
    const webhooks = await prisma.webhookEvent.findMany({
      where: {
        status: "active",
        event_type: { contains: eventType },
      },
    });

    if (webhooks.length === 0) return;

    // Send to each webhook URL
    const webhookPromises = webhooks.map(async (webhook) => {
      try {
        const metadata = JSON.parse(webhook.payload);
        const url = metadata.url;

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Heimdell-Event": eventType,
            "X-Heimdell-Webhook-Id": webhook.id,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          console.error(`Webhook failed: ${url} - ${response.status}`);
          // Increment retry count
          await prisma.webhookEvent.update({
            where: { id: webhook.id },
            data: { retries: webhook.retries + 1 },
          });
        }
      } catch (error) {
        console.error(`Webhook error: ${error}`);
        await prisma.webhookEvent.update({
          where: { id: webhook.id },
          data: { retries: webhook.retries + 1 },
        });
      }
    });

    await Promise.all(webhookPromises);
  } catch (error) {
    console.error("Error triggering webhooks:", error);
  }
}

// Event-specific webhook triggers
export async function notifyLeadReplied(leadId: string, lead: any) {
  await triggerWebhooks("lead.replied", {
    event: "lead.replied",
    lead_id: leadId,
    timestamp_utc: new Date().toISOString(),
    data: {
      company: lead.company,
      key_decision_maker: lead.key_decision_maker,
      status: lead.status,
      emails: JSON.parse(lead.emails),
      replied_at: lead.replied_at_utc,
      message: "🎉 Lead replied! Immediate response recommended.",
      priority: "CRITICAL",
    },
  });
}

export async function notifyLeadQualified(leadId: string, lead: any) {
  await triggerWebhooks("lead.qualified", {
    event: "lead.qualified",
    lead_id: leadId,
    timestamp_utc: new Date().toISOString(),
    data: {
      company: lead.company,
      key_decision_maker: lead.key_decision_maker,
      role: lead.role,
      status: lead.status,
      message: "✅ Lead qualified! Schedule meeting or demo.",
      priority: "HIGH",
    },
  });
}

export async function notifyLeadStalled(leadId: string, lead: any) {
  await triggerWebhooks("lead.stalled", {
    event: "lead.stalled",
    lead_id: leadId,
    timestamp_utc: new Date().toISOString(),
    data: {
      company: lead.company,
      key_decision_maker: lead.key_decision_maker,
      days_since_last_action: Math.floor(
        (Date.now() - new Date(lead.last_action_utc).getTime()) /
          (1000 * 60 * 60 * 24)
      ),
      message: "⚠️ Lead stalled. Consider re-engagement or archiving.",
      priority: "MEDIUM",
    },
  });
}

export async function notifyStatusChanged(
  leadId: string,
  fromStatus: string,
  toStatus: string,
  lead: any
) {
  await triggerWebhooks("lead.status_changed", {
    event: "lead.status_changed",
    lead_id: leadId,
    timestamp_utc: new Date().toISOString(),
    data: {
      company: lead.company,
      from_status: fromStatus,
      to_status: toStatus,
      next_action: lead.next_action,
      next_action_due: lead.next_action_due_utc,
      message: `Status changed: ${fromStatus} → ${toStatus}`,
      priority: "LOW",
    },
  });
}

export async function notifyLeadCreated(leadId: string, lead: any) {
  await triggerWebhooks("lead.created", {
    event: "lead.created",
    lead_id: leadId,
    timestamp_utc: new Date().toISOString(),
    data: {
      company: lead.company,
      key_decision_maker: lead.key_decision_maker,
      role: lead.role,
      status: lead.status,
      owner: lead.owner,
      message: "🆕 New lead created and entered pipeline.",
      priority: "LOW",
    },
  });
}

export async function notifyRateLimitReached() {
  await triggerWebhooks("rate_limit.reached", {
    event: "rate_limit.reached",
    timestamp_utc: new Date().toISOString(),
    data: {
      message: "🚨 Daily send limit reached. Email sending paused until reset.",
      priority: "HIGH",
      reset_time: "00:00 UTC",
    },
  });
}
