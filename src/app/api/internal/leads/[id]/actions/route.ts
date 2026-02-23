import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import {
  getNextStatus,
  isValidTransition,
  ACTION_STATUS_MAP,
} from "@/lib/status-engine";

// ─── POST /api/internal/leads/[id]/actions ─────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const lead = await prisma.lead.findUnique({ where: { lead_id: id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const { action_type, target_status, reason } = body;

  // Determine next status
  let nextStatus = target_status;

  if (!nextStatus) {
    if (action_type && ACTION_STATUS_MAP[action_type]) {
      nextStatus = ACTION_STATUS_MAP[action_type];
    } else {
      nextStatus = getNextStatus(lead.status);
    }
  }

  if (!nextStatus) {
    return NextResponse.json(
      {
        error: "No valid next status",
        current: lead.status,
        action: action_type,
      },
      { status: 400 }
    );
  }

  if (!isValidTransition(lead.status, nextStatus)) {
    return NextResponse.json(
      {
        error: "Invalid transition",
        from: lead.status,
        to: nextStatus,
      },
      { status: 400 }
    );
  }

  // Calculate next action due date for waiting states
  let nextActionDue = null;
  if (nextStatus === "WAITING_D2") {
    nextActionDue = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  } else if (nextStatus === "WAITING_D1") {
    nextActionDue = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
  }

  // Update outreach flags based on action type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {
    status: nextStatus,
    last_action_utc: new Date(),
    updated_at: new Date(),
  };

  if (nextActionDue) updateData.next_action_due_utc = nextActionDue;

  if (action_type === "SEND_EMAIL_1") updateData.email_sent_1 = true;
  if (action_type === "SEND_DM_LI_1") updateData.dm_li_sent_1 = true;
  if (action_type === "SEND_DM_FB_1") updateData.dm_fb_sent_1 = true;
  if (action_type === "SEND_DM_IG_1") updateData.dm_ig_sent_1 = true;
  if (action_type === "COMPLETE_CALL") updateData.call_done = true;
  if (action_type === "SEND_EMAIL_2") updateData.email_sent_2 = true;
  if (action_type === "SEND_DM_2") updateData.dm_sent_2 = true;
  if (action_type === "SEND_WA_VOICE") updateData.wa_voice_sent = true;

  const updated = await prisma.lead.update({
    where: { lead_id: id },
    data: updateData,
  });

  await createAuditLog({
    lead_id: id,
    actor: "user:dashboard",
    before_status: lead.status,
    after_status: nextStatus,
    action: action_type || "ADVANCE_PIPELINE",
    reason: reason || "Pipeline advanced via dashboard",
  });

  return NextResponse.json({
    success: true,
    lead: {
      ...updated,
      emails: JSON.parse(updated.emails),
    },
    transition: {
      from: lead.status,
      to: nextStatus,
    },
  });
}
