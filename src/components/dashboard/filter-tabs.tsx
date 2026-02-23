"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { FilterTab } from "@/types/lead";

interface TabBarProps {
  activeTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
  counts: Record<FilterTab, number>;
}

const tabs: { key: FilterTab; label: string; icon: string }[] = [
  { key: "due_now", label: "DUE NOW", icon: "⚡" },
  { key: "calls_due", label: "CALLS DUE", icon: "📞" },
  { key: "wa_voice_due", label: "WA VOICE", icon: "🎙️" },
  { key: "replied", label: "REPLIED/QUAL", icon: "✅" },
  { key: "stalled", label: "STALLED >3D", icon: "⚠️" },
  { key: "all", label: "ALL LEADS", icon: "📊" },
];

export function FilterTabBar({ activeTab, onTabChange, counts }: TabBarProps) {
  return (
    <div className="flex gap-1 p-1 glass rounded-xl overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg font-mono text-xs tracking-wider whitespace-nowrap transition-all duration-200 ${
            activeTab === tab.key
              ? "text-cyan-300"
              : "text-slate-400 hover:text-slate-300 hover:bg-slate-800/50"
          }`}
        >
          {activeTab === tab.key && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 rounded-lg bg-cyan-500/10 border border-cyan-500/30"
              style={{ boxShadow: "0 0 15px rgba(6, 182, 212, 0.1)" }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            />
          )}
          <span className="relative z-10">{tab.icon}</span>
          <span className="relative z-10">{tab.label}</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={counts[tab.key]}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="relative z-10 ml-1 px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-bold"
            >
              {counts[tab.key]}
            </motion.span>
          </AnimatePresence>
        </button>
      ))}
    </div>
  );
}
