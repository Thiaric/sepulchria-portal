from pathlib import Path

ROOT = Path.cwd()
NOTICE = ROOT / "components" / "registration-closed-notice.tsx"
PAGE = ROOT / "app" / "early-alpha-rewards" / "page.tsx"

if not NOTICE.exists():
    raise RuntimeError(f"Missing expected file: {NOTICE}")

if PAGE.exists():
    raise RuntimeError(f"{PAGE} already exists. No files were changed.")

text = NOTICE.read_text(encoding="utf-8")

def replace_once(source, old, new, label):
    count = source.count(old)
    if count != 1:
        raise RuntimeError(
            f"{label}: expected exact snippet once, found {count}. No files were written."
        )
    return source.replace(old, new, 1)

text = replace_once(
    text,
    '  const [open, setOpen] = useState(false);\n  const [name, setName] = useState("");\n',
    '  const [open, setOpen] = useState(false);\n  const [infoOpen, setInfoOpen] = useState(false);\n  const [name, setName] = useState("");\n',
    "info modal state",
)

text = replace_once(
    text,
    '''  useEffect(() => {
    if (!open) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !loading) {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, loading]);
''',
    '''  useEffect(() => {
    if (!open && !infoOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (infoOpen) {
        setInfoOpen(false);
        return;
      }

      if (!loading) {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, infoOpen, loading]);
''',
    "modal effect",
)

text = replace_once(
    text,
    '''<p className="mx-auto mt-3 max-w-xl text-xs leading-6 text-[rgb(var(--sep-colour-8f8271))] components_registration_closed_notice_p_closed_alpha_access_3">
  Applications are reviewed individually and invitations are limited. Special features will be granted to the first 50 accepted Alpha players. Learn more.
</p>
''',
    '''<p className="mx-auto mt-3 max-w-xl text-xs leading-6 text-[rgb(var(--sep-colour-8f8271))] components_registration_closed_notice_p_closed_alpha_access_3">
  Applications are reviewed individually and invitations are limited.{" "}
  <span className="text-[rgb(var(--sep-colour-c8a46e))]">
    The first 50 accepted Alpha players will also receive exclusive Early Alpha features.
  </span>{" "}
  <button
    type="button"
    onClick={() => setInfoOpen(true)}
    className="text-[rgb(var(--sep-colour-d0aa72))] underline decoration-[rgb(var(--sep-colour-725636))] underline-offset-4 transition hover:text-[rgb(var(--sep-colour-efd5a7))]"
  >
    Learn more
  </button>
  .
</p>
''',
    "alpha reward copy",
)

text = replace_once(
    text,
    '''      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 components_registration_closed_notice_div_dialog"
''',
    '''      {infoOpen ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="alpha-rewards-title"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setInfoOpen(false);
            }
          }}
        >
          <div className="max-h-[90dvh] w-full max-w-4xl overflow-hidden border border-[rgb(var(--sep-colour-765937))]/70 bg-[rgb(var(--sep-colour-120d09))] shadow-2xl">
            <div className="flex items-start justify-between gap-5 border-b border-[rgb(var(--sep-colour-60482e))]/35 px-5 py-4 sm:px-7">
              <div>
                <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8b704e))]">
                  Early Alpha
                </p>
                <h2
                  id="alpha-rewards-title"
                  className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-e2cda4))]"
                >
                  First 50 Player Features
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setInfoOpen(false)}
                className="text-xl text-[rgb(var(--sep-colour-9b876a))] hover:text-[rgb(var(--sep-colour-e0c99d))]"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <iframe
              src="/early-alpha-rewards"
              title="Early Alpha rewards"
              className="h-[72dvh] w-full border-0 bg-[rgb(var(--sep-colour-090706))]"
            />
          </div>
        </div>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 components_registration_closed_notice_div_dialog"
''',
    "alpha rewards modal",
)

page_text = '''export default function EarlyAlphaRewardsPage() {
  return (
    <main className="min-h-screen bg-[rgb(var(--sep-colour-090706))] px-5 py-7 text-[rgb(var(--sep-colour-c9b8a0))] sm:px-8 sm:py-9">
      <div className="mx-auto max-w-3xl">
        <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8b704e))]">
          Early Alpha
        </p>

        <h1 className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-e2cda4))]">
          Features for the First 50 Accepted Players
        </h1>

        <p className="mt-4 text-sm leading-7 text-[rgb(var(--sep-colour-b8aa95))]">
          The first 50 accepted Early Alpha players will receive a selection of special account features as a thank-you for joining Sepulchria during its earliest playable stage.
        </p>

        <div className="mt-7 space-y-5">
          <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5">
            <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d8c29b))]">
              Feature Example One
            </h2>
            <p className="mt-2 text-sm leading-6 text-[rgb(var(--sep-colour-a99b87))]">
              Replace this text with the first Early Alpha feature and explain what the player receives.
            </p>
            <div className="mt-4 flex min-h-44 items-center justify-center border border-dashed border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-100c09))] px-5 text-center text-xs text-[rgb(var(--sep-colour-766b5e))]">
              Screenshot / example image
            </div>
          </section>

          <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5">
            <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d8c29b))]">
              Feature Example Two
            </h2>
            <p className="mt-2 text-sm leading-6 text-[rgb(var(--sep-colour-a99b87))]">
              Replace this text with the second Early Alpha feature and explain what the player receives.
            </p>
            <div className="mt-4 flex min-h-44 items-center justify-center border border-dashed border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-100c09))] px-5 text-center text-xs text-[rgb(var(--sep-colour-766b5e))]">
              Screenshot / example image
            </div>
          </section>

          <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5">
            <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d8c29b))]">
              Feature Example Three
            </h2>
            <p className="mt-2 text-sm leading-6 text-[rgb(var(--sep-colour-a99b87))]">
              Replace this text with the third Early Alpha feature and explain what the player receives.
            </p>
            <div className="mt-4 flex min-h-44 items-center justify-center border border-dashed border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-100c09))] px-5 text-center text-xs text-[rgb(var(--sep-colour-766b5e))]">
              Screenshot / example image
            </div>
          </section>
        </div>

        <p className="mt-7 border-t border-[rgb(var(--sep-colour-60482e))]/35 pt-5 text-xs leading-6 text-[rgb(var(--sep-colour-806b50))]">
          This page is intentionally separate from the application form so its content can be updated independently as the Early Alpha benefits are finalised.
        </p>
      </div>
    </main>
  );
}
'''

if text.count("infoOpen") < 3:
    raise RuntimeError("Validation failed: info modal changes were not inserted correctly.")

PAGE.parent.mkdir(parents=True, exist_ok=False)
NOTICE.write_text(text, encoding="utf-8")
PAGE.write_text(page_text, encoding="utf-8")

print("Early Alpha rewards modal patch applied.")
print("Changed: components/registration-closed-notice.tsx")
print("Created: app/early-alpha-rewards/page.tsx")
print("Now run: npm run build")
