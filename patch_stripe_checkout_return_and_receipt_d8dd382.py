from pathlib import Path

ROOT = Path.cwd()

def fail(message: str):
    raise SystemExit(f"\nPATCH STOPPED: {message}\n")

def read(rel: str) -> str:
    p = ROOT / rel
    if not p.exists():
        fail(f"Missing expected file: {rel}")
    return p.read_text(encoding="utf-8")

def write(rel: str, text: str):
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8", newline="\n")

def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail(f"{label}: expected exactly 1 match, found {count}")
    return text.replace(old, new, 1)

# 1) Checkout button: keep the Store modal alive and open Stripe separately.
rel = "components/store/store-stripe-purchase-button.tsx"
text = read(rel)

text = replace_once(
    text,
    'import { useActionState, useEffect } from "react";',
    'import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";',
    "Stripe button React import",
)

old = '''  useEffect(() => {
    if (!state.ok || !state.checkoutUrl) return;
    window.top?.location.assign(state.checkoutUrl);
  }, [state.ok, state.checkoutUrl]);

  return (
    <form action={action} className="mt-2">
'''
new = '''  const checkoutWindowRef = useRef<Window | null>(null);
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
'''
text = replace_once(text, old, new, "Stripe checkout window behaviour")

old = '''      {state.error ? (
        <p className="mt-2 text-[9px] leading-4 text-red-300">
          {state.error}
        </p>
      ) : null}
'''
new = '''      {state.error || popupError ? (
        <p className="mt-2 text-[9px] leading-4 text-red-300">
          {state.error ?? popupError}
        </p>
      ) : null}
'''
text = replace_once(text, old, new, "Stripe button error output")
write(rel, text)

# 2) Listener inside the existing Store modal iframe.
bridge_rel = "components/store/store-stripe-checkout-bridge.tsx"
bridge_path = ROOT / bridge_rel
if bridge_path.exists():
    fail(f"{bridge_rel} already exists; refusing to overwrite it.")

bridge = '''"use client";

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
'''
write(bridge_rel, bridge)

# 3) Render bridge once on /store.
rel = "app/(portal)/store/page.tsx"
text = read(rel)
text = replace_once(
    text,
    'import { StoreStripePurchaseButton } from "@/components/store/store-stripe-purchase-button";\n',
    'import { StoreStripePurchaseButton } from "@/components/store/store-stripe-purchase-button";\n'
    'import { StoreStripeCheckoutBridge } from "@/components/store/store-stripe-checkout-bridge";\n',
    "Store page checkout bridge import",
)

old = '''    <main
      data-store-page
      className="flex h-full min-h-0 w-full flex-col p-2 sm:p-5"
    >
'''
new = '''    <main
      data-store-page
      className="flex h-full min-h-0 w-full flex-col p-2 sm:p-5"
    >
      <StoreStripeCheckoutBridge />
'''
text = replace_once(text, old, new, "Store page checkout bridge render")
write(rel, text)

# 4) Lightweight public return page.
return_rel = "app/store-checkout-return/page.tsx"
return_path = ROOT / return_rel
if return_path.exists():
    fail(f"{return_rel} already exists; refusing to overwrite it.")

return_page = '''"use client";

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
'''
write(return_rel, return_page)

# 5) Make return page public.
rel = "lib/supabase/proxy.ts"
text = read(rel)
text = replace_once(
    text,
    '  "/refund-policy",\n  "/auth",',
    '  "/refund-policy",\n  "/store-checkout-return",\n  "/auth",',
    "public Store checkout return route",
)
write(rel, text)

# 6) Send Stripe back to the disposable checkout return window.
rel = "lib/store/stripe-server.ts"
text = read(rel)
old = '''    success_url:
      `${storeSiteUrl()}/store?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${storeSiteUrl()}/store?stripe=cancelled`,
'''
new = '''    success_url:
      `${storeSiteUrl()}/store-checkout-return?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:
      `${storeSiteUrl()}/store-checkout-return?stripe=cancelled`,
'''
text = replace_once(text, old, new, "Stripe return URLs")
write(rel, text)

# 7) Receipt amount: Remnants is the only non-money payment method.
rel = "lib/store/store-email.ts"
text = read(rel)
old = '''  const amount =
    order.payment_method === "stripe"
      ? new Intl.NumberFormat("en-GB", {
          style: "currency",
          currency: order.currency || "GBP",
        }).format(Number(order.total_money_minor ?? 0) / 100)
      : `${Number(order.total_remnants ?? 0)} Remnants`;
'''
new = '''  const amount =
    order.payment_method === "remnants"
      ? `${Number(order.total_remnants ?? 0)} Remnants`
      : new Intl.NumberFormat("en-GB", {
          style: "currency",
          currency: order.currency || "GBP",
        }).format(Number(order.total_money_minor ?? 0) / 100);
'''
text = replace_once(text, old, new, "Store receipt amount formatting")
write(rel, text)

print("")
print("Stripe checkout return + receipt patch applied.")
print("")
print("Behaviour now:")
print("  - /store modal stays open in the original Sepulchria portal.")
print("  - Stripe opens in a separate checkout window/tab.")
print("  - success/cancel returns to a lightweight Sepulchria page.")
print("  - that page notifies the original Store modal, closes itself, and the Store refreshes.")
print("  - receipt emails treat only 'remnants' as Remnants; Stripe is always formatted as money.")
print("")
print("Next: npm run build")
