import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// ─── GET /api/agent/context/[id] ───────────────────────────
// Provides rich context for OpenClaw to make intelligent decisions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const lead = await prisma.lead.findUnique({ where: { lead_id: id } });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Get audit history
  const auditLogs = await prisma.auditLog.findMany({
    where: { lead_id: id },
    orderBy: { timestamp_utc: "desc" },
    take: 20,
  });

  // Calculate engagement metrics
  const firstContact = auditLogs.find(log => log.action.includes("EMAIL") || log.action.includes("DM"));
  const daysSinceFirstContact = firstContact
    ? Math.floor((Date.now() - new Date(firstContact.timestamp_utc).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const daysSinceLastAction = lead.last_action_utc
    ? Math.floor((Date.now() - new Date(lead.last_action_utc).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  const totalTouches = auditLogs.filter(log =>
    ["SEND_EMAIL", "SEND_DM", "COMPLETE_CALL"].some(action => log.action.includes(action))
  ).length;

  // Determine priority score (0-10)
  let priorityScore = 0;

  // Replied = highest priority
  if (lead.status === "REPLIED") priorityScore = 10;
  // Qualified = very high
  else if (lead.qualified) priorityScore = 9;
  // Overdue by 2+ days
  else if (daysSinceLastAction >= 2 && lead.next_action_due_utc && new Date(lead.next_action_due_utc) < new Date()) {
    priorityScore = 8;
  }
  // Due today
  else if (lead.next_action_due_utc && new Date(lead.next_action_due_utc).toDateString() === new Date().toDateString()) {
    priorityScore = 7;
  }
  // Stalled (3+ days no action)
  else if (daysSinceLastAction >= 3) priorityScore = 5;
  // Waiting state
  else if (lead.status.includes("WAITING")) priorityScore = 3;
  // Default
  else priorityScore = 4;

  // Channel health (how many touches on each channel)
  const channelTouches = {
    email: [lead.email_sent_1, lead.email_sent_2].filter(Boolean).length,
    linkedin: lead.dm_li_sent_1 ? 1 : 0,
    facebook: lead.dm_fb_sent_1 ? 1 : 0,
    instagram: lead.dm_ig_sent_1 ? 1 : 0,
    phone: lead.call_done ? 1 : 0,
    whatsapp: lead.wa_voice_sent ? 1 : 0,
  };

  // Recommend next channel (least touched)
  const channelScores = Object.entries(channelTouches)
    .map(([channel, count]) => ({ channel, count }))
    .sort((a, b) => a.count - b.count);

  const recommendedChannel = channelScores[0].channel;

  // Timing recommendation
  const now = new Date();
  const hour = now.getHours();
  let timingRecommendation = "send_now";

  if (hour < 8 || hour > 18) timingRecommendation = "wait_until_morning";
  if (hour >= 11 && hour <= 13) timingRecommendation = "lunch_time_good";
  if (now.getDay() === 6 || now.getDay() === 0) timingRecommendation = "weekend_avoid";

  // AI Decision Context
  const context = {
    lead: {
      ...lead,
      emails: JSON.parse(lead.emails),
    },
    metrics: {
      days_in_pipeline: daysSinceFirstContact,
      days_since_last_action: daysSinceLastAction,
      total_touches: totalTouches,
      channel_touches: channelTouches,
      priority_score: priorityScore,
    },
    recommendations: {
      next_channel: recommendedChannel,
      timing: timingRecommendation,
      urgency: priorityScore >= 7 ? "high" : priorityScore >= 5 ? "medium" : "low",
      should_act_now: priorityScore >= 7 && timingRecommendation === "send_now",
    },
    recent_history: auditLogs.slice(0, 5).map(log => ({
      action: log.action,
      timestamp: log.timestamp_utc,
      status_change: `${log.before_status} → ${log.after_status}`,
      actor: log.actor,
    })),
    ai_insights: {
      engagement_level: totalTouches === 0 ? "cold" : totalTouches >= 3 ? "warm" : "lukewarm",
      response_likelihood: lead.status === "REPLIED" ? "high" : daysSinceLastAction < 2 ? "medium" : "low",
      recommended_template: determineTemplate(lead, totalTouches),
      personalization_hints: generatePersonalizationHints(lead),
    },
  };

  return NextResponse.json(context);
}

function determineTemplate(lead: any, touches: number): string {
  if (lead.status === "REPLIED") return "conversation_builder";
  if (lead.status === "QUALIFIED") return "meeting_scheduler";
  if (touches === 0) return "cold_outreach_v2";
  if (touches === 1) return "follow_up_value";
  if (touches >= 2) return "last_chance_offer";
  return "cold_outreach_v2";
}

function generatePersonalizationHints(lead: any): string[] {
  const hints: string[] = [];

  if (lead.linkedin_clean) {
    hints.push("Check LinkedIn for recent posts or job changes");
  }

  if (lead.role?.includes("CEO")) {
    hints.push("Focus on ROI, scaling challenges, and strategic vision");
  } else if (lead.role?.includes("CTO") || lead.role?.includes("Engineer")) {
    hints.push("Emphasize technical architecture, security, and developer experience");
  } else if (lead.role?.includes("Sales") || lead.role?.includes("VP")) {
    hints.push("Highlight pipeline predictability and revenue impact");
  }

  if (lead.company) {
    hints.push(`Research ${lead.company} recent news or funding announcements`);
  }

  if (lead.notes) {
    hints.push(`Review notes for context: ${lead.notes.substring(0, 100)}...`);
  }

  return hints;
}
