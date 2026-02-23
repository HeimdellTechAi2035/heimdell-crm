import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, checkIdempotency } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import {
  isValidTransition,
  getNextStatus,
  NEXT_ACTION_LABEL,
  LeadStatusType,
} from "@/lib/status-engine";
import { v4 as uuidv4 } from "uuid";

// ─── POST /api/agent/leads/:id/actions ─────────────────────
export const POST = withAuth(async (request: NextRequest, { actor, params }) => {
  const leadId = params?.id;
  const body = await request.json();
  const idempotencyKey =
    request.headers.get("idempotency-key") || body.idempotency_key;

  // Idempotency check
  if (idempotencyKey) {
    const check = await checkIdempotency(idempotencyKey);
    if (check.duplicate) {
      return NextResponse.json(
        { error: "Duplicate action", existing_id: check.existingId },
        { status: 409 }
      );
    }
  }

  const lead = await prisma.lead.findUnique({ where: { lead_id: leadId } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const { action_type, target_status, reason, payload } = body;

  // Determine target status
  let newStatus: string;
  if (target_status) {
    if (!isValidTransition(lead.status, target_status)) {
      return NextResponse.json(
        {
          error: `Invalid transition: ${lead.status} → ${target_status}`,
          current_status: lead.status,
        },
        { status: 400 }
      );
    }
    newStatus = target_status;
  } else {
    const next = getNextStatus(lead.status);
    if (!next) {
      return NextResponse.json(
        { error: "No valid next status from current state", current_status: lead.status },
        { status: 400 }
      );
    }
    newStatus = next;
  }

  const beforeStatus = lead.status;

  // Build flag updates based on action type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flagUpdates: any = {};
  if (action_type === "SEND_EMAIL_1") flagUpdates.email_sent_1 = true;
  if (action_type === "SEND_DMS_1") {
    flagUpdates.dm_li_sent_1 = true;
    flagUpdates.dm_fb_sent_1 = true;
    flagUpdates.dm_ig_sent_1 = true;
  }
  if (action_type === "MAKE_CALL") flagUpdates.call_done = true;
  if (action_type === "SEND_EMAIL_2") flagUpdates.email_sent_2 = true;
  if (action_type === "SEND_DMS_2") flagUpdates.dm_sent_2 = true;
  if (action_type === "SEND_WA_VOICE") flagUpdates.wa_voice_sent = true;
  if (action_type === "MARK_REPLIED") {
    flagUpdates.replied_at_utc = new Date();
  }
  if (action_type === "MARK_QUALIFIED") flagUpdates.qualified = true;

  // Calculate next_action_due_utc for waiting states
  let nextDue: Date | null = null;
  if (newStatus === "WAITING_D2") {
    nextDue = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  } else if (newStatus === "WAITING_D1") {
    nextDue = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
  }

  // Update lead
  const updated = await prisma.lead.update({
    where: { lead_id: leadId },
    data: {
      status: newStatus,
      last_action_utc: new Date(),
      next_action: NEXT_ACTION_LABEL[newStatus as LeadStatusType] || null,
      next_action_due_utc: nextDue,
      ...flagUpdates,
    },
  });

  // Record action
  await prisma.leadAction.create({
    data: {
      id: uuidv4(),
      lead_id: leadId!,
      action_type: action_type || "TRIGGER_NEXT",
      idempotency_key: idempotencyKey || null,
      payload: payload ? JSON.stringify(payload) : null,
    },
  });

  // Audit log
  await createAuditLog({
    lead_id: leadId!,
    actor,
    before_status: beforeStatus,
    after_status: newStatus,
    action: action_type || "TRIGGER_NEXT",
    reason: reason || `Action triggered: ${beforeStatus} → ${newStatus}`,
  });

  return NextResponse.json({
    success: true,
    lead: { ...updated, emails: JSON.parse(updated.emails) },
    transition: { from: beforeStatus, to: newStatus },
  });
});
