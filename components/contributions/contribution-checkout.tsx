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
            <p className="normal-case text-[9px] tracking-[0.08em] text-[rgb(var(--sep-colour-806b50))]">
              Support Sepulchria
            </p>
            <p className="mt-1 font-serif text-xl normal-case text-[rgb(var(--sep-colour-d8bf91))]">
              Secure contribution
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="normal-case border border-[rgb(var(--sep-colour-60482e))]/55 px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-d7c4a5))]"
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
                <p className="font-serif text-2xl normal-case text-[#24180f]">
                  Confirming contribution
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
      <form action={action}>
        <input type="hidden" name="productId" value={selected?.productId ?? ""} />
        <input type="hidden" name="priceId" value={selected?.priceId ?? ""} />
        <input
          type="hidden"
          name="pricingMode"
          value={selected?.pricingMode ?? ""}
        />

        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {options.map((option) => {
            const active = option.id === selectedOptionId;

            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedOptionId(option.id)}
                className={[
                  "relative min-h-[132px] border p-3.5 pr-20 text-left normal-case transition",
                  active
                    ? "border-[rgb(var(--sep-skin-c1))] bg-[rgb(var(--sep-colour-21170f))] shadow-[0_0_14px_rgba(var(--sep-rgb-185-140-80),0.12)] ring-1 ring-[rgb(var(--sep-skin-c1))]/35"
                    : "border-[rgb(var(--sep-skin-c1))]/25 bg-[rgb(var(--sep-colour-100c09))] hover:border-[rgb(var(--sep-skin-c1))]/55 hover:bg-[rgb(var(--sep-colour-17120f))]",
                ].join(" ")}
              >
                {active ? (
                  <span className="absolute right-2.5 top-2.5 normal-case border border-[rgb(var(--sep-skin-c1))]/55 bg-[rgb(var(--sep-colour-15100d))] px-2 py-1 text-[8px] text-[rgb(var(--sep-skin-c2))]">
                    ✓ Selected
                  </span>
                ) : null}

                <span className="block font-serif text-lg normal-case text-[rgb(var(--sep-skin-c2))]">
                  {option.productName}
                </span>
                <span className="mt-1 block text-[10px] leading-[1.45rem] text-[rgb(var(--sep-global-c1))]">
                  {option.description}
                </span>
                <span className="mt-2 block font-serif text-xl normal-case text-[rgb(var(--sep-skin-c1))]">
                  {option.pricingMode === "custom"
                    ? "Choose your amount"
                    : moneyLabel(option.amountMinor ?? 0, option.currency)}
                </span>
              </button>
            );
          })}
        </div>

        {selected?.pricingMode === "custom" ? (
          <label className="mt-3 block border border-[rgb(var(--sep-skin-c1))]/25 bg-[rgb(var(--sep-colour-100c09))] p-3">
            <span className="mb-1.5 block text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-skin-c1))]">
              Your contribution
            </span>
            <div className="flex items-center border border-[rgb(var(--sep-skin-c1))]/35 bg-[rgb(var(--sep-colour-15100d))]">
              <span className="px-3 font-serif text-lg text-[rgb(var(--sep-skin-c2))]">
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
                className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-xs text-[rgb(var(--sep-skin-c2))] outline-none"
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
          className="mt-4 w-full border border-[rgb(var(--sep-skin-c1))]/55 bg-[rgb(var(--sep-colour-21170f))] px-4 py-2.5 text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-skin-c2))] transition hover:border-[rgb(var(--sep-skin-c2))]/70 hover:bg-[rgb(var(--sep-colour-2a1d12))] disabled:opacity-55"
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
            window.dispatchEvent(
              new CustomEvent("sepulchria:contribution-updated"),
            );
          }}
          onClose={() => setCheckoutOpen(false)}
        />
      ) : null}
    </>
  );
}
