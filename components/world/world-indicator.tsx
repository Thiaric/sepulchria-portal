"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { createClient } from "@/lib/supabase/client";
import { useWorldState } from "@/components/world/world-state-provider";
import {
  AURETH_WEEKDAYS,
  formatAurethDate,
  formatShortAurethDate,
  fromIsoDateKey,
  getAurethDate,
  toIsoDateKey,
} from "@/lib/world/calendar";
import { getLunarPhase } from "@/lib/world/lunar";
import { CalendarEventNotificationBadge } from "@/components/world/calendar-event-notification-badge";

const ICONS: Record<string, string> = {
  clear: "/icons/weather/clear.png",
  partly_cloudy:
    "/icons/weather/partly-cloudy.png",
  cloudy: "/icons/weather/cloudy.png",
  overcast: "/icons/weather/overcast.png",
  fog: "/icons/weather/fog.png",
  drizzle: "/icons/weather/drizzle.png",
  rain: "/icons/weather/rain.png",
  heavy_rain:
    "/icons/weather/heavy-rain.png",
  storm: "/icons/weather/storm.png",
  snow: "/icons/weather/snow.png",
  heavy_snow:
    "/icons/weather/heavy-snow.png",
  hail: "/icons/weather/hail.png",
};

type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location_name: string | null;
  room: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

function weatherLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

function shiftMonth(
  date: Date,
  amount: number,
) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() +
        amount,
      1,
      12,
    ),
  );
}

function shiftYear(
  date: Date,
  amount: number,
) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear() +
        amount,
      date.getUTCMonth(),
      1,
      12,
    ),
  );
}

function monthBounds(date: Date) {
  const start = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      1,
      12,
    ),
  );

  const end = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      0,
      12,
    ),
  );

  return {
    start:
      toIsoDateKey(start),
    end:
      toIsoDateKey(end),
  };
}

function Calendar({
  currentDate,
  viewDate,
  events,
  selectedDateKey,
  onSelectDate,
  onPreviousMonth,
  onNextMonth,
  onPreviousYear,
  onNextYear,
  onToday,
}: {
  currentDate: Date;
  viewDate: Date;
  events: CalendarEvent[];
  selectedDateKey:
    | string
    | null;
  onSelectDate: (
    value: string | null,
  ) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onPreviousYear: () => void;
  onNextYear: () => void;
  onToday: () => void;
}) {
  const aureth =
    getAurethDate(viewDate);

  const currentAureth =
    getAurethDate(currentDate);

  const realYear =
    viewDate.getUTCFullYear();

  const realMonth =
    viewDate.getUTCMonth();

  const firstWeekday =
    new Date(
      Date.UTC(
        realYear,
        realMonth,
        1,
        12,
      ),
    ).getUTCDay();

  const eventCountByDate =
    new Map<string, number>();

  for (const event of events) {
    eventCountByDate.set(
      event.event_date,
      (eventCountByDate.get(
        event.event_date,
      ) ?? 0) + 1,
    );
  }

  const cells: Array<
    | {
        day: number;
        date: Date;
        key: string;
      }
    | null
  > = [
    ...Array.from(
      {
        length:
          firstWeekday,
      },
      () => null,
    ),
    ...Array.from(
      {
        length:
          aureth.daysInMonth,
      },
      (_, index) => {
        const day =
          index + 1;

        const date =
          new Date(
            Date.UTC(
              realYear,
              realMonth,
              day,
              12,
            ),
          );

        return {
          day,
          date,
          key:
            toIsoDateKey(
              date,
            ),
        };
      },
    ),
  ];

  while (
    cells.length % 7 !==
    0
  ) {
    cells.push(null);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <CalendarButton
            label="«"
            title="Previous year"
            onClick={
              onPreviousYear
            }
          />
          <CalendarButton
            label="‹"
            title="Previous month"
            onClick={
              onPreviousMonth
            }
          />
        </div>

        <div className="text-center">
          <p className="font-serif text-lg text-[rgb(var(--sep-colour-dfc79c))]">
            {aureth.monthName}
          </p>
          <p className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806f59))]">
            {aureth.year} ADN
          </p>
        </div>

        <div className="flex items-center gap-1">
          <CalendarButton
            label="›"
            title="Next month"
            onClick={
              onNextMonth
            }
          />
          <CalendarButton
            label="»"
            title="Next year"
            onClick={
              onNextYear
            }
          />
        </div>
      </div>

      <div className="mt-1 flex justify-center">
        <button
          type="button"
          onClick={onToday}
          className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-2 py-1 ... text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-9d896d))] transition hover:border-[rgb(var(--sep-colour-967342))] hover:text-[rgb(var(--sep-colour-dfc79c))]"
        >
          Current month
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 ... gap-px border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-60482e))]/25">
        {AURETH_WEEKDAYS.map(
          (weekday) => (
            <div
              key={weekday}
              title={weekday}
              className="bg-[rgb(var(--sep-colour-100c09))] px-0.5 py-2 text-center text-[7px] uppercase tracking-[0.04em] text-[rgb(var(--sep-colour-796a56))]"
            >
              {weekday.slice(
                0,
                3,
              )}
            </div>
          ),
        )}

        {cells.map(
          (
            cell,
            index,
          ) => {
            if (!cell) {
              return (
                <div
                  key={index}
                  className="h-10 bg-[rgb(var(--sep-colour-100c09))]/65 sm:h-11"
                />
              );
            }

            const lunar =
              getLunarPhase(
                cell.date,
              );

            const eventCount =
              eventCountByDate.get(
                cell.key,
              ) ?? 0;

            const isToday =
              currentAureth.year ===
                aureth.year &&
              currentAureth.monthIndex ===
                aureth.monthIndex &&
              currentAureth.day ===
                cell.day;

            const isSelected =
              selectedDateKey ===
              cell.key;

            return (
              <button
                key={cell.key}
                type="button"
                onClick={() =>
                  onSelectDate(
                    eventCount > 0
                      ? cell.key
                      : null,
                  )
                }
                title={`${formatAurethDate(
                  cell.date,
                )} · ${lunar.name}${
                  eventCount > 0
                    ? ` · ${eventCount} event${
                        eventCount ===
                        1
                          ? ""
                          : "s"
                      }`
                    : ""
                }`}
                className={[
  "relative flex h-10 flex-col items-center justify-center gap-0.5 bg-[rgb(var(--sep-colour-15100d))] text-[9px] transition sm:h-11",
                  eventCount > 0
                    ? "cursor-pointer bg-[rgb(var(--sep-colour-2b1d12))] ring-2 ring-inset ring-[rgb(var(--sep-colour-9f7744))]/75 shadow-[inset_0_0_14px_rgba(176,128,67,0.22)] hover:bg-[rgb(var(--sep-colour-362418))] hover:ring-[rgb(var(--sep-colour-c19152))]/90"
                    : "cursor-default",
                  isToday
                    ? "font-semibold text-[rgb(var(--sep-colour-f0d39f))] shadow-[inset_0_0_0_1px_#a67b45]"
                    : "text-[rgb(var(--sep-colour-a99a85))]",
                  isSelected
                    ? "bg-[rgb(var(--sep-colour-2a1d12))] shadow-[inset_0_0_0_1px_#c08b4a]"
                    : "",
                ].join(
                  " ",
                )}
              >
                <span className="leading-none">
                  {cell.day}
                </span>

                <img
                  src={
                    lunar.symbol
                  }
                  alt=""
                  aria-hidden="true"
                  className="h-3.5 w-3.5 object-contain opacity-75"
                />

                {eventCount >
                0 ? (
                  <span
                    aria-label={`${eventCount} calendar event${
                      eventCount ===
                      1
                        ? ""
                        : "s"
                    }`}
                    className="absolute right-1 top-1 flex h-3 min-w-3 items-center justify-center rounded-full bg-[rgb(var(--sep-colour-a87536))] px-0.5 text-[6px] font-bold leading-none text-[rgb(var(--sep-colour-160e08))]"
                  >
                    {eventCount >
                    9
                      ? "9+"
                      : eventCount}
                  </span>
                ) : null}
              </button>
            );
          },
        )}
      </div>
    </div>
  );
}

function CalendarButton({
  label,
  title,
  onClick,
}: {
  label: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-17110d))] font-serif text-sm text-[rgb(var(--sep-colour-bda479))] transition hover:border-[rgb(var(--sep-colour-987344))] hover:bg-[rgb(var(--sep-colour-271b12))] hover:text-[rgb(var(--sep-colour-efd4a0))]"
    >
      {label}
    </button>
  );
}

function CalendarEventList({
  dateKey,
  events,
}: {
  dateKey: string | null;
  events: CalendarEvent[];
}) {
  if (!dateKey) {
      return null;

  }

  const date =
    fromIsoDateKey(
      dateKey,
    );

  const selected =
    events.filter(
      (event) =>
        event.event_date ===
        dateKey,
    );

  return (
    <div className="mt-4 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-100c09))] p-3">
      <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
        Events
      </p>
      <h3 className="mt-1 font-serif text-base text-[rgb(var(--sep-colour-dfc79c))]">
        {formatAurethDate(
          date,
        )}
      </h3>

      <div className="mt-3 space-y-2">
        {selected.map(
          (event) => (
            <article
              key={event.id}
              className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-15100d))] p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h4 className="font-serif text-sm text-[rgb(var(--sep-colour-e0c79b))]">
                  {event.title}
                </h4>

                {event.start_time ? (
                  <span className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a58c68))]">
                    {event.start_time.slice(
                      0,
                      5,
                    )}
                    {event.end_time
                      ? `–${event.end_time.slice(
                          0,
                          5,
                        )}`
                      : ""}
                  </span>
                ) : null}
              </div>

              {event.room?.name ||
              event.location_name ? (
                <p className="mt-1 text-[9px] text-[rgb(var(--sep-colour-9d896d))]">
                  {event.room?.name ??
                    event.location_name}
                </p>
              ) : null}

              {event.description ? (
                <p className="mt-2 whitespace-pre-wrap text-[10px] leading-5 text-[rgb(var(--sep-colour-827563))]">
                  {event.description}
                </p>
              ) : null}
            </article>
          ),
        )}
      </div>
    </div>
  );
}

export function WorldIndicator({
  characterId,
}: {
  characterId: string | null;
}) {
  const {
    state,
    gameDate,
  } = useWorldState();

  const [open, setOpen] =
    useState(false);

  const [
    mounted,
    setMounted,
  ] = useState(false);

  const [
    viewDate,
    setViewDate,
  ] = useState(
    () =>
      new Date(
        Date.UTC(
          gameDate.getUTCFullYear(),
          gameDate.getUTCMonth(),
          1,
          12,
        ),
      ),
  );

  const [
    events,
    setEvents,
  ] = useState<
    CalendarEvent[]
  >([]);

  const [
    eventsLoading,
    setEventsLoading,
  ] = useState(false);

  const [
    selectedDateKey,
    setSelectedDateKey,
  ] = useState<
    string | null
  >(null);

  useEffect(
    () =>
      setMounted(true),
    [],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const close = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key ===
        "Escape"
      ) {
        setOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      close,
    );

    return () =>
      window.removeEventListener(
        "keydown",
        close,
      );
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const supabase =
      createClient();

    const bounds =
      monthBounds(
        viewDate,
      );

    async function loadEvents() {
      setEventsLoading(true);

      const {
        data,
        error,
      } = await supabase
        .from(
          "calendar_events",
        )
        .select(
          "id, title, description, event_date, start_time, end_time, location_name, room:rooms!calendar_events_room_id_fkey(id, name, slug)",
        )
        .eq(
          "is_active",
          true,
        )
        .gte(
          "event_date",
          bounds.start,
        )
        .lte(
          "event_date",
          bounds.end,
        )
        .order(
          "event_date",
          {
            ascending: true,
          },
        )
        .order(
          "start_time",
          {
            ascending: true,
          },
        );

      if (cancelled) {
        return;
      }

      if (error) {
        console.error(
          "Unable to load calendar events:",
          error.message,
        );
        setEvents([]);
      } else {
        setEvents(
  (data ?? []).map((event) => {
    const room =
      Array.isArray(event.room)
        ? event.room[0] ?? null
        : event.room;

    return {
      id: String(event.id),
      title: String(event.title),
      description:
        event.description ?? null,
      event_date: String(
        event.event_date,
      ),
      start_time:
        event.start_time ?? null,
      end_time:
        event.end_time ?? null,
      location_name:
        event.location_name ?? null,
      room: room
        ? {
            id: String(room.id),
            name: String(room.name),
            slug: String(room.slug),
          }
        : null,
    };
  }),
);
      }

      setEventsLoading(false);
    }

    void loadEvents();

    const channel =
      supabase
        .channel(
          `calendar-events-${bounds.start}-${bounds.end}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "calendar_events",
          },
          () => {
            void loadEvents();
          },
        )
        .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(
        channel,
      );
    };
  }, [
    open,
    viewDate,
  ]);

  useEffect(() => {
    setSelectedDateKey(
      null,
    );
  }, [viewDate]);

  const time = useMemo(
    () =>
      new Intl.DateTimeFormat(
        "en-GB",
        {
          timeZone:
            "Europe/London",
          hour: "2-digit",
          minute:
            "2-digit",
          hour12: false,
        },
      ).format(gameDate),
    [gameDate],
  );

  const shortDate =
    useMemo(
      () =>
        formatShortAurethDate(
          gameDate,
        ),
      [gameDate],
    );

  const fullDate =
    useMemo(
      () =>
        formatAurethDate(
          gameDate,
        ),
      [gameDate],
    );

  const lunar = useMemo(
    () =>
      getLunarPhase(
        gameDate,
      ),
    [gameDate],
  );

  function returnToCurrentMonth() {
    setViewDate(
      new Date(
        Date.UTC(
          gameDate.getUTCFullYear(),
          gameDate.getUTCMonth(),
          1,
          12,
        ),
      ),
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setOpen(true)
        }
        className="relative flex h-8 w-8 items-center justify-center gap-0 border border-[rgb(var(--sep-colour-614b31))] bg-[rgb(var(--sep-colour-17120f))] p-0 text-[rgb(var(--sep-colour-c9aa79))] transition hover:border-[rgb(var(--sep-colour-8d6b42))] hover:bg-[rgb(var(--sep-colour-201711))] md:h-10 md:w-auto md:gap-2 md:px-3"
        title={`${fullDate} · ${lunar.name} · ${weatherLabel(
          state.weather,
        )}`}
        aria-label="Open in-game calendar"
      >
        <span className="inline-flex shrink-0 items-center justify-center">
          <img
            src={
              ICONS[
                state.weather
              ] ??
              "/icons/weather/clear.png"
            }
            alt={weatherLabel(
              state.weather,
            )}
            width={20}
            height={20}
            className="block h-5 w-5 object-contain"
          />
        </span>

        <span className="hidden text-[9px] uppercase tracking-[0.08em] text-[rgb(var(--sep-colour-a38c69))] xl:inline">
          {
            state.temperature_c
          }
          °C | {shortDate} -{" "}
          {time} |
        </span>

        <span className="inline-flex shrink-0 items-center justify-center">
          <img
            src={
              lunar.symbol
            }
            alt={lunar.name}
            width={20}
            height={20}
            className="block h-5 w-5 object-contain"
          />
        </span>
      </button>

      {mounted && open
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-sm sm:p-4"
              onMouseDown={(
                event,
              ) => {
                if (
                  event.target ===
                  event.currentTarget
                ) {
                  setOpen(
                    false,
                  );
                }
              }}
            >
              <section
  data-sep-modal-exempt="calendar"
      role="dialog"
  aria-modal="true"
  className="relative w-full max-w-2xl max-h-[calc(100dvh-24px)] overflow-y-auto border border-[rgb(var(--sep-colour-765937))]/70 bg-[rgb(var(--sep-colour-120d0a))] p-3 shadow-[0_30px_100px_rgba(var(--sep-rgb-0-0-0),0.85)] sm:p-4"
>
                <button
                  type="button"
                  onClick={() =>
                    setOpen(
                      false,
                    )
                  }
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/60 bg-[rgb(var(--sep-colour-17110f))] text-[rgb(var(--sep-colour-c8a875))]"
                >
                  ×
                </button>

                <p className="text-[8px] uppercase tracking-[0.26em] text-[rgb(var(--sep-colour-886c48))]">
                  Aureth ·
                  Reckoning After
                  the Darkest Night
                </p>

                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 pr-10">
  <h2 className="font-serif text-base text-[rgb(var(--sep-colour-e2cda4))]">
    {fullDate}
  </h2>

  <span className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8f7b60))]">
    {time}
  </span>
</div>

                <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_140px]">
                  <div>
                    <div>
                      <Calendar
                        currentDate={
                          gameDate
                        }
                        viewDate={
                          viewDate
                        }
                        events={
                          events
                        }
                        selectedDateKey={
                          selectedDateKey
                        }
                        onSelectDate={
                          setSelectedDateKey
                        }
                        onPreviousMonth={() =>
                          setViewDate(
                            (
                              current,
                            ) =>
                              shiftMonth(
                                current,
                                -1,
                              ),
                          )
                        }
                        onNextMonth={() =>
                          setViewDate(
                            (
                              current,
                            ) =>
                              shiftMonth(
                                current,
                                1,
                              ),
                          )
                        }
                        onPreviousYear={() =>
                          setViewDate(
                            (
                              current,
                            ) =>
                              shiftYear(
                                current,
                                -1,
                              ),
                          )
                        }
                        onNextYear={() =>
                          setViewDate(
                            (
                              current,
                            ) =>
                              shiftYear(
                                current,
                                1,
                              ),
                          )
                        }
                        onToday={
                          returnToCurrentMonth
                        }
                      />

                      {eventsLoading ? (
                        <p className="mt-3 text-[9px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))]">
                          Loading
                          calendar
                          events…
                        </p>
                      ) : (
                        <CalendarEventList
                          dateKey={
                            selectedDateKey
                          }
                          events={
                            events
                          }
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-100c09))] p-4">
                    <div className="border-b border-[rgb(var(--sep-colour-60482e))]/35 pb-4 text-center">
                      <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))]">
                        Current
                        weather
                      </p>

                      <div className="mt-2 flex items-center justify-center">
                        <img
                          src={
                            ICONS[
                              state
                                .weather
                            ] ??
                            "/icons/weather/clear.png"
                          }
                          alt={weatherLabel(
                            state.weather,
                          )}
                          width={50}
height={50}
className="block h-11 w-11 object-contain"
                        />
                      </div>

                      <p className="mt-1 font-serif text-sm capitalize text-[rgb(var(--sep-colour-dfc79c))]">
                        {weatherLabel(
                          state.weather,
                        )} <br></br> {state.temperature_c}°C
                      </p>

                      <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-746858))]">
                        {
                          state.weather_intensity
                        }
                      </p>
                    </div>

                    <div className="flex flex-1 flex-col justify-end pt-4 text-center">
                      <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))]">
                        Current
                        lunar phase
                      </p>

                      <div className="mt-2 flex items-center justify-center">
                        <img
                          src={
                            lunar.symbol
                          }
                          alt={
                            lunar.name
                          }
                          width={
                            50
                          }
                          height={
                            50
                          }
                          className="block h-[50px] w-[50px] object-contain"
                        />
                      </div>

                      <p className="mt-3 font-serif text-base text-[rgb(var(--sep-colour-dfc79c))]">
                        {
                          lunar.name
                        }
                      </p>

                      <p className="mt-2 text-[9px] leading-4 text-[rgb(var(--sep-colour-827563))]">
                        {
                          lunar.illumination
                        }
                        % illuminated
                      </p>

                      <p className="text-[9px] leading-4 text-[rgb(var(--sep-colour-6f6456))]">
                        Day{" "}
                        {
                          lunar.ageDays
                        }{" "}
                        of the
                        lunar cycle
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function Fact({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-15100d))] p-3">
      <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-776650))]">
        {label}
      </p>
      <p className="mt-1 truncate font-serif text-sm text-[rgb(var(--sep-colour-d8bd91))]">
        {value}
      </p>
    </div>
  );
}
