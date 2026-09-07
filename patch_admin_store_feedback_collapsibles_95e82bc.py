from pathlib import Path
import re
import subprocess

ROOT = Path.cwd()
EXPECTED_HEAD = "95e82bc79fe096bd74e6f775b6e08b6c2c096541"


def git_head():
    return subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, encoding="utf-8", errors="strict"
    ).strip()


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"{label}: expected exact block once, found {count}. No files were written."
        )
    return text.replace(old, new, 1)


MESSAGES = {
    "syncExistingPremiumCatalogueToStore": "Catalogue synced to Store.",
    "createStoreProduct": "Product created.",
    "updateStoreProduct": "Product saved.",
    "deleteStorePrice": "Price removed.",
    "saveStorePrice": "Price saved and synced.",
    "deleteStoreGrant": "Unlock removed.",
    "addStoreGrant": "Unlock added.",
    "deleteStoreProduct": "Product deleted.",
    "createStoreDiscount": "Discount created.",
    "toggleStoreDiscount": "Discount updated.",
    "createStorePostPurchaseOffer": "Post-purchase offer created.",
    "toggleStorePostPurchaseOffer": "Post-purchase offer updated.",
    "syncAllStorePaddle": "Paddle sync completed.",
    "configureStorePaddleWebhook": "Webhook settings updated.",
    "syncOneStoreProductPaddle": "Product synced to Paddle.",
    "deleteStoreRegionOverride": "Regional price removed.",
    "saveStoreRegionOverride": "Regional price saved and synced.",
    "refundStoreOrder": "Refund request sent to Paddle.",
}


def convert_action_forms(text, label):
    pattern = re.compile(r"<form\b(?P<attrs>[^>]*)>", re.S)
    converted = 0

    def repl(match):
        nonlocal converted
        attrs = match.group("attrs")
        action_match = re.search(r"\baction=\{([A-Za-z0-9_]+)\}", attrs)
        if not action_match:
            return match.group(0)
        action_name = action_match.group(1)
        success = MESSAGES.get(action_name)
        if not success:
            raise SystemExit(
                f"Missing success message mapping for {action_name}. No files were written."
            )
        attrs = re.sub(
            r"\s*\baction=\{" + re.escape(action_name) + r"\}", "", attrs, count=1
        )
        converted += 1
        return (
            f'<AdminActionForm action={{{action_name}}} '
            f'successMessage="{success}"{attrs}>'
        )

    updated = pattern.sub(repl, text)
    closing = updated.count("</form>")
    if converted == 0:
        raise SystemExit(f"{label}: no server-action forms found. No files were written.")
    if closing != converted:
        raise SystemExit(
            f"{label}: converted {converted} openings but found {closing} closing forms. No files were written."
        )
    return updated.replace("</form>", "</AdminActionForm>")


head = git_head()
if head != EXPECTED_HEAD:
    raise SystemExit(f"This patch is for {EXPECTED_HEAD}; your local HEAD is {head}.")

print(f"Verified HEAD: {head}")

page_path = ROOT / "app" / "(portal)" / "admin" / "store" / "page.tsx"
commerce_path = ROOT / "components" / "admin" / "store-commerce-operations.tsx"
offers_path = ROOT / "components" / "admin" / "store-post-purchase-offers.tsx"
ui_path = ROOT / "components" / "admin" / "admin-action-ui.tsx"

for path in (page_path, commerce_path, offers_path):
    if not path.exists():
        raise SystemExit(f"Missing {path.relative_to(ROOT)}. No files were written.")
if ui_path.exists():
    raise SystemExit(f"{ui_path.relative_to(ROOT)} already exists. No files were written.")

page = page_path.read_text(encoding="utf-8")
commerce = commerce_path.read_text(encoding="utf-8")
offers = offers_path.read_text(encoding="utf-8")

page = replace_once(
    page,
    'import { StoreLiveFilterBar } from "@/components/store/store-live-filter-bar";',
    'import { AdminActionForm } from "@/components/admin/admin-action-ui";\nimport { StoreLiveFilterBar } from "@/components/store/store-live-filter-bar";',
    "admin store page import",
)
commerce = replace_once(
    commerce,
    'import "server-only";',
    'import "server-only";\n\nimport { AdminActionForm, AdminCollapsibleSection } from "@/components/admin/admin-action-ui";',
    "commerce UI import",
)
offers = replace_once(
    offers,
    'import "server-only";',
    'import "server-only";\n\nimport { AdminActionForm } from "@/components/admin/admin-action-ui";',
    "post-purchase UI import",
)

page = convert_action_forms(page, "admin store page")
commerce = convert_action_forms(commerce, "commerce operations")
offers = convert_action_forms(offers, "post-purchase offers")

commerce = replace_once(
    commerce,
    '      <div className="border border-[rgb(var(--sep-skin-c1,169_138_96))]/35 bg-[rgb(var(--sep-colour-15100d))] p-4 sm:p-5">\n        <div className="flex flex-wrap items-end justify-between gap-4">',
    '      <AdminCollapsibleSection title="Paddle sync & launch readiness">\n        <div className="flex flex-wrap items-end justify-between gap-4">',
    "Paddle readiness opening",
)
commerce = replace_once(
    commerce,
    '''            <h3 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-skin-c1,169_138_96))]">
              Paddle sync & launch readiness
            </h3>
''',
    "",
    "Paddle readiness duplicate heading",
)
commerce = replace_once(
    commerce,
    '''      </div>

      <div className="border border-[rgb(var(--sep-skin-c1,169_138_96))]/35 bg-[rgb(var(--sep-colour-15100d))] p-4 sm:p-5">
        <h3 className="font-serif text-2xl text-[rgb(var(--sep-skin-c1,169_138_96))]">
          Regional pricing & currencies
        </h3>''',
    '''      </AdminCollapsibleSection>

      <AdminCollapsibleSection title="Regional pricing & currencies">''',
    "Regional pricing boundary",
)
commerce = replace_once(
    commerce,
    '''      </div>

      <div className="border border-[rgb(var(--sep-skin-c1,169_138_96))]/35 bg-[rgb(var(--sep-colour-15100d))] p-4 sm:p-5">
        <h3 className="font-serif text-2xl text-[rgb(var(--sep-skin-c1,169_138_96))]">
          Store analytics · last 30 days
        </h3>''',
    '''      </AdminCollapsibleSection>

      <div className="border border-[rgb(var(--sep-skin-c1,169_138_96))]/35 bg-[rgb(var(--sep-colour-15100d))] p-4 sm:p-5">
        <h3 className="font-serif text-2xl text-[rgb(var(--sep-skin-c1,169_138_96))]">
          Store analytics · last 30 days
        </h3>''',
    "Regional pricing closing",
)
commerce = replace_once(
    commerce,
    '''      </div>

      <div className="border border-[rgb(var(--sep-skin-c1,169_138_96))]/35 bg-[rgb(var(--sep-colour-15100d))] p-4 sm:p-5">
        <h3 className="font-serif text-2xl text-[rgb(var(--sep-skin-c1,169_138_96))]">
          Refunds
        </h3>''',
    '''      </div>

      <AdminCollapsibleSection title="Refunds">''',
    "Refunds opening",
)
commerce = replace_once(
    commerce,
    '''      </div>

      <div className="border border-[rgb(var(--sep-skin-c1,169_138_96))]/35 bg-[rgb(var(--sep-colour-15100d))] p-4 sm:p-5">
        <h3 className="font-serif text-2xl text-[rgb(var(--sep-skin-c1,169_138_96))]">
          Paddle audit log
        </h3>''',
    '''      </AdminCollapsibleSection>

      <AdminCollapsibleSection title="Paddle audit log">''',
    "Paddle audit opening",
)
commerce = replace_once(
    commerce,
    '''        </div>
      </div>
    </section>
  );
}''',
    '''        </div>
      </AdminCollapsibleSection>
    </section>
  );
}''',
    "Paddle audit closing",
)

ui_source = r'''"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ServerFormAction = (formData: FormData) => Promise<unknown>;
type Feedback = { kind: "success" | "error"; text: string; left: number; top: number };

function feedbackPosition(submitter: HTMLElement | null) {
  if (!submitter) return { left: 24, top: 24 };
  const rect = submitter.getBoundingClientRect();
  const desiredLeft = rect.right + 10;
  const maxLeft = Math.max(16, window.innerWidth - 360);
  if (desiredLeft <= maxLeft) {
    return { left: desiredLeft, top: Math.max(12, rect.top) };
  }
  return {
    left: Math.max(16, Math.min(rect.left, maxLeft)),
    top: Math.min(window.innerHeight - 64, rect.bottom + 8),
  };
}

export function AdminActionForm({
  action,
  successMessage,
  className,
  children,
}: {
  action: ServerFormAction;
  successMessage: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const timerRef = useRef<number | null>(null);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  function showFeedback(kind: Feedback["kind"], text: string, submitter: HTMLElement | null) {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    const position = feedbackPosition(submitter);
    setFeedback({ kind, text, ...position });
    timerRef.current = window.setTimeout(() => {
      setFeedback(null);
      timerRef.current = null;
    }, 5_000);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const nativeEvent = event.nativeEvent as SubmitEvent;
    const submitter = nativeEvent.submitter instanceof HTMLElement ? nativeEvent.submitter : null;
    const form = event.currentTarget;
    const buttons = Array.from(
      form.querySelectorAll<HTMLButtonElement>('button[type="submit"], button:not([type])'),
    );
    const previouslyDisabled = buttons.map((button) => button.disabled);
    buttons.forEach((button) => { button.disabled = true; });
    submitter?.setAttribute("aria-busy", "true");
    setPending(true);
    setFeedback(null);

    try {
      await action(new FormData(form));
      showFeedback("success", successMessage, submitter);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : "The action failed.";
      showFeedback("error", message, submitter);
    } finally {
      buttons.forEach((button, index) => { button.disabled = previouslyDisabled[index]; });
      submitter?.removeAttribute("aria-busy");
      setPending(false);
    }
  }

  return (
    <form className={className} onSubmit={handleSubmit} aria-busy={pending}>
      {children}
      {mounted && feedback
        ? createPortal(
            <div
              role={feedback.kind === "error" ? "alert" : "status"}
              className={`fixed z-[9999] max-w-[340px] border px-3 py-2 text-[10px] shadow-xl ${
                feedback.kind === "success"
                  ? "border-emerald-700/70 bg-emerald-950 text-emerald-200"
                  : "border-red-800/70 bg-red-950 text-red-200"
              }`}
              style={{ left: feedback.left, top: feedback.top }}
            >
              {feedback.text}
            </div>,
            document.body,
          )
        : null}
    </form>
  );
}

export function AdminCollapsibleSection({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="border border-[rgb(var(--sep-skin-c1,169_138_96))]/35 bg-[rgb(var(--sep-colour-15100d))]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-5"
      >
        <span className="font-serif text-2xl text-[rgb(var(--sep-skin-c1,169_138_96))]">{title}</span>
        <span aria-hidden="true" className="text-lg text-[rgb(var(--sep-skin-c1,169_138_96))]">
          {open ? "−" : "+"}
        </span>
      </button>
      {open ? (
        <div className="border-t border-[rgb(var(--sep-skin-c1,169_138_96))]/20 p-4 sm:p-5">
          {children}
        </div>
      ) : null}
    </section>
  );
}
'''

for label, text in (("page", page), ("commerce", commerce), ("offers", offers)):
    if "<form" in text or "</form>" in text:
        raise SystemExit(f"{label}: an unconverted form remains. No files were written.")

for title in (
    "Paddle sync & launch readiness",
    "Regional pricing & currencies",
    "Refunds",
    "Paddle audit log",
):
    marker = f'<AdminCollapsibleSection title="{title}">'
    if commerce.count(marker) != 1:
        raise SystemExit(f"commerce: marker for {title!r} missing or duplicated. No files were written.")

page_path.write_text(page, encoding="utf-8")
commerce_path.write_text(commerce, encoding="utf-8")
offers_path.write_text(offers, encoding="utf-8")
ui_path.write_text(ui_source, encoding="utf-8")

print("DONE")
print("Patched Admin -> Store against 95e82bc.")
print("- Success/error feedback appears beside the pressed button")
print("- Feedback disappears after 5 seconds")
print("- Data refreshes in place via router.refresh(), not a full page reload")
print("- Submit buttons disable while their action runs")
print("- Paddle sync & launch readiness starts collapsed")
print("- Regional pricing & currencies starts collapsed")
print("- Refunds starts collapsed")
print("- Paddle audit log starts collapsed")
print("Run: npm run build")
