from pathlib import Path
import sys

ROOT = Path.cwd()
DISPLAY = ROOT / "components/characters/character-display-trophies.tsx"
OWN_PAGE = ROOT / "app/(portal)/character/page.tsx"
PUBLIC_PROFILE = ROOT / "components/characters/public-character-profile.tsx"
ADMIN_PAGE = ROOT / "app/(portal)/admin/trophies/page.tsx"
FEEDBACK = ROOT / "components/admin/trophy-save-feedback.tsx"

def fail(message):
    print(f"\nERROR: {message}")
    sys.exit(1)

def read(path):
    if not path.exists(): fail(f"Missing file: {path}")
    return path.read_text(encoding="utf-8")

def write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(f"UPDATED: {path.relative_to(ROOT)}")

def patch_display():
    text = read(DISPLAY)
    text = text.replace('className="inline-flex flex-wrap items-center gap-1.5"', 'className="ml-auto inline-flex flex-wrap items-center justify-end gap-1.5"')
    text = text.replace('className="flex h-8 w-8 items-center justify-center overflow-hidden border border-[rgb(var(--sep-colour-745636))]/60 bg-[rgb(var(--sep-colour-100c09))]"', 'className="flex h-8 w-8 items-center justify-center overflow-hidden bg-transparent"')
    text = text.replace('className="flex h-8 w-8 items-center justify-center overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-15100d))]"', 'className="flex h-8 w-8 items-center justify-center overflow-hidden bg-transparent"')
    text = text.replace('className="pointer-events-none absolute bottom-full left-0 z-40 mb-2 hidden w-56 border border-[rgb(var(--sep-colour-745636))]/70 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left shadow-xl group-hover:block group-focus:block group-focus-within:block"', 'className="pointer-events-none absolute bottom-full right-0 z-40 mb-2 hidden w-56 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2.5 text-left group-hover:block group-focus:block group-focus-within:block"')
    text = text.replace('className="pointer-events-none absolute bottom-full right-0 z-40 mb-2 hidden w-56 border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2.5 text-left group-hover:block group-focus:block group-focus-within:block"', 'className="pointer-events-none absolute bottom-full right-0 z-40 mb-2 hidden w-56 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2.5 text-left group-hover:block group-focus:block group-focus-within:block"')
    write(DISPLAY, text)

def patch_headers():
    for path in (OWN_PAGE, PUBLIC_PROFILE):
        text = read(path)
        text = text.replace('className="mt-1 flex flex-wrap items-center gap-2.5"', 'className="mt-1 flex flex-wrap items-center justify-between gap-2.5"')
        write(path, text)

FEEDBACK_TSX = '"use client";\n\nimport { useEffect, useState } from "react";\n\nexport function TrophySaveFeedback({\n  type,\n  message,\n}: {\n  type: "success" | "error";\n  message: string;\n}) {\n  const [visible, setVisible] = useState(true);\n\n  useEffect(() => {\n    const timer = window.setTimeout(() => {\n      setVisible(false);\n    }, 5000);\n\n    return () => {\n      window.clearTimeout(timer);\n    };\n  }, []);\n\n  if (!visible) {\n    return null;\n  }\n\n  return (\n    <p\n      role={type === "error" ? "alert" : "status"}\n      className={\n        type === "success"\n          ? "mt-2 border border-[rgb(var(--sep-colour-5f704f))]/45 bg-[rgb(var(--sep-colour-11150f))] px-3 py-2 text-[9px] leading-4 text-[rgb(var(--sep-colour-b7c7a8))]"\n          : "mt-2 border border-[rgb(var(--sep-colour-7a4a3f))]/45 bg-[rgb(var(--sep-colour-1b100d))] px-3 py-2 text-[9px] leading-4 text-[rgb(var(--sep-colour-c9a398))]"\n      }\n    >\n      {message}\n    </p>\n  );\n}\n'

def patch_admin():
    text = read(ADMIN_PAGE)
    if 'PendingSubmitButton' not in text:
        anchor = 'import Link from "next/link";'
        if anchor not in text: fail("Could not find Link import.")
        text = text.replace(anchor, anchor + '\nimport { PendingSubmitButton } from "@/components/forms/pending-submit-button";\nimport { TrophySaveFeedback } from "@/components/admin/trophy-save-feedback";', 1)
    elif 'TrophySaveFeedback' not in text:
        anchor = 'import { PendingSubmitButton } from "@/components/forms/pending-submit-button";'
        if anchor not in text: fail("Could not find PendingSubmitButton import.")
        text = text.replace(anchor, anchor + '\nimport { TrophySaveFeedback } from "@/components/admin/trophy-save-feedback";', 1)
    old_button = '          <button\n            type="submit"\n            className={buttonClass}\n          >\n            Save Trophy\n          </button>'
    new_button = '          <PendingSubmitButton\n            idleText="Save Trophy"\n            pendingText="Saving..."\n            className={`${buttonClass} disabled:cursor-not-allowed disabled:opacity-60`}\n          />'
    if old_button in text:
        text = text.replace(old_button, new_button, 1)
    old_feedback = '              {saveSuccess ? (\n                <p className="mt-2 border border-emerald-800/45 bg-emerald-950/15 px-3 py-2 text-[9px] leading-4 text-emerald-300">\n                  Trophy saved successfully.\n                </p>\n              ) : saveError ? (\n                <p className="mt-2 border border-red-800/45 bg-red-950/15 px-3 py-2 text-[9px] leading-4 text-red-300">\n                  {saveError}\n                </p>\n              ) : null}'
    new_feedback = '              {saveSuccess ? (\n                <TrophySaveFeedback\n                  type="success"\n                  message="Trophy saved successfully."\n                />\n              ) : saveError ? (\n                <TrophySaveFeedback\n                  type="error"\n                  message={saveError}\n                />\n              ) : null}'
    if old_feedback in text:
        text = text.replace(old_feedback, new_feedback, 1)
    if "Saving..." not in text: fail("Could not patch Save Trophy button.")
    if "TrophySaveFeedback" not in text: fail("Could not patch timed feedback.")
    write(ADMIN_PAGE, text)

def main():
    for path in (DISPLAY, OWN_PAGE, PUBLIC_PROFILE, ADMIN_PAGE):
        if not path.exists(): fail(f"Run from repo root. Missing: {path.relative_to(ROOT)}")
    print("Applying final Trophy UI polish...")
    print("No GitHub or Vercel operations are performed.\n")
    write(FEEDBACK, FEEDBACK_TSX)
    patch_display()
    patch_headers()
    patch_admin()
    print("\nSUCCESS.")
    print("Run: npm run build")

if __name__ == "__main__":
    main()