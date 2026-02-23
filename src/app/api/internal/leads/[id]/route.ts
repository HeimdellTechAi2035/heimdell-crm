import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createAuditLog, getAuditLogs } from "@/lib/audit";
import { isValidTransition } from "@/lib/status-engine";

// ─── GET /api/internal/leads/[id] ──────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const lead = await prisma.lead.findUnique({ where: { lead_id: id } });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const audit = await getAuditLogs(id);

  return NextResponse.json({
    ...lead,
    emails: JSON.parse(lead.emails),
    audit_logs: audit,
  });
}

// ─── PATCH /api/internal/leads/[id] ────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const lead = await prisma.lead.findUnique({ where: { lead_id: id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const { status, notes, qualified, mobile_valid, reason } = body;

  // Validate status transition if provided
  if (status && !isValidTransition(lead.status, status)) {
    return NextResponse.json(
      { error: "Invalid status transition", from: lead.status, to: status },
      { status: 400 }
    );
  }

  // Build update data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = { updated_at: new Date() };
  if (status) updateData.status = status;
  if (notes !== undefined) updateData.notes = notes;
  if (qualified !== undefined) updateData.qualified = qualified;
  if (mobile_valid !== undefined) updateData.mobile_valid = mobile_valid;

  const updated = await prisma.lead.update({
    where: { lead_id: id },
    data: updateData,
  });

  if (status) {
    await createAuditLog({
      lead_id: id,
      actor: "user:dashboard",
      before_status: lead.status,
      after_status: status,
      action: "UPDATE_STATUS",
      reason: reason || "Status updated via dashboard",
    });
  }

  return NextResponse.json({
    ...updated,
    emails: JSON.parse(updated.emails),
  });
}
