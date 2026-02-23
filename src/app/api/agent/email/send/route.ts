import { NextRequest, NextResponse } from "next/server";
import { withAuth, checkSendLimit, incrementSendCount, checkIdempotency } from "@/lib/auth";
import { sendEmail } from "@/lib/smtp";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";

// ─── POST /api/agent/email/send ────────────────────────────
export const POST = withAuth(async (request: NextRequest, { actor }) => {
  const body = await request.json();
  const idempotencyKey = request.headers.get("idempotency-key");

  // Idempotency
  if (idempotencyKey) {
    const check = await checkIdempotency(idempotencyKey);
    if (check.duplicate) {
      return NextResponse.json(
        { error: "Duplicate request", existing_id: check.existingId },
        { status: 409 }
      );
    }
  }

  const { to, subject, html, lead_id } = body;

  if (!to || !subject || !html) {
    return NextResponse.json(
      { error: "to, subject, and html are required" },
      { status: 400 }
    );
  }

  // Check send limit
  const limitCheck = await checkSendLimit();
  if (!limitCheck.allowed) {
    return NextResponse.json(
      {
        error: "Daily send limit reached",
        remaining: 0,
      },
      { status: 429 }
    );
  }

  // Send email
  const result = await sendEmail({ to, subject, html });

  if (result.success) {
    await incrementSendCount();

    // Record idempotency
    if (idempotencyKey) {
      await prisma.leadAction.create({
        data: {
          lead_id: lead_id || "SYSTEM",
          action_type: "EMAIL_SEND",
          idempotency_key: idempotencyKey,
          payload: JSON.stringify({ to, subject, messageId: result.messageId }),
        },
      });
    }

    // Audit if lead_id provided
    if (lead_id) {
      const lead = await prisma.lead.findUnique({ where: { lead_id } });
      if (lead) {
        await createAuditLog({
          lead_id,
          actor,
          before_status: lead.status,
          after_status: lead.status,
          action: "EMAIL_SENT",
          reason: `Email sent to ${to}: ${subject}`,
        });
      }
    }
  }

  return NextResponse.json({
    success: result.success,
    messageId: result.messageId,
    error: result.error,
    remaining_sends: limitCheck.remaining - (result.success ? 1 : 0),
  });
});
