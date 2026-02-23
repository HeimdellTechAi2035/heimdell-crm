import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, checkIdempotency } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { LeadStatus, NEXT_ACTION_LABEL } from "@/lib/status-engine";
import { v4 as uuidv4 } from "uuid";

// ─── GET /api/agent/leads ──────────────────────────────────
export const GET = withAuth(async (request: NextRequest, { actor }) => {
  const { searchParams } = new URL(request.url);

  const status = searchParams.get("status");
  const owner = searchParams.get("owner");
  const filter = searchParams.get("filter"); // due_now, calls_due, wa_voice_due, replied, stalled
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const skip = (page - 1) * limit;

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (status) where.status = status;
  if (owner) where.owner = owner;

  const now = new Date();

  if (filter === "due_now") {
    where.next_action_due_utc = { lte: now };
    where.status = { notIn: ["COMPLETED", "NOT_INTERESTED"] };
  } else if (filter === "calls_due") {
    where.status = LeadStatus.CALL_DUE;
  } else if (filter === "wa_voice_due") {
    where.status = LeadStatus.WA_VOICE_DUE;
  } else if (filter === "replied") {
    where.status = { in: [LeadStatus.REPLIED, LeadStatus.QUALIFIED] };
  } else if (filter === "stalled") {
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    where.last_action_utc = { lte: threeDaysAgo };
    where.status = {
      notIn: ["COMPLETED", "NOT_INTERESTED", "QUALIFIED", "REPLIED"],
    };
  }

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: [
        { next_action_due_utc: "asc" },
        { created_at: "desc" },
      ],
      skip,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ]);

  return NextResponse.json({
    leads: leads.map((l: any) => ({
      ...l,
      emails: JSON.parse(l.emails),
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    actor,
  });
});

// ─── POST /api/agent/leads ─────────────────────────────────
export const POST = withAuth(async (request: NextRequest, { actor }) => {
  const body = await request.json();
  const idempotencyKey = request.headers.get("idempotency-key");

  // Check idempotency
  if (idempotencyKey) {
    const check = await checkIdempotency(idempotencyKey);
    if (check.duplicate) {
      return NextResponse.json(
        { error: "Duplicate request", existing_id: check.existingId },
        { status: 409 }
      );
    }
  }

  const {
    company,
    key_decision_maker,
    role,
    emails = [],
    number,
    linkedin_clean,
    facebook_clean,
    insta_clean,
    owner,
    notes,
  } = body;

  if (!company || !key_decision_maker || !role) {
    return NextResponse.json(
      { error: "company, key_decision_maker, and role are required" },
      { status: 400 }
    );
  }

  const lead_id = uuidv4();

  const lead = await prisma.lead.create({
    data: {
      lead_id,
      company,
      key_decision_maker,
      role,
      emails: JSON.stringify(Array.isArray(emails) ? emails : [emails]),
      number: number || null,
      linkedin_clean: linkedin_clean || null,
      facebook_clean: facebook_clean || null,
      insta_clean: insta_clean || null,
      status: LeadStatus.NEW,
      next_action: NEXT_ACTION_LABEL.NEW,
      owner: owner || actor,
      notes: notes || null,
    },
  });

  // Record idempotency
  if (idempotencyKey) {
    await prisma.leadAction.create({
      data: {
        lead_id: lead.lead_id,
        action_type: "CREATE_LEAD",
        idempotency_key: idempotencyKey,
      },
    });
  }

  // Audit log
  await createAuditLog({
    lead_id: lead.lead_id,
    actor,
    before_status: "NONE",
    after_status: LeadStatus.NEW,
    action: "CREATE_LEAD",
    reason: "New lead created",
  });

  return NextResponse.json(
    {
      ...lead,
      emails: JSON.parse(lead.emails),
    },
    { status: 201 }
  );
});
