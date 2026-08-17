"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";
import type {
  ClimateOverrideSnapshot,
  WeatherIntensity,
  WeatherKind,
  WorldState,
} from "@/lib/world/types";

const WEATHER: WeatherKind[] = [
  "clear", "partly_cloudy", "cloudy", "overcast", "fog", "drizzle",
  "rain", "heavy_rain", "storm", "snow", "heavy_snow", "hail",
];

const INTENSITY: WeatherIntensity[] = [
  "light", "moderate", "heavy",
];

function effectiveGameDate(state: WorldState) {
  const base = Date.parse(state.game_datetime);

  if (Number.isNaN(base) || !state.automatic_time) {
    return new Date(state.game_datetime);
  }

  const anchor = Date.parse(state.updated_at);
  const elapsed = Number.isNaN(anchor)
    ? 0
    : Math.max(0, Date.now() - anchor);

  return new Date(
    base + elapsed * Math.max(0, Number(state.time_scale) || 0),
  );
}

function makeSnapshot(state: WorldState): ClimateOverrideSnapshot {
  return {
    weather: state.weather,
    weather_intensity: state.weather_intensity,
    temperature_c: state.temperature_c,
    automatic_weather: state.automatic_weather,
    automatic_temperature: state.automatic_temperature,
    next_weather_change_game: state.next_weather_change_game,
    weather_last_changed_game: state.weather_last_changed_game,
    temperature_last_changed_game: state.temperature_last_changed_game,
  };
}

export async function resetWeatherOverride() {
  const staff = await requireStaff();
  const supabase = await createClient();

  const { data: before, error: beforeError } = await supabase
    .from("world_state")
    .select("*")
    .eq("id", "aureth")
    .maybeSingle();

  if (beforeError || !before) {
    throw new Error(
      beforeError?.message ?? "World state could not be loaded.",
    );
  }

  const state = before as WorldState;
  const snapshot = state.climate_override_snapshot;

  if (!snapshot) {
    revalidatePath("/", "layout");
    return;
  }

  const gameDate = effectiveGameDate(state);
  const restored = {
    game_datetime: gameDate.toISOString(),
    weather: snapshot.weather,
    weather_intensity: snapshot.weather_intensity,
    temperature_c: snapshot.temperature_c,
    automatic_weather: snapshot.automatic_weather,
    automatic_temperature: snapshot.automatic_temperature,
    next_weather_change_game: snapshot.next_weather_change_game,
    weather_last_changed_game: snapshot.weather_last_changed_game,
    temperature_last_changed_game: snapshot.temperature_last_changed_game,
    weather_override_until_game: null,
    temperature_override_until_game: null,
    climate_override_snapshot: null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("world_state")
    .update(restored)
    .eq("id", "aureth");

  if (error) {
    throw new Error(`Unable to restore climate: ${error.message}`);
  }

  await supabase.from("world_state_history").insert({
    changed_by: staff.userId,
    previous_state: before,
    new_state: {
      ...before,
      ...restored,
      source: "staff_override_restored",
    },
  });

  revalidatePath("/", "layout");
}

export async function updateWorldState(formData: FormData) {
  const staff = await requireStaff();
  const supabase = await createClient();

  const weather = String(formData.get("weather") ?? "clear") as WeatherKind;
  const intensity = String(
    formData.get("weatherIntensity") ?? "moderate",
  ) as WeatherIntensity;
  const temperature = Number(formData.get("temperatureC"));
  const timeScale = Number(formData.get("timeScale"));
  const automaticTime = formData.get("automaticTime") === "on";
  const automaticWeather = formData.get("automaticWeather") === "on";
  const automaticTemperature =
    formData.get("automaticTemperature") === "on";

  const overrideHours = Math.max(
    0,
    Math.min(12, Number(formData.get("overrideHours") ?? 0) || 0),
  );

  const temperatureOverrideHours = Math.max(
    0,
    Math.min(
      12,
      Number(formData.get("temperatureOverrideHours") ?? 0) || 0,
    ),
  );

  const submittedDate = new Date(
    String(formData.get("gameDatetime") ?? ""),
  );

  if (!WEATHER.includes(weather)) {
    throw new Error("Invalid weather condition.");
  }

  if (!INTENSITY.includes(intensity)) {
    throw new Error("Invalid weather intensity.");
  }

  if (
    !Number.isFinite(temperature) ||
    temperature < -60 ||
    temperature > 60
  ) {
    throw new Error("Temperature must be between -60 and 60°C.");
  }

  if (
    !Number.isFinite(timeScale) ||
    timeScale < 0 ||
    timeScale > 24
  ) {
    throw new Error("Time scale must be between 0 and 24.");
  }

  if (Number.isNaN(submittedDate.getTime())) {
    throw new Error("Invalid game date/time.");
  }

  const { data: before, error: beforeError } = await supabase
    .from("world_state")
    .select("*")
    .eq("id", "aureth")
    .maybeSingle();

  if (beforeError || !before) {
    throw new Error(
      beforeError?.message ?? "World state could not be loaded.",
    );
  }

  const state = before as WorldState;
  const hasTemporaryOverride =
    overrideHours > 0 || temperatureOverrideHours > 0;

  /*
   * Snapshot only once. If staff edits an override while one is already
   * active, the original natural climate remains the restoration target.
   */
  const snapshot =
    hasTemporaryOverride
      ? state.climate_override_snapshot ?? makeSnapshot(state)
      : state.climate_override_snapshot;

  const weatherOverrideUntil =
    automaticWeather && overrideHours > 0
      ? new Date(
          submittedDate.getTime() + overrideHours * 60 * 60 * 1000,
        ).toISOString()
      : null;

  const temperatureOverrideUntil =
    automaticTemperature && temperatureOverrideHours > 0
      ? new Date(
          submittedDate.getTime() +
            temperatureOverrideHours * 60 * 60 * 1000,
        ).toISOString()
      : null;

  const nextWeatherChange =
    automaticWeather && overrideHours === 0
      ? new Date(
          submittedDate.getTime() +
            (2 + Math.random() * 2) * 60 * 60 * 1000,
        ).toISOString()
      : state.next_weather_change_game;

  const staffControlsTemperature =
    !automaticTemperature || temperatureOverrideHours > 0;

  const nextTemperature = staffControlsTemperature
    ? Math.round(temperature)
    : state.temperature_c;

  const next = {
    game_datetime: submittedDate.toISOString(),
    automatic_time: automaticTime,
    time_scale: timeScale,

    weather,
    weather_intensity: intensity,
    temperature_c: nextTemperature,

    automatic_weather: automaticWeather,
    weather_override_until_game: weatherOverrideUntil,
    next_weather_change_game: nextWeatherChange,
    weather_last_changed_game: submittedDate.toISOString(),

    automatic_temperature: automaticTemperature,
    temperature_override_until_game: temperatureOverrideUntil,
    temperature_last_changed_game: staffControlsTemperature
      ? submittedDate.toISOString()
      : state.temperature_last_changed_game,

    climate_override_snapshot: snapshot,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("world_state")
    .update(next)
    .eq("id", "aureth");

  if (error) {
    throw new Error(`Unable to update world state: ${error.message}`);
  }

  await supabase.from("world_state_history").insert({
    changed_by: staff.userId,
    previous_state: before,
    new_state: {
      ...next,
      source: hasTemporaryOverride ? "staff_temporary_override" : "staff",
      weather_override_hours: overrideHours,
      temperature_override_hours: temperatureOverrideHours,
    },
  });

  revalidatePath("/", "layout");
}
