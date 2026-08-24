

import { AdminActionForm } from "@/components/admin/admin-action-form";
import {
  AURETH_MONTHS,
  AURETH_YEAR_OFFSET,
  fromIsoDateKey,
  getAurethDate,
} from "@/lib/world/calendar";
import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

import {
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
} from "./actions";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location_name: string | null;
  room_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type RoomOption = {
  id: string;
  name: string;
  area: {
    name: string;
  } | null;
};

function timeValue(
  value: string | null,
) {
  return value
    ? value.slice(0, 5)
    : "";
}

function EventDateFields({
  date,
}: {
  date: Date;
}) {
  const aureth =
    getAurethDate(date);

  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_1.3fr_0.8fr]">
      <label className="block">
        <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
          Year ADN
        </span>
        <input
          type="number"
          name="aurethYear"
          min={1}
          max={9999}
          required
          defaultValue={aureth.year}
          className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-9b7446))]"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
          Month
        </span>
        <select
          name="monthIndex"
          required
          defaultValue={aureth.monthIndex}
          className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-9b7446))]"
        >
          {AURETH_MONTHS.map(
            (month, index) => (
              <option
                key={month}
                value={index}
              >
                {month}
              </option>
            ),
          )}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
          Day
        </span>
        <input
          type="number"
          name="day"
          min={1}
          max={31}
          required
          defaultValue={aureth.day}
          className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-9b7446))]"
        />
      </label>
    </div>
  );
}

function EventFields({
  event,
  defaultDate,
  rooms,
}: {
  event?: EventRow;
  defaultDate: Date;
  rooms: RoomOption[];
}) {
  const eventDate = event
    ? fromIsoDateKey(
        event.event_date,
      )
    : defaultDate;

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
          Event title
        </span>
        <input
          type="text"
          name="title"
          required
          maxLength={160}
          defaultValue={
            event?.title ?? ""
          }
          className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-9b7446))]"
        />
      </label>

      <EventDateFields
        date={eventDate}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
            Start time
          </span>
          <input
            type="time"
            name="startTime"
            defaultValue={timeValue(
              event?.start_time ??
                null,
            )}
            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-9b7446))]"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
            End time
          </span>
          <input
            type="time"
            name="endTime"
            defaultValue={timeValue(
              event?.end_time ??
                null,
            )}
            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-9b7446))]"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
          Location
        </span>

        <select
          name="roomId"
          defaultValue={
            event?.room_id ?? ""
          }
          className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-9b7446))]"
        >
          <option value="">
            No specific location
          </option>

          {rooms.map((room) => (
            <option
              key={room.id}
              value={room.id}
            >
              {room.area?.name
                ? `${room.area.name} — ${room.name}`
                : room.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
          Description
        </span>
        <textarea
          name="description"
          maxLength={20_000}
          defaultValue={
            event?.description ?? ""
          }
          rows={5}
          className="w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm leading-6 text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-9b7446))]"
        />
      </label>

      <label className="flex items-center gap-3 text-sm text-[rgb(var(--sep-colour-bbaa90))]">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={
            event
              ? event.is_active
              : true
          }
          className="h-4 w-4 accent-[rgb(var(--sep-colour-8b673d))]"
        />
        Visible on calendar
      </label>
    </div>
  );
}

export default async function EventsAdminPage() {
  await requireAdminSection("events");

  const supabase =
    await createClient();

  const [
    eventsResult,
    worldResult,
    roomsResult,
  ] = await Promise.all([
    supabase
      .from("calendar_events")
      .select(
        "id, title, description, event_date, start_time, end_time, location_name, room_id, is_active, created_at, updated_at",
      )
      .order("event_date", {
        ascending: false,
      })
      .order("start_time", {
        ascending: true,
      }),

    supabase
      .from("world_state")
      .select(
        "game_datetime, automatic_time, time_scale, updated_at",
      )
      .eq("id", "aureth")
      .maybeSingle(),

    supabase
      .from("rooms")
      .select(
        "id, name, area:areas!rooms_area_id_fkey(name)",
      )
      .eq("is_active", true)
      .order("name", {
        ascending: true,
      }),
  ]);

  if (eventsResult.error) {
    throw new Error(
      `Unable to load calendar events: ${eventsResult.error.message}`,
    );
  }

  if (roomsResult.error) {
    throw new Error(
      `Unable to load locations: ${roomsResult.error.message}`,
    );
  }

  const rooms = (roomsResult.data ?? []).map(
    (room) => ({
      id: String(room.id),
      name: String(room.name),
      area: Array.isArray(room.area)
        ? room.area[0] ?? null
        : room.area,
    }),
  ) as RoomOption[];

  let defaultDate =
    new Date();

  const world =
    worldResult.data;

  if (world?.game_datetime) {
    const base =
      Date.parse(
        world.game_datetime,
      );

    if (!Number.isNaN(base)) {
      if (
        world.automatic_time
      ) {
        const anchor =
          Date.parse(
            world.updated_at,
          );

        const elapsed =
          Number.isNaN(anchor)
            ? 0
            : Math.max(
                0,
                Date.now() -
                  anchor,
              );

        defaultDate = new Date(
          base +
            elapsed *
              Math.max(
                0,
                Number(
                  world.time_scale,
                ) || 0,
              ),
        );
      } else {
        defaultDate =
          new Date(base);
      }
    }
  }

  const events =
    (eventsResult.data ??
      []) as EventRow[];

  return (
    <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-5 lg:p-6">
      <section
        id="event-new"
        className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4 sm:p-5"
      >
        <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
          Calendar
        </p>
        <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dec69a))]">
          Create event
        </h2>
        <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
          Dates are entered in the Aureth calendar. The underlying database date is converted automatically.
        </p>

        <AdminActionForm
          action={
            createCalendarEvent
          }
          className="mt-5"
        >
          <EventFields
            defaultDate={
              defaultDate
            }
            rooms={rooms}
          />

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))]"
            >
              Create event
            </button>
          </div>
        </AdminActionForm>
      </section>

      <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
              Existing records
            </p>
            <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dec69a))]">
              Events
            </h2>
          </div>

          <p className="text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">
            {events.length} total
          </p>
        </div>

        <div className="mt-4 space-y-3">
          {events.map((event) => {
            const aureth =
              getAurethDate(
                fromIsoDateKey(
                  event.event_date,
                ),
              );

            return (
              <details
                key={event.id}
                id={`event-${event.id}`}
                className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))]"
              >
                <summary className="cursor-pointer list-none px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate font-serif text-base text-[rgb(var(--sep-colour-d8bf91))]">
                        {event.title}
                      </p>
                      <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))]">
                        {aureth.day}{" "}
                        {aureth.monthName},{" "}
                        {aureth.year} ADN
                        {event.start_time
                          ? ` · ${timeValue(
                              event.start_time,
                            )}`
                          : ""}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 text-[8px] uppercase tracking-[0.14em] ${
                        event.is_active
                          ? "text-[rgb(var(--sep-colour-9caf7c))]"
                          : "text-[rgb(var(--sep-colour-746858))]"
                      }`}
                    >
                      {event.is_active
                        ? "Visible"
                        : "Hidden"}
                    </span>
                  </div>
                </summary>

                <div className="border-t border-[rgb(var(--sep-colour-59432c))]/35 p-4">
                  <AdminActionForm
                    action={
                      updateCalendarEvent
                    }
                  >
                    <input
                      type="hidden"
                      name="eventId"
                      value={event.id}
                    />

                    <EventFields
                      event={event}
                      defaultDate={
                        defaultDate
                      }
                      rooms={rooms}
                    />

                    <div className="mt-5 flex justify-end">
                      <button
                        type="submit"
                        className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))]"
                      >
                        Save event
                      </button>
                    </div>
                  </AdminActionForm>

                  <AdminActionForm
                    action={
                      deleteCalendarEvent
                    }
                    className="mt-5 border-t border-[rgb(var(--sep-colour-743d35))]/35 pt-4"
                  >
                    <input
                      type="hidden"
                      name="eventId"
                      value={event.id}
                    />

                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <label className="block min-w-[220px] flex-1">
                        <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-9a6258))]">
                          Type DELETE to remove permanently
                        </span>
                        <input
                          type="text"
                          name="confirmation"
                          autoComplete="off"
                          className="w-full border border-[rgb(var(--sep-colour-743d35))]/55 bg-[rgb(var(--sep-colour-160d0b))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-ddb0a6))] outline-none focus:border-[rgb(var(--sep-colour-a75c50))]"
                        />
                      </label>

                      <button
                        type="submit"
                        className="border border-[rgb(var(--sep-colour-743d35))] bg-[rgb(var(--sep-colour-2a1512))] px-4 py-2.5 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-d8a49a))] transition hover:border-[rgb(var(--sep-colour-a75c50))] hover:bg-[rgb(var(--sep-colour-3a1b17))]"
                      >
                        Delete event
                      </button>
                    </div>
                  </AdminActionForm>
                </div>
              </details>
            );
          })}

          {events.length === 0 ? (
            <p className="border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-100c09))]/60 p-4 text-[11px] text-[rgb(var(--sep-colour-8f8271))]">
              No calendar events have been created yet.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
