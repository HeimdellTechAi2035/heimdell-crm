// ─── Lead Status Enum ───────────────────────────────────────
export const LeadStatus = {
  NEW: "NEW",
  CONTACTED_1: "CONTACTED_1",
  WAITING_D2: "WAITING_D2",
  CALL_DUE: "CALL_DUE",
  CALLED: "CALLED",
  WAITING_D1: "WAITING_D1",
  CONTACTED_2: "CONTACTED_2",
  WA_VOICE_DUE: "WA_VOICE_DUE",
  REPLIED: "REPLIED",
  QUALIFIED: "QUALIFIED",
  NOT_INTERESTED: "NOT_INTERESTED",
  COMPLETED: "COMPLETED",
} as const;

export type LeadStatusType = (typeof LeadStatus)[keyof typeof LeadStatus];

// ─── Strict Status Flow Map ────────────────────────────────
// Each key maps to the set of valid next statuses
export const STATUS_FLOW: Record<LeadStatusType, LeadStatusType[]> = {
  NEW: ["CONTACTED_1"],
  CONTACTED_1: ["WAITING_D2"],
  WAITING_D2: ["CALL_DUE"],
  CALL_DUE: ["CALLED"],
  CALLED: ["WAITING_D1"],
  WAITING_D1: ["CONTACTED_2"],
  CONTACTED_2: ["WA_VOICE_DUE"],
  WA_VOICE_DUE: ["REPLIED", "QUALIFIED", "NOT_INTERESTED", "COMPLETED"],
  REPLIED: ["QUALIFIED", "NOT_INTERESTED", "COMPLETED"],
  QUALIFIED: ["COMPLETED"],
  NOT_INTERESTED: ["COMPLETED"],
  COMPLETED: [],
};

// ─── Action → Status Mapping ───────────────────────────────
// What action triggers which status transition
export const ACTION_STATUS_MAP: Record<string, { from: LeadStatusType; to: LeadStatusType }> = {
  SEND_EMAIL_1: { from: "NEW", to: "CONTACTED_1" },
  SEND_DMS_1: { from: "CONTACTED_1", to: "WAITING_D2" },
  WAIT_D2: { from: "WAITING_D2", to: "CALL_DUE" },
  MAKE_CALL: { from: "CALL_DUE", to: "CALLED" },
  WAIT_D1: { from: "CALLED", to: "WAITING_D1" },
  SEND_EMAIL_2: { from: "WAITING_D1", to: "CONTACTED_2" },
  SEND_DMS_2: { from: "CONTACTED_2", to: "WA_VOICE_DUE" },
  SEND_WA_VOICE: { from: "WA_VOICE_DUE", to: "REPLIED" },
  MARK_REPLIED: { from: "WA_VOICE_DUE", to: "REPLIED" },
  MARK_QUALIFIED: { from: "REPLIED", to: "QUALIFIED" },
  MARK_NOT_INTERESTED: { from: "REPLIED", to: "NOT_INTERESTED" },
  MARK_COMPLETED: { from: "QUALIFIED", to: "COMPLETED" },
};

// ─── Next Action Descriptions ──────────────────────────────
export const NEXT_ACTION_LABEL: Record<LeadStatusType, string> = {
  NEW: "Send Email #1 + DMs (LI, FB, IG)",
  CONTACTED_1: "Send DMs Round 1",
  WAITING_D2: "Wait 2 days, then Call",
  CALL_DUE: "Make Phone Call",
  CALLED: "Wait 1 day",
  WAITING_D1: "Send Email #2 + DMs Round 2",
  CONTACTED_2: "Send WhatsApp Voice Note",
  WA_VOICE_DUE: "Send WA Voice & Wait for Reply",
  REPLIED: "Qualify or Disqualify",
  QUALIFIED: "Mark Completed",
  NOT_INTERESTED: "Mark Completed",
  COMPLETED: "— Done —",
};

// ─── Status Display Colors for UI ──────────────────────────
export const STATUS_COLORS: Record<LeadStatusType, string> = {
  NEW: "text-cyan-400 bg-cyan-400/10 border-cyan-400/30",
  CONTACTED_1: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  WAITING_D2: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  CALL_DUE: "text-orange-400 bg-orange-400/10 border-orange-400/30",
  CALLED: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  WAITING_D1: "text-amber-300 bg-amber-300/10 border-amber-300/30",
  CONTACTED_2: "text-purple-400 bg-purple-400/10 border-purple-400/30",
  WA_VOICE_DUE: "text-green-400 bg-green-400/10 border-green-400/30",
  REPLIED: "text-fuchsia-400 bg-fuchsia-400/10 border-fuchsia-400/30",
  QUALIFIED: "text-emerald-300 bg-emerald-300/10 border-emerald-300/30",
  NOT_INTERESTED: "text-red-400 bg-red-400/10 border-red-400/30",
  COMPLETED: "text-slate-400 bg-slate-400/10 border-slate-400/30",
};

// ─── Validation ────────────────────────────────────────────
export function isValidTransition(from: string, to: string): boolean {
  const allowed = STATUS_FLOW[from as LeadStatusType];
  if (!allowed) return false;
  return allowed.includes(to as LeadStatusType);
}

export function getNextStatus(currentStatus: string): LeadStatusType | null {
  const allowed = STATUS_FLOW[currentStatus as LeadStatusType];
  if (!allowed || allowed.length === 0) return null;
  return allowed[0]; // Default to the first valid next status
}
