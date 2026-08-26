import "server-only";

import { createHmac } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

export type SecurityRateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

function getHashSecret() {
  const secret =
    process.env.RATE_LIMIT_HASH_SECRET ??
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error(
      "Rate limiting requires RATE_LIMIT_HASH_SECRET, SUPABASE_SECRET_KEY, or SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return secret;
}

function hashIdentifier(identifier: string) {
  return createHmac("sha256", getHashSecret())
    .update(identifier)
    .digest("hex");
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  const ip =
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    "unknown";

  return ip.slice(0, 200);
}

export async function consumeSecurityRateLimit({
  scope,
  identifier,
  limit,
  windowSeconds,
}: {
  scope: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
}): Promise<SecurityRateLimitResult> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc(
    "consume_security_rate_limit",
    {
      p_scope: scope,
      p_identifier_hash: hashIdentifier(identifier),
      p_limit: limit,
      p_window_seconds: windowSeconds,
    },
  );

  if (error) {
    throw new Error(
      `Unable to apply security rate limit: ${error.message}`,
    );
  }

  const row = Array.isArray(data) ? data[0] ?? null : data;

  if (!row) {
    throw new Error("Unable to apply security rate limit.");
  }

  return {
    allowed: row.allowed === true,
    remaining: Number.isFinite(Number(row.remaining))
      ? Math.max(0, Number(row.remaining))
      : 0,
    retryAfterSeconds: Number.isFinite(
      Number(row.retry_after_seconds),
    )
      ? Math.max(0, Number(row.retry_after_seconds))
      : 0,
  };
}
