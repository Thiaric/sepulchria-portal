#!/usr/bin/env python3
from pathlib import Path
import argparse

TARGET = Path("components/support/ticket-live-sync.tsx")

NEW = r""""use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

function signatureForPayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";

  const data = payload as {
    events?: Array<{
      id?: string;
      event_type?: string;
      created_at?: string;
      details?: unknown;
    }>;
    tickets?: Array<{
      id?: string;
      updated_at?: string;
      status?: string;
      priority?: string;
      assigned_staff_user_id?: string | null;
    }>;
  };

  if (Array.isArray(data.events)) {
    return JSON.stringify(
      data.events.map((event) => [
        event.id ?? "",
        event.event_type ?? "",
        event.created_at ?? "",
        event.details ?? null,
      ]),
    );
  }

  if (Array.isArray(data.tickets)) {
    return JSON.stringify(
      data.tickets.map((ticket) => [
        ticket.id ?? "",
        ticket.updated_at ?? "",
        ticket.status ?? "",
        ticket.priority ?? "",
        ticket.assigned_staff_user_id ?? null,
      ]),
    );
  }

  return "";
}

export function TicketLiveSync({
  reference,
  admin = false,
}: {
  reference?: string;
  admin?: boolean;
}) {
  const router = useRouter();
  const lastSignatureRef = useRef<string | null>(null);
  const requestInFlightRef = useRef(false);

  useEffect(() => {
    let stopped = false;

    async function markCurrentTicketRead() {
      if (!reference) return;

      await fetch("/api/support/read", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ reference, admin }),
        cache: "no-store",
      }).catch(() => undefined);
    }

    async function tick() {
      if (
        stopped ||
        requestInFlightRef.current ||
        document.visibilityState !== "visible"
      ) {
        return;
      }

      requestInFlightRef.current = true;

      try {
        const params = new URLSearchParams();

        if (admin) params.set("admin", "1");
        if (reference) params.set("reference", reference);

        const response = await fetch(
          `/api/support/context?${params.toString()}`,
          { cache: "no-store" },
        );

        if (!response.ok || stopped) return;

        const payload = await response.json();
        const nextSignature = signatureForPayload(payload);

        /*
         * Do not refresh the server route on every poll.
         * Establish the first response as the baseline and refresh
         * only when ticket data actually changes.
         */
        if (lastSignatureRef.current === null) {
          lastSignatureRef.current = nextSignature;
        } else if (lastSignatureRef.current !== nextSignature) {
          lastSignatureRef.current = nextSignature;
          router.refresh();
        }

        await markCurrentTicketRead();

        window.dispatchEvent(
          new Event("sepulchria:ticket-notifications-changed"),
        );
      } finally {
        requestInFlightRef.current = false;
      }
    }

    void tick();

    const intervalId = window.setInterval(
      () => void tick(),
      2000,
    );

    const handleFocus = () => void tick();
    window.addEventListener("focus", handleFocus);

    return () => {
      stopped = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [admin, reference, router]);

  return null;
}
"""

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not TARGET.exists():
        raise SystemExit(f"ERROR: missing {TARGET}. Nothing written.")

    current = TARGET.read_text(encoding="utf-8")

    required = [
        'router.refresh();window.dispatchEvent',
        'window.setInterval(()=>void tick(),2000)',
        'fetch("/api/support/read"',
    ]
    missing = [anchor for anchor in required if anchor not in current]
    if missing:
        raise SystemExit(
            "ERROR: file does not match the inspected 52adebc implementation. "
            "Nothing written."
        )

    print("Baseline: 52adebc")
    print(f"patch target: {TARGET}")
    print("Fix: refresh ticket server pages only when polled ticket data changes.")

    if args.dry_run:
        print("\nDRY RUN ONLY — no files written.")
        return

    TARGET.write_text(NEW, encoding="utf-8", newline="\n")
    print(f"\npatched: {TARGET}")
    print("Applied LOCALLY only. No GitHub write was performed.")
    print("Next: npm run build")

if __name__ == "__main__":
    main()
