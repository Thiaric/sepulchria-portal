const YEAR_OFFSET = 2207;

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
    year: year + YEAR_OFFSET,
    monthIndex,
    monthName: AURETH_MONTHS[monthIndex],
    day,
    weekdayIndex,
    weekdayName: AURETH_WEEKDAYS[weekdayIndex],
    daysInMonth: new Date(Date.UTC(year, monthIndex + 1, 0, 12)).getUTCDate(),
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
