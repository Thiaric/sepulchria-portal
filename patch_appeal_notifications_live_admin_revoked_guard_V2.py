#!/usr/bin/env python3
from pathlib import Path
import argparse
import re
import subprocess

BASELINE = "8068d8e6f27d0e61243a34efcccfea4b69cd229c"

def require(condition, message):
    if not condition:
        raise SystemExit(f"ERROR: {message}. Nothing written.")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    root = Path.cwd()
    require((root / "package.json").exists(), "run from sepulchria-portal root")

    head = subprocess.check_output(
        ["git", "rev-parse", "HEAD"],
        text=True,
    ).strip()
    require(head == BASELINE, f"HEAD is {head}; expected {BASELINE}")

    changes = {}

    # 1) Appeal action: revoked guard + normal ticket_created event.
    p = root / "app/(portal)/sanctions/actions.ts"
    s = p.read_text(encoding="utf-8")

    if 'Revoked sanctions cannot be appealed.' not in s:
        marker = '  const { data: existingEvents, error: existingError } = await admin'
        require(marker in s, "could not locate appeal duplicate-check marker")
        s = s.replace(
            marker,
            """  if (sanction.status === "revoked") {
    throw new Error("Revoked sanctions cannot be appealed.");
  }

""" + marker,
            1,
        )

    if 'event_type: "ticket_created"' not in s:
        marker = '  const { error: eventError } = await admin\n    .from("ticket_events")'
        require(marker in s, "could not locate appeal audit-event insert")

        standard_event = """  const { error: createdEventError } = await admin
    .from("ticket_events")
    .insert({
      ticket_id: ticket.id,
      actor_user_id: identity.userId,
      actor_character_id: identity.characterId,
      event_type: "ticket_created",
      details: {
        category: "support",
        source: "sanction_appeal",
        sanction_id: sanction.id,
      },
    });

  if (createdEventError) {
    throw new Error(
      `Appeal ticket created but its notification event could not be recorded: ${createdEventError.message}`,
    );
  }

"""
        s = s.replace(marker, standard_event + marker, 1)

    changes[p] = s

    # 2) Player sanctions page: no new appeal button for revoked sanctions.
    p = root / "app/(portal)/sanctions/page.tsx"
    s = p.read_text(encoding="utf-8")

    if ': status !== "revoked"' not in s:
        pattern = re.compile(
            r'\{appealBySanction\.get\(s\.id\)\?'
            r'(<Link href=\{`/support/\$\{appealBySanction\.get\(s\.id\)!\.public_reference\}`\}.*?</Link>)'
            r':'
            r'(<Link href=\{`/sanctions/\$\{s\.id\}/appeal`\}.*?</Link>)'
            r'\}',
            re.DOTALL,
        )
        match = pattern.search(s)
        require(match is not None, "could not locate sanctions appeal button expression")

        existing_link = match.group(1)
        new_link = match.group(2)

        replacement = (
            '{appealBySanction.get(s.id)\n'
            f'            ? {existing_link}\n'
            '            : status !== "revoked"\n'
            f'              ? {new_link}\n'
            '              : null}'
        )
        s = s[:match.start()] + replacement + s[match.end():]

    changes[p] = s

    # 3) Direct appeal URL guard for revoked sanctions.
    p = root / "app/(portal)/sanctions/[id]/appeal/page.tsx"
    s = p.read_text(encoding="utf-8")

    if 'if (sanction.status === "revoked")' not in s:
        pattern = re.compile(
            r'(  if \(existingTicketId\) \{.*?\n  \}\n)\n(  return \()',
            re.DOTALL,
        )
        match = pattern.search(s)
        require(match is not None, "could not locate existing-appeal redirect block")

        replacement = (
            match.group(1)
            + '\n  if (sanction.status === "revoked") {\n'
            + '    redirect("/sanctions");\n'
            + '  }\n\n'
            + match.group(2)
        )
        s = s[:match.start()] + replacement + s[match.end():]

    changes[p] = s

    # 4) Admin ticket detail must always render fresh on router.refresh().
    p = root / "app/(portal)/admin/tickets/[reference]/page.tsx"
    s = p.read_text(encoding="utf-8")

    if 'export const dynamic = "force-dynamic";' not in s:
        marker = 'import { notFound } from "next/navigation";'
        require(marker in s, "could not locate admin ticket navigation import")
        s = s.replace(
            marker,
            marker + '\n\nexport const dynamic = "force-dynamic";',
            1,
        )

    changes[p] = s

    print("Baseline:", head[:7])
    print(f"Prepared {len(changes)} local correction(s):")
    for path in changes:
        print(" ", str(path.relative_to(root)).replace("/", "\\"))

    if args.dry_run:
        print("\nDRY RUN ONLY — no files written.")
        return

    for path, content in changes.items():
        path.write_text(content, encoding="utf-8")

    print("\nApplied LOCALLY only.")
    print("No SQL changes required.")
    print("Next: npm run build")

if __name__ == "__main__":
    main()
