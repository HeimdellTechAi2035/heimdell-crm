import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, checkIdempotency } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { isValidTransition, NEXT_ACTION_LABEL, LeadStatusType } from "@/lib/status-engine";
import {
  notifyLeadReplied,
  notifyLeadQualified,
  notifyStatusChanged,
} from "@/lib/webhooks";

// ─── GET /api/agent/leads/:id ──────────────────────────────
export const GET = withAuth(async (_request: NextRequest, { actor, params }) => {
  const id = params?.id;

  const lead = await prisma.lead.findUnique({
    where: { lead_id: id },
    include: { audit_logs: { orderBy: { timestamp_utc: "desc" }, take: 20 } },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...lead,
    emails: JSON.parse(lead.emails),
    actor,
  });
});

// ─── PATCH /api/agent/leads/:id ────────────────────────────
export const PATCH = withAuth(async (request: NextRequest, { actor, params }) => {
  const id = params?.id;
  const body = await request.json();
  const idempotencyKey = request.headers.get("idempotency-key");

  // Idempotency check
  if (idempotencyKey) {
    const check = await checkIdempotency(idempotencyKey);
    if (check.duplicate) {
      return NextResponse.json(
        { error: "Duplicate request", existing_id: check.existingId },
        { status: 409 }
      );
    }
  }

  const lead = await prisma.lead.findUnique({ where: { lead_id: id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const beforeStatus = lead.status;

  // If status is being changed, validate the transition
  if (body.status && body.status !== lead.status) {
    if (!isValidTransition(lead.status, body.status)) {
      return NextResponse.json(
        {
          error: `Invalid status transition: ${lead.status} → ${body.status}`,
          allowed: getNextStates(lead.status),
        },
        { status: 400 }
      );
    }
  }

  // Build update data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {};
  const allowedFields = [
    "company", "key_decision_maker", "role", "number",
    "linkedin_clean", "facebook_clean", "insta_clean",
    "status", "next_action", "next_action_due_utc",
    "owner", "outcome", "notes", "qualified",
    "email_sent_1", "dm_li_sent_1", "dm_fb_sent_1", "dm_ig_sent_1",
    "call_done", "email_sent_2", "dm_sent_2", "wa_voice_sent",
    "mobile_valid",
  ];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  if (body.emails !== undefined) {
    updateData.emails = JSON.stringify(
      Array.isArray(body.emails) ? body.emails : [body.emails]
    );
  }

  // Auto-set next_action label if status changed
  if (body.status && body.status !== beforeStatus) {
    updateData.next_action = NEXT_ACTION_LABEL[body.status as LeadStatusType] || null;
    updateData.last_action_utc = new Date();
  }

  if (body.replied_at_utc) {
    updateData.replied_at_utc = new Date(body.replied_at_utc);
  }

  const updated = await prisma.lead.update({
    where: { lead_id: id },
    data: updateData,
  });

  // Record idempotency
  if (idempotencyKey) {
    await prisma.leadAction.create({
      data: {
        lead_id: id!,
        action_type: "PATCH_LEAD",
        idempotency_key: idempotencyKey,
        payload: JSON.stringify(body),
      },
    });
  }

  // Audit log if status changed
  if (body.status && body.status !== beforeStatus) {
    await createAuditLog({
      lead_id: id!,
      actor,
      before_status: beforeStatus,
      after_status: body.status,
      action: "STATUS_CHANGE",
      reason: body.reason || `Status updated from ${beforeStatus} to ${body.status}`,
    });

    // Trigger webhooks for real-time AI companion updates
    if (body.status === "REPLIED") {
      await notifyLeadReplied(id!, updated);
    }
    await notifyStatusChanged(id!, beforeStatus, body.status, updated);
  }

  // Check if qualified flag was set
  if (body.qualified === true && !lead.qualified) {
    await notifyLeadQualified(id!, updated);
  }

  return NextResponse.json({
    ...updated,
    emails: JSON.parse(updated.emails),
  });
});

function getNextStates(status: string): string[] {
  const { STATUS_FLOW } = require("@/lib/status-engine");
  return STATUS_FLOW[status] || [];
}
