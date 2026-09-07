"use client";

import { useEffect } from "react";

const CHECKOUT_RETURN_TYPE = "sepulchria:store-checkout-return";
const CHECKOUT_CHANNEL = "sepulchria-store-checkout";

export default function StoreCheckoutReturnPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawStatus = params.get("stripe");
    const status =
      rawStatus === "success" || rawStatus === "cancelled"
        ? rawStatus
        : "cancelled";

    const payload = {
      type: CHECKOUT_RETURN_TYPE,
      status,
      sessionId: params.get("session_id"),
    };

    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel(CHECKOUT_CHANNEL);
      channel.postMessage(payload);
      channel.close();
    }

    if (window.opener && !window.opener.closed) {
      try {
        window.opener.postMessage(payload, window.location.origin);
        window.opener.focus();
      } catch {
        // BroadcastChannel above is the cross-window fallback.
      }
    }

    window.setTimeout(() => {
      window.close();
    }, 150);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[rgb(var(--sep-colour-090706))] p-6 text-center text-[rgb(var(--sep-colour-d8cbb5))]">
      <div>
        <p className="font-serif text-2xl">Returning to Sepulchria...</p>
        <p className="mt-2 text-xs text-[rgb(var(--sep-colour-8f8271))]">
          This checkout window will close automatically.
        </p>
        <button
          type="button"
          onClick={() => window.close()}
          className="mt-5 border border-[rgb(var(--sep-colour-987344))]/70 px-4 py-2 text-[9px] uppercase tracking-[0.14em]"
        >
          Close window
        </button>
      </div>
    </main>
  );
}
