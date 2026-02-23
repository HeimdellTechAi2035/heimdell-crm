"use client";

import { motion, AnimatePresence } from "framer-motion";
import { GlassPanel } from "@/components/ui/glass-card";
import { NeonButton } from "@/components/ui/neon-button";
import { StatusBadge, OutreachFlag } from "@/components/ui/status-badge";
import { STATUS_FLOW } from "@/lib/status-engine";
import type { Lead } from "@/types/lead";
import type { LeadStatusType } from "@/lib/status-engine";

interface ActionHUDProps {
  lead: Lead | null;
  onClose: () => void;
  onTriggerAction: (leadId: string, targetStatus?: string) => void;
  loading: boolean;
}

export function ActionHUD({ lead, onClose, onTriggerAction, loading }: ActionHUDProps) {
  if (!lead) return null;

  const nextStatuses = STATUS_FLOW[lead.status as LeadStatusType] || [];
  const socialLinks = [
    { label: "LinkedIn", url: lead.linkedin_clean, icon: "🔗", color: "text-blue-400" },
    { label: "Facebook", url: lead.facebook_clean, icon: "📘", color: "text-blue-500" },
    { label: "Instagram", url: lead.insta_clean, icon: "📸", color: "text-pink-400" },
  ];

  const flags = [
    { label: "Email #1", active: lead.email_sent_1 },
    { label: "DM LinkedIn", active: lead.dm_li_sent_1 },
    { label: "DM Facebook", active: lead.dm_fb_sent_1 },
    { label: "DM Instagram", active: lead.dm_ig_sent_1 },
    { label: "Call Done", active: lead.call_done },
    { label: "Email #2", active: lead.email_sent_2 },
    { label: "DM Round 2", active: lead.dm_sent_2 },
    { label: "WA Voice", active: lead.wa_voice_sent },
    { label: "Mobile Valid", active: lead.mobile_valid },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* HUD Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", bounce: 0.2 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <GlassPanel className="glow-cyan-strong">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold neon-text-cyan">
                  {lead.key_decision_maker}
                </h2>
                <p className="text-sm text-slate-400 font-mono mt-1">
                  {lead.company} · {lead.role}
                </p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  ID: {lead.lead_id.slice(0, 8)}...
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-slate-500 hover:text-white transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Status */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-[11px] font-mono text-slate-500 uppercase">Status:</span>
              <StatusBadge status={lead.status} />
              {lead.next_action && (
                <span className="text-xs font-mono text-amber-400">
                  → {lead.next_action}
                </span>
              )}
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="space-y-2">
                <h4 className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                  Contact
                </h4>
                {lead.emails.length > 0 && (
                  <p className="text-xs font-mono text-slate-300">
                    ✉️ {lead.emails.join(", ")}
                  </p>
                )}
                {lead.number && (
                  <p className="text-xs font-mono text-slate-300">
                    📱 {lead.number}
                    {lead.mobile_valid && (
                      <span className="ml-2 text-emerald-400 text-[10px]">✓ valid</span>
                    )}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                  Social Links
                </h4>
                {socialLinks.map((link) =>
                  link.url ? (
                    <a
                      key={link.label}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 text-xs font-mono ${link.color} hover:underline transition-colors`}
                    >
                      <span>{link.icon}</span>
                      {link.label}
                      <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ) : (
                    <p key={link.label} className="text-xs font-mono text-slate-600">
                      {link.icon} {link.label} — not set
                    </p>
                  )
                )}
              </div>
            </div>

            {/* Outreach Flags Grid */}
            <div className="mb-6">
              <h4 className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-2">
                Outreach Progress
              </h4>
              <div className="flex flex-wrap gap-2">
                {flags.map((flag) => (
                  <OutreachFlag key={flag.label} label={flag.label} active={flag.active} />
                ))}
              </div>
            </div>

            {/* Notes */}
            {lead.notes && (
              <div className="mb-6">
                <h4 className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-2">
                  Notes
                </h4>
                <p className="text-xs text-slate-400 bg-slate-900/50 rounded-lg p-3 border border-slate-800 font-mono whitespace-pre-wrap">
                  {lead.notes}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="border-t border-slate-700/50 pt-4">
              <h4 className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-3">
                Available Actions
              </h4>
              <div className="flex flex-wrap gap-2">
                {nextStatuses.length > 0 ? (
                  nextStatuses.map((status) => (
                    <NeonButton
                      key={status}
                      variant={
                        status === "QUALIFIED"
                          ? "green"
                          : status === "NOT_INTERESTED"
                          ? "red"
                          : status === "COMPLETED"
                          ? "purple"
                          : "cyan"
                      }
                      size="md"
                      loading={loading}
                      onClick={() => onTriggerAction(lead.lead_id, status)}
                    >
                      → {status.replace(/_/g, " ")}
                    </NeonButton>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 font-mono">
                    No further actions available. Lead is at terminal state.
                  </p>
                )}
              </div>
            </div>

            {/* Audit Trail */}
            {lead.audit_logs && lead.audit_logs.length > 0 && (
              <div className="mt-6 border-t border-slate-700/50 pt-4">
                <h4 className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-2">
                  Audit Trail
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {lead.audit_logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center gap-3 text-[10px] font-mono text-slate-500 py-1 border-b border-slate-800/50"
                    >
                      <span className="text-slate-600">
                        {new Date(log.timestamp_utc).toLocaleString()}
                      </span>
                      <span className="text-purple-400/60">@{log.actor}</span>
                      <span>
                        {log.before_status} → {log.after_status}
                      </span>
                      {log.reason && (
                        <span className="text-slate-600 truncate">
                          ({log.reason})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GlassPanel>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
