import "server-only";

import { createClient } from "@supabase/supabase-js";

import type {
  WeatherIntensity,
  WeatherKind,
  WorldState,
} from "@/lib/world/types";

const WORLD_ROW_ID = "aureth";
const TEMPERATURE_STEP_GAME_MS = 60 * 60 * 1000;

type WeatherCandidate = {
  weather: WeatherKind;
  weight: number;
};

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.",
    );
  }

  return createClient(url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function effectiveGameDate(
  state: WorldState,
  realNow = Date.now(),
) {
  const base = Date.parse(state.game_datetime);

  if (Number.isNaN(base) || !state.automatic_time) {
    return new Date(state.game_datetime);
  }

  const anchor = Date.parse(state.updated_at);
  const elapsed = Number.isNaN(anchor)
    ? 0
    : Math.max(0, realNow - anchor);

  return new Date(
    base +
      elapsed *
        Math.max(
          0,
          Number(state.time_scale) || 0,
        ),
  );
}

function seasonFor(date: Date) {
  const month = date.getUTCMonth() + 1;

  if (month === 12 || month <= 2) return "winter";
  if (month <= 5) return "spring";
  if (month <= 8) return "summer";
  return "autumn";
}

function weightedPick(
  candidates: WeatherCandidate[],
): WeatherKind {
  const total = candidates.reduce(
    (sum, item) => sum + item.weight,
    0,
  );

  let roll = Math.random() * total;

  for (const item of candidates) {
    roll -= item.weight;
    if (roll <= 0) return item.weather;
  }

  return candidates[candidates.length - 1].weather;
}

function candidatesFor(
  gameDate: Date,
  temperature: number,
): WeatherCandidate[] {
  const season = seasonFor(gameDate);

  if (season === "winter") {
    if (temperature <= 1) {
      return [
        { weather: "cloudy", weight: 18 },
        { weather: "overcast", weight: 16 },
        { weather: "fog", weight: 10 },
        { weather: "snow", weight: 22 },
        { weather: "heavy_snow", weight: 8 },
        { weather: "clear", weight: 10 },
        { weather: "partly_cloudy", weight: 12 },
        { weather: "hail", weight: 4 },
      ];
    }

    return [
      { weather: "cloudy", weight: 22 },
      { weather: "overcast", weight: 20 },
      { weather: "fog", weight: 12 },
      { weather: "drizzle", weight: 15 },
      { weather: "rain", weight: 14 },
      { weather: "clear", weight: 7 },
      { weather: "partly_cloudy", weight: 10 },
    ];
  }

  if (season === "spring") {
    return [
      { weather: "clear", weight: 14 },
      { weather: "partly_cloudy", weight: 20 },
      { weather: "cloudy", weight: 17 },
      { weather: "overcast", weight: 9 },
      { weather: "fog", weight: 7 },
      { weather: "drizzle", weight: 14 },
      { weather: "rain", weight: 13 },
      { weather: "heavy_rain", weight: 3 },
      { weather: "storm", weight: 3 },
      { weather: "hail", weight: 2 },
    ];
  }

  if (season === "summer") {
    return [
      { weather: "clear", weight: 32 },
      { weather: "partly_cloudy", weight: 27 },
      { weather: "cloudy", weight: 12 },
      { weather: "overcast", weight: 5 },
      { weather: "fog", weight: 3 },
      { weather: "drizzle", weight: 5 },
      { weather: "rain", weight: 7 },
      { weather: "heavy_rain", weight: 3 },
      { weather: "storm", weight: 6 },
      { weather: "hail", weight: 1 },
    ];
  }

  return [
    { weather: "clear", weight: 10 },
    { weather: "partly_cloudy", weight: 15 },
    { weather: "cloudy", weight: 23 },
    { weather: "overcast", weight: 15 },
    { weather: "fog", weight: 12 },
    { weather: "drizzle", weight: 10 },
    { weather: "rain", weight: 11 },
    { weather: "heavy_rain", weight: 2 },
    { weather: "storm", weight: 2 },
    { weather: "hail", weight: 2 },
  ];
}

const TRANSITIONS: Record<WeatherKind, WeatherKind[]> = {
  clear: ["clear", "partly_cloudy", "cloudy", "fog"],
  partly_cloudy: [
    "clear",
    "partly_cloudy",
    "cloudy",
    "overcast",
    "drizzle",
  ],
  cloudy: [
    "partly_cloudy",
    "cloudy",
    "overcast",
    "fog",
    "drizzle",
    "rain",
    "snow",
  ],
  overcast: [
    "cloudy",
    "overcast",
    "fog",
    "drizzle",
    "rain",
    "heavy_rain",
    "snow",
    "heavy_snow",
    "hail",
  ],
  fog: ["fog", "cloudy", "overcast", "partly_cloudy", "drizzle"],
  drizzle: ["drizzle", "cloudy", "overcast", "rain", "partly_cloudy"],
  rain: ["drizzle", "rain", "heavy_rain", "overcast", "cloudy", "storm", "hail"],
  heavy_rain: ["rain", "heavy_rain", "storm", "overcast", "hail"],
  storm: ["storm", "heavy_rain", "rain", "overcast", "cloudy", "hail"],
  snow: ["snow", "heavy_snow", "overcast", "cloudy", "partly_cloudy", "hail"],
  heavy_snow: ["heavy_snow", "snow", "overcast", "cloudy", "hail"],
  hail: ["hail", "rain", "overcast", "cloudy", "snow"],
};

function chooseWeather(
  state: WorldState,
  gameDate: Date,
) {
  const seasonal = candidatesFor(
    gameDate,
    state.temperature_c,
  );

  const allowed = new Set(TRANSITIONS[state.weather]);
  const believable = seasonal.filter((candidate) =>
    allowed.has(candidate.weather),
  );

  return weightedPick(
    believable.length > 0 ? believable : seasonal,
  );
}

function chooseIntensity(
  weather: WeatherKind,
): WeatherIntensity {
  if (
    weather === "clear" ||
    weather === "partly_cloudy" ||
    weather === "fog" ||
    weather === "drizzle"
  ) {
    return Math.random() < 0.72 ? "light" : "moderate";
  }

  if (
    weather === "storm" ||
    weather === "heavy_rain" ||
    weather === "heavy_snow" ||
    weather === "hail"
  ) {
    return Math.random() < 0.68 ? "heavy" : "moderate";
  }

  const roll = Math.random();
  if (roll < 0.2) return "light";
  if (roll < 0.82) return "moderate";
  return "heavy";
}

function baseTemperatureTarget(gameDate: Date) {
  const season = seasonFor(gameDate);
  const hour = gameDate.getUTCHours();
  const daytime = hour >= 7 && hour < 19;

  const ranges = {
    winter: daytime ? [2, 8] : [-2, 4],
    spring: daytime ? [10, 17] : [5, 11],
    summer: daytime ? [18, 27] : [12, 18],
    autumn: daytime ? [9, 16] : [4, 11],
  } as const;

  const [min, max] = ranges[season];
  return min + Math.random() * (max - min);
}

const WEATHER_TEMPERATURE_MODIFIER: Record<WeatherKind, number> = {
  clear: 2,
  partly_cloudy: 1,
  cloudy: 0,
  overcast: -1,
  fog: -2,
  drizzle: -1,
  rain: -2,
  heavy_rain: -3,
  storm: -4,
  snow: -4,
  heavy_snow: -5,
  hail: -4,
};

function targetTemperature(
  gameDate: Date,
  weather: WeatherKind,
) {
  return Math.round(
    baseTemperatureTarget(gameDate) +
      WEATHER_TEMPERATURE_MODIFIER[weather],
  );
}

function nextTemperature(
  current: number,
  gameDate: Date,
  weather: WeatherKind,
) {
  const target = targetTemperature(gameDate, weather);
  const delta = target - current;

  if (Math.abs(delta) <= 1) return target;

  return (
    current +
    Math.sign(delta) *
      Math.min(
        Math.abs(delta),
        1 + Math.floor(Math.random() * 2),
      )
  );
}

function nextChangeDate(
  gameDate: Date,
  weather: WeatherKind,
) {
  const hours =
    weather === "storm" ||
    weather === "heavy_rain" ||
    weather === "heavy_snow" ||
    weather === "hail"
      ? 1 + Math.random() * 2
      : 2 + Math.random() * 2;

  return new Date(
    gameDate.getTime() + hours * 60 * 60 * 1000,
  );
}

function parseOptionalDate(value: string | null) {
  return value ? Date.parse(value) : Number.NaN;
}

export async function tickAutomaticWeather() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("world_state")
    .select("*")
    .eq("id", WORLD_ROW_ID)
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "World state not found.");
  }

  const state = data as WorldState;
  const gameDate = effectiveGameDate(state);

  const weatherOverrideUntil = parseOptionalDate(
    state.weather_override_until_game,
  );
  const weatherOverrideActive =
    !Number.isNaN(weatherOverrideUntil) &&
    gameDate.getTime() < weatherOverrideUntil;
  const weatherOverrideExpired =
    !Number.isNaN(weatherOverrideUntil) &&
    gameDate.getTime() >= weatherOverrideUntil;

  const temperatureOverrideUntil = parseOptionalDate(
    state.temperature_override_until_game,
  );
  const temperatureOverrideActive =
    !Number.isNaN(temperatureOverrideUntil) &&
    gameDate.getTime() < temperatureOverrideUntil;
  const temperatureOverrideExpired =
    !Number.isNaN(temperatureOverrideUntil) &&
    gameDate.getTime() >= temperatureOverrideUntil;

  const nextWeatherChange = parseOptionalDate(
    state.next_weather_change_game,
  );

  const weatherTransitionDue =
    state.automatic_weather &&
    !weatherOverrideActive &&
    (
      weatherOverrideExpired ||
      Number.isNaN(nextWeatherChange) ||
      gameDate.getTime() >= nextWeatherChange
    );

  let weather = state.weather;
  let intensity = state.weather_intensity;
  let nextWeatherChangeGame = state.next_weather_change_game;
  let weatherLastChangedGame = state.weather_last_changed_game;

  if (weatherTransitionDue) {
    weather = chooseWeather(state, gameDate);
    intensity = chooseIntensity(weather);
    nextWeatherChangeGame = nextChangeDate(
      gameDate,
      weather,
    ).toISOString();
    weatherLastChangedGame = gameDate.toISOString();
  } else if (!state.automatic_weather) {
    nextWeatherChangeGame = null;
  }

  const temperatureLastChanged = parseOptionalDate(
    state.temperature_last_changed_game,
  );

  const temperatureTickDue =
    state.automatic_temperature &&
    !temperatureOverrideActive &&
    (
      temperatureOverrideExpired ||
      Number.isNaN(temperatureLastChanged) ||
      gameDate.getTime() - temperatureLastChanged >=
        TEMPERATURE_STEP_GAME_MS ||
      weatherTransitionDue
    );

  let temperature = state.temperature_c;
  let temperatureLastChangedGame =
    state.temperature_last_changed_game;

  if (temperatureTickDue) {
    temperature = nextTemperature(
      state.temperature_c,
      gameDate,
      weather,
    );
    temperatureLastChangedGame = gameDate.toISOString();
  }

  const anyChange =
    weatherTransitionDue ||
    temperatureTickDue ||
    weatherOverrideExpired ||
    temperatureOverrideExpired;

  if (!anyChange) {
    return {
      changed: false,
      reason: weatherOverrideActive
        ? "staff-weather-override-active"
        : temperatureOverrideActive
          ? "staff-temperature-override-active"
          : "waiting-for-next-change",
    };
  }

  const now = new Date().toISOString();

  const next = {
    game_datetime: gameDate.toISOString(),
    weather,
    weather_intensity: intensity,
    temperature_c: temperature,
    next_weather_change_game: nextWeatherChangeGame,
    weather_override_until_game: weatherOverrideExpired
      ? null
      : state.weather_override_until_game,
    weather_last_changed_game: weatherLastChangedGame,
    temperature_override_until_game: temperatureOverrideExpired
      ? null
      : state.temperature_override_until_game,
    temperature_last_changed_game: temperatureLastChangedGame,
    updated_at: now,
  };

  const { error: updateError } = await supabase
    .from("world_state")
    .update(next)
    .eq("id", WORLD_ROW_ID);

  if (updateError) {
    throw new Error(
      `Unable to advance automatic world climate: ${updateError.message}`,
    );
  }

  return {
    changed: true,
    reason:
      weatherTransitionDue && temperatureTickDue
        ? "weather-and-temperature-changed"
        : weatherTransitionDue
          ? "weather-changed"
          : temperatureTickDue
            ? "temperature-changed"
            : "override-expired",
    weather,
    intensity,
    temperature,
    gameDate: gameDate.toISOString(),
    nextWeatherChange: nextWeatherChangeGame,
  };
}
