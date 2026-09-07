from pathlib import Path

ROOT = Path.cwd()

def fail(msg: str):
    raise SystemExit(f"\nPATCH STOPPED: {msg}\n")

def read(rel: str) -> str:
    p = ROOT / rel
    if not p.exists():
        fail(f"Missing expected file: {rel}")
    return p.read_text(encoding="utf-8")

def write(rel: str, text: str):
    (ROOT / rel).write_text(text, encoding="utf-8", newline="\n")

def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail(f"{label}: expected exactly 1 match, found {count}")
    return text.replace(old, new, 1)

# ------------------------------------------------------------------
# 1) Add a tiny authenticated server action to ask whether the
#    webhook has finished fulfilling this exact Stripe checkout.
# ------------------------------------------------------------------
rel = "app/(portal)/store/actions.ts"
text = read(rel)

anchor = '''export type StoreStripeState = {
  ok: boolean;
  error: string | null;
  clientSecret: string | null;
  checkoutSessionId: string | null;
};
'''

addition = '''export type StoreStripeState = {
  ok: boolean;
  error: string | null;
  clientSecret: string | null;
  checkoutSessionId: string | null;
};

export async function getStoreStripeCheckoutStatus(
  checkoutSessionId: string,
): Promise<{
  status: string | null;
  fulfilled: boolean;
}> {
  const sessionId = checkoutSessionId.trim();

  if (!sessionId) {
    return { status: null, fulfilled: false };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: null, fulfilled: false };
  }

  const { data: order, error } = await admin
    .from("store_orders")
    .select("status")
    .eq("user_id", user.id)
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (error || !order) {
    return { status: null, fulfilled: false };
  }

  return {
    status: order.status,
    fulfilled: order.status === "fulfilled",
  };
}
'''

text = replace_once(text, anchor, addition, "Stripe checkout status action")
write(rel, text)

# ------------------------------------------------------------------
# 2) Embedded checkout:
#    onComplete no longer blindly waits 1.2s and reloads.
#    Instead, keep the overlay up, poll until webhook fulfillment is
#    actually complete, THEN reload the Store so ownership is current.
# ------------------------------------------------------------------
rel = "components/store/store-stripe-purchase-button.tsx"
text = read(rel)

text = replace_once(
    text,
    '''import {
  startStoreStripeCheckout,
  type StoreStripeState,
} from "@/app/(portal)/store/actions";''',
    '''import {
  getStoreStripeCheckoutStatus,
  startStoreStripeCheckout,
  type StoreStripeState,
} from "@/app/(portal)/store/actions";''',
    "Stripe status action import",
)

old_sig = '''function StripeEmbeddedCheckoutModal({
  clientSecret,
  onClose,
}: {
  clientSecret: string;
  onClose: () => void;
}) {
  const handleComplete = useCallback(() => {
    onClose();

    window.setTimeout(() => {
      window.location.reload();
    }, 1200);
  }, [onClose]);
'''

new_sig = '''function StripeEmbeddedCheckoutModal({
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
'''

text = replace_once(text, old_sig, new_sig, "Stripe completion polling")

old_body = '''        <div className="min-h-0 flex-1 overflow-y-auto bg-white">
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{
              clientSecret,
              onComplete: handleComplete,
            }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
'''

new_body = '''        <div className="relative min-h-0 flex-1 overflow-y-auto bg-white">
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
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/95 p-6 text-center">
              <div className="max-w-sm">
                <p className="font-serif text-2xl text-[#24180f]">
                  Finalising Purchase
                </p>
                <p className="mt-3 text-sm leading-6 text-[#6a5849]">
                  Your payment is complete. Sepulchria is applying the purchase
                  to your character now.
                </p>

                {finaliseError ? (
                  <>
                    <p className="mt-4 text-sm leading-6 text-red-700">
                      {finaliseError}
                    </p>
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="mt-4 border border-[#6f5436] px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-[#3d2a1c]"
                    >
                      Refresh Store
                    </button>
                  </>
                ) : (
                  <p className="mt-4 text-[10px] uppercase tracking-[0.16em] text-[#8b735f]">
                    Please wait...
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>
'''

text = replace_once(text, old_body, new_body, "Stripe finalising overlay")

text = replace_once(
    text,
    '''        <StripeEmbeddedCheckoutModal
          clientSecret={state.clientSecret}
          onClose={closeCheckout}
        />''',
    '''        <StripeEmbeddedCheckoutModal
          clientSecret={state.clientSecret}
          checkoutSessionId={state.checkoutSessionId!}
          onClose={closeCheckout}
        />''',
    "Pass checkout session ID to embedded modal",
)

write(rel, text)

print("")
print("Stripe fulfilment-refresh patch applied.")
print("")
print("Now the checkout overlay stays visible after payment until the webhook has")
print("actually marked the Store order fulfilled. Only then does /store reload,")
print("so the purchased product should already render as owned.")
print("")
print("Next: npm run build")
