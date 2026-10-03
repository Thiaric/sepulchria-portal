import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

async function logContributionEmail(input: {
  contributionId: string;
  recipient: string;
  status: "sent" | "skipped" | "error";
  providerMessageId?: string | null;
  error?: string | null;
}) {
  const admin = createAdminClient();

  await admin.from("support_contribution_email_log").insert({
    contribution_id: input.contributionId,
    kind: "thank_you",
    recipient: input.recipient,
    status: input.status,
    provider_message_id: input.providerMessageId ?? null,
    error: input.error ?? null,
  });
}

export async function sendContributionThankYouEmail(contributionId: string) {
  const admin = createAdminClient();

  const { data: alreadySent, error: sentLookupError } = await admin
    .from("support_contribution_email_log")
    .select("id, provider_message_id")
    .eq("contribution_id", contributionId)
    .eq("kind", "thank_you")
    .eq("status", "sent")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sentLookupError) {
    throw new Error(sentLookupError.message);
  }

  if (alreadySent) {
    return {
      sent: true,
      skipped: false,
      alreadySent: true,
      providerMessageId: alreadySent.provider_message_id ?? null,
    };
  }

  const { data: contribution, error } = await admin
    .from("support_contributions")
    .select("id, user_id, customer_email, amount_minor, currency, status")
    .eq("id", contributionId)
    .single();

  if (error || !contribution) {
    throw new Error(error?.message ?? "Contribution not found.");
  }

  let recipient = contribution.customer_email?.trim() ?? "";

  if (!recipient) {
    const { data: userData } = await admin.auth.admin.getUserById(
      contribution.user_id,
    );
    recipient = userData.user?.email?.trim() ?? "";
  }

  if (!recipient) {
    await logContributionEmail({
      contributionId,
      recipient: "unknown",
      status: "skipped",
      error: "Contribution has no recipient email address.",
    });
    throw new Error("Contribution has no recipient email address.");
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.CONTRIBUTIONS_EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    const message =
      "RESEND_API_KEY or CONTRIBUTIONS_EMAIL_FROM is not configured.";

    await logContributionEmail({
      contributionId,
      recipient,
      status: "skipped",
      error: message,
    });

    throw new Error(message);
  }

  const amount = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: contribution.currency || "GBP",
  }).format(Number(contribution.amount_minor ?? 0) / 100);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `contribution-thank-you/${contribution.id}`,
    },
    body: JSON.stringify({
      from,
      to: [recipient],
      subject: "Thank you for supporting Sepulchria",
      html: `
        <div style="font-family:Georgia,serif;background:#120d0a;color:#e8dcc4;padding:32px;">
          <div style="max-width:620px;margin:0 auto;border:1px solid #60482e;padding:28px;background:#17110d;">
            <p style="margin:0 0 8px;color:#a98250;font-size:12px;letter-spacing:.18em;text-transform:uppercase;">Sepulchria</p>
            <h1 style="margin:0 0 20px;color:#efd6aa;font-size:28px;font-weight:normal;">Thank you for your support</h1>
            <p style="font-family:Arial,sans-serif;line-height:1.7;color:#c9bda8;">
              Your one-off contribution of <strong>${amount}</strong> has been received.
            </p>
            <p style="font-family:Arial,sans-serif;line-height:1.7;color:#c9bda8;">
              Your support helps with the continued development and running of Sepulchria.
            </p>
            <p style="font-family:Arial,sans-serif;line-height:1.7;color:#9f927f;">
              Contribution reference: ${contribution.id}
            </p>
          </div>
        </div>
      `,
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | { id?: string; message?: string }
    | null;

  if (!response.ok) {
    const message =
      payload?.message || `Email provider returned HTTP ${response.status}.`;

    await logContributionEmail({
      contributionId,
      recipient,
      status: "error",
      error: message,
    });

    throw new Error(message);
  }

  await logContributionEmail({
    contributionId,
    recipient,
    status: "sent",
    providerMessageId: payload?.id ?? null,
  });

  return { sent: true, skipped: false };
}
