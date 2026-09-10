"use client";

import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getStoreStripeCheckoutStatus,
  startStoreStripeCheckout,
  type StoreStripeState,
} from "@/app/(portal)/store/actions";

const initialState: StoreStripeState = {
  ok: false,
  error: null,
  clientSecret: null,
  checkoutSessionId: null,
};

const publishableKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";

const stripePromise = publishableKey
  ? loadStripe(publishableKey)
  : Promise.resolve(null);

function StripeEmbeddedCheckoutModal({
  clientSecret,
  checkoutSessionId,
  onClose,
}: {
  clientSecret: string;
  checkoutSessionId: string;
  onClose: () => void;
}) {
  const [finalising, setFinalising] = useState(false);
  const [finaliseError, setFinaliseError] = useState<string | null>(null);

  const handleComplete = useCallback(() => {
    setFinalising(true);
    setFinaliseError(null);

    void (async () => {
      const deadline = Date.now() + 20000;

      while (Date.now() < deadline) {
        try {
          const result =
            await getStoreStripeCheckoutStatus(checkoutSessionId);

          if (result.fulfilled) {
            window.location.reload();
            return;
          }
        } catch {
          // A transient status-check failure should not interrupt fulfilment.
        }

        await new Promise((resolve) => window.setTimeout(resolve, 350));
      }

      setFinaliseError(
        "Payment completed, but Sepulchria is still applying your purchase. Please wait a few seconds and refresh the Store.",
      );
    })();
  }, [checkoutSessionId]);

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/75 p-3 sm:p-6 components_store_store_stripe_purchase_button_div_secure_stripe_checkout"
      role="dialog"
      aria-modal="true"
      aria-label="Secure Stripe checkout"
    >
      <div className="relative flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden border border-[rgb(var(--sep-colour-987344))]/70 bg-[rgb(var(--sep-colour-100c09))] shadow-2xl components_store_store_stripe_purchase_button_div_secure_stripe_checkout_2">
        <div className="flex shrink-0 items-center justify-between border-b border-[rgb(var(--sep-colour-60482e))]/45 px-4 py-3 components_store_store_stripe_purchase_button_div_secure_stripe_checkout_3">
          <div className="components_store_store_stripe_purchase_button_div_secure_stripe_checkout_4">
            <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] components_store_store_stripe_purchase_button_p_secure_stripe_checkout">
              Sepulchria Store
            </p>
            <p className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))] components_store_store_stripe_purchase_button_p_secure_stripe_checkout_2">
              Secure Checkout
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="border border-[rgb(var(--sep-colour-60482e))]/55 px-3 py-2 text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d7c4a5))] components_store_store_stripe_purchase_button_button_close"
          >
            Close
          </button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-y-auto bg-white components_store_store_stripe_purchase_button_div_secure_stripe_checkout_5">
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
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/95 p-6 text-center components_store_store_stripe_purchase_button_div_container">
              <div className="max-w-sm components_store_store_stripe_purchase_button_div_container_2">
                <p className="font-serif text-2xl text-[#24180f] components_store_store_stripe_purchase_button_p_text">
                  Finalising Purchase
                </p>
                <p className="mt-3 text-sm leading-6 text-[#6a5849] components_store_store_stripe_purchase_button_p_text_2">
                  Your payment is complete. Sepulchria is applying the purchase
                  to your character now.
                </p>

                {finaliseError ? (
                  <>
                    <p className="mt-4 text-sm leading-6 text-red-700 components_store_store_stripe_purchase_button_p_text_3">
                      {finaliseError}
                    </p>
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="mt-4 border border-[#6f5436] px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-[#3d2a1c] components_store_store_stripe_purchase_button_button_refresh_store"
                    >
                      Refresh Store
                    </button>
                  </>
                ) : (
                  <p className="mt-4 text-[10px] uppercase tracking-[0.16em] text-[#8b735f] components_store_store_stripe_purchase_button_p_text_4">
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

export function StoreStripePurchaseButton({
  productId,
  priceId,
  label,
}: {
  productId: string;
  priceId: string;
  label: string;
}) {
  const [state, action, pending] = useActionState(
    startStoreStripeCheckout,
    initialState,
  );

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const openedSessionRef = useRef<string | null>(null);

  const closeCheckout = useCallback(() => {
    setCheckoutOpen(false);
  }, []);

  useEffect(() => {
    if (
      !state.ok ||
      !state.clientSecret ||
      !state.checkoutSessionId
    ) {
      return;
    }

    if (openedSessionRef.current === state.checkoutSessionId) {
      return;
    }

    openedSessionRef.current = state.checkoutSessionId;
    setCheckoutOpen(true);
  }, [
    state.ok,
    state.clientSecret,
    state.checkoutSessionId,
  ]);

  return (
    <>
      <form action={action} className="mt-2 components_store_store_stripe_purchase_button_form_action">
        <input className="components_store_store_stripe_purchase_button_input_product_id" type="hidden" name="productId" value={productId} />
        <input className="components_store_store_stripe_purchase_button_input_price_id" type="hidden" name="priceId" value={priceId} />

        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 components_store_store_stripe_purchase_button_div_container_3">
          <input
            type="text"
            name="discountCode"
            autoComplete="off"
            placeholder="Discount code (optional)"
            className="min-w-0 w-full border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[9px] uppercase tracking-[0.08em] text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))] components_store_store_stripe_purchase_button_input_discount_code"
          />

          <button
            type="submit"
            disabled={pending}
            className="whitespace-nowrap border border-[rgb(var(--sep-colour-987344))]/70 bg-[rgb(var(--sep-colour-2a1d12))] px-4 py-2 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd9aa))] transition hover:border-[rgb(var(--sep-colour-b78b50))] disabled:cursor-wait disabled:opacity-55 components_store_store_stripe_purchase_button_button_action"
          >
            {pending ? "Opening..." : `Buy for ${label} · tax incl.`}
          </button>
        </div>

        {state.error ? (
          <p className="mt-2 text-[9px] leading-4 text-red-300 components_store_store_stripe_purchase_button_p_text_5">
            {state.error}
          </p>
        ) : null}
      </form>

      {checkoutOpen && state.clientSecret ? (
        <StripeEmbeddedCheckoutModal
          clientSecret={state.clientSecret}
          checkoutSessionId={state.checkoutSessionId!}
          onClose={closeCheckout}
        />
      ) : null}
    </>
  );
}
