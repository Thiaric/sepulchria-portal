export type WeatherKind =
  | "clear"
  | "partly_cloudy"
  | "cloudy"
  | "overcast"
  | "fog"
  | "drizzle"
  | "rain"
  | "heavy_rain"
  | "storm"
  | "snow"
  | "heavy_snow";

export type WeatherIntensity =
  | "light"
  | "moderate"
  | "heavy";

export type WorldState = {
  id: string;
  game_datetime: string;
  automatic_time: boolean;
  time_scale: number;

  weather: WeatherKind;
  weather_intensity: WeatherIntensity;
  temperature_c: number;

  automatic_weather: boolean;
  next_weather_change_game: string | null;
  weather_override_until_game: string | null;
  weather_last_changed_game: string | null;

  updated_at: string;
};

export const DEFAULT_WORLD_STATE: WorldState = {
  id: "aureth",
  game_datetime:
    new Date().toISOString(),
  automatic_time: true,
  time_scale: 1,

  weather: "clear",
  weather_intensity: "moderate",
  temperature_c: 18,

  automatic_weather: true,
  next_weather_change_game: null,
  weather_override_until_game: null,
  weather_last_changed_game: null,

  updated_at:
    new Date().toISOString(),
};
