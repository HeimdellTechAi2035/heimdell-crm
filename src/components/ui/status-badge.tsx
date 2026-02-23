"use client";

import { STATUS_COLORS } from "@/lib/status-engine";
import type { LeadStatusType } from "@/lib/status-engine";

export function StatusBadge({ status }: { status: string }) {
  const colors =
    STATUS_COLORS[status as LeadStatusType] ||
    "text-slate-400 bg-slate-400/10 border-slate-400/30";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold tracking-wider border ${colors}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function OutreachFlag({
  label,
  active,
}: {
  label: string;
  active: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border ${
        active
          ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
          : "text-slate-500 border-slate-700 bg-slate-800/50"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          active ? "bg-emerald-400 animate-pulse" : "bg-slate-600"
        }`}
      />
      {label}
    </span>
  );
}
