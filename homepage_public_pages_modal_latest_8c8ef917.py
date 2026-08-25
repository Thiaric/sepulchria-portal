from pathlib import Path
import re
import subprocess

ROOT = Path.cwd()
EXPECTED = "8c8ef917ea9fa7c2de7427e4b76cd4a6a6acd43e"

HOMEPAGE = ROOT / "components/homepage/sepulchria-homepage.tsx"
MODAL = ROOT / "components/homepage/homepage-public-modal.tsx"


def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}\nNo changes were applied.")


def read(path: Path) -> str:
    if not path.exists():
        fail(f"Missing expected file: {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def regex_once(
    text: str,
    pattern: str,
    replacement: str,
    label: str,
) -> str:
    next_text, count = re.subn(
        pattern,
        replacement,
        text,
        count=1,
        flags=re.MULTILINE,
    )
    if count != 1:
        fail(f"{label}: expected exactly one match, found {count}")
    return next_text


head = subprocess.check_output(
    ["git", "rev-parse", "HEAD"],
    cwd=ROOT,
    text=True,
).strip()

if head != EXPECTED:
    fail(
        f"Patch expects HEAD {EXPECTED}, "
        f"but current HEAD is {head}"
    )

if MODAL.exists():
    fail(
        "components/homepage/homepage-public-modal.tsx already exists"
    )

homepage = read(HOMEPAGE)

homepage = replace_once(
    homepage,
    'import { CookieSettingsButton } from "@/components/privacy/cookie-storage-controls";\n',
    'import { CookieSettingsButton } from "@/components/privacy/cookie-storage-controls";\n'
    'import { HomepagePublicModal } from "@/components/homepage/homepage-public-modal";\n',
    "HomepagePublicModal import",
)

state_anchor = '''  const [aboutOpen, setAboutOpen] =
    useState(false);

  const [
    portalSessionReplaced,
'''

state_replacement = '''  const [aboutOpen, setAboutOpen] =
    useState(false);

  const [
    publicModal,
    setPublicModal,
  ] = useState<{
    title: string;
    href: string;
  } | null>(null);

  const [
    portalSessionReplaced,
'''

homepage = replace_once(
    homepage,
    state_anchor,
    state_replacement,
    "homepage public modal state",
)

primary_old = '''                {PRIMARY_LINKS.map(
                  (item) => (
                    <HomepageButton
                      key={item.label}
                      {...item}
                      label={
                        item.label ===
                          "Register" &&
                        !registrationsOpen
                          ? "Info about Registration"
                          : item.label
                      }
                    />
                  ),
                )}
'''

primary_new = '''                {PRIMARY_LINKS.map(
                  (item) =>
                    item.label ===
                    "Register" ? (
                      <HomepageButton
                        key={item.label}
                        {...item}
                        label={
                          !registrationsOpen
                            ? "Info about Registration"
                            : item.label
                        }
                      />
                    ) : (
                      <HomepageActionButton
                        key={item.label}
                        eyebrow={item.eyebrow}
                        label={item.label}
                        symbol={item.symbol}
                        onClick={() =>
                          setPublicModal({
                            title: item.label,
                            href: item.href,
                          })
                        }
                      />
                    ),
                )}
'''

homepage = replace_once(
    homepage,
    primary_old,
    primary_new,
    "Codex/Rules modal conversion",
)

footer_targets = {
    "/community-rules": "Community Rules",
    "/safety": "Safety",
    "/age-policy": "18+ Policy",
    "/privacy": "Privacy",
    "/cookies": "Cookies",
    "/terms": "Terms",
}

for href, label in footer_targets.items():
    pattern = (
        r'<Link href="' + re.escape(href) +
        r'" className="([^"]+)">\s*' +
        re.escape(label) +
        r'\s*</Link>'
    )

    replacement = (
        '<button\n'
        '                type="button"\n'
        '                onClick={() =>\n'
        '                  setPublicModal({\n'
        f'                    title: "{label}",\n'
        f'                    href: "{href}",\n'
        '                  })\n'
        '                }\n'
        r'                className="\1"'
        '\n'
        '              >\n'
        f'                {label}\n'
        '              </button>'
    )

    homepage = regex_once(
        homepage,
        pattern,
        replacement,
        f"footer modal link {label}",
    )

about_anchor = '''      {aboutOpen ? (
'''

modal_mount = '''      <HomepagePublicModal
        modal={publicModal}
        onClose={() =>
          setPublicModal(null)
        }
      />

      {aboutOpen ? (
'''

homepage = replace_once(
    homepage,
    about_anchor,
    modal_mount,
    "public modal mount before About modal",
)

modal_source = r'''"use client";

import {
  useEffect,
} from "react";

type HomepagePublicModalProps = {
  modal: {
    title: string;
    href: string;
  } | null;
  onClose: () => void;
};

export function HomepagePublicModal({
  modal,
  onClose,
}: HomepagePublicModalProps) {
  useEffect(() => {
    if (!modal) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [modal, onClose]);

  if (!modal) {
    return null;
  }

  const separator =
    modal.href.includes("?")
      ? "&"
      : "?";

  const iframeSrc =
    `${modal.href}${separator}embedded=homepage`;

  return (
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center p-2 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={modal.title}
    >
      <button
        type="button"
        aria-label={`Close ${modal.title}`}
        onClick={onClose}
        className="absolute inset-0 bg-[rgb(var(--sep-colour-050403))]/85 backdrop-blur-[2px]"
      />

      <section className="relative z-10 flex h-[92dvh] w-[96vw] max-w-[1280px] flex-col overflow-hidden border border-[rgb(var(--sep-colour-795a34))]/70 bg-[rgb(var(--sep-colour-0d0907))] shadow-[0_30px_100px_rgba(var(--sep-rgb-0-0-0),0.88)] sm:h-[88dvh] sm:w-[92vw]">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-120d0a))] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-[7px] uppercase tracking-[0.26em] text-[rgb(var(--sep-colour-80684c))]">
              Sepulchria
            </p>

            <h2 className="truncate font-serif text-lg text-[rgb(var(--sep-colour-e0c99e))] sm:text-xl">
              {modal.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${modal.title}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/60 bg-[rgb(var(--sep-colour-17110d))] text-lg text-[rgb(var(--sep-colour-bda57f))] transition hover:border-[rgb(var(--sep-colour-9b7443))] hover:text-[rgb(var(--sep-colour-f1d7a5))]"
          >
            ×
          </button>
        </div>

        <iframe
          key={iframeSrc}
          src={iframeSrc}
          title={modal.title}
          className="min-h-0 flex-1 border-0 bg-[rgb(var(--sep-colour-090706))]"
        />
      </section>
    </div>
  );
}
'''

HOMEPAGE.write_text(
    homepage,
    encoding="utf-8",
    newline="\n",
)

MODAL.write_text(
    modal_source,
    encoding="utf-8",
    newline="\n",
)

print("WROTE  components/homepage/sepulchria-homepage.tsx")
print("WROTE  components/homepage/homepage-public-modal.tsx")
print()
print("PATCH APPLIED SUCCESSFULLY")
print()
print("Modal behaviour enabled for:")
print("- Codex")
print("- Rules")
print("- Community Rules")
print("- Safety")
print("- 18+ Policy")
print("- Privacy")
print("- Cookies")
print("- Terms")
print()
print("Left unchanged:")
print("- About Sepulchria (existing modal)")
print("- Register / Info about Registration")
print("- Enter Sepulchria / Login")
print("- Cookie Settings")
print("- Discord")
print("- Credits (still has no real route)")
print()
print("Next: npm run build")
