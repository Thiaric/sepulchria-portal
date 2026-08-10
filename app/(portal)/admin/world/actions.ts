"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";
import type {
  WeatherIntensity,
  WeatherKind,
} from "@/lib/world/types";

const WEATHER: WeatherKind[] = [
  "clear",
  "partly_cloudy",
  "cloudy",
  "overcast",
  "fog",
  "drizzle",
  "rain",
  "heavy_rain",
  "storm",
  "snow",
  "heavy_snow",
  "hail",
];

const INTENSITY: WeatherIntensity[] =
  [
    "light",
    "moderate",
    "heavy",
  ];

function effectiveGameDate(
  state: {
    game_datetime: string;
    automatic_time: boolean;
    time_scale: number;
    updated_at: string;
  },
) {
  const base =
    Date.parse(
      state.game_datetime,
    );

  if (
    Number.isNaN(base) ||
    !state.automatic_time
  ) {
    return new Date(
      state.game_datetime,
    );
  }

  const anchor =
    Date.parse(state.updated_at);

  const elapsed =
    Number.isNaN(anchor)
      ? 0
      : Math.max(
          0,
          Date.now() - anchor,
        );

  return new Date(
    base +
      elapsed *
        Math.max(
          0,
          Number(
            state.time_scale,
          ) || 0,
        ),
  );
}

export async function updateWorldState(
  formData: FormData,
) {
  const staff =
    await requireStaff();

  const supabase =
    await createClient();

  const weather =
    String(
      formData.get("weather") ??
        "clear",
    ) as WeatherKind;

  const intensity =
    String(
      formData.get(
        "weatherIntensity",
      ) ?? "moderate",
    ) as WeatherIntensity;

  const temperature =
    Number(
      formData.get(
        "temperatureC",
      ),
    );

  const timeScale =
    Number(
      formData.get("timeScale"),
    );

  const automaticTime =
    formData.get(
      "automaticTime",
    ) === "on";

  const automaticWeather =
    formData.get(
      "automaticWeather",
    ) === "on";

  const overrideHours =
    Math.max(
      0,
      Math.min(
        12,
        Number(
          formData.get(
            "overrideHours",
          ) ?? 0,
        ) || 0,
      ),
    );

  const submittedDate =
    new Date(
      String(
        formData.get(
          "gameDatetime",
        ) ?? "",
      ),
    );

  if (
    !WEATHER.includes(weather)
  ) {
    throw new Error(
      "Invalid weather condition.",
    );
  }

  if (
    !INTENSITY.includes(
      intensity,
    )
  ) {
    throw new Error(
      "Invalid weather intensity.",
    );
  }

  if (
    !Number.isFinite(
      temperature,
    ) ||
    temperature < -60 ||
    temperature > 60
  ) {
    throw new Error(
      "Temperature must be between -60 and 60°C.",
    );
  }

  if (
    !Number.isFinite(
      timeScale,
    ) ||
    timeScale < 0 ||
    timeScale > 24
  ) {
    throw new Error(
      "Time scale must be between 0 and 24.",
    );
  }

  if (
    Number.isNaN(
      submittedDate.getTime(),
    )
  ) {
    throw new Error(
      "Invalid game date/time.",
    );
  }

  const {
    data: before,
    error: beforeError,
  } = await supabase
    .from("world_state")
    .select("*")
    .eq("id", "aureth")
    .maybeSingle();

  if (
    beforeError ||
    !before
  ) {
    throw new Error(
      beforeError?.message ??
        "World state could not be loaded.",
    );
  }

  const now =
    new Date().toISOString();

  const overrideUntil =
    automaticWeather &&
    overrideHours > 0
      ? new Date(
          submittedDate.getTime() +
            overrideHours *
              60 *
              60 *
              1000,
        ).toISOString()
      : null;

  /*
   * Staff choosing weather establishes
   * the new current spell. Automatic
   * weather can then resume after the
   * optional game-hour override.
   */
  const nextWeatherChange =
    automaticWeather
      ? new Date(
          submittedDate.getTime() +
            (2 +
              Math.random() * 2) *
              60 *
              60 *
              1000,
        ).toISOString()
      : null;

  const next = {
    game_datetime:
      submittedDate.toISOString(),
    automatic_time:
      automaticTime,
    time_scale: timeScale,

    weather,
    weather_intensity:
      intensity,
    temperature_c:
      Math.round(
        temperature,
      ),

    automatic_weather:
      automaticWeather,
    weather_override_until_game:
      overrideUntil,
    next_weather_change_game:
      nextWeatherChange,
    weather_last_changed_game:
      submittedDate.toISOString(),

    updated_at: now,
  };

  const { error } =
    await supabase
      .from("world_state")
      .update(next)
      .eq("id", "aureth");

  if (error) {
    throw new Error(
      `Unable to update world state: ${error.message}`,
    );
  }

  await supabase
    .from("world_state_history")
    .insert({
      changed_by: staff.userId,
      previous_state:
        before,
      new_state: {
        ...next,
        source: "staff",
        override_hours:
          overrideHours,
      },
    });

  revalidatePath("/", "layout");

  redirect(
    "/admin/world?saved=1",
  );
}
