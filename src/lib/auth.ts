import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

const API_KEY_PREFIX = "hmdl_";

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function validateApiKey(
  request: NextRequest
): Promise<{ valid: boolean; error?: string; actor?: string }> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return { valid: false, error: "Missing Authorization header" };
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (!token.startsWith(API_KEY_PREFIX)) {
    return {
      valid: false,
      error: `Invalid key format. Keys must start with '${API_KEY_PREFIX}'`,
    };
  }

  const keyHash = hashKey(token);

  try {
    const apiKey = await prisma.apiKey.findUnique({
      where: { key_hash: keyHash },
    });

    if (!apiKey || !apiKey.active) {
      return { valid: false, error: "Invalid or inactive API key" };
    }

    return { valid: true, actor: apiKey.label };
  } catch {
    return { valid: false, error: "Auth verification failed" };
  }
}

export function withAuth(
  handler: (
    request: NextRequest,
    context: { actor: string; params?: Record<string, string> }
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, routeContext?: { params?: Promise<Record<string, string>> }) => {
    const auth = await validateApiKey(request);

    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error, code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const params = routeContext?.params ? await routeContext.params : undefined;
    return handler(request, { actor: auth.actor!, params });
  };
}

// ─── Idempotency Check ─────────────────────────────────────
export async function checkIdempotency(
  key: string | null
): Promise<{ duplicate: boolean; existingId?: string }> {
  if (!key) return { duplicate: false };

  const existing = await prisma.leadAction.findUnique({
    where: { idempotency_key: key },
  });

  if (existing) {
    return { duplicate: true, existingId: existing.id };
  }

  return { duplicate: false };
}

// ─── Send Limit Governor ───────────────────────────────────
export async function checkSendLimit(): Promise<{
  allowed: boolean;
  remaining: number;
}> {
  const today = new Date().toISOString().split("T")[0];

  let limit = await prisma.sendLimit.findUnique({
    where: { date_key: today },
  });

  if (!limit) {
    limit = await prisma.sendLimit.create({
      data: { date_key: today, count: 0, max_limit: 50 },
    });
  }

  if (limit.count >= limit.max_limit) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: limit.max_limit - limit.count };
}

export async function incrementSendCount(): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  await prisma.sendLimit.upsert({
    where: { date_key: today },
    update: { count: { increment: 1 } },
    create: { date_key: today, count: 1, max_limit: 50 },
  });
}

// ─── Utility: Generate API Key ─────────────────────────────
export async function generateApiKey(label: string): Promise<string> {
  const rawKey = `${API_KEY_PREFIX}${crypto.randomBytes(32).toString("hex")}`;
  const keyHash = hashKey(rawKey);

  await prisma.apiKey.create({
    data: { key_hash: keyHash, label, active: true },
  });

  return rawKey;
}
