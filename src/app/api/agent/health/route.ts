import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "operational",
    service: "heimdell-crm",
    version: "1.0.0",
    timestamp_utc: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
