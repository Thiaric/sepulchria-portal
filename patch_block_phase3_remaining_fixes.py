#!/usr/bin/env python3
# Sepulchria — Block Phase 3 cleanup
# Baseline inspected: 42aae5eb20155a70cc7005de6345a67b34e25771
# LOCAL ONLY. No commit, branch, push, deploy, or GitHub write.

from __future__ import annotations
import argparse, difflib, subprocess, sys
from pathlib import Path

BASELINE = "42aae5eb20155a70cc7005de6345a67b34e25771"

def head():
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "HEAD"], text=True, stderr=subprocess.DEVNULL
        ).strip()
    except Exception:
        return None

def tracked_dirty():
    try:
        return bool(
            subprocess.check_output(
                ["git", "status", "--porcelain", "--untracked-files=no"], text=True
            ).strip()
        )
    except Exception:
        return False

def read(p: Path) -> str:
    if not p.exists():
        raise SystemExit(f"ERROR: missing expected file: {p}")
    return p.read_text(encoding="utf-8")

def once(text: str, old: str, new: str, label: str) -> str:
    n = text.count(old)
    if n != 1:
        raise SystemExit(
            f"ERROR: {label}: expected anchor once, found {n}. Nothing written."
        )
    return text.replace(old, new, 1)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--allow-different-head", action="store_true")
    args = ap.parse_args()

    root = Path.cwd()
    if not (root / "package.json").exists():
        raise SystemExit("ERROR: run from the sepulchria-portal repository root.")

    h = head()
    if h and h != BASELINE and not args.allow_different_head:
        raise SystemExit(f"ERROR: HEAD is {h}; patch baseline is {BASELINE}.")

    if tracked_dirty() and not args.dry_run:
        raise SystemExit(
            "ERROR: tracked project files have uncommitted changes. "
            "Commit/stash them first, or use --dry-run."
        )

    changes = {}

    def edit(rel: str, fn):
        p = root / rel
        old = read(p)
        new = fn(old)
        if old != new:
            changes[p] = (old, new)

    def add(rel: str, content: str):
        p = root / rel
        old = p.read_text(encoding="utf-8") if p.exists() else ""
        changes[p] = (old, content)

    add(
        "lib/auth/is-character-staff.ts",
        '''import "server-only";

import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";

function createPrivilegedClient() {
  const url =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const secret =
    process.env
      .SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.",
    );
  }

  return createAdminClient(
    url,
    secret,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

export async function isCharacterStaff(
  characterId: string,
): Promise<boolean> {
  const admin =
    createPrivilegedClient();

  const {
    data: character,
    error: characterError,
  } = await admin
    .from("characters")
    .select("user_id")
    .eq("id", characterId)
    .maybeSingle();

  if (characterError) {
    throw new Error(
      `Unable to identify character account: ${characterError.message}`,
    );
  }

  if (!character?.user_id) {
    return false;
  }

  const {
    data: staffMember,
    error: staffError,
  } = await admin
    .from("staff_members")
    .select("user_id")
    .eq(
      "user_id",
      character.user_id,
    )
    .maybeSingle();

  if (staffError) {
    throw new Error(
      `Unable to identify staff status: ${staffError.message}`,
    );
  }

  return Boolean(staffMember);
}
''',
    )

    def profile_page(t: str) -> str:
        t = once(
            t,
            '''import { getStaffSession } from "@/lib/auth/require-staff";
''',
            '''import { getStaffSession } from "@/lib/auth/require-staff";
import { isCharacterStaff } from "@/lib/auth/is-character-staff";
''',
            "profile import isCharacterStaff",
        )
        t = once(
            t,
            '''  let canUseFriendList = false;
  let isInFriendList = false;
  let blockedByViewer = false;
  let blockedViewer = false;
''',
            '''  let canUseFriendList = false;
  let isInFriendList = false;
  let blockedByViewer = false;
  let blockedViewer = false;

  const targetIsStaff =
    await isCharacterStaff(
      character.id,
    );
''',
            "profile target staff state",
        )
        t = once(
            t,
            '''        canBlock={
  Boolean(activeCharacter) &&
  activeCharacter?.id !== character.id
}
''',
            '''        canBlock={
          Boolean(activeCharacter) &&
          activeCharacter?.id !==
            character.id &&
          !targetIsStaff
        }
''',
            "profile canBlock staff",
        )
        return t

    edit("app/(portal)/characters/[slug]/page.tsx", profile_page)

    def block_actions(t: str) -> str:
        t = once(
            t,
            '''import { createClient } from "@/lib/supabase/server";
''',
            '''import { createClient } from "@/lib/supabase/server";
import { isCharacterStaff } from "@/lib/auth/is-character-staff";
''',
            "block action helper import",
        )
        t = once(
            t,
            '''  if (targetError) throw new Error(targetError.message);
  if (!target || target.is_system) throw new Error("That character cannot be blocked.");

  if (block) {
''',
            '''  if (targetError) throw new Error(targetError.message);
  if (!target || target.is_system) throw new Error("That character cannot be blocked.");

  if (
    block &&
    await isCharacterStaff(
      targetCharacterId,
    )
  ) {
    throw new Error(
      "Staff characters cannot be blocked.",
    );
  }

  if (block) {
''',
            "block action reject staff",
        )
        return t

    edit("app/(portal)/characters/block-actions.ts", block_actions)

    def game_context(t: str) -> str:
        return once(
            t,
            '''    const refreshInterval =
      window.setInterval(() => {
        void loadRoomContext();
      }, 60_000);
''',
            '''    const refreshInterval =
      window.setInterval(() => {
        void loadRoomContext();
      }, 5_000);
''',
            "game context refresh rate",
        )

    edit("components/portal/game-context-panel.tsx", game_context)

    def active_city(t: str) -> str:
        old = '''                                {!isCurrentCharacter &&
                                !blockedCharacterIds.has(
                                  person.id,
                                ) ? (
                                  <form
                                    action={
                                      startConversation
                                    }
                                    onSubmit={() =>
                                      setOpen(
                                        false,
                                      )
                                    }
                                  >
                                    <input
                                      type="hidden"
                                      name="recipientId"
                                      value={
                                        person.id
                                      }
                                    />

                                    <button
                                      type="submit"
                                      aria-label={`Send a private message to ${displayName}`}
                                      title={`Message ${displayName}`}
                                      className="flex h-6 w-6 items-center justify-center border border-[rgb(var(--sep-colour-6d5132))]/60 bg-[rgb(var(--sep-colour-1b130d))] text-[10px] text-[rgb(var(--sep-colour-b89059))] transition hover:border-[rgb(var(--sep-colour-a47b43))] hover:bg-[rgb(var(--sep-colour-332318))] hover:text-[rgb(var(--sep-colour-f0d09a))]"
                                    >
                                      ✉
                                    </button>
                                  </form>
                                ) : (
                                  <span
                                    title="This is your character"
                                    className="flex h-6 min-w-6 items-center justify-center px-1 text-[7px] uppercase text-[rgb(var(--sep-colour-66594a))]"
                                  >
                                    You
                                  </span>
                                )}
'''
        new = '''                                {isCurrentCharacter ? (
                                  <span
                                    title="This is your character"
                                    className="flex h-6 min-w-6 items-center justify-center px-1 text-[7px] uppercase text-[rgb(var(--sep-colour-66594a))]"
                                  >
                                    You
                                  </span>
                                ) : !blockedCharacterIds.has(
                                    person.id,
                                  ) ? (
                                  <form
                                    action={
                                      startConversation
                                    }
                                    onSubmit={() =>
                                      setOpen(
                                        false,
                                      )
                                    }
                                  >
                                    <input
                                      type="hidden"
                                      name="recipientId"
                                      value={
                                        person.id
                                      }
                                    />

                                    <button
                                      type="submit"
                                      aria-label={`Send a private message to ${displayName}`}
                                      title={`Message ${displayName}`}
                                      className="flex h-6 w-6 items-center justify-center border border-[rgb(var(--sep-colour-6d5132))]/60 bg-[rgb(var(--sep-colour-1b130d))] text-[10px] text-[rgb(var(--sep-colour-b89059))] transition hover:border-[rgb(var(--sep-colour-a47b43))] hover:bg-[rgb(var(--sep-colour-332318))] hover:text-[rgb(var(--sep-colour-f0d09a))]"
                                    >
                                      ✉
                                    </button>
                                  </form>
                                ) : null}
'''
        return once(t, old, new, "active city You branch")

    edit("components/portal/active-city-counter.tsx", active_city)

    def game_actions(t: str) -> str:
        t = once(
            t,
            '''        if (!resolution.ok) {
          return {
            ok: false,
            message:
              "Character not at this Location",
          };
        }
''',
            '''        if (!resolution.ok) {
          return {
            ok: false,
            message:
              resolution.message,
          };
        }
''',
            "submitted whisper preserve error",
        )
        t = once(
            t,
            '''        let resolvedRecipient:
          | WhisperRecipient
          | null = null;

        for (
          const candidate of
          matchingCharacters ?? []
        ) {
''',
            '''        let resolvedRecipient:
          | WhisperRecipient
          | null = null;

        let resolutionFailureMessage:
          string | null = null;

        for (
          const candidate of
          matchingCharacters ?? []
        ) {
''',
            "typed whisper failure state",
        )
        t = once(
            t,
            '''          if (resolution.ok) {
            resolvedRecipient =
              resolution.recipient;

            break;
          }
        }

        if (!resolvedRecipient) {
          return {
            ok: false,
            message:
              "Character not at this Location",
          };
        }
''',
            '''          if (resolution.ok) {
            resolvedRecipient =
              resolution.recipient;

            break;
          }

          if (
            !resolutionFailureMessage
          ) {
            resolutionFailureMessage =
              resolution.message;
          }
        }

        if (!resolvedRecipient) {
          return {
            ok: false,
            message:
              resolutionFailureMessage ??
              "Character not at this Location",
          };
        }
''',
            "typed whisper preserve error",
        )
        return t

    edit("app/(portal)/game/actions.ts", game_actions)

    if not changes:
        print("Nothing to change.")
        return

    print(f"Prepared {len(changes)} local file change(s).")

    if args.dry_run:
        for p, (old, new) in changes.items():
            rel = p.relative_to(root)
            print(f"\n===== {rel} =====")
            sys.stdout.writelines(
                difflib.unified_diff(
                    old.splitlines(True),
                    new.splitlines(True),
                    fromfile=f"a/{rel}",
                    tofile=f"b/{rel}",
                )
            )
        print("\nDRY RUN ONLY — no files written.")
        return

    for p, (_, new) in changes.items():
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(new, encoding="utf-8", newline="\n")
        print("patched:", p.relative_to(root))

    print("\nApplied LOCALLY only. No GitHub write was performed.")
    print("Next: npm run build")

if __name__ == "__main__":
    main()
