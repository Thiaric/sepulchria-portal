"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

type TicketRow = {
  id: string;
  public_reference: string;
  status: string;
  priority: string;
  subject: string;
  assigned_staff_user_id:
    | string
    | null;
  search_body?: string;
};

type TicketEvent = {
  id: string;
  text: string;
  created_at: string;
};

function fmt(value: string) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(new Date(value));
}

export function TicketContextPanel({
  admin = false,
  reference,
}: {
  admin?: boolean;
  reference?: string;
}) {
  const [tickets, setTickets] =
    useState<TicketRow[]>([]);
  const [events, setEvents] =
    useState<TicketEvent[]>([]);
  const [search, setSearch] =
    useState("");

  useEffect(() => {
    let dead = false;

    async function load() {
      const qs =
        new URLSearchParams();

      if (admin) {
        qs.set("admin", "1");
      }

      if (reference) {
        qs.set(
          "reference",
          reference,
        );
      }

      const response =
        await fetch(
          `/api/support/context?${qs}`,
          {
            cache: "no-store",
          },
        );

      if (
        !response.ok ||
        dead
      ) {
        return;
      }

      const json =
        await response.json();

      if (reference) {
        setEvents(
          json.events ?? [],
        );
      } else {
        setTickets(
          json.tickets ?? [],
        );
      }
    }

    void load();

    const id =
      window.setInterval(
        () => void load(),
        2000,
      );

    return () => {
      dead = true;
      window.clearInterval(id);
    };
  }, [admin, reference]);

  const query =
    search
      .trim()
      .toLowerCase();

  const visible =
    useMemo(
      () =>
        tickets.filter(
          (ticket) =>
            !query ||
            [
              ticket.public_reference,
              ticket.status,
              ticket.priority,
              ticket.subject,
              ticket.assigned_staff_user_id ??
                "",
              ticket.search_body ??
                "",
            ].some((value) =>
              String(value)
                .toLowerCase()
                .includes(query),
            ),
        ),
      [query, tickets],
    );

  if (reference) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
          Ticket activity
        </p>

        <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
          {reference}
        </h2>

        <div
          data-sep-interaction-fixed="true"
          className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1"
        >
          {events.length ? (
            events.map((event) => (
              <div
                key={event.id}
                data-sep-interactive-surface="row"
                className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 transition hover:border-[rgb(var(--sep-colour-8a673f))] hover:bg-[rgb(var(--sep-colour-17110d))]"
              >
                <p className="text-[10px] leading-4 text-[rgb(var(--sep-colour-cbb28a))]">
                  {event.text}
                </p>

                <p className="mt-2 text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-6f6353))]">
                  {fmt(
                    event.created_at,
                  )}
                </p>
              </div>
            ))
          ) : (
            <p className="text-xs text-[rgb(var(--sep-colour-8f8271))]">
              No Ticket activity.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
        {admin
          ? "Administration"
          : "Support"}
      </p>

      <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
        Jump to Ticket
      </h2>

      <input
        type="search"
        value={search}
        onChange={(event) =>
          setSearch(
            event.target.value,
          )
        }
        placeholder="Number, status, title, body, priority, assignee..."
        className="mt-3 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs outline-none"
      />

      <div className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto">
        {visible.map(
          (ticket) => (
            <Link
              key={ticket.id}
              href={`${admin ? "/admin/tickets" : "/support"}/${ticket.public_reference}`}
              className="block border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 transition hover:border-[rgb(var(--sep-colour-8a673f))] hover:bg-[rgb(var(--sep-colour-17110d))]"
            >
              <span className="block font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))]">
                {ticket.subject}
              </span>

              <span className="mt-1 block text-[7px] uppercase text-[rgb(var(--sep-colour-6f6353))]">
                {
                  ticket.public_reference
                }{" "}
                ·{" "}
                {ticket.status.replaceAll(
                  "_",
                  " ",
                )}{" "}
                · {ticket.priority}
              </span>
            </Link>
          ),
        )}
      </div>
    </div>
  );
}
