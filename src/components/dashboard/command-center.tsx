"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { v4 as uuidv4 } from "uuid";

import { FilterTabBar } from "@/components/dashboard/filter-tabs";
import { StatsBar } from "@/components/dashboard/stats-bar";
import { LeadRow } from "@/components/dashboard/lead-row";
import { ActionHUD } from "@/components/dashboard/action-hud";
import { CreateLeadModal } from "@/components/dashboard/create-lead-modal";
import { NeonButton } from "@/components/ui/neon-button";
import type { Lead, FilterTab, PaginatedResponse } from "@/types/lead";

const API_BASE = "/api/internal";

// ─── Internal API routes for dashboard (no auth required) ───
async function fetchLeads(filter: FilterTab, page = 1): Promise<PaginatedResponse> {
  const params = new URLSearchParams({ page: String(page), limit: "50" });
  if (filter !== "all") params.set("filter", filter);

  const res = await fetch(`${API_BASE}/leads?${params}`);
  if (!res.ok) throw new Error("Failed to fetch leads");
  return res.json();
}

async function fetchLeadDetail(id: string): Promise<Lead> {
  const res = await fetch(`${API_BASE}/leads/${id}`);
  if (!res.ok) throw new Error("Failed to fetch lead");
  return res.json();
}

async function triggerAction(leadId: string, targetStatus?: string) {
  const res = await fetch(`${API_BASE}/leads/${leadId}/actions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": uuidv4(),
    },
    body: JSON.stringify({
      action_type: "TRIGGER_NEXT",
      target_status: targetStatus,
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Action failed");
  }
  return res.json();
}

async function createLead(data: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/leads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": uuidv4(),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Create failed");
  }
  return res.json();
}

export function CommandCenter() {
  const [activeTab, setActiveTab] = useState<FilterTab>("due_now");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    dueNow: 0,
    callsDue: 0,
    waVoiceDue: 0,
    replied: 0,
    qualified: 0,
    stalled: 0,
    completedToday: 0,
  });
  const [counts, setCounts] = useState<Record<FilterTab, number>>({
    due_now: 0,
    calls_due: 0,
    wa_voice_due: 0,
    replied: 0,
    stalled: 0,
    all: 0,
  });

  const loadLeads = useCallback(async () => {
    try {
      const data = await fetchLeads(activeTab);
      setLeads(data.leads);

      // Update count for active tab
      setCounts((prev) => ({
        ...prev,
        [activeTab]: data.pagination.total,
      }));
    } catch (err) {
      console.error("Failed to load leads:", err);
    }
  }, [activeTab]);

  const loadStats = useCallback(async () => {
    try {
      // Fetch counts for all filters in parallel
      const [all, dueNow, callsDue, waVoice, replied, stalled] =
        await Promise.all([
          fetchLeads("all"),
          fetchLeads("due_now"),
          fetchLeads("calls_due"),
          fetchLeads("wa_voice_due"),
          fetchLeads("replied"),
          fetchLeads("stalled"),
        ]);

      setStats({
        total: all.pagination.total,
        dueNow: dueNow.pagination.total,
        callsDue: callsDue.pagination.total,
        waVoiceDue: waVoice.pagination.total,
        replied: replied.pagination.total,
        qualified: replied.leads.filter((l) => l.qualified).length,
        stalled: stalled.pagination.total,
        completedToday: all.leads.filter(
          (l) =>
            l.status === "COMPLETED" &&
            l.updated_at &&
            new Date(l.updated_at).toDateString() === new Date().toDateString()
        ).length,
      });

      setCounts({
        all: all.pagination.total,
        due_now: dueNow.pagination.total,
        calls_due: callsDue.pagination.total,
        wa_voice_due: waVoice.pagination.total,
        replied: replied.pagination.total,
        stalled: stalled.pagination.total,
      });
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000); // Refresh stats every 30s
    return () => clearInterval(interval);
  }, [loadStats]);

  const handleSelectLead = async (lead: Lead) => {
    try {
      const detailed = await fetchLeadDetail(lead.lead_id);
      setSelectedLead(detailed);
    } catch {
      setSelectedLead(lead);
    }
  };

  const handleTriggerAction = async (leadId: string, targetStatus?: string) => {
    setActionLoading(true);
    try {
      await triggerAction(leadId, targetStatus);
      // Refresh
      const updated = await fetchLeadDetail(leadId);
      setSelectedLead(updated);
      loadLeads();
      loadStats();
    } catch (err) {
      console.error("Action failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateLead = async (data: Record<string, unknown>) => {
    await createLead(data);
    loadLeads();
    loadStats();
  };

  // Filter leads by search query
  const filteredLeads = searchQuery
    ? leads.filter(
        (l) =>
          l.key_decision_maker.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.role.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : leads;

  return (
    <div className="min-h-screen p-4 lg:p-6 space-y-4">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="neon-text-cyan">HEIMDELL</span>
            <span className="text-slate-500 mx-2">|</span>
            <span className="text-slate-400 text-lg font-normal">
              Command Center
            </span>
          </h1>
          <p className="text-[10px] font-mono text-slate-600 mt-1 tracking-widest">
            SALES OUTREACH CRM v1.0 · {new Date().toISOString().split("T")[0]} ·{" "}
            {stats.total} LEADS TRACKED
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg bg-slate-900/80 border border-slate-700/50 text-xs text-slate-300 font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 w-48 lg:w-64 transition-all"
            />
          </div>

          <NeonButton variant="cyan" onClick={() => setShowCreate(true)}>
            + NEW LEAD
          </NeonButton>
        </div>
      </motion.header>

      {/* Stats Bar */}
      <StatsBar stats={stats} />

      {/* Filter Tabs */}
      <FilterTabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={counts}
      />

      {/* Lead List */}
      <div className="space-y-2">
        <AnimatePresence mode="wait">
          {filteredLeads.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20"
            >
              <p className="text-slate-500 font-mono text-sm">
                {searchQuery
                  ? "No leads match your search."
                  : "No leads in this view."}
              </p>
              <p className="text-slate-600 font-mono text-xs mt-2">
                {!searchQuery && "Create a new lead or switch tabs."}
              </p>
            </motion.div>
          ) : (
            filteredLeads.map((lead, i) => (
              <LeadRow
                key={lead.lead_id}
                lead={lead}
                index={i}
                onSelect={handleSelectLead}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Action HUD */}
      <AnimatePresence>
        {selectedLead && (
          <ActionHUD
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
            onTriggerAction={handleTriggerAction}
            loading={actionLoading}
          />
        )}
      </AnimatePresence>

      {/* Create Lead Modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateLeadModal
            onClose={() => setShowCreate(false)}
            onSubmit={handleCreateLead}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
