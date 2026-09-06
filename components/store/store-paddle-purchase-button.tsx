"use client";

import { useActionState, useEffect } from "react";

import {
  startStorePaddleCheckout,
  type StorePaddleState,
} from "@/app/(portal)/store/actions";

const initialState: StorePaddleState = {
  ok: false,
  error: null,
  checkoutUrl: null,
};

export function StorePaddlePurchaseButton({
  productId,
  label,
}: {
  productId: string;
  label: string;
}) {
  const [state, action, pending] = useActionState(
    startStorePaddleCheckout,
    initialState,
  );

  useEffect(() => {
    if (state.ok && state.checkoutUrl) {
      window.location.assign(state.checkoutUrl);
    }
  }, [state.ok, state.checkoutUrl]);

  return (
    <form action={action} className="mt-2">
      <input type="hidden" name="productId" value={productId} />

      <button
        type="submit"
        disabled={pending}
        className="w-full border border-[rgb(var(--sep-colour-987344))]/70 bg-[rgb(var(--sep-colour-2a1d12))] px-3 py-2 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd9aa))] transition hover:border-[rgb(var(--sep-colour-b78b50))] disabled:cursor-wait disabled:opacity-55"
      >
        {pending ? "Opening checkout..." : `Buy for ${label}`}
      </button>

      {state.error ? (
        <p className="mt-2 text-[9px] leading-4 text-red-300">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
