#!/usr/bin/env python3
from pathlib import Path
import argparse
import subprocess

BASELINE = "8068d8e6f27d0e61243a34efcccfea4b69cd229c"

FILES = {
    "actions": "app/(portal)/sanctions/actions.ts",
    "sanctions": "app/(portal)/sanctions/page.tsx",
    "appeal": "app/(portal)/sanctions/[id]/appeal/page.tsx",
    "admin_ticket": "app/(portal)/admin/tickets/[reference]/page.tsx",
}

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

    actions = baseline_text(FILES["actions"])
    sanctions = baseline_text(FILES["sanctions"])
    appeal = baseline_text(FILES["appeal"])
    admin_ticket = baseline_text(FILES["admin_ticket"])

    actions = replace_once(
        actions,
        '''  if (sanctionError || !sanction) {
    throw new Error("This sanction is unavailable.");
  }

  const { data: existingEvents, error: existingError } = await admin''',
        '''  if (sanctionError || !sanction) {
    throw new Error("This sanction is unavailable.");
  }

  if (sanction.status === "revoked") {
    throw new Error("Revoked sanctions cannot be appealed.");
  }

  const { data: existingEvents, error: existingError } = await admin''',
        "revoked sanction server guard",
    )

    actions = replace_once(
        actions,
        '''  const { error: eventError } = await admin
    .from("ticket_events")
    .insert({
      ticket_id: ticket.id,
      actor_user_id: identity.userId,
      actor_character_id: identity.characterId,
      event_type: "sanction_appeal_created",
      details: {
        source: "sanction_appeal",
        sanction_id: sanction.id,
        sanction_type: sanction.sanction_type,
        sanction_status: sanction.status,
      },
    });

  if (eventError) {
    throw new Error(
      `Appeal ticket created but the sanction link could not be recorded: ${eventError.message}`,
    );
  }''',
        '''  const { error: createdEventError } = await admin
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

  const { error: eventError } = await admin
    .from("ticket_events")
    .insert({
      ticket_id: ticket.id,
      actor_user_id: identity.userId,
      actor_character_id: identity.characterId,
      event_type: "sanction_appeal_created",
      details: {
        source: "sanction_appeal",
        sanction_id: sanction.id,
        sanction_type: sanction.sanction_type,
        sanction_status: sanction.status,
      },
    });

  if (eventError) {
    throw new Error(
      `Appeal ticket created but the sanction link could not be recorded: ${eventError.message}`,
    );
  }''',
        "appeal ticket-created notification event",
    )

    old_button = '''          {appealBySanction.get(s.id)?<Link href={`/support/${appealBySanction.get(s.id)!.public_reference}`} className="border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-261b12))] px-4 py-2.5 text-[8px] uppercase text-[rgb(var(--sep-colour-d5b785))]">Open Appeal · {appealBySanction.get(s.id)!.status.replaceAll("_"," ")}</Link>:<Link href={`/sanctions/${s.id}/appeal`} className="border border-[rgb(var(--sep-colour-967342))] bg-[rgb(var(--sep-colour-3b2b1b))] px-4 py-2.5 text-[8px] uppercase text-[rgb(var(--sep-colour-f1d9a7))]">Appeal Sanction</Link>}'''
    new_button = '''          {appealBySanction.get(s.id)
            ? <Link href={`/support/${appealBySanction.get(s.id)!.public_reference}`} className="border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-261b12))] px-4 py-2.5 text-[8px] uppercase text-[rgb(var(--sep-colour-d5b785))]">Open Appeal · {appealBySanction.get(s.id)!.status.replaceAll("_"," ")}</Link>
            : status !== "revoked"
              ? <Link href={`/sanctions/${s.id}/appeal`} className="border border-[rgb(var(--sep-colour-967342))] bg-[rgb(var(--sep-colour-3b2b1b))] px-4 py-2.5 text-[8px] uppercase text-[rgb(var(--sep-colour-f1d9a7))]">Appeal Sanction</Link>
              : null}'''

    sanctions = replace_once(
        sanctions,
        old_button,
        new_button,
        "revoked sanction appeal button",
    )

    appeal = replace_once(
        appeal,
        '''  if (existingTicketId) {
    const { data: ticket } = await admin
      .from("tickets")
      .select("public_reference")
      .eq("id", existingTicketId)
      .maybeSingle();

    if (ticket?.public_reference) {
      redirect(`/support/${ticket.public_reference}`);
    }
  }

  return (''',
        '''  if (existingTicketId) {
    const { data: ticket } = await admin
      .from("tickets")
      .select("public_reference")
      .eq("id", existingTicketId)
      .maybeSingle();

    if (ticket?.public_reference) {
      redirect(`/support/${ticket.public_reference}`);
    }
  }

  if (sanction.status === "revoked") {
    redirect("/sanctions");
  }

  return (''',
        "direct revoked appeal URL guard",
    )

    admin_ticket = replace_once(
        admin_ticket,
        '''import Link from "next/link";
import { notFound } from "next/navigation";''',
        '''import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";''',
        "admin ticket dynamic rendering",
    )

    outputs = {
        FILES["actions"]: actions,
        FILES["sanctions"]: sanctions,
        FILES["appeal"]: appeal,
        FILES["admin_ticket"]: admin_ticket,
    }

    print("Baseline:", head[:7])
    print("Source mode: git show (exact committed files)")
    print(f"Prepared {len(outputs)} corrected file(s):")
    for path in outputs:
        print(" ", path.replace("/", "\\"))

    if args.dry_run:
        print("\nDRY RUN ONLY — no project files written.")
        return

    for rel, content in outputs.items():
        (root / rel).write_text(content, encoding="utf-8")

    print("\nApplied LOCALLY only.")
    print("No SQL changes required.")
    print("Next: npm run build")

if __name__ == "__main__":
    main()
