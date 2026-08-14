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
          <p className="font-serif text-lg text-[#dfc79c]">
            {aureth.monthName}
          </p>
          <p className="text-[8px] uppercase tracking-[0.14em] text-[#806f59]">
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

      <div className="mt-2 flex justify-center">
        <button
          type="button"
          onClick={onToday}
          className="border border-[#60482e]/45 bg-[#15100d] px-3 py-1.5 text-[7px] uppercase tracking-[0.16em] text-[#9d896d] transition hover:border-[#967342] hover:text-[#dfc79c]"
        >
          Current month
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-px border border-[#60482e]/35 bg-[#60482e]/25">
        {AURETH_WEEKDAYS.map(
          (weekday) => (
            <div
              key={weekday}
              title={weekday}
              className="bg-[#100c09] px-0.5 py-2 text-center text-[7px] uppercase tracking-[0.04em] text-[#796a56]"
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
                  className="h-10 bg-[#100c09]/65 sm:h-11"
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
  "relative flex h-10 flex-col items-center justify-center gap-0.5 bg-[#15100d] text-[9px] transition sm:h-11",
                  eventCount > 0
                    ? "cursor-pointer hover:bg-[#241a11]"
                    : "cursor-default",
                  isToday
                    ? "font-semibold text-[#f0d39f] shadow-[inset_0_0_0_1px_#a67b45]"
                    : "text-[#a99a85]",
                  isSelected
                    ? "bg-[#2a1d12] shadow-[inset_0_0_0_1px_#c08b4a]"
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
                    className="absolute right-1 top-1 flex h-3 min-w-3 items-center justify-center rounded-full bg-[#a87536] px-0.5 text-[6px] font-bold leading-none text-[#160e08]"
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
      className="flex h-8 w-8 items-center justify-center border border-[#60482e]/50 bg-[#17110d] font-serif text-sm text-[#bda479] transition hover:border-[#987344] hover:bg-[#271b12] hover:text-[#efd4a0]"
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
    return (
      <div className="mt-4 border border-[#60482e]/35 bg-[#100c09] p-3 text-[10px] leading-5 text-[#756958]">
        Days with events have a gold marker. Click one to read its events.
      </div>
    );
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
    <div className="mt-4 border border-[#60482e]/40 bg-[#100c09] p-3">
      <p className="text-[7px] uppercase tracking-[0.18em] text-[#806b50]">
        Events
      </p>
      <h3 className="mt-1 font-serif text-base text-[#dfc79c]">
        {formatAurethDate(
          date,
        )}
      </h3>

      <div className="mt-3 space-y-2">
        {selected.map(
          (event) => (
            <article
              key={event.id}
              className="border border-[#59432c]/40 bg-[#15100d] p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h4 className="font-serif text-sm text-[#e0c79b]">
                  {event.title}
                </h4>

                {event.start_time ? (
                  <span className="text-[8px] uppercase tracking-[0.12em] text-[#a58c68]">
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
                <p className="mt-1 text-[9px] text-[#9d896d]">
                  {event.room?.name ??
                    event.location_name}
                </p>
              ) : null}

              {event.description ? (
                <p className="mt-2 whitespace-pre-wrap text-[10px] leading-5 text-[#827563]">
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

export function WorldIndicator() {
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
        className="hidden h-10 items-center gap-2 border border-[#614b31] bg-[#17120f] px-3 text-[#c9aa79] transition hover:border-[#8d6b42] hover:bg-[#201711] md:flex"
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

        <span className="hidden text-[9px] uppercase tracking-[0.08em] text-[#a38c69] xl:inline">
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
                role="dialog"
                aria-modal="true"
                className="relative my-auto w-full max-w-2xl border border-[#765937]/70 bg-[#120d0a] p-4 shadow-[0_30px_100px_rgba(0,0,0,0.85)] sm:p-5"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpen(
                      false,
                    )
                  }
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center border border-[#60482e]/60 bg-[#17110f] text-[#c8a875]"
                >
                  ×
                </button>

                <p className="text-[8px] uppercase tracking-[0.26em] text-[#886c48]">
                  Aureth ·
                  Reckoning After
                  the Darkest Night
                </p>

                <h2 className="mt-2 pr-10 font-serif text-2xl text-[#e2cda4]">
                  {fullDate}
                </h2>

                <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_150px]">
                  <div>
                    <div className="grid grid-cols-2 gap-2">
                      <Fact
                        label="Time"
                        value={
                          time
                        }
                      />

                      <Fact
                        label="Temperature"
                        value={`${state.temperature_c}°C`}
                      />
                    </div>

                    <div className="mt-5">
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
                        <p className="mt-3 text-[9px] uppercase tracking-[0.12em] text-[#756958]">
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

                  <div className="flex flex-col border border-[#60482e]/40 bg-[#100c09] p-4">
                    <div className="border-b border-[#60482e]/35 pb-4 text-center">
                      <p className="text-[8px] uppercase tracking-[0.2em] text-[#806b50]">
                        Current
                        weather
                      </p>

                      <div className="mt-3 flex items-center justify-center">
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
                          width={
                            72
                          }
                          height={
                            72
                          }
                          className="block h-[72px] w-[72px] object-contain"
                        />
                      </div>

                      <p className="mt-3 font-serif text-base capitalize text-[#dfc79c]">
                        {weatherLabel(
                          state.weather,
                        )}
                      </p>

                      <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-[#746858]">
                        {
                          state.weather_intensity
                        }
                      </p>
                    </div>

                    <div className="flex flex-1 flex-col justify-end pt-4 text-center">
                      <p className="text-[8px] uppercase tracking-[0.2em] text-[#806b50]">
                        Current
                        lunar phase
                      </p>

                      <div className="mt-3 flex items-center justify-center">
                        <img
                          src={
                            lunar.symbol
                          }
                          alt={
                            lunar.name
                          }
                          width={
                            72
                          }
                          height={
                            72
                          }
                          className="block h-[72px] w-[72px] object-contain"
                        />
                      </div>

                      <p className="mt-3 font-serif text-base text-[#dfc79c]">
                        {
                          lunar.name
                        }
                      </p>

                      <p className="mt-2 text-[9px] leading-4 text-[#827563]">
                        {
                          lunar.illumination
                        }
                        % illuminated
                      </p>

                      <p className="text-[9px] leading-4 text-[#6f6456]">
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
    <div className="border border-[#60482e]/35 bg-[#15100d] p-3">
      <p className="text-[7px] uppercase tracking-[0.18em] text-[#776650]">
        {label}
      </p>
      <p className="mt-1 truncate font-serif text-sm text-[#d8bd91]">
        {value}
      </p>
    </div>
  );
}
