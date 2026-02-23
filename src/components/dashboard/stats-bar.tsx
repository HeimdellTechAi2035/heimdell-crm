"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";

interface StatsProps {
  stats: {
    total: number;
    dueNow: number;
    callsDue: number;
    waVoiceDue: number;
    replied: number;
    qualified: number;
    stalled: number;
    completedToday: number;
  };
}

const statCards = [
  { key: "total", label: "TOTAL LEADS", color: "text-slate-300", glow: "cyan" as const },
  { key: "dueNow", label: "DUE NOW", color: "neon-text-cyan", glow: "cyan" as const },
  { key: "callsDue", label: "CALLS DUE", color: "text-orange-400", glow: "purple" as const },
  { key: "waVoiceDue", label: "WA VOICE", color: "text-green-400", glow: "cyan" as const },
  { key: "replied", label: "REPLIED", color: "text-fuchsia-400", glow: "purple" as const },
  { key: "qualified", label: "QUALIFIED", color: "text-emerald-300", glow: "cyan" as const },
  { key: "stalled", label: "STALLED", color: "text-red-400", glow: "purple" as const },
  { key: "completedToday", label: "DONE TODAY", color: "text-cyan-300", glow: "cyan" as const },
];

export function StatsBar({ stats }: StatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
      {statCards.map((card, i) => (
        <motion.div
          key={card.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <GlassCard className="p-3 text-center" glow={card.glow} animate={false}>
            <motion.p
              className={`text-2xl font-bold font-mono ${card.color}`}
              key={stats[card.key as keyof typeof stats]}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
            >
              {stats[card.key as keyof typeof stats]}
            </motion.p>
            <p className="text-[9px] font-mono text-slate-500 tracking-widest mt-1">
              {card.label}
            </p>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );
}
