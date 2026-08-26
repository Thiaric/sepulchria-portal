"use server";

import { createHash, randomBytes } from "crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAdminSection } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function getSiteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");

  if (!host) {
    throw new Error(
      "Unable to determine the site URL. Set NEXT_PUBLIC_SITE_URL.",
    );
  }

  const proto =
    h.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");

  return `${proto}://${host}`;
}

async function sendInvitationEmail(
  email: string,
  name: string,
  invitationUrl: string,
) {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.REGISTRATION_INVITE_FROM_EMAIL;

  if (!apiKey || !from) {
    return {
      sent: false,
      reason:
        "Email delivery is not configured. Copy the generated invitation link and send it manually.",
    };
  }

  const response = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Your invitation to Sepulchria",
        text: `Greetings,

Your application to join the Sepulchria Closed Alpha has been accepted.

While the City Gates remain closed to the public, an invitation has been issued specifically to this email address.

Follow the invitation below to complete your account and begin your journey into Sepulchria:

${invitationUrl}

This invitation is intended only for the email address to which it was sent and expires in 7 days.

If you did not apply to join Sepulchria, you may safely ignore this message.

Sepulchria
Where the Fallen left their mark.`,
        html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your invitation to Sepulchria</title>
</head>
<body style="margin:0;padding:0;background:#0d0b0a;font-family:Georgia,'Times New Roman',serif;color:#e8dcc4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0d0b0a;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#15100d;border:1px solid #60482e;">
        <tr>
          <td align="center" style="padding:38px 28px 22px;border-bottom:1px solid #4a3725;">
            <img src="https://sepulchria-portal.vercel.app/logo/logo.png" alt="Sepulchria" width="120" style="display:block;max-width:120px;height:auto;margin:0 auto 18px;">
            <div style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#8d714d;">The City of the Fallen</div>
            <h1 style="margin:12px 0 0;font-size:34px;font-weight:normal;line-height:1.15;color:#d8bf91;">The City Gates Open For You</h1>
            <div style="margin:20px auto 0;width:60px;border-top:1px solid #80613b;"></div>
          </td>
        </tr>
        <tr>
          <td style="padding:38px 42px 20px;">
            <p style="margin:0 0 22px;font-size:16px;line-height:1.8;color:#d5c8b3;">Greetings,</p>
            <p style="margin:0 0 20px;font-size:16px;line-height:1.8;color:#c8baa4;">Your application to join the Sepulchria Closed Alpha has been accepted.</p>
            <p style="margin:0 0 20px;font-size:16px;line-height:1.8;color:#c8baa4;">While the City Gates remain closed to the public, an invitation has been issued specifically to this email address.</p>
            <p style="margin:0 0 28px;font-size:16px;line-height:1.8;color:#c8baa4;">Follow the invitation below to complete your account and begin your journey into Sepulchria.</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr><td align="center" style="padding:8px 0 34px;">
                <a href="${invitationUrl}" style="display:inline-block;background:#8a6840;border:1px solid #b28b58;color:#fff3d6;text-decoration:none;padding:15px 30px;font-size:13px;letter-spacing:2px;text-transform:uppercase;font-family:Georgia,'Times New Roman',serif;">Accept Invitation</a>
              </td></tr>
            </table>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #3e3023;border-bottom:1px solid #3e3023;">
              <tr><td style="padding:20px 10px;text-align:center;">
                <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#806747;">Beyond the gates</div>
                <div style="margin-top:8px;font-size:14px;line-height:1.7;color:#a9977c;">Create your account. Forge your character. Enter the Living World.</div>
              </td></tr>
            </table>
            <p style="margin:28px 0 0;font-size:12px;line-height:1.7;color:#786d60;">This invitation is intended only for the email address to which it was sent. If you did not apply to join Sepulchria, you may safely ignore this message.</p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:24px 30px 30px;">
            <div style="font-size:18px;color:#b89b6d;">&#10022;</div>
            <div style="margin-top:10px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#665541;">Sepulchria</div>
            <div style="margin-top:6px;font-size:11px;color:#5e554a;">Where the Fallen left their mark.</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      }),
    },
  );

  if (!response.ok) {
    const text =
      await response.text().catch(() => "");

    throw new Error(
      `Invitation was created but the email could not be sent: ${
        text || response.status
      }`,
    );
  }

  return { sent: true, reason: null };
}

export async function sendRegistrationInvitationAction(
  formData: FormData,
) {
  const staff =
    await requireAdminSection("new_register");

  const applicationId =
    String(formData.get("application_id") ?? "").trim();

  if (!applicationId) {
    throw new Error("Missing application id.");
  }

  const admin = createAdminClient();

  const { data: application, error } = await admin
    .from("registration_applications")
    .select("id,name,email,status")
    .eq("id", applicationId)
    .maybeSingle();

  if (error || !application) {
    throw new Error(
      error?.message ??
        "Registration application not found.",
    );
  }

  const token =
    randomBytes(32).toString("base64url");
  const hash = tokenHash(token);

  const expiresAt =
    new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

  const origin = await getSiteOrigin();
  const invitationUrl =
    `${origin}/auth/sign-up?invite=${encodeURIComponent(token)}`;

  const { error: insertError } = await admin
    .from("registration_invitations")
    .insert({
      application_id: application.id,
      email: application.email.toLowerCase(),
      token_hash: hash,
      invitation_url: invitationUrl,
      expires_at: expiresAt,
      created_by: staff.userId,
    });

  if (insertError) {
    throw new Error(insertError.message);
  }

  let sent = false;
  let warning = "";

  try {
    const emailResult = await sendInvitationEmail(
      application.email,
      application.name,
      invitationUrl,
    );
    sent = emailResult.sent;
    warning = emailResult.reason ?? "";
  } catch (caught) {
    warning =
      caught instanceof Error
        ? caught.message
        : "Email delivery failed.";
  }

  const now = new Date().toISOString();

  if (sent) {
    const { error: applicationUpdateError } = await admin
      .from("registration_applications")
      .update({
        status: "invited",
        invited_at: now,
        updated_at: now,
      })
      .eq("id", application.id);

    if (applicationUpdateError) {
      throw new Error(applicationUpdateError.message);
    }
  }

  await admin
    .from("registration_invitations")
    .update({
      sent_at: sent ? now : null,
    })
    .eq("token_hash", hash);

  revalidatePath("/admin/registrations");

  const params = new URLSearchParams();
  params.set("inviteLink", invitationUrl);
  params.set("sent", sent ? "1" : "0");

  if (warning) {
    params.set("warning", warning.slice(0, 500));
  }

  redirect(`/admin/registrations?${params.toString()}`);
}

export async function declineRegistrationApplicationAction(
  formData: FormData,
) {
  await requireAdminSection("new_register");

  const applicationId =
    String(formData.get("application_id") ?? "").trim();

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const {
    data: application,
    error: applicationError,
  } = await admin
    .from("registration_applications")
    .select("id,status")
    .eq("id", applicationId)
    .maybeSingle();

  if (applicationError || !application) {
    throw new Error(
      applicationError?.message ??
        "Registration application not found.",
    );
  }

  if (application.status !== "pending") {
    throw new Error(
      "Only pending applications can be declined.",
    );
  }

  const { error } = await admin
    .from("registration_applications")
    .update({
      status: "declined",
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", applicationId)
    .eq("status", "pending");

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/registrations");
}
