import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
) {
  try {
    const body = await request.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    if (!email) {
      return NextResponse.json(
        {
          error:
            "Email address is required.",
        },
        { status: 400 },
      );
    }

    const supabase =
      createAdminClient();

    const {
      data,
      error,
    } = await supabase.rpc(
      "email_is_registered",
      {
        check_email: email,
      },
    );

    if (error) {
      console.error(
        "Email check failed:",
        error,
      );

      return NextResponse.json(
        {
          error:
            "Unable to check this email address.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      exists: data === true,
    });
  } catch (error) {
    console.error(
      "Email check error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to check this email address.",
      },
      { status: 500 },
    );
  }
}