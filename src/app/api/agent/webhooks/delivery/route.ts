import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// ─── POST /api/agent/webhooks/delivery ─────────────────────
// Handles delivery status callbacks (e.g., from email providers)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event_type, payload } = body;

    if (!event_type) {
      return NextResponse.json(
        { error: "event_type is required" },
        { status: 400 }
      );
    }

    // Store webhook event
    const event = await prisma.webhookEvent.create({
      data: {
        event_type,
        payload: JSON.stringify(payload || {}),
        processed: false,
      },
    });

    // Process known event types
    if (event_type === "delivery_success" && payload?.lead_id) {
      // Mark as delivered — could update lead flags here
      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: { processed: true },
      });
    }

    if (event_type === "delivery_failure" && payload?.lead_id) {
      // Flag the email as failed
      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: { processed: true },
      });

      // Could add notes to the lead
      if (payload.lead_id) {
        const lead = await prisma.lead.findUnique({
          where: { lead_id: payload.lead_id },
        });
        if (lead) {
          await prisma.lead.update({
            where: { lead_id: payload.lead_id },
            data: {
              notes: `${lead.notes || ""}\n[WEBHOOK] Delivery failure: ${payload.error || "Unknown error"} at ${new Date().toISOString()}`,
            },
          });
        }
      }
    }

    return NextResponse.json({ received: true, event_id: event.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Webhook processing failed", detail: message },
      { status: 500 }
    );
  }
}
