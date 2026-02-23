"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  glow?: "cyan" | "purple" | "none";
  animate?: boolean;
  onClick?: () => void;
}

export function GlassCard({
  children,
  className = "",
  glow = "cyan",
  animate = true,
  onClick,
}: GlassCardProps) {
  const glowClass =
    glow === "cyan"
      ? "glow-cyan"
      : glow === "purple"
      ? "glow-purple"
      : "";

  const Component = animate ? motion.div : "div";

  const props = animate
    ? {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3 },
        whileHover: onClick ? { scale: 1.005 } : undefined,
      }
    : {};

  return (
    <Component
      className={`glass rounded-xl ${glowClass} ${className} ${
        onClick ? "cursor-pointer" : ""
      }`}
      onClick={onClick}
      {...props}
    >
      {children}
    </Component>
  );
}

export function GlassPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`glass-strong rounded-2xl p-6 ${className}`}>
      {children}
    </div>
  );
}
