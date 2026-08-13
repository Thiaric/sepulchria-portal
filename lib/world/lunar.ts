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
    ["New Moon", "🌑"],
    ["Waxing Crescent", "🌒"],
    ["First Quarter", "🌓"],
    ["Waxing Gibbous", "🌔"],
    ["Full Moon", "🌕"],
    ["Waning Gibbous", "🌖"],
    ["Last Quarter", "🌗"],
    ["Waning Crescent", "🌘"],
  ] as const;

  return {
    name: phases[index][0],
    symbol: phases[index][1],
    illumination: Math.round(illumination * 100),
    ageDays: Math.round(ageDays * 10) / 10,
  };
}
