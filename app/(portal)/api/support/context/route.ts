import {
  NextRequest,
  NextResponse,
} from "next/server";

import { getTicketUnreadCounts } from "@/lib/support/ticket-unread";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ROLES = [
  "owner",
  "admin",
  "moderator",
  "master",
];

function text(
  type: string,
  details: any,
  actor: string,
) {
  if (type === "ticket_created") {
    return `${actor} opened the ticket`;
  }

  if (
    type === "player_replied" ||
    type === "staff_replied"
  ) {
    return `${actor} replied`;
  }

  if (type === "internal_note_added") {
    return `${actor} added an internal note`;
  }

  if (type === "staff_assigned") {
    return `${actor} assigned the ticket`;
  }

  if (type === "ticket_state_changed") {
    return `${actor} changed the ticket${
      details?.status
        ? ` to ${String(details.status).replaceAll("_", " ")}`
        : ""
    }${
      details?.priority
        ? ` · ${details.priority} priority`
        : ""
    }`;
  }

  return `${actor} updated the ticket`;
}

export async function GET(
  req: NextRequest,
) {
  const sb = await createClient();

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const admin = createAdminClient();

  const isAdmin =
    req.nextUrl.searchParams.get("admin") === "1";

  const reference =
    req.nextUrl.searchParams.get("reference");

  if (isAdmin) {
    const { data: staff } = await admin
      .from("staff_members")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      !staff ||
      !ROLES.includes(staff.role)
    ) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      );
    }
  }

  if (reference) {
    let ticketQuery = admin
      .from("tickets")
      .select(
        "id,public_reference,opened_by_user_id",
      )
      .eq("public_reference", reference);

    if (!isAdmin) {
      ticketQuery = ticketQuery.eq(
        "opened_by_user_id",
        user.id,
      );
    }

    const {
      data: ticket,
      error: ticketError,
    } = await ticketQuery.maybeSingle();

    if (ticketError) {
      return NextResponse.json(
        { error: ticketError.message },
        { status: 500 },
      );
    }

    if (!ticket) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 },
      );
    }

    let eventQuery = admin
      .from("ticket_events")
      .select(
        "id,actor_user_id,event_type,details,created_at",
      )
      .eq("ticket_id", ticket.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(100);

    if (!isAdmin) {
      eventQuery = eventQuery.neq(
        "event_type",
        "internal_note_added",
      );
    }

    const {
      data: events,
      error: eventError,
    } = await eventQuery;

    if (eventError) {
      return NextResponse.json(
        { error: eventError.message },
        { status: 500 },
      );
    }

    const actorIds = [
      ...new Set(
        (events ?? [])
          .map(
            (event) =>
              event.actor_user_id,
          )
          .filter(Boolean),
      ),
    ];

    const { data: characters } =
      actorIds.length
        ? await admin
            .from("characters")
            .select(
              "user_id,display_name,first_name,surname",
            )
            .in("user_id", actorIds)
        : { data: [] as any[] };

    const names = new Map(
      (characters ?? []).map(
        (character) => [
          character.user_id,
          character.display_name ||
            `${character.first_name ?? ""} ${character.surname ?? ""}`.trim(),
        ],
      ),
    );

    const openerName =
      names.get(
        ticket.opened_by_user_id,
      ) ?? "Player";

    return NextResponse.json({
      events: (events ?? []).map(
        (event) => {
          const responseEvent =
            isAdmin
              ? event
              : {
                  id: event.id,
                  event_type:
                    event.event_type,
                  details:
                    event.details,
                  created_at:
                    event.created_at,
                };

          return {
            ...responseEvent,
            text: text(
              event.event_type,
              event.details,
              names.get(
                event.actor_user_id,
              ) ??
                (
                  event.actor_user_id ===
                  ticket.opened_by_user_id
                    ? openerName
                    : "Staff"
                ),
            ),
          };
        },
      ),
    });
  }

  let query = admin
    .from("tickets")
    .select(
      "id,public_reference,status,priority,subject,assigned_staff_user_id,opened_by_user_id,updated_at",
    )
    .order("updated_at", {
      ascending: false,
    })
    .limit(250);

  if (!isAdmin) {
    query = query.eq(
      "opened_by_user_id",
      user.id,
    );
  }

  const {
    data: tickets,
    error,
  } = await query;

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  const ids =
    (tickets ?? []).map(
      (ticket) => ticket.id,
    );

  const [messages, unread] =
    await Promise.all([
      ids.length
        ? admin
            .from("ticket_messages")
            .select("ticket_id,body")
            .in("ticket_id", ids)
        : Promise.resolve({
            data: [] as any[],
            error: null,
          }),
      getTicketUnreadCounts({
        admin,
        userId: user.id,
        ticketIds: ids,
        audience:
          isAdmin
            ? "staff"
            : "player",
      }),
    ]);

  if (messages.error) {
    return NextResponse.json(
      {
        error:
          messages.error.message,
      },
      { status: 500 },
    );
  }

  const bodies =
    new Map<string, string[]>();

  for (
    const message of
    messages.data ?? []
  ) {
    const current =
      bodies.get(
        message.ticket_id,
      ) ?? [];

    current.push(
      String(
        message.body ?? "",
      ),
    );

    bodies.set(
      message.ticket_id,
      current,
    );
  }

  return NextResponse.json({
    tickets:
      (tickets ?? []).map(
        (ticket) => ({
          ...ticket,
          search_body:
            (
              bodies.get(
                ticket.id,
              ) ?? []
            ).join("\n"),
          unread_activity_count:
            unread.get(
              ticket.id,
            ) ?? 0,
        }),
      ),
  });
}
