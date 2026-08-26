import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getRegistrationsOpen } from "@/lib/registration/get-registrations-open";
import { getValidRegistrationInvitation } from "@/lib/registration/invitations";

export async function POST(
  request: Request,
) {
  try {
    const body = await request.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";
    const invitationToken =
      typeof body.invitationToken === "string"
        ? body.invitationToken.trim()
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

    const registrationsOpen =
      await getRegistrationsOpen();

    if (!registrationsOpen) {
      const invitation =
        await getValidRegistrationInvitation(
          invitationToken,
        );

      if (
        !invitation ||
        invitation.email.toLowerCase() !== email
      ) {
        return NextResponse.json(
          {
            error:
              "This registration invitation is invalid or does not match this email address.",
          },
          { status: 403 },
        );
      }
    } else {
      // Do not expose account-existence information on the
      // public registration flow. Supabase handles duplicate
      // signup attempts without this privileged lookup.
      return NextResponse.json({
        exists: false,
      });
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