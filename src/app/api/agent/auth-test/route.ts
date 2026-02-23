import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);

  if (!auth.valid) {
    return NextResponse.json(
      { authenticated: false, error: auth.error },
      { status: 401 }
    );
  }

  return NextResponse.json({
    authenticated: true,
    actor: auth.actor,
    timestamp_utc: new Date().toISOString(),
    permissions: [
      "leads:read",
      "leads:write",
      "pipeline:advance",
      "actions:write",
      "email:send",
    ],
  });
}
