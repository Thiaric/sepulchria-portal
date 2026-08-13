export type LunarPhase = {
  name: string;
  symbol: string;
  illumination: number;
  ageDays: number;
};

const MONTH = 29.530588853;
const DAY_MS = 86400000;
const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);

export function getLunarPhase(date: Date): LunarPhase {
  const elapsed = (date.getTime() - NEW_MOON) / DAY_MS;
  const cycle = ((elapsed / MONTH) % 1 + 1) % 1;
  const ageDays = cycle * MONTH;
  const illumination = (1 - Math.cos(cycle * Math.PI * 2)) / 2;
  const index = Math.floor(cycle * 8 + 0.5) % 8;
  const phases = [
  ["New Moon", "/icons/moon/new-moon.png"],
  ["Waxing Crescent", "/icons/moon/waxing-crescent.png"],
  ["First Quarter", "/icons/moon/first-quarter.png"],
  ["Waxing Gibbous", "/icons/moon/waxing-gibbous.png"],
  ["Full Moon", "/icons/moon/full-moon.png"],
  ["Waning Gibbous", "/icons/moon/waning-gibbous.png"],
  ["Last Quarter", "/icons/moon/last-quarter.png"],
  ["Waning Crescent", "/icons/moon/waning-crescent.png"],
] as const;

  return {
    name: phases[index][0],
    symbol: phases[index][1],
    illumination: Math.round(illumination * 100),
    ageDays: Math.round(ageDays * 10) / 10,
  };
}
