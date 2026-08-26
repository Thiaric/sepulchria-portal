import { NextResponse } from "next/server";

import {
  consumeSecurityRateLimit,
  getClientIp,
} from "@/lib/security/rate-limit";

type AuthRateLimitAction =
  | "login"
  | "password_reset";

const RULES: Record<
  AuthRateLimitAction,
  {
    limit: number;
    windowSeconds: number;
  }
> = {
  login: {
    limit: 10,
    windowSeconds: 10 * 60,
  },
  password_reset: {
    limit: 5,
    windowSeconds: 60 * 60,
  },
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const action =
    body &&
    typeof body === "object" &&
    typeof (body as any).action === "string"
      ? String((body as any).action)
      : "";

  if (
    action !== "login" &&
    action !== "password_reset"
  ) {
    return NextResponse.json(
      { error: "Invalid security request." },
      { status: 400 },
    );
  }

  const rule = RULES[action as AuthRateLimitAction];

  try {
    const result = await consumeSecurityRateLimit({
      scope: `auth_${action}_ip`,
      identifier: getClientIp(request),
      limit: rule.limit,
      windowSeconds: rule.windowSeconds,
    });

    if (!result.allowed) {
      return NextResponse.json(
        {
          error:
            action === "login"
              ? "Too many login attempts. Please wait before trying again."
              : "Too many password reset requests. Please wait before trying again.",
          retryAfterSeconds: result.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.max(1, result.retryAfterSeconds),
            ),
          },
        },
      );
    }

    return NextResponse.json({
      ok: true,
      remaining: result.remaining,
    });
  } catch (error) {
    console.error(
      "Unable to apply auth rate limit:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Security verification is temporarily unavailable. Please try again shortly.",
      },
      { status: 503 },
    );
  }
}
