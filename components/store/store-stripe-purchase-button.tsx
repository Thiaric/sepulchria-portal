"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";

import {
  startStoreStripeCheckout,
  type StoreStripeState,
} from "@/app/(portal)/store/actions";

const initialState: StoreStripeState = {
  ok: false,
  error: null,
  checkoutUrl: null,
  checkoutSessionId: null,
};

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

  const checkoutWindowRef = useRef<Window | null>(null);
  const [popupError, setPopupError] = useState<string | null>(null);

  function prepareCheckoutWindow(event: FormEvent<HTMLFormElement>) {
    setPopupError(null);

    const checkoutWindow = window.open(
      "about:blank",
      "sepulchria-stripe-checkout",
    );

    if (!checkoutWindow) {
      event.preventDefault();
      setPopupError(
        "Your browser blocked the secure checkout window. Allow pop-ups for Sepulchria and try again.",
      );
      return;
    }

    checkoutWindowRef.current = checkoutWindow;

    try {
      checkoutWindow.document.title = "Sepulchria Checkout";
      checkoutWindow.document.body.innerHTML =
        '<p style="font-family:serif;padding:24px">Opening secure checkout...</p>';
    } catch {
      // Checkout can continue without the temporary loading message.
    }
  }

  useEffect(() => {
    if (state.error) {
      const checkoutWindow = checkoutWindowRef.current;

      if (checkoutWindow && !checkoutWindow.closed) {
        checkoutWindow.close();
      }

      checkoutWindowRef.current = null;
      return;
    }

    if (!state.ok || !state.checkoutUrl) return;

    const checkoutWindow = checkoutWindowRef.current;

    if (!checkoutWindow || checkoutWindow.closed) {
      setPopupError(
        "The secure checkout window was closed. Please try the purchase again.",
      );
      return;
    }

    checkoutWindow.location.replace(state.checkoutUrl);
  }, [state.error, state.ok, state.checkoutUrl]);

  return (
    <form action={action} onSubmit={prepareCheckoutWindow} className="mt-2">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="priceId" value={priceId} />

      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <input
          type="text"
          name="discountCode"
          autoComplete="off"
          placeholder="Discount code (optional)"
          className="min-w-0 w-full border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[9px] uppercase tracking-[0.08em] text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))]"
        />

        <button
          type="submit"
          disabled={pending}
          className="whitespace-nowrap border border-[rgb(var(--sep-colour-987344))]/70 bg-[rgb(var(--sep-colour-2a1d12))] px-4 py-2 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd9aa))] transition hover:border-[rgb(var(--sep-colour-b78b50))] disabled:cursor-wait disabled:opacity-55"
        >
          {pending ? "Opening..." : `Buy for ${label}`}
        </button>
      </div>

      {state.error || popupError ? (
        <p className="mt-2 text-[9px] leading-4 text-red-300">
          {state.error ?? popupError}
        </p>
      ) : null}
    </form>
  );
}
