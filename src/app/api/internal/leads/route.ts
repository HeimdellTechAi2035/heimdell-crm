import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { LeadStatus, NEXT_ACTION_LABEL } from "@/lib/status-engine";
import { v4 as uuidv4 } from "uuid";

// ─── Internal API routes for frontend dashboard (no auth required) ───
// These are separate from /api/agent/* which require Bearer token auth

// ─── GET /api/internal/leads ───────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const status = searchParams.get("status");
  const owner = searchParams.get("owner");
  const filter = searchParams.get("filter");
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
      notIn: ["COMPLETED", "NOT_INTERESTED", "REPLIED", "QUALIFIED"],
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
  });
}

// ─── POST /api/internal/leads ──────────────────────────────
export async function POST(request: NextRequest) {
  const body = await request.json();

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
      { error: "Missing required fields: company, key_decision_maker, role" },
      { status: 400 }
    );
  }

  const lead = await prisma.lead.create({
    data: {
      lead_id: uuidv4(),
      company,
      key_decision_maker,
      role,
      emails: JSON.stringify(emails),
      number: number || null,
      linkedin_clean: linkedin_clean || null,
      facebook_clean: facebook_clean || null,
      insta_clean: insta_clean || null,
      status: LeadStatus.NEW,
      next_action: NEXT_ACTION_LABEL[LeadStatus.NEW],
      owner: owner || null,
      notes: notes || null,
      qualified: false,
      email_sent_1: false,
      dm_li_sent_1: false,
      dm_fb_sent_1: false,
      dm_ig_sent_1: false,
      call_done: false,
      email_sent_2: false,
      dm_sent_2: false,
      wa_voice_sent: false,
      mobile_valid: !!number,
    },
  });

  await createAuditLog({
    lead_id: lead.lead_id,
    actor: "user:dashboard",
    before_status: null,
    after_status: lead.status,
    action: "CREATE_LEAD",
    reason: "Lead created via dashboard",
  });

  return NextResponse.json(
    {
      ...lead,
      emails: JSON.parse(lead.emails),
    },
    { status: 201 }
  );
}
