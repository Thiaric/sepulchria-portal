import "server-only";

import Stripe from "stripe";

type StripeEnvironment = "test" | "live";

function stripeEnvironment(): StripeEnvironment {
  const value = (process.env.STRIPE_ENVIRONMENT ?? "sandbox").trim().toLowerCase();
  return value === "live" || value === "production" ? "live" : "test";
}

function stripeSecretKey() {
  const value = process.env.STRIPE_SECRET_KEY?.trim();

  if (!value) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  if (stripeEnvironment() === "test" && !value.startsWith("sk_test_")) {
    throw new Error(
      "STRIPE_ENVIRONMENT is sandbox/test but STRIPE_SECRET_KEY is not a test key.",
    );
  }

  if (stripeEnvironment() === "live" && !value.startsWith("sk_live_")) {
    throw new Error(
      "STRIPE_ENVIRONMENT is live/production but STRIPE_SECRET_KEY is not a live key.",
    );
  }

  return value;
}

function stripeClient() {
  return new Stripe(stripeSecretKey());
}

export async function createContributionCheckout(input: {
  amountMinor: number;
  customerEmail: string;
  contributionId: string;
  userId: string;
  characterId?: string | null;
}) {
  const stripe = stripeClient();

  const metadata: Record<string, string> = {
    sepulchria_payment_type: "contribution",
    contribution_id: input.contributionId,
    sepulchria_user_id: input.userId,
  };

  if (input.characterId) {
    metadata.sepulchria_character_id = input.characterId;
  }

  const params = {
    mode: "payment",
    ui_mode: "embedded_page",
    redirect_on_completion: "never",
    submit_type: "donate",
    customer_email: input.customerEmail,
    client_reference_id: input.contributionId,
    line_items: [
      {
        price_data: {
          currency: "gbp",
          unit_amount: Math.trunc(input.amountMinor),
          tax_behavior: "inclusive",
          product_data: {
            name: "Support Sepulchria",
            description:
              "Voluntary one-off contribution to support Sepulchria.",
            metadata: {
              sepulchria_payment_type: "contribution",
            },
          },
        },
        quantity: 1,
      },
    ],
    metadata,
    payment_intent_data: {
      metadata,
    },
    managed_payments: {
      enabled: true,
    },
  } as Stripe.Checkout.SessionCreateParams & {
    managed_payments: { enabled: true };
  };

  const session = await stripe.checkout.sessions.create(params);

  if (!session.client_secret) {
    throw new Error(
      "Stripe created a contribution Checkout Session without a client secret.",
    );
  }

  return {
    clientSecret: session.client_secret,
    checkoutSessionId: session.id,
  };
}
