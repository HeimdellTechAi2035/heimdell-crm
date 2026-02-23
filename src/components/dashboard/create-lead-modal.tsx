"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GlassPanel } from "@/components/ui/glass-card";
import { NeonButton } from "@/components/ui/neon-button";

interface CreateLeadModalProps {
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}

export function CreateLeadModal({ onClose, onSubmit }: CreateLeadModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    company: "",
    key_decision_maker: "",
    role: "",
    emails: "",
    number: "",
    linkedin_clean: "",
    facebook_clean: "",
    insta_clean: "",
    owner: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        ...form,
        emails: form.emails
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean),
      });
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/50 text-sm text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-lg"
      >
        <GlassPanel className="glow-cyan">
          <h2 className="text-lg font-bold neon-text-cyan mb-4">
            + NEW LEAD
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase">
                  Company *
                </label>
                <input
                  className={inputClass}
                  value={form.company}
                  onChange={(e) =>
                    setForm({ ...form, company: e.target.value })
                  }
                  required
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase">
                  Decision Maker *
                </label>
                <input
                  className={inputClass}
                  value={form.key_decision_maker}
                  onChange={(e) =>
                    setForm({ ...form, key_decision_maker: e.target.value })
                  }
                  required
                  placeholder="Jane Doe"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase">
                  Role *
                </label>
                <input
                  className={inputClass}
                  value={form.role}
                  onChange={(e) =>
                    setForm({ ...form, role: e.target.value })
                  }
                  required
                  placeholder="CEO"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase">
                  Phone
                </label>
                <input
                  className={inputClass}
                  value={form.number}
                  onChange={(e) =>
                    setForm({ ...form, number: e.target.value })
                  }
                  placeholder="+1 555 0123"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-500 uppercase">
                Emails (comma-separated)
              </label>
              <input
                className={inputClass}
                value={form.emails}
                onChange={(e) =>
                  setForm({ ...form, emails: e.target.value })
                }
                placeholder="jane@acme.com, jdoe@acme.com"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase">
                  LinkedIn URL
                </label>
                <input
                  className={inputClass}
                  value={form.linkedin_clean}
                  onChange={(e) =>
                    setForm({ ...form, linkedin_clean: e.target.value })
                  }
                  placeholder="linkedin.com/in/..."
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase">
                  Facebook URL
                </label>
                <input
                  className={inputClass}
                  value={form.facebook_clean}
                  onChange={(e) =>
                    setForm({ ...form, facebook_clean: e.target.value })
                  }
                  placeholder="facebook.com/..."
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase">
                  Instagram URL
                </label>
                <input
                  className={inputClass}
                  value={form.insta_clean}
                  onChange={(e) =>
                    setForm({ ...form, insta_clean: e.target.value })
                  }
                  placeholder="instagram.com/..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase">
                  Owner
                </label>
                <input
                  className={inputClass}
                  value={form.owner}
                  onChange={(e) =>
                    setForm({ ...form, owner: e.target.value })
                  }
                  placeholder="agent-name"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase">
                  Notes
                </label>
                <input
                  className={inputClass}
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                  placeholder="Initial notes..."
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <NeonButton type="submit" variant="cyan" loading={loading}>
                CREATE LEAD
              </NeonButton>
              <NeonButton
                type="button"
                variant="red"
                onClick={onClose}
              >
                CANCEL
              </NeonButton>
            </div>
          </form>
        </GlassPanel>
      </motion.div>
    </motion.div>
  );
}
