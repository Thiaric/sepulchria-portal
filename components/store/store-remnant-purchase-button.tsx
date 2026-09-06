"use client";

import { useActionState, useEffect } from "react";
import { purchaseStoreProductWithRemnants, type StorePurchaseState } from "@/app/(portal)/store/actions";

const initialState: StorePurchaseState = { ok: false, error: null, orderId: null };

export function StoreRemnantPurchaseButton({ productId, amount }: { productId: string; amount: number }) {
  const [state, action, pending] = useActionState(purchaseStoreProductWithRemnants, initialState);

  useEffect(() => {
    if (state.ok) window.location.reload();
  }, [state.ok]);

  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="productId" value={productId} />
      <button type="submit" disabled={pending} className="w-full border border-[rgb(var(--sep-colour-987344))]/70 bg-[rgb(var(--sep-colour-2a1d12))] px-3 py-2 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd9aa))] transition hover:border-[rgb(var(--sep-colour-b78b50))] disabled:cursor-wait disabled:opacity-55">
        {pending ? "Purchasing..." : `Buy for 🝈 ${amount} Remnants`}
      </button>
      {state.error ? <p className="mt-2 text-[9px] leading-4 text-red-300">{state.error}</p> : null}
    </form>
  );
}
