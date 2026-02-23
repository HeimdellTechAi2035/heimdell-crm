import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

// ─── POST /api/agent/webhooks/subscribe ────────────────────
// OpenClaw subscribes to real-time events
export const POST = withAuth(async (request: NextRequest, { actor }) => {
  const body = await request.json();

  const { url, events, description } = body;

  if (!url || !events || !Array.isArray(events)) {
    return NextResponse.json(
      { error: "Missing required fields: url, events (array)" },
      { status: 400 }
    );
  }

  // Valid event types
  const validEvents = [
    "lead.replied",
    "lead.qualified",
    "lead.status_changed",
    "lead.created",
    "lead.stalled",
    "email.bounced",
    "email.opened",
    "rate_limit.reached",
  ];

  const invalidEvents = events.filter((e: string) => !validEvents.includes(e));
  if (invalidEvents.length > 0) {
    return NextResponse.json(
      {
        error: "Invalid event types",
        invalid: invalidEvents,
        valid_options: validEvents,
      },
      { status: 400 }
    );
  }

  // Store webhook subscription
  const webhook = await prisma.webhookEvent.create({
    data: {
      id: uuidv4(),
      event_type: events.join(","),
      payload: JSON.stringify({ url, description, actor }),
      status: "active",
      retries: 0,
      created_at: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    webhook_id: webhook.id,
    subscribed_events: events,
    webhook_url: url,
    message: "Webhook subscription active. You will receive events in real-time.",
  });
});

// ─── GET /api/agent/webhooks/subscribe ─────────────────────
// List active webhook subscriptions
export const GET = withAuth(async (request: NextRequest, { actor }) => {
  const webhooks = await prisma.webhookEvent.findMany({
    where: { status: "active" },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json({
    webhooks: webhooks.map((w) => ({
      id: w.id,
      events: w.event_type.split(","),
      metadata: JSON.parse(w.payload),
      created_at: w.created_at,
    })),
  });
});
