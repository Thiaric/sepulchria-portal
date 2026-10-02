"use client";

import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getContributionCheckoutStatus,
  startContributionCheckout,
  type ContributionStripeState,
} from "@/app/(portal)/contribution/actions";

const initialState: ContributionStripeState = {
  ok: false,
  error: null,
  clientSecret: null,
  checkoutSessionId: null,
  amountMinor: null,
};

const publishableKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";

const stripePromise = publishableKey
  ? loadStripe(publishableKey)
  : Promise.resolve(null);

const PRESETS = [3, 5, 10, 20] as const;

function moneyLabel(amountMinor: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amountMinor / 100);
}

function ContributionCheckoutModal({
  clientSecret,
  checkoutSessionId,
  onPaid,
  onClose,
}: {
  clientSecret: string;
  checkoutSessionId: string;
  onPaid: () => void;
  onClose: () => void;
}) {
  const [finalising, setFinalising] = useState(false);
  const [finaliseError, setFinaliseError] = useState<string | null>(null);

  const handleComplete = useCallback(() => {
    setFinalising(true);
    setFinaliseError(null);

    void (async () => {
      const deadline = Date.now() + 20_000;

      while (Date.now() < deadline) {
        try {
          const result = await getContributionCheckoutStatus(
            checkoutSessionId,
          );

          if (result.paid) {
            onPaid();
            return;
          }
        } catch {
          // Webhook finalisation can briefly lag behind Checkout.
        }

        await new Promise((resolve) =>
          window.setTimeout(resolve, 350),
        );
      }

      setFinaliseError(
        "Payment completed, but Sepulchria is still confirming your contribution. Please close this window and check again shortly.",
      );
    })();
  }, [checkoutSessionId, onPaid]);

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/75 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Secure contribution checkout"
    >
      <div className="relative flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden border border-[rgb(var(--sep-colour-987344))]/70 bg-[rgb(var(--sep-colour-100c09))] shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-[rgb(var(--sep-colour-60482e))]/45 px-4 py-3">
          <div>
            <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
              Support Sepulchria
            </p>
            <p className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
              Secure Contribution
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="border border-[rgb(var(--sep-colour-60482e))]/55 px-3 py-2 text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d7c4a5))]"
          >
            Close
          </button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-y-auto bg-white">
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{
              clientSecret,
              onComplete: handleComplete,
            }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>

          {finalising ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/95 p-6 text-center">
              <div className="max-w-sm">
                <p className="font-serif text-2xl text-[#24180f]">
                  Confirming Contribution
                </p>
                <p className="mt-3 text-sm leading-6 text-[#6a5849]">
                  Your payment is complete. Sepulchria is confirming it now.
                </p>

                {finaliseError ? (
                  <p className="mt-4 text-sm leading-6 text-red-700">
                    {finaliseError}
                  </p>
                ) : (
                  <p className="mt-4 text-[10px] uppercase tracking-[0.16em] text-[#8b735f]">
                    Please wait...
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ContributionCheckout() {
  const [state, action, pending] = useActionState(
    startContributionCheckout,
    initialState,
  );

  const [amount, setAmount] = useState("5.00");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [completedAmount, setCompletedAmount] = useState<number | null>(null);
  const openedSessionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!state.ok || !state.clientSecret || !state.checkoutSessionId) {
      return;
    }

    if (openedSessionRef.current === state.checkoutSessionId) {
      return;
    }

    openedSessionRef.current = state.checkoutSessionId;
    setCheckoutOpen(true);
  }, [state.ok, state.clientSecret, state.checkoutSessionId]);

  const closeCheckout = useCallback(() => {
    setCheckoutOpen(false);
  }, []);

  const completeCheckout = useCallback(() => {
    setCompletedAmount(state.amountMinor);
    setCheckoutOpen(false);
  }, [state.amountMinor]);

  return (
    <>
      <form action={action} className="mt-6">
        <input type="hidden" name="amount" value={amount} />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRESETS.map((preset) => {
            const value = preset.toFixed(2);
            const active = amount === value;

            return (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(value)}
                className={[
                  "border px-4 py-4 font-serif text-xl transition",
                  active
                    ? "border-[rgb(var(--sep-colour-b58a50))] bg-[rgb(var(--sep-colour-332719))] text-[rgb(var(--sep-colour-f0d6aa))]"
                    : "border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))] text-[rgb(var(--sep-colour-cbb28a))] hover:border-[rgb(var(--sep-colour-8d6d3e))]",
                ].join(" ")}
              >
                £{preset}
              </button>
            );
          })}
        </div>

        <label className="mt-4 block">
          <span className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
            Or choose another amount
          </span>

          <div className="mt-2 flex items-center border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))]">
            <span className="px-3 font-serif text-lg text-[rgb(var(--sep-colour-cbb28a))]">
              £
            </span>

            <input
              type="number"
              min="1"
              max="500"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm text-[rgb(var(--sep-colour-e8dcc4))] outline-none"
            />
          </div>
        </label>

        <p className="mt-3 text-[10px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
          Minimum £1.00 · Maximum £500.00 · One-off payment only.
        </p>

        <button
          type="submit"
          disabled={pending || !publishableKey}
          className="mt-5 w-full border border-[rgb(var(--sep-colour-987344))]/70 bg-[rgb(var(--sep-colour-2a1d12))] px-5 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd9aa))] transition hover:border-[rgb(var(--sep-colour-b78b50))] disabled:cursor-wait disabled:opacity-55"
        >
          {pending ? "Opening secure checkout..." : "Support Sepulchria"}
        </button>

        {!publishableKey ? (
          <p className="mt-3 text-[10px] leading-5 text-red-300">
            Stripe is not configured in this environment.
          </p>
        ) : null}

        {state.error ? (
          <p className="mt-3 text-[10px] leading-5 text-red-300">
            {state.error}
          </p>
        ) : null}

        {completedAmount !== null ? (
          <div className="mt-5 border border-[rgb(var(--sep-colour-8d6d3e))]/65 bg-[rgb(var(--sep-colour-21170f))] p-4">
            <p className="font-serif text-xl text-[rgb(var(--sep-colour-efd6aa))]">
              Thank you for supporting Sepulchria.
            </p>
            <p className="mt-2 text-xs leading-5 text-[rgb(var(--sep-colour-a99b89))]">
              Your {moneyLabel(completedAmount)} contribution has been received. A confirmation email will be sent to your account email address.
            </p>
          </div>
        ) : null}
      </form>

      {checkoutOpen && state.clientSecret && state.checkoutSessionId ? (
        <ContributionCheckoutModal
          clientSecret={state.clientSecret}
          checkoutSessionId={state.checkoutSessionId}
          onPaid={completeCheckout}
          onClose={closeCheckout}
        />
      ) : null}
    </>
  );
}
