// ─── Lead Type for Frontend ─────────────────────────────────
export interface Lead {
  lead_id: string;
  company: string;
  key_decision_maker: string;
  role: string;
  emails: string[];
  number: string | null;
  linkedin_clean: string | null;
  facebook_clean: string | null;
  insta_clean: string | null;
  status: string;
  last_action_utc: string | null;
  next_action: string | null;
  next_action_due_utc: string | null;
  owner: string | null;
  outcome: string | null;
  notes: string | null;
  qualified: boolean;
  email_sent_1: boolean;
  dm_li_sent_1: boolean;
  dm_fb_sent_1: boolean;
  dm_ig_sent_1: boolean;
  call_done: boolean;
  email_sent_2: boolean;
  dm_sent_2: boolean;
  wa_voice_sent: boolean;
  replied_at_utc: string | null;
  mobile_valid: boolean;
  created_at: string;
  updated_at: string;
  audit_logs?: AuditEntry[];
}

export interface AuditEntry {
  id: string;
  lead_id: string;
  actor: string;
  timestamp_utc: string;
  before_status: string;
  after_status: string;
  action: string;
  reason: string | null;
}

export interface PaginatedResponse {
  leads: Lead[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export type FilterTab = "due_now" | "calls_due" | "wa_voice_due" | "replied" | "stalled" | "all";
