"use client";

import { motion } from "framer-motion";
import { ReactNode, ButtonHTMLAttributes } from "react";

interface NeonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "cyan" | "purple" | "red" | "green";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const variantStyles = {
  cyan: "border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400/60 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]",
  purple:
    "border-purple-500/40 text-purple-400 hover:bg-purple-500/10 hover:border-purple-400/60 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]",
  red: "border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-400/60 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]",
  green:
    "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-400/60 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]",
};

const sizeStyles = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export function NeonButton({
  children,
  variant = "cyan",
  size = "md",
  loading = false,
  className = "",
  disabled,
  ...props
}: NeonButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={`
        relative inline-flex items-center justify-center gap-2
        rounded-lg border font-medium font-mono
        backdrop-blur-sm bg-slate-900/50
        transition-all duration-200
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      disabled={disabled || loading}
      {...(props as any)}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </motion.button>
  );
}
