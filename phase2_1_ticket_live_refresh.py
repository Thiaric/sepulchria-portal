#!/usr/bin/env python3
# Sepulchria — Phase 2.1 Ticket Centre live refresh
# Targets the Phase 2 files previously generated locally.
# LOCAL ONLY. No GitHub writes.

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path

def tracked_dirty():
    try:
        return bool(
            subprocess.check_output(
                ["git", "status", "--porcelain", "--untracked-files=no"],
                text=True,
            ).strip()
        )
    except Exception:
        return False

def once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"ERROR: {label}: expected anchor once, found {count}. Nothing written."
        )
    return text.replace(old, new, 1)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    root = Path.cwd()

    required = [
        "app/(portal)/support/page.tsx",
        "app/(portal)/support/[reference]/page.tsx",
        "app/(portal)/admin/tickets/page.tsx",
        "app/(portal)/admin/tickets/[reference]/page.tsx",
    ]

    for rel in required:
        if not (root / rel).exists():
            raise SystemExit(
                f"ERROR: missing Phase 2 file: {rel}. Nothing written."
            )

    changes = {}

    live_component = '''"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function TicketLiveRefresh({
  intervalMs = 2000,
}: {
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        router.refresh();
      }
    };

    const interval =
      window.setInterval(
        refresh,
        intervalMs,
      );

    const handleVisibility =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          router.refresh();
        }
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibility,
    );

    return () => {
      window.clearInterval(
        interval,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );
    };
  }, [intervalMs, router]);

  return null;
}
'''

    component_path = root / "components/support/ticket-live-refresh.tsx"
    if component_path.exists():
        raise SystemExit(
            "ERROR: components/support/ticket-live-refresh.tsx already exists. Nothing written."
        )
    changes[component_path] = ("", live_component)

    def patch_page(rel: str, heading_anchor: str):
        path = root / rel
        old = path.read_text(encoding="utf-8")
        new = old

        import_anchor = 'import Link from "next/link";\n'
        import_line = (
            'import { TicketLiveRefresh } '
            'from "@/components/support/ticket-live-refresh";\n'
        )

        new = once(
            new,
            import_anchor,
            import_anchor + "\n" + import_line,
            f"{rel} live refresh import",
        )

        new = once(
            new,
            heading_anchor,
            heading_anchor + "\n        <TicketLiveRefresh />",
            f"{rel} live refresh render",
        )

        changes[path] = (old, new)

    patch_page(
        "app/(portal)/support/page.tsx",
        '      <div className="mx-auto max-w-5xl">',
    )

    patch_page(
        "app/(portal)/support/[reference]/page.tsx",
        '      <div className="mx-auto max-w-4xl">',
    )

    patch_page(
        "app/(portal)/admin/tickets/page.tsx",
        '      <div className="mx-auto max-w-[1400px]">',
    )

    patch_page(
        "app/(portal)/admin/tickets/[reference]/page.tsx",
        '      <div className="mx-auto max-w-5xl">',
    )

    print(f"Prepared {len(changes)} local file change(s):")
    for path in changes:
        print("  ", path.relative_to(root))

    if args.dry_run:
        print("\nDRY RUN ONLY — no files written.")
        return

    for path, (_, new) in changes.items():
        path.parent.mkdir(
            parents=True,
            exist_ok=True,
        )
        path.write_text(
            new,
            encoding="utf-8",
            newline="\n",
        )
        print(
            "patched:",
            path.relative_to(root),
        )

    print("\nApplied LOCALLY only. No GitHub write was performed.")
    print("Next: npm run build")

if __name__ == "__main__":
    main()
