import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_WORLD_STATE,
  type WorldState,
} from "@/lib/world/types";

export async function getWorldState(): Promise<WorldState> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("world_state")
    .select(`
      id,
      game_datetime,
      automatic_time,
      time_scale,
      weather,
      weather_intensity,
      temperature_c,
      automatic_weather,
      next_weather_change_game,
      weather_override_until_game,
      weather_last_changed_game,
      automatic_temperature,
      temperature_override_until_game,
      temperature_last_changed_game,
      climate_override_snapshot,
      updated_at
    `)
    .eq("id", "aureth")
    .maybeSingle();

  if (error || !data) {
    return DEFAULT_WORLD_STATE;
  }

  return data as WorldState;
}
