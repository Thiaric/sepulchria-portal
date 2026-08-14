export const AURETH_YEAR_OFFSET = 2200;

export const AURETH_MONTHS = [
  "Frostern",
  "Molakorn",
  "Estaron",
  "Ameron",
  "Paneron",
  "Soltiron",
  "Flameron",
  "Wanern",
  "Vintorn",
  "Bifron",
  "Morsern",
  "Nochern",
] as const;

export const AURETH_WEEKDAYS = [
  "Edrimos",
  "Tharmos",
  "Linmos",
  "Vaemos",
  "Selmos",
  "Namartes",
  "Caeliant",
] as const;

export type AurethDate = {
  year: number;
  monthIndex: number;
  monthName: string;
  day: number;
  weekdayIndex: number;
  weekdayName: string;
  daysInMonth: number;
};

export function getAurethDate(date: Date): AurethDate {
  const year = date.getUTCFullYear();
  const monthIndex = date.getUTCMonth();
  const day = date.getUTCDate();
  const weekdayIndex = date.getUTCDay();

  return {
    year: year + AURETH_YEAR_OFFSET,
    monthIndex,
    monthName: AURETH_MONTHS[monthIndex],
    day,
    weekdayIndex,
    weekdayName: AURETH_WEEKDAYS[weekdayIndex],
    daysInMonth: new Date(
      Date.UTC(year, monthIndex + 1, 0, 12),
    ).getUTCDate(),
  };
}

export function formatAurethDate(date: Date) {
  const value = getAurethDate(date);
  return `${value.weekdayName}, ${value.day} ${value.monthName}, ${value.year} ADN`;
}

export function formatShortAurethDate(date: Date) {
  const value = getAurethDate(date);
  return `${value.day} ${value.monthName}`;
}

export function aurethDateToUtcDate(
  aurethYear: number,
  monthIndex: number,
  day: number,
) {
  const realYear =
    aurethYear - AURETH_YEAR_OFFSET;

  if (
    !Number.isInteger(aurethYear) ||
    !Number.isInteger(monthIndex) ||
    !Number.isInteger(day) ||
    monthIndex < 0 ||
    monthIndex > 11
  ) {
    throw new Error("Invalid Aureth date.");
  }

  const candidate = new Date(
    Date.UTC(
      realYear,
      monthIndex,
      day,
      12,
    ),
  );

  if (
    candidate.getUTCFullYear() !== realYear ||
    candidate.getUTCMonth() !== monthIndex ||
    candidate.getUTCDate() !== day
  ) {
    throw new Error(
      "That day does not exist in the selected month.",
    );
  }

  return candidate;
}

export function toIsoDateKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(
    date.getUTCMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    date.getUTCDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function fromIsoDateKey(value: string) {
  const match = value.match(
    /^(-?\d{1,6})-(\d{2})-(\d{2})$/,
  );

  if (!match) {
    throw new Error("Invalid calendar date.");
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);

  const date = new Date(
    Date.UTC(year, monthIndex, day, 12),
  );

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== monthIndex ||
    date.getUTCDate() !== day
  ) {
    throw new Error("Invalid calendar date.");
  }

  return date;
}
