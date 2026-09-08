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
# 1) Store purchase button: make it explicit that the shown amount is
#    the final tax-inclusive amount Sepulchria intends the customer to pay.
# ------------------------------------------------------------------
rel = "components/store/store-stripe-purchase-button.tsx"
text = read(rel)

text = replace_once(
    text,
    '''            {pending ? "Opening..." : `Buy for ${label}`}''',
    '''            {pending ? "Opening..." : `Buy for ${label} · tax incl.`}''',
    "Store Stripe tax-inclusive button label",
)

write(rel, text)

# ------------------------------------------------------------------
# 2) AdminActionForm: optionally change the submit button text while
#    pending and force an hourglass/wait cursor for the duration.
# ------------------------------------------------------------------
rel = "components/admin/admin-action-ui.tsx"
text = read(rel)

text = replace_once(
    text,
    '''  refreshDelaysMs = [],
  children,
}: {
  action: ServerFormAction;
  successMessage: string;
  className?: string;
  refreshDelaysMs?: number[];
  children: ReactNode;
}) {''',
    '''  refreshDelaysMs = [],
  pendingLabel,
  busyCursor = false,
  children,
}: {
  action: ServerFormAction;
  successMessage: string;
  className?: string;
  refreshDelaysMs?: number[];
  pendingLabel?: string;
  busyCursor?: boolean;
  children: ReactNode;
}) {''',
    "AdminActionForm props",
)

text = replace_once(
    text,
    '''    const previouslyDisabled = buttons.map((button) => button.disabled);
    buttons.forEach((button) => { button.disabled = true; });
    submitter?.setAttribute("aria-busy", "true");
    setPending(true);
    setFeedback(null);
''',
    '''    const previouslyDisabled = buttons.map((button) => button.disabled);
    const previousSubmitterText = submitter?.textContent ?? null;
    const previousHtmlCursor = document.documentElement.style.cursor;
    const previousBodyCursor = document.body.style.cursor;

    buttons.forEach((button) => { button.disabled = true; });

    if (submitter && pendingLabel) {
      submitter.textContent = pendingLabel;
    }

    if (busyCursor) {
      document.documentElement.style.cursor = "wait";
      document.body.style.cursor = "wait";
    }

    submitter?.setAttribute("aria-busy", "true");
    setPending(true);
    setFeedback(null);
''',
    "AdminActionForm pending UI start",
)

text = replace_once(
    text,
    '''    } finally {
      buttons.forEach((button, index) => { button.disabled = previouslyDisabled[index]; });
      submitter?.removeAttribute("aria-busy");
      setPending(false);
    }
''',
    '''    } finally {
      buttons.forEach((button, index) => { button.disabled = previouslyDisabled[index]; });

      if (submitter && pendingLabel && previousSubmitterText !== null) {
        submitter.textContent = previousSubmitterText;
      }

      if (busyCursor) {
        document.documentElement.style.cursor = previousHtmlCursor;
        document.body.style.cursor = previousBodyCursor;
      }

      submitter?.removeAttribute("aria-busy");
      setPending(false);
    }
''',
    "AdminActionForm pending UI restore",
)

write(rel, text)

# ------------------------------------------------------------------
# 3) Enable that behaviour specifically for "Sync all to Stripe".
# ------------------------------------------------------------------
rel = "components/admin/store-commerce-operations.tsx"
text = read(rel)

text = replace_once(
    text,
    '''            <AdminActionForm action={syncAllStoreStripe} successMessage="Stripe sync completed.">
              <button className={button}>Sync all to Stripe</button>
            </AdminActionForm>''',
    '''            <AdminActionForm
              action={syncAllStoreStripe}
              successMessage="Stripe sync completed."
              pendingLabel="Syncing..."
              busyCursor
            >
              <button className={`${button} disabled:cursor-wait disabled:opacity-60`}>
                Sync all to Stripe
              </button>
            </AdminActionForm>''',
    "Sync all Stripe pending UX",
)

write(rel, text)

print("")
print("Store price copy + Stripe sync pending UX patch applied.")
print("")
print("Changes:")
print("  - Purchase button now says the displayed amount is tax-inclusive.")
print("  - Sync all to Stripe disables during sync and changes to 'Syncing...'.")
print("  - Cursor becomes wait/hourglass until sync finishes, then restores.")
print("")
print("Next: npm run build")
