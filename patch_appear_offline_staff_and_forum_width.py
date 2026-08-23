#!/usr/bin/env python3
from pathlib import Path
import argparse
import subprocess

BASELINE = "520be31620a351615b38abc4d1f50d45b555ba3f"

FILES = [
    "components/portal/active-city-counter.tsx",
    "components/characters/character-directory.tsx",
    "components/forum/topic-post.tsx",
    "lib/characters/get-public-character.ts",
]

def die(message):
    raise SystemExit(f"ERROR: {message}. Nothing written.")

def baseline_text(path):
    try:
        return subprocess.check_output(
            ["git", "show", f"{BASELINE}:{path}"],
            text=True,
            encoding="utf-8",
        )
    except subprocess.CalledProcessError:
        die(f"could not read {path} from baseline commit")

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        die(f"{label}: expected exact baseline block once, found {count}")
    return text.replace(old, new, 1)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    root = Path.cwd()
    if not (root / "package.json").exists():
        die("run this from the sepulchria-portal root")

    head = subprocess.check_output(
        ["git", "rev-parse", "HEAD"],
        text=True,
    ).strip()

    if head != BASELINE:
        die(f"HEAD is {head}; expected {BASELINE}")

    out = {path: baseline_text(path) for path in FILES}

    # 1) Header presence:
    # ONLY active staff characters deliberately using Appear Offline
    # get the dashed/translucent treatment. Normal active characters unchanged.
    p = "components/portal/active-city-counter.tsx"
    s = out[p]

    old = '''                        className="group relative min-w-0 overflow-hidden border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-120e0b))] transition hover:border-[rgb(var(--sep-colour-8f6c43))] hover:bg-[rgb(var(--sep-colour-18110d))]"'''
    new = '''                        className={
                          isStaff &&
                          presence.appear_offline === true
                            ? "group relative min-w-0 overflow-hidden border border-dashed border-[rgb(var(--sep-colour-876a46))]/55 bg-[rgb(var(--sep-colour-120e0b))] opacity-40 transition hover:border-[rgb(var(--sep-colour-9b7446))] hover:bg-[rgb(var(--sep-colour-18110d))] hover:opacity-100"
                            : "group relative min-w-0 overflow-hidden border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-120e0b))] transition hover:border-[rgb(var(--sep-colour-8f6c43))] hover:bg-[rgb(var(--sep-colour-18110d))]"
                        }'''
    s = replace_once(
        s,
        old,
        new,
        "header appear-offline staff card styling",
    )
    out[p] = s

    # 2) Expose the existing appear_offline flag in the public directory item type.
    # Non-staff already have appear-offline presence rows filtered out server-side.
    p = "lib/characters/get-public-character.ts"
    s = out[p]

    old = '''  presence: {
    status: PublicPresenceStatus;
    last_seen_at: string;
  } | null;'''
    new = '''  presence: {
    status: PublicPresenceStatus;
    last_seen_at: string;
    appear_offline: boolean;
    appeared_offline_at: string | null;
  } | null;'''
    s = replace_once(
        s,
        old,
        new,
        "directory presence type",
    )
    out[p] = s

    # 3) Characters directory:
    # Keep ALL ordinary offline cards exactly as baseline.
    # Apply special styling ONLY when the preserved presence row explicitly says
    # appear_offline=true (which only staff viewers receive from the server).
    p = "components/characters/character-directory.tsx"
    s = out[p]

    old = '''    <article className="group relative overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 transition duration-200 hover:-translate-y-0.5 hover:border-[rgb(var(--sep-colour-a17a49))] hover:bg-[rgb(var(--sep-colour-1a130e))]">'''
    new = '''    <article
      className={
        character.presence?.appear_offline === true
          ? "group relative overflow-hidden border border-dashed border-[rgb(var(--sep-colour-876a46))]/55 bg-[rgb(var(--sep-colour-15100d))]/95 opacity-40 transition duration-200 hover:-translate-y-0.5 hover:border-[rgb(var(--sep-colour-9b7446))] hover:bg-[rgb(var(--sep-colour-1a130e))] hover:opacity-100"
          : "group relative overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 transition duration-200 hover:-translate-y-0.5 hover:border-[rgb(var(--sep-colour-a17a49))] hover:bg-[rgb(var(--sep-colour-1a130e))]"
      }
    >'''
    s = replace_once(
        s,
        old,
        new,
        "directory appear-offline staff card styling",
    )
    out[p] = s

    # 4) Forum author column remains 40% smaller: 230px -> 138px.
    p = "components/forum/topic-post.tsx"
    s = out[p]

    s = replace_once(
        s,
        '''      <div className="grid lg:grid-cols-[230px_minmax(0,1fr)]">''',
        '''      <div className="grid lg:grid-cols-[138px_minmax(0,1fr)]">''',
        "forum author column width",
    )
    out[p] = s

    print("Baseline:", head[:7])
    print("Prepared corrected UI changes:")
    print("  - Header: ONLY staff using Appear Offline get dashed/translucent styling")
    print("  - Directory: normal Offline cards remain EXACTLY unchanged")
    print("  - Directory: ONLY staff using Appear Offline get dashed/translucent styling")
    print("  - Staff can see that styling on themselves and other staff")
    print("  - Forum author column: 230px -> 138px (40% smaller)")
    print()

    if args.dry_run:
        print("DRY RUN ONLY — no project files written.")
        return

    for rel, content in out.items():
        (root / rel).write_text(content, encoding="utf-8")

    print("Applied LOCALLY only.")
    print("Next: npm run build")

if __name__ == "__main__":
    main()
