"use client";

import { useEffect } from "react";

const CHECKOUT_RETURN_TYPE = "sepulchria:store-checkout-return";
const CHECKOUT_CHANNEL = "sepulchria-store-checkout";

export function StoreStripeCheckoutBridge() {
  useEffect(() => {
    let refreshTimer: number | null = null;

    const refreshStore = (status: unknown) => {
      if (status === "success") {
        refreshTimer = window.setTimeout(() => {
          window.location.reload();
        }, 900);
        return;
      }

      window.location.reload();
    };

    const onWindowMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== CHECKOUT_RETURN_TYPE) return;
      refreshStore(event.data?.status);
    };

    window.addEventListener("message", onWindowMessage);

    let channel: BroadcastChannel | null = null;

    if ("BroadcastChannel" in window) {
      channel = new BroadcastChannel(CHECKOUT_CHANNEL);
      channel.addEventListener("message", (event) => {
        if (event.data?.type !== CHECKOUT_RETURN_TYPE) return;
        refreshStore(event.data?.status);
      });
    }

    return () => {
      window.removeEventListener("message", onWindowMessage);
      channel?.close();

      if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer);
      }
    };
  }, []);

  return null;
}
