import { prisma } from "@/lib/db";

export interface AuditEntry {
  lead_id: string;
  actor: string;
  before_status: string;
  after_status: string;
  action: string;
  reason?: string;
}

export async function createAuditLog(entry: AuditEntry) {
  return prisma.auditLog.create({
    data: {
      lead_id: entry.lead_id,
      actor: entry.actor,
      before_status: entry.before_status,
      after_status: entry.after_status,
      action: entry.action,
      reason: entry.reason ?? null,
      timestamp_utc: new Date(),
    },
  });
}

export async function getAuditLogs(leadId: string) {
  return prisma.auditLog.findMany({
    where: { lead_id: leadId },
    orderBy: { timestamp_utc: "desc" },
  });
}
