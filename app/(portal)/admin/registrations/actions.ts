"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAdminSection } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

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

  if (
    application.status === "registered" ||
    application.status === "declined"
  ) {
    throw new Error(
      "This application can no longer be invited.",
    );
  }

  const origin = await getSiteOrigin();
  const redirectTo =
    `${origin}/auth/complete-invitation`;

  const {
    data: inviteData,
    error: inviteError,
  } = await admin.auth.admin.inviteUserByEmail(
    application.email,
    {
      redirectTo,
      data: {
        registration_application_id: application.id,
        registration_applicant_name: application.name,
        registration_source: "closed_alpha",
      },
    },
  );

  if (inviteError) {
    const params = new URLSearchParams();
    params.set(
      "inviteError",
      inviteError.message.slice(0, 500),
    );

    redirect(
      `/admin/registrations?${params.toString()}`,
    );
  }

  const now = new Date().toISOString();

  const { error: historyError } = await admin
    .from("registration_auth_invitations")
    .insert({
      application_id: application.id,
      auth_user_id: inviteData.user?.id ?? null,
      email: application.email.toLowerCase(),
      created_by: staff.userId,
      sent_at: now,
    });

  if (historyError) {
    throw new Error(
      `Supabase sent the invitation, but invitation history could not be saved: ${historyError.message}`,
    );
  }

  const { error: updateError } = await admin
    .from("registration_applications")
    .update({
      status: "invited",
      invited_at: now,
      updated_at: now,
    })
    .eq("id", application.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath("/admin/registrations");

  const params = new URLSearchParams();
  params.set("inviteSent", "1");
  params.set("inviteEmail", application.email);

  redirect(
    `/admin/registrations?${params.toString()}`,
  );
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
