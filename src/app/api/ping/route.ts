import { NextResponse } from "next/server";

// ─── GET /api/ping ──────────────────────────────────────────
// Health check endpoint for external monitoring (OpenClaw, AWS ELB, etc.)
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "heimdell-crm",
      timestamp_utc: new Date().toISOString(),
      version: "1.0.0",
      environment: process.env.NODE_ENV || "production",
    },
    { status: 200 }
  );
}
