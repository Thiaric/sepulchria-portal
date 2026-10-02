"use server";

import { createContributionCheckout } from "@/lib/contributions/stripe-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ContributionStripeState = {
  ok: boolean;
  error: string | null;
  clientSecret: string | null;
  checkoutSessionId: string | null;
  amountMinor: number | null;
};

const MINIMUM_AMOUNT_MINOR = 100;
const MAXIMUM_AMOUNT_MINOR = 50_000;

function failure(error: string): ContributionStripeState {
  return {
    ok: false,
    error,
    clientSecret: null,
    checkoutSessionId: null,
    amountMinor: null,
  };
}

function parseAmountMinor(raw: string) {
  const normalized = raw.trim();

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return null;

  const minor = Math.round(amount * 100);

  if (minor < MINIMUM_AMOUNT_MINOR || minor > MAXIMUM_AMOUNT_MINOR) {
    return null;
  }

  return minor;
}

export async function getContributionCheckoutStatus(
  checkoutSessionId: string,
): Promise<{ status: string | null; paid: boolean }> {
  const sessionId = checkoutSessionId.trim();

  if (!sessionId) {
    return { status: null, paid: false };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: null, paid: false };
  }

  const { data: contribution, error } = await admin
    .from("support_contributions")
    .select("status")
    .eq("user_id", user.id)
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (error || !contribution) {
    return { status: null, paid: false };
  }

  return {
    status: contribution.status,
    paid:
      contribution.status === "paid" ||
      contribution.status === "partially_refunded" ||
      contribution.status === "refunded",
  };
}

export async function startContributionCheckout(
  _previousState: ContributionStripeState,
  formData: FormData,
): Promise<ContributionStripeState> {
  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return failure("Stripe is not configured yet.");
  }

  const amountMinor = parseAmountMinor(
    String(formData.get("amount") ?? ""),
  );

  if (amountMinor === null) {
    return failure("Choose an amount between £1.00 and £500.00.");
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return failure("You must be signed in.");
  }

  const customerEmail = user.email?.trim() ?? "";

  if (!customerEmail) {
    return failure(
      "Your account does not have an email address for the contribution receipt.",
    );
  }

  const { data: character } = await admin
    .from("characters")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_system", false)
    .maybeSingle();

  const { data: contribution, error: insertError } = await admin
    .from("support_contributions")
    .insert({
      user_id: user.id,
      character_id: character?.id ?? null,
      customer_email: customerEmail,
      amount_minor: amountMinor,
      currency: "GBP",
      status: "pending",
      stripe_environment: (
        process.env.STRIPE_ENVIRONMENT ?? "sandbox"
      )
        .trim()
        .toLowerCase(),
    })
    .select("id")
    .single();

  if (insertError || !contribution) {
    return failure(
      insertError?.message ?? "Unable to start the contribution.",
    );
  }

  try {
    const checkout = await createContributionCheckout({
      amountMinor,
      customerEmail,
      contributionId: contribution.id,
      userId: user.id,
      characterId: character?.id ?? null,
    });

    const { error: updateError } = await admin
      .from("support_contributions")
      .update({
        stripe_checkout_session_id: checkout.checkoutSessionId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", contribution.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return {
      ok: true,
      error: null,
      clientSecret: checkout.clientSecret,
      checkoutSessionId: checkout.checkoutSessionId,
      amountMinor,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await admin
      .from("support_contributions")
      .update({
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", contribution.id);

    return failure(message);
  }
}
