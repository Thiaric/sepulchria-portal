"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { useWorldState } from "@/components/world/world-state-provider";
import {
  AURETH_WEEKDAYS,
  formatAurethDate,
  formatShortAurethDate,
  getAurethDate,
} from "@/lib/world/calendar";
import { getLunarPhase } from "@/lib/world/lunar";

const ICONS: Record<string, string> = {
  clear: "☀",
  partly_cloudy: "◐",
  cloudy: "☁",
  overcast: "☁",
  fog: "≋",
  drizzle: "☂",
  rain: "☂",
  heavy_rain: "☂",
  storm: "ϟ",
  snow: "❄",
  heavy_snow: "❄",
  hail: "◆",
};

function weatherLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function Calendar({ date }: { date: Date }) {
  const aureth = getAurethDate(date);
  const realYear = date.getUTCFullYear();
  const firstWeekday = new Date(
    Date.UTC(realYear, aureth.monthIndex, 1, 12),
  ).getUTCDay();

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: aureth.daysInMonth }, (_, index) => index + 1),
  ];

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <p className="font-serif text-lg text-[#dfc79c]">
          {aureth.monthName}
        </p>
        <p className="text-[8px] uppercase tracking-[0.14em] text-[#806f59]">
          {aureth.year} ADF
        </p>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-px border border-[#60482e]/35 bg-[#60482e]/25">
        {AURETH_WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            title={weekday}
            className="bg-[#100c09] px-0.5 py-2 text-center text-[7px] uppercase tracking-[0.04em] text-[#796a56]"
          >
            {weekday.slice(0, 3)}
          </div>
        ))}

        {cells.map((value, index) => (
          <div
            key={index}
            className={`flex aspect-square items-center justify-center bg-[#15100d] text-[10px] ${
              value === aureth.day
                ? "bg-[#2a1d12] font-semibold text-[#f0d39f] shadow-[inset_0_0_0_1px_#a67b45]"
                : "text-[#a99a85]"
            }`}
          >
            {value ?? ""}
          </div>
        ))}
      </div>
    </div>
  );
}

export function WorldIndicator() {
  const { state, gameDate } = useWorldState();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  const time = useMemo(
    () =>
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/London",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(gameDate),
    [gameDate],
  );

  const shortDate = useMemo(
    () => formatShortAurethDate(gameDate),
    [gameDate],
  );

  const fullDate = useMemo(
    () => formatAurethDate(gameDate),
    [gameDate],
  );

  const lunar = useMemo(
    () => getLunarPhase(gameDate),
    [gameDate],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-10 items-center gap-2 border border-[#614b31] bg-[#17120f] px-3 text-[#c9aa79] transition hover:border-[#8d6b42] hover:bg-[#201711] md:flex"
        title={`${fullDate} · ${lunar.name} · ${weatherLabel(state.weather)}`}
        aria-label="Open in-game calendar"
      >
        <span>{ICONS[state.weather] ?? "◌"}</span>
        <span className="hidden text-[9px] uppercase tracking-[0.08em] text-[#a38c69] xl:inline">
          {state.temperature_c}°C | {shortDate} - {time} |</span>
        <span className="inline-flex shrink-0 items-center justify-center">
  <img
    src={lunar.symbol}
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
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setOpen(false);
              }}
            >
              <section
                role="dialog"
                aria-modal="true"
                className="relative w-full max-w-lg border border-[#765937]/70 bg-[#120d0a] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.85)] sm:p-6"
              >
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center border border-[#60482e]/60 bg-[#17110f] text-[#c8a875]"
                >
                  ×
                </button>

                <p className="text-[8px] uppercase tracking-[0.26em] text-[#886c48]">
                  Aureth · Reckoning After the Darkest Night
                </p>

                <h2 className="mt-2 pr-10 font-serif text-2xl text-[#e2cda4]">
                  {fullDate}
                </h2>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <Fact label="Time" value={time} />
                  <Fact label="Weather" value={weatherLabel(state.weather)} />
                  <Fact label="Temperature" value={`${state.temperature_c}°C`} />
                </div>

                <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_150px]">
                  <Calendar date={gameDate} />

                  <div className="border border-[#60482e]/40 bg-[#100c09] p-4 text-center">
                    <p className="text-[8px] uppercase tracking-[0.2em] text-[#806b50]">
                      Lunar phase
                    </p>
                    <div className="mt-3 flex items-center justify-center">
  <img
    src={lunar.symbol}
    alt={lunar.name}
    width={80}
    height={80}
    className="block h-20 w-20 object-contain"
  />
</div>
                    <p className="mt-3 font-serif text-base text-[#dfc79c]">
                      {lunar.name}
                    </p>
                    <p className="mt-2 text-[9px] leading-4 text-[#827563]">
                      {lunar.illumination}% illuminated
                    </p>
                    <p className="text-[9px] leading-4 text-[#6f6456]">
                      Day {lunar.ageDays} of the lunar cycle
                    </p>
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
