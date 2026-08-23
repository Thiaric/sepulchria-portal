#!/usr/bin/env python3
from pathlib import Path
import argparse
import subprocess

BASELINE = "520be31620a351615b38abc4d1f50d45b555ba3f"

FILES = [
    "components/portal/active-city-counter.tsx",
    "components/characters/character-directory.tsx",
    "components/forum/topic-post.tsx",
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

    p = "components/portal/active-city-counter.tsx"
    s = out[p]
    old = '''                        className="group relative min-w-0 overflow-hidden border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-120e0b))] transition hover:border-[rgb(var(--sep-colour-8f6c43))] hover:bg-[rgb(var(--sep-colour-18110d))]"'''
    new = '''                        className={
                          presence.appear_offline
                            ? "group relative min-w-0 overflow-hidden border border-dashed border-[rgb(var(--sep-colour-876a46))]/55 bg-[rgb(var(--sep-colour-120e0b))] opacity-40 transition hover:border-[rgb(var(--sep-colour-9b7446))] hover:bg-[rgb(var(--sep-colour-18110d))] hover:opacity-100"
                            : "group relative min-w-0 overflow-hidden border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-120e0b))] transition hover:border-[rgb(var(--sep-colour-8f6c43))] hover:bg-[rgb(var(--sep-colour-18110d))]"
                        }'''
    s = replace_once(s, old, new, "header presence offline card styling")
    out[p] = s

    p = "components/characters/character-directory.tsx"
    s = out[p]
    old = '''    <article className="group relative overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 transition duration-200 hover:-translate-y-0.5 hover:border-[rgb(var(--sep-colour-a17a49))] hover:bg-[rgb(var(--sep-colour-1a130e))]">'''
    new = '''    <article
      className={
        status === "offline"
          ? "group relative overflow-hidden border border-dashed border-[rgb(var(--sep-colour-876a46))]/55 bg-[rgb(var(--sep-colour-15100d))]/95 opacity-40 transition duration-200 hover:-translate-y-0.5 hover:border-[rgb(var(--sep-colour-9b7446))] hover:bg-[rgb(var(--sep-colour-1a130e))] hover:opacity-100"
          : "group relative overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 transition duration-200 hover:-translate-y-0.5 hover:border-[rgb(var(--sep-colour-a17a49))] hover:bg-[rgb(var(--sep-colour-1a130e))]"
      }
    >'''
    s = replace_once(s, old, new, "character directory offline card styling")
    out[p] = s

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
    print("Prepared UI changes:")
    print("  - Header presence: appear-offline cards match sidebar offline styling")
    print("  - Characters directory: offline cards match sidebar offline styling")
    print("  - Forum topic/reply author column: 230px -> 138px (40% smaller)")
    print()
    for path in FILES:
        print(" ", path.replace("/", "\\"))

    if args.dry_run:
        print("\nDRY RUN ONLY — no project files written.")
        return

    for rel, content in out.items():
        (root / rel).write_text(content, encoding="utf-8")

    print("\nApplied LOCALLY only.")
    print("Next: npm run build")

if __name__ == "__main__":
    main()
