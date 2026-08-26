import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getRegistrationsOpen } from "@/lib/registration/get-registrations-open";
import {
  consumeSecurityRateLimit,
  getClientIp,
} from "@/lib/security/rate-limit";

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

export async function POST(request: Request) {
  const registrationsOpen = await getRegistrationsOpen();

  if (registrationsOpen) {
    return NextResponse.json(
      {
        error:
          "Registrations are currently open. Please use the normal registration form.",
      },
      { status: 409 },
    );
  }

  try {
    const rateLimit =
      await consumeSecurityRateLimit({
        scope:
          "registration_application_ip",
        identifier:
          getClientIp(request),
        limit: 5,
        windowSeconds: 60 * 60,
      });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error:
            "Too many applications have been submitted from this connection. Please try again later.",
          retryAfterSeconds:
            rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.max(
                1,
                rateLimit.retryAfterSeconds,
              ),
            ),
          },
        },
      );
    }
  } catch (error) {
    console.error(
      "Unable to apply registration application rate limit:",
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

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid application." },
      { status: 400 },
    );
  }

  if (clean((body as any).website, 200)) {
    return NextResponse.json({ ok: true });
  }

  const name = clean((body as any).name, 120);
  const email =
    clean((body as any).email, 320).toLowerCase();
  const heardAbout =
    clean((body as any).heardAbout, 3000);
  const roleplayEnjoyment =
    clean((body as any).roleplayEnjoyment, 6000);
  const rpgExperience =
    clean((body as any).rpgExperience, 6000);

  if (
    !name ||
    !email ||
    !heardAbout ||
    !roleplayEnjoyment ||
    !rpgExperience
  ) {
    return NextResponse.json(
      { error: "Every field is required." },
      { status: 400 },
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const {
    data: emailRegistered,
    error: emailCheckError,
  } = await admin.rpc(
    "email_is_registered",
    {
      check_email: email,
    },
  );

  if (emailCheckError) {
    console.error(
      "Unable to check whether application email is already registered:",
      emailCheckError.message,
    );

    return NextResponse.json(
      {
        error:
          "Unable to check this email address right now.",
      },
      { status: 500 },
    );
  }

  if (emailRegistered === true) {
    return NextResponse.json({ ok: true });
  }

  const { data: existing } = await admin
    .from("registration_applications")
    .select("id,status")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      {
        error:
          "An application has already been submitted with this email address.",
      },
      { status: 409 },
    );
  }

  const { error } = await admin
    .from("registration_applications")
    .insert({
      name,
      email,
      heard_about: heardAbout,
      roleplay_enjoyment: roleplayEnjoyment,
      rpg_experience: rpgExperience,
      status: "pending",
    });

  if (error) {
    return NextResponse.json(
      {
        error:
          error.code === "23505"
            ? "An application has already been submitted with this email address."
            : "Unable to submit the application right now.",
      },
      {
        status:
          error.code === "23505" ? 409 : 500,
      },
    );
  }

  return NextResponse.json({ ok: true });
}
