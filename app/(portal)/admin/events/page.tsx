

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
  notify_on_publish: boolean;
  notify_24h: boolean;
  notify_1h: boolean;
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
    <div className="grid gap-3 sm:grid-cols-[1fr_1.3fr_0.8fr] admin_events_page_div_container">
      <label className="block admin_events_page_label_label">
        <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] admin_events_page_span_text">
          Year ADN
        </span>
        <input
          type="number"
          name="aurethYear"
          min={1}
          max={9999}
          required
          defaultValue={aureth.year}
          className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-9b7446))] admin_events_page_input_aureth_year"
        />
      </label>

      <label className="block admin_events_page_label_label_2">
        <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] admin_events_page_span_text_2">
          Month
        </span>
        <select
          name="monthIndex"
          required
          defaultValue={aureth.monthIndex}
          className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-9b7446))] admin_events_page_select_select"
        >
          {AURETH_MONTHS.map(
            (month, index) => (
              <option className="admin_events_page_option_option"
                key={month}
                value={index}
              >
                {month}
              </option>
            ),
          )}
        </select>
      </label>

      <label className="block admin_events_page_label_label_3">
        <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] admin_events_page_span_text_3">
          Day
        </span>
        <input
          type="number"
          name="day"
          min={1}
          max={31}
          required
          defaultValue={aureth.day}
          className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-9b7446))] admin_events_page_input_day"
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
    <div className="space-y-4 admin_events_page_div_visible_calendar">
      <label className="block admin_events_page_label_visible_calendar">
        <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] admin_events_page_span_visible_calendar">
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
          className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-9b7446))] admin_events_page_input_title"
        />
      </label>

      <EventDateFields
        date={eventDate}
      />

      <div className="grid gap-3 sm:grid-cols-2 admin_events_page_div_visible_calendar_2">
        <label className="block admin_events_page_label_visible_calendar_2">
          <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] admin_events_page_span_visible_calendar_2">
            Start time
          </span>
          <input
            type="time"
            name="startTime"
            defaultValue={timeValue(
              event?.start_time ??
                null,
            )}
            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-9b7446))] admin_events_page_input_start_time"
          />
        </label>

        <label className="block admin_events_page_label_visible_calendar_3">
          <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] admin_events_page_span_visible_calendar_3">
            End time
          </span>
          <input
            type="time"
            name="endTime"
            defaultValue={timeValue(
              event?.end_time ??
                null,
            )}
            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-9b7446))] admin_events_page_input_end_time"
          />
        </label>
      </div>

      <label className="block admin_events_page_label_visible_calendar_4">
        <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] admin_events_page_span_visible_calendar_4">
          Location
        </span>

        <select
          name="roomId"
          defaultValue={
            event?.room_id ?? ""
          }
          className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-9b7446))] admin_events_page_select_room_id"
        >
          <option className="admin_events_page_option_room_id" value="">
            No specific location
          </option>

          {rooms.map((room) => (
            <option className="admin_events_page_option_option_2"
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

      <label className="block admin_events_page_label_visible_calendar_5">
        <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] admin_events_page_span_visible_calendar_5">
          Description
        </span>
        <textarea
          name="description"
          maxLength={20_000}
          defaultValue={
            event?.description ?? ""
          }
          rows={5}
          className="w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm leading-6 text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-9b7446))] admin_events_page_textarea_description"
        />
      </label>

      <label className="flex items-center gap-3 text-sm text-[rgb(var(--sep-colour-bbaa90))] admin_events_page_label_visible_calendar_6">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={
            event
              ? event.is_active
              : true
          }
          className="h-4 w-4 accent-[rgb(var(--sep-colour-8b673d))] admin_events_page_input_active"
        />
        Visible on calendar
      </label>

      <div className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-0d0907))]/45 p-4 admin_events_page_div_visible_calendar_3">
        <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] admin_events_page_p_visible_calendar">
          Bell notifications
        </p>
        <p className="mt-1 text-[10px] leading-5 text-[rgb(var(--sep-colour-8f8271))] admin_events_page_p_visible_calendar_2">
          Reminder timing follows Aureth game time, including pauses and time-scale changes.
        </p>

        <div className="mt-3 grid gap-2 admin_events_page_div_notify_published">
          <label className="flex items-center gap-3 text-sm text-[rgb(var(--sep-colour-bbaa90))] admin_events_page_label_notify_published">
            <input
              type="checkbox"
              name="notifyOnPublish"
              defaultChecked={event?.notify_on_publish ?? false}
              className="h-4 w-4 accent-[rgb(var(--sep-colour-8b673d))] admin_events_page_input_notify_publish"
            />
            Notify when published
          </label>

          <label className="flex items-center gap-3 text-sm text-[rgb(var(--sep-colour-bbaa90))] admin_events_page_label_notify_published_2">
            <input
              type="checkbox"
              name="notify24h"
              defaultChecked={event?.notify_24h ?? false}
              className="h-4 w-4 accent-[rgb(var(--sep-colour-8b673d))] admin_events_page_input_notify24h"
            />
            Notify 24 Aureth hours before
          </label>

          <label className="flex items-center gap-3 text-sm text-[rgb(var(--sep-colour-bbaa90))] admin_events_page_label_notify_published_3">
            <input
              type="checkbox"
              name="notify1h"
              defaultChecked={event?.notify_1h ?? false}
              className="h-4 w-4 accent-[rgb(var(--sep-colour-8b673d))] admin_events_page_input_notify1h"
            />
            Notify 1 Aureth hour before
          </label>
        </div>
      </div>
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
        "id, title, description, event_date, start_time, end_time, location_name, room_id, is_active, notify_on_publish, notify_24h, notify_1h, created_at, updated_at",
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
    <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-5 lg:p-6 admin_events_page_main_main">
      <section
        id="event-new"
        className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4 sm:p-5 admin_events_page_section_new"
      >
        <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))] admin_events_page_p_new">
          Calendar
        </p>
        <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dec69a))] admin_events_page_h2_new">
          Create event
        </h2>
        <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))] admin_events_page_p_new_2">
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

          <div className="mt-5 flex justify-end admin_events_page_div_new">
            <button
              type="submit"
              className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))] admin_events_page_button_create_event"
            >
              Create event
            </button>
          </div>
        </AdminActionForm>
      </section>

      <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4 sm:p-5 admin_events_page_section_section">
        <div className="flex flex-wrap items-end justify-between gap-3 admin_events_page_div_container_2">
          <div className="admin_events_page_div_events">
            <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))] admin_events_page_p_events">
              Existing records
            </p>
            <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dec69a))] admin_events_page_h2_events">
              Events
            </h2>
          </div>

          <p className="text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))] admin_events_page_p_text">
            {events.length} total
          </p>
        </div>

        <div className="mt-4 space-y-3 admin_events_page_div_container_3">
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
                className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] admin_events_page_details_details"
              >
                <summary className="cursor-pointer list-none px-4 py-3 admin_events_page_summary_summary">
                  <div className="flex items-center justify-between gap-4 admin_events_page_div_container_4">
                    <div className="min-w-0 admin_events_page_div_container_5">
                      <p className="truncate font-serif text-base text-[rgb(var(--sep-colour-d8bf91))] admin_events_page_p_text_2">
                        {event.title}
                      </p>
                      <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))] admin_events_page_p_text_3">
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
                      className={[((`shrink-0 text-[8px] uppercase tracking-[0.14em] ${
                        event.is_active
                          ? "text-[rgb(var(--sep-colour-9caf7c))]"
                          : "text-[rgb(var(--sep-colour-746858))]"
                      }`)), "admin_events_page_span_text_4"].filter(Boolean).join(" ")}
                    >
                      {event.is_active
                        ? "Visible"
                        : "Hidden"}
                    </span>
                  </div>
                </summary>

                <div className="border-t border-[rgb(var(--sep-colour-59432c))]/35 p-4 admin_events_page_div_container_6">
                  <AdminActionForm
                    action={
                      updateCalendarEvent
                    }
                  >
                    <input className="admin_events_page_input_event_id"
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

                    <div className="mt-5 flex justify-end admin_events_page_div_container_7">
                      <button
                        type="submit"
                        className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))] admin_events_page_button_save_event"
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
                    <input className="admin_events_page_input_event_id_2"
                      type="hidden"
                      name="eventId"
                      value={event.id}
                    />

                    <div className="flex flex-wrap items-end justify-between gap-3 admin_events_page_div_container_8">
                      <label className="block min-w-[220px] flex-1 admin_events_page_label_label_4">
                        <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-9a6258))] admin_events_page_span_text_5">
                          Type DELETE to remove permanently
                        </span>
                        <input
                          type="text"
                          name="confirmation"
                          autoComplete="off"
                          className="w-full border border-[rgb(var(--sep-colour-743d35))]/55 bg-[rgb(var(--sep-colour-160d0b))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-ddb0a6))] outline-none focus:border-[rgb(var(--sep-colour-a75c50))] admin_events_page_input_confirmation"
                        />
                      </label>

                      <button
                        type="submit"
                        className="border border-[rgb(var(--sep-colour-743d35))] bg-[rgb(var(--sep-colour-2a1512))] px-4 py-2.5 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-d8a49a))] transition hover:border-[rgb(var(--sep-colour-a75c50))] hover:bg-[rgb(var(--sep-colour-3a1b17))] admin_events_page_button_delete_event"
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
            <p className="border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-100c09))]/60 p-4 text-[11px] text-[rgb(var(--sep-colour-8f8271))] admin_events_page_p_text_4">
              No calendar events have been created yet.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
