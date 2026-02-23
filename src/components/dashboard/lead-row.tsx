"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusBadge, OutreachFlag } from "@/components/ui/status-badge";
import type { Lead } from "@/types/lead";
import { formatDistanceToNow } from "date-fns";

interface LeadRowProps {
  lead: Lead;
  index: number;
  onSelect: (lead: Lead) => void;
}

export function LeadRow({ lead, index, onSelect }: LeadRowProps) {
  const isOverdue =
    lead.next_action_due_utc &&
    new Date(lead.next_action_due_utc) < new Date();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
    >
      <GlassCard
        className={`p-4 hover:border-cyan-500/30 transition-all duration-200 ${
          isOverdue ? "border-red-500/30" : ""
        }`}
        glow={isOverdue ? "purple" : "cyan"}
        onClick={() => onSelect(lead)}
        animate={false}
      >
        <div className="flex items-center justify-between gap-4">
          {/* Left: Lead Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-sm font-semibold text-white truncate">
                {lead.key_decision_maker}
              </h3>
              <StatusBadge status={lead.status} />
              {isOverdue && (
                <span className="text-[10px] font-mono text-red-400 animate-pulse">
                  OVERDUE
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
              <span className="text-cyan-400/70">{lead.company}</span>
              <span>·</span>
              <span>{lead.role}</span>
              {lead.owner && (
                <>
                  <span>·</span>
                  <span className="text-purple-400/70">@{lead.owner}</span>
                </>
              )}
            </div>
          </div>

          {/* Center: Outreach Flags */}
          <div className="hidden lg:flex items-center gap-1.5">
            <OutreachFlag label="E1" active={lead.email_sent_1} />
            <OutreachFlag label="LI" active={lead.dm_li_sent_1} />
            <OutreachFlag label="FB" active={lead.dm_fb_sent_1} />
            <OutreachFlag label="IG" active={lead.dm_ig_sent_1} />
            <OutreachFlag label="📞" active={lead.call_done} />
            <OutreachFlag label="E2" active={lead.email_sent_2} />
            <OutreachFlag label="D2" active={lead.dm_sent_2} />
            <OutreachFlag label="WA" active={lead.wa_voice_sent} />
          </div>

          {/* Right: Next Action & Timing */}
          <div className="text-right flex-shrink-0 min-w-[160px]">
            {lead.next_action && (
              <p className="text-[11px] font-mono text-amber-400/80 mb-1 truncate">
                → {lead.next_action}
              </p>
            )}
            {lead.next_action_due_utc && (
              <p className={`text-[10px] font-mono ${isOverdue ? "text-red-400" : "text-slate-500"}`}>
                {formatDistanceToNow(new Date(lead.next_action_due_utc), {
                  addSuffix: true,
                })}
              </p>
            )}
            {lead.last_action_utc && (
              <p className="text-[10px] font-mono text-slate-600">
                last:{" "}
                {formatDistanceToNow(new Date(lead.last_action_utc), {
                  addSuffix: true,
                })}
              </p>
            )}
          </div>

          {/* Chevron */}
          <div className="text-slate-600 ml-2">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
