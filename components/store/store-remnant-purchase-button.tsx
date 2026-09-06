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
      <input type="text" name="discountCode" autoComplete="off" placeholder="Discount code (optional)"
        className="mb-2 w-full border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[9px] uppercase tracking-[0.08em] text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))]" />
      <button type="submit" disabled={pending} className="w-full border border-[rgb(var(--sep-colour-987344))]/70 bg-[rgb(var(--sep-colour-2a1d12))] px-3 py-2 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd9aa))] transition hover:border-[rgb(var(--sep-colour-b78b50))] disabled:cursor-wait disabled:opacity-55">
        {pending ? "Purchasing..." : `Buy for 🝈 ${amount} Remnants`}
      </button>
      {state.error ? <p className="mt-2 text-[9px] leading-4 text-red-300">{state.error}</p> : null}
    </form>
  );
}
