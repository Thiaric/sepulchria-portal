from pathlib import Path
import subprocess

BASE = "a25e57c6bccb3c299a231c9631c4aee748d2ef02"
root = Path.cwd()

FILES = {
    "breeze": "app/(portal)/game/components/BreezeLodgingsPanel.tsx",
    "odd": "app/(portal)/game/components/OddJobsPanel.tsx",
    "game": "app/(portal)/game/page.tsx",
    "rooms": "app/(portal)/admin/rooms/page.tsx",
    "admin_context": "components/portal/admin-context-panel.tsx",
}

def fail(message):
    print(f"ERROR: {message}")
    raise SystemExit(1)

def git_show(path):
    try:
        return subprocess.check_output(
            ["git", "show", f"{BASE}:{path}"],
            cwd=root,
            text=True,
            encoding="utf-8",
        )
    except subprocess.CalledProcessError as exc:
        fail(f"Could not read {path} from commit {BASE}: {exc}")

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        fail(f"{label}: expected 1 match in committed source, found {count}. No files were changed.")
    return text.replace(old, new, 1)

head = subprocess.check_output(
    ["git", "rev-parse", "HEAD"],
    cwd=root,
    text=True,
).strip()

if head != BASE:
    fail(
        f"Current local HEAD is {head}, but latest pushed master used for this patch is {BASE}. "
        "No files were changed."
    )

# Always rebuild these files from the exact pushed commit, not from any
# uncommitted earlier patch attempts in the working tree.
texts = {key: git_show(path) for key, path in FILES.items()}

# 1) Breeze Lodgings panel
breeze = texts["breeze"]
breeze = replace_once(
    breeze,
    '''  return (
    <div className="shrink-0 border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-120e0b))]">''',
    '''  return (
    <details className="group max-h-[72%] shrink-0 overflow-y-auto border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-120e0b))]">''',
    "Breeze outer wrapper",
)
breeze = replace_once(
    breeze,
    '''      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <div>
          <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
            The Breeze Lodgings
          </p>
          <p className="mt-0.5 font-serif text-sm text-[rgb(var(--sep-colour-dec89f))]">
            Rooms for travellers
          </p>
        </div>

        <div className="text-right">
          <p className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))]">
            Wallet
          </p>
          <p className="font-serif text-base text-[rgb(var(--sep-colour-e4c589))]">
            {formatRemnants(wallet)}
          </p>
        </div>
      </div>''',
    '''      <summary className="sticky top-0 z-30 flex cursor-pointer list-none items-center justify-between gap-3 bg-[rgb(var(--sep-colour-120e0b))] px-3 py-2 [&::-webkit-details-marker]:hidden">
        <div>
          <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
            The Breeze Lodgings
          </p>
          <p className="mt-0.5 font-serif text-sm text-[rgb(var(--sep-colour-dec89f))]">
            Rooms for travellers
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))]">
              Wallet
            </p>
            <p className="font-serif text-base text-[rgb(var(--sep-colour-e4c589))]">
              {formatRemnants(wallet)}
            </p>
          </div>

          <span className="text-[9px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a88d65))]">
            <span className="group-open:hidden">View Rooms ▾</span>
            <span className="hidden group-open:inline">Hide Rooms ▴</span>
          </span>
        </div>
      </summary>''',
    "Breeze summary",
)
old_tail = '''      </div>
    </div>
  );
}
'''
new_tail = '''      </div>
    </details>
  );
}
'''
if not breeze.endswith(old_tail):
    fail("Breeze final wrapper does not match committed source. No files were changed.")
texts["breeze"] = breeze[:-len(old_tail)] + new_tail

# 2) Odd Jobs panel
odd = texts["odd"]
odd = replace_once(
    odd,
    '''  return (
    <div className="shrink-0 border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-120e0b))]">''',
    '''  return (
    <details className="group max-h-[72%] shrink-0 overflow-y-auto border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-120e0b))]">''',
    "Odd Jobs outer wrapper",
)
odd = replace_once(
    odd,
    '''      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <div>
          <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
            Odd Jobs Bureau
          </p>

          <p className="mt-0.5 font-serif text-sm text-[rgb(var(--sep-colour-dec89f))]">
            Today&apos;s work
          </p>
        </div>

        <div className="text-right">
          <p className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))]">
            Wallet
          </p>

          <p className="font-serif text-base text-[rgb(var(--sep-colour-e4c589))]">
            {formatRemnants(Number(first.wallet_balance))}
          </p>
        </div>
      </div>''',
    '''      <summary className="sticky top-0 z-30 flex cursor-pointer list-none items-center justify-between gap-3 bg-[rgb(var(--sep-colour-120e0b))] px-3 py-2 [&::-webkit-details-marker]:hidden">
        <div>
          <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
            Odd Jobs Bureau
          </p>

          <p className="mt-0.5 font-serif text-sm text-[rgb(var(--sep-colour-dec89f))]">
            Today&apos;s work
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))]">
              Wallet
            </p>
            <p className="font-serif text-base text-[rgb(var(--sep-colour-e4c589))]">
              {formatRemnants(Number(first.wallet_balance))}
            </p>
          </div>

          <span className="text-[9px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a88d65))]">
            <span className="group-open:hidden">View Jobs ▾</span>
            <span className="hidden group-open:inline">Hide Jobs ▴</span>
          </span>
        </div>
      </summary>''',
    "Odd Jobs summary",
)
if not odd.endswith(old_tail):
    fail("Odd Jobs final wrapper does not match committed source. No files were changed.")
texts["odd"] = odd[:-len(old_tail)] + new_tail

# 3) Make special-location chats use the same full-height layout as ordinary chats.
game = texts["game"]
game = replace_once(
    game,
    '''  const hasLocationPanel =
    room.slug === "odd-jobs-bureau" ||
    room.slug === "the-breeze-lodgings";

  return (
  <div
  className={
    hasLocationPanel
  ? "min-h-full overflow-visible p-2 sm:p-3 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:p-4"
  : privateLocation
    ? "private-location-theme h-full min-h-0 overflow-hidden p-2 sm:p-3 lg:p-4"
    : "h-full min-h-0 overflow-hidden p-2 sm:p-3 lg:p-4"
  }''',
    '''  return (
  <div
  className={
    privateLocation
      ? "private-location-theme h-full min-h-0 overflow-hidden p-2 sm:p-3 lg:p-4"
      : "h-full min-h-0 overflow-hidden p-2 sm:p-3 lg:p-4"
  }''',
    "Game outer layout",
)
game = replace_once(
    game,
    '''    <div
  className={
    hasLocationPanel
      ? "mx-auto flex min-h-full max-w-80dvh flex-col"
      : "mx-auto flex h-full max-w-80dvh flex-col"
  }
>
  <article
  className={
    hasLocationPanel
      ? "flex shrink-0 flex-col overflow-visible border border-[rgb(var(--sep-colour-6a5032))]/50 bg-[rgb(var(--sep-colour-17110d))]"
      : "flex min-h-0 flex-1 flex-col overflow-visible border border-[rgb(var(--sep-colour-6a5032))]/50 bg-[rgb(var(--sep-colour-17110d))] lg:overflow-hidden"
  }
>''',
    '''    <div className="mx-auto flex h-full max-w-80dvh flex-col">
  <article className="flex min-h-0 flex-1 flex-col overflow-visible border border-[rgb(var(--sep-colour-6a5032))]/50 bg-[rgb(var(--sep-colour-17110d))] lg:overflow-hidden">
''',
    "Game inner layout",
)
texts["game"] = game

# 4) Stable anchors on admin location cards.
rooms = texts["rooms"]
rooms = replace_once(
    rooms,
    '''              <section
                key={room.id}
                className="overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]"
              >''',
    '''              <section
                key={room.id}
                id={`room-${room.id}`}
                className="scroll-mt-4 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]"
              >''',
    "Admin room card",
)
texts["rooms"] = rooms

# 5) Right sidebar uses the stable room anchor first.
admin = texts["admin_context"]
admin = replace_once(
    admin,
    '''    } else if (
      mode === "rooms"
    ) {
      target =
        document
          .querySelector<HTMLInputElement>(
            `input[name="roomId"][value="${CSS.escape(
              entry.id,
            )}"]`,
          )
          ?.closest<HTMLElement>(
            "section",
          ) ?? null;''',
    '''    } else if (
      mode === "rooms"
    ) {
      target =
        document.getElementById(
          `room-${entry.id}`,
        ) ??
        document
          .querySelector<HTMLInputElement>(
            `input[name="roomId"][value="${CSS.escape(
              entry.id,
            )}"]`,
          )
          ?.closest<HTMLElement>(
            "section",
          ) ??
        null;''',
    "Admin room jump",
)
texts["admin_context"] = admin

# Validate before writing.
checks = {
    "breeze": ["View Rooms ▾", "</details>"],
    "odd": ["View Jobs ▾", "</details>"],
    "game": ['className="mx-auto flex h-full max-w-80dvh flex-col"'],
    "rooms": ['id={`room-${room.id}`}'],
    "admin_context": ['`room-${entry.id}`'],
}
for key, needles in checks.items():
    for needle in needles:
        if needle not in texts[key]:
            fail(f"Validation failed for {FILES[key]}. No files were changed.")

# Write only after all baseline edits validate.
for key, rel in FILES.items():
    (root / rel).write_text(texts[key], encoding="utf-8")

print("Patch applied successfully FROM CLEAN PUSHED MASTER.")
print("Earlier uncommitted attempts in these five files were intentionally discarded.")
print("Changed files:")
for rel in FILES.values():
    print(" -", rel)
print("No SQL required.")
print("Next: npm run build")
