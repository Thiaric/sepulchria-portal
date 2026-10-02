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

type ContributionOption = {
  id: string;
  productId: string;
  priceId: string | null;
  pricingMode: "fixed" | "custom";
  productName: string;
  description: string;
  amountMinor: number | null;
  currency: string;
  minAmountMinor: number | null;
  maxAmountMinor: number | null;
  sortOrder: number;
};

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

function moneyLabel(amountMinor: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
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
          const result = await getContributionCheckoutStatus(checkoutSessionId);
          if (result.paid) {
            onPaid();
            return;
          }
        } catch {}

        await new Promise((resolve) => window.setTimeout(resolve, 350));
      }

      setFinaliseError(
        "Payment completed, but Sepulchria is still confirming your contribution.",
      );
    })();
  }, [checkoutSessionId, onPaid]);

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/75 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden border border-[rgb(var(--sep-colour-987344))]/70 bg-[rgb(var(--sep-colour-100c09))] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[rgb(var(--sep-colour-60482e))]/45 px-4 py-3">
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
            options={{ clientSecret, onComplete: handleComplete }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>

          {finalising ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/95 p-6 text-center">
              <div className="max-w-sm">
                <p className="font-serif text-2xl text-[#24180f]">
                  Confirming Contribution
                </p>
                {finaliseError ? (
                  <p className="mt-4 text-sm text-red-700">{finaliseError}</p>
                ) : (
                  <p className="mt-3 text-sm text-[#6a5849]">Please wait...</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ContributionCheckout({
  options,
}: {
  options: ContributionOption[];
}) {
  const [state, action, pending] = useActionState(
    startContributionCheckout,
    initialState,
  );

  const [selectedOptionId, setSelectedOptionId] = useState(options[0]?.id ?? "");
  const [customAmount, setCustomAmount] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [completedAmount, setCompletedAmount] = useState<number | null>(null);
  const openedSessionRef = useRef<string | null>(null);

  const selected =
    options.find((option) => option.id === selectedOptionId) ?? null;

  useEffect(() => {
    if (!state.ok || !state.clientSecret || !state.checkoutSessionId) return;
    if (openedSessionRef.current === state.checkoutSessionId) return;

    openedSessionRef.current = state.checkoutSessionId;
    setCheckoutOpen(true);
  }, [state.ok, state.clientSecret, state.checkoutSessionId]);

  return (
    <>
      <form action={action} className="mt-6">
        <input type="hidden" name="productId" value={selected?.productId ?? ""} />
        <input type="hidden" name="priceId" value={selected?.priceId ?? ""} />
        <input
          type="hidden"
          name="pricingMode"
          value={selected?.pricingMode ?? ""}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          {options.map((option) => {
            const active = option.id === selectedOptionId;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelectedOptionId(option.id)}
                className={[
                  "border p-4 text-left transition",
                  active
                    ? "border-[rgb(var(--sep-colour-b58a50))] bg-[rgb(var(--sep-colour-332719))]"
                    : "border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))]",
                ].join(" ")}
              >
                <span className="block font-serif text-xl text-[rgb(var(--sep-colour-efd6aa))]">
                  {option.productName}
                </span>
                <span className="mt-1 block text-[11px] leading-5 text-[rgb(var(--sep-colour-a99b89))]">
                  {option.description}
                </span>
                <span className="mt-3 block font-serif text-2xl text-[rgb(var(--sep-colour-d8bf91))]">
                  {option.pricingMode === "custom"
                    ? "Choose your amount"
                    : moneyLabel(option.amountMinor ?? 0, option.currency)}
                </span>
              </button>
            );
          })}
        </div>

        {selected?.pricingMode === "custom" ? (
          <label className="mt-4 block">
            <span className="mb-1 block text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-8f8271))]">
              Your contribution
            </span>
            <div className="flex items-center border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))]">
              <span className="px-3 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
                £
              </span>
              <input
                name="customAmount"
                type="number"
                min={(selected.minAmountMinor ?? 100) / 100}
                max={(selected.maxAmountMinor ?? 50000) / 100}
                step="0.01"
                required
                value={customAmount}
                onChange={(event) => setCustomAmount(event.target.value)}
                placeholder={`${((selected.minAmountMinor ?? 100) / 100).toFixed(2)} – ${((selected.maxAmountMinor ?? 50000) / 100).toFixed(2)}`}
                className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm text-[rgb(var(--sep-colour-e5cfa6))] outline-none"
              />
            </div>
            <span className="mt-1 block text-[9px] text-[rgb(var(--sep-colour-756957))]">
              Minimum {moneyLabel(selected.minAmountMinor ?? 100, selected.currency)} · Maximum{" "}
              {moneyLabel(selected.maxAmountMinor ?? 50000, selected.currency)}
            </span>
          </label>
        ) : null}

        <button
          type="submit"
          disabled={
            pending ||
            !publishableKey ||
            !selected ||
            (selected.pricingMode === "custom" && !customAmount)
          }
          className="mt-5 w-full border border-[rgb(var(--sep-colour-987344))]/70 bg-[rgb(var(--sep-colour-2a1d12))] px-5 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd9aa))] disabled:opacity-55"
        >
          {pending ? "Opening secure checkout..." : "Support Sepulchria"}
        </button>

        {state.error ? (
          <p className="mt-3 text-[10px] leading-5 text-red-300">
            {state.error}
          </p>
        ) : null}

        {completedAmount !== null ? (
          <p className="mt-4 text-sm text-[rgb(var(--sep-colour-efd6aa))]">
            Thank you. Your {moneyLabel(completedAmount)} contribution was received.
          </p>
        ) : null}
      </form>

      {checkoutOpen && state.clientSecret && state.checkoutSessionId ? (
        <ContributionCheckoutModal
          clientSecret={state.clientSecret}
          checkoutSessionId={state.checkoutSessionId}
          onPaid={() => {
            setCompletedAmount(state.amountMinor);
            setCheckoutOpen(false);
          }}
          onClose={() => setCheckoutOpen(false)}
        />
      ) : null}
    </>
  );
}
