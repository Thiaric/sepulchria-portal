

import { AdminLondonClock } from "@/components/world/admin-london-clock";
import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import {
  formatAurethDate,
} from "@/lib/world/calendar";
import { getWorldState } from "@/lib/world/get-world-state";
import { getLunarPhase } from "@/lib/world/lunar";
import {
  resetWeatherOverride,
  updateWorldState,
} from "./actions";

const WEATHER = [
  "clear", "partly_cloudy", "cloudy", "overcast", "fog", "drizzle",
  "rain", "heavy_rain", "storm", "snow", "heavy_snow", "hail",
] as const;

const WEATHER_ICONS: Record<string, string> = {
  clear: "/icons/weather/clear.png",
  partly_cloudy: "/icons/weather/partly-cloudy.png",
  cloudy: "/icons/weather/cloudy.png",
  overcast: "/icons/weather/overcast.png",
  fog: "/icons/weather/fog.png",
  drizzle: "/icons/weather/drizzle.png",
  rain: "/icons/weather/rain.png",
  heavy_rain: "/icons/weather/heavy-rain.png",
  storm: "/icons/weather/storm.png",
  snow: "/icons/weather/snow.png",
  heavy_snow: "/icons/weather/heavy-snow.png",
  hail: "/icons/weather/hail.png",
};

function seasonFor(date: Date) {
  const month = date.getUTCMonth() + 1;
  if (month >= 3 && month <= 5) return "Spring";
  if (month >= 6 && month <= 8) return "Summer";
  if (month >= 9 && month <= 11) return "Autumn";
  return "Winter";
}

function phaseFor(date: Date) {
  const hour = date.getUTCHours();
  if (hour < 5) return "Night";
  if (hour < 7) return "Dawn";
  if (hour < 18) return "Day";
  if (hour < 20) return "Dusk";
  return "Night";
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    weatherReset?: string;
  }>;
}) {
  await requireAdminSection("world");

  const state = await getWorldState();
  const { saved, weatherReset } = await searchParams;
  const gameDate = new Date(state.game_datetime);
  const lunar = getLunarPhase(gameDate);
  const hasStoredClimate = Boolean(state.climate_override_snapshot);

  return (
    <main className="p-5 sm:p-7 lg:p-9 admin_world_page_main_main">
      <div className="mx-auto max-w-5xl admin_world_page_div_time_amp_weather">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))] admin_world_page_p_time_amp_weather">
          World control
        </p>

        <h2 className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-e2cda4))] admin_world_page_h2_time_amp_weather">
          Time &amp; weather
        </h2>

        <p className="mt-3 text-sm leading-7 text-[rgb(var(--sep-colour-a99b89))] admin_world_page_p_time_amp_weather_2">
          {formatAurethDate(gameDate)}. Temporary staff climate changes
          remember the world exactly as it was before the override and restore
          that state when the override expires or when staff resets it.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-5 admin_world_page_div_time_amp_weather_2">
  <Fact
    label="Season"
    value={seasonFor(gameDate)}
  />

  <Fact
    label="Time of day"
    value={phaseFor(gameDate)}
  />

  <ImageFact
    label="Moon"
    value={lunar.name}
    image={lunar.symbol}
  />

  <ImageFact
    label="Weather"
    value={state.weather.replaceAll("_", " ")}
    image={
      WEATHER_ICONS[state.weather] ??
      "/icons/weather/clear.png"
    }
  />

  <Fact
    label="Temperature"
    value={
      state.temperature_override_until_game
        ? `${state.temperature_c}°C · Override`
        : state.automatic_temperature
          ? `${state.temperature_c}°C · Auto`
          : `${state.temperature_c}°C · Staff`
    }
  />
</div>

        {saved ? (
          <p className="mt-5 border border-[rgb(var(--sep-colour-42624a))] bg-[rgb(var(--sep-colour-122019))] p-3 text-sm text-[rgb(var(--sep-colour-9fd0a9))] admin_world_page_p_time_amp_weather_3">
            World state updated.
          </p>
        ) : null}

        {weatherReset === "1" ? (
          <p className="mt-5 border border-[rgb(var(--sep-colour-42624a))] bg-[rgb(var(--sep-colour-122019))] p-3 text-sm text-[rgb(var(--sep-colour-9fd0a9))] admin_world_page_p_time_amp_weather_4">
            Temporary climate cancelled. The exact pre-override weather and
            temperature have been restored.
          </p>
        ) : null}

        {weatherReset === "empty" ? (
          <p className="mt-5 border border-[rgb(var(--sep-colour-6a573a))] bg-[rgb(var(--sep-colour-1b160e))] p-3 text-sm text-[rgb(var(--sep-colour-c5a978))] admin_world_page_p_time_amp_weather_5">
            There is no stored temporary climate to restore.
          </p>
        ) : null}

        <form
          action={updateWorldState}
          className="mt-7 grid gap-5 lg:grid-cols-2 admin_world_page_form_update_world_state"
        >
          <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-6 admin_world_page_section_world_clock">
            <h3 className="font-serif text-xl text-[rgb(var(--sep-colour-e2cda4))] admin_world_page_h3_world_clock">
              World clock
            </h3>

            <AdminLondonClock />

            <label className="mt-5 flex gap-3 text-sm text-[rgb(var(--sep-colour-b8a58a))] admin_world_page_label_world_clock">
              <input className="admin_world_page_input_automatic_time"
                name="automaticTime"
                type="checkbox"
                defaultChecked={state.automatic_time}
              />
              Keep time moving automatically
            </label>

            <label className="mt-5 block text-xs text-[rgb(var(--sep-colour-9a815f))] admin_world_page_label_world_clock_2">
              Time scale
              <select
                name="timeScale"
                defaultValue={String(state.time_scale)}
                className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0f0b09))] p-3 text-[rgb(var(--sep-colour-e1cba3))] admin_world_page_select_time_scale"
              >
                <option className="admin_world_page_option_0" value="0">Paused</option>
                <option className="admin_world_page_option_5" value=".5">0.5×</option>
                <option className="admin_world_page_option_1" value="1">1× real time</option>
                <option className="admin_world_page_option_2" value="2">2×</option>
                <option className="admin_world_page_option_4" value="4">4×</option>
                <option className="admin_world_page_option_8" value="8">8×</option>
                <option className="admin_world_page_option_12" value="12">12×</option>
                <option className="admin_world_page_option_24" value="24">24×</option>
              </select>
            </label>

            <div className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] p-4 admin_world_page_div_world_clock">
              <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))] admin_world_page_p_world_clock">
                Aureth calendar
              </p>
              <p className="mt-2 font-serif text-base text-[rgb(var(--sep-colour-dfc79c))] admin_world_page_p_world_clock_2">
                {formatAurethDate(gameDate)}
              </p>
              <div className="mt-3 flex items-center gap-3 admin_world_page_div_world_clock_2">
                <img
    src={lunar.symbol}
    alt={lunar.name}
    className="mx-auto h-20 w-20 object-contain admin_world_page_img_world_clock"
  />
                <div className="admin_world_page_div_world_clock_3">
                  <p className="font-serif text-base text-[rgb(var(--sep-colour-dfc79c))] admin_world_page_p_world_clock_3">
                    {lunar.name}
                  </p>
                  <p className="text-[9px] text-[rgb(var(--sep-colour-796d5e))] admin_world_page_p_world_clock_4">
                    {lunar.illumination}% illuminated · day {lunar.ageDays} of
                    the cycle
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-6 admin_world_page_section_intensity">
            <div className="flex flex-wrap items-start justify-between gap-3 admin_world_page_div_intensity">
              <div className="admin_world_page_div_weather">
                <h3 className="font-serif text-xl text-[rgb(var(--sep-colour-e2cda4))] admin_world_page_h3_weather">
                  Weather
                </h3>
                <p className="mt-2 max-w-md text-xs leading-6 text-[rgb(var(--sep-colour-897b69))] admin_world_page_p_weather">
                  A timed override stores the climate that existed immediately
                  before it. Reset restores that stored state rather than
                  generating new weather.
                </p>
              </div>

              <button
                type="submit"
                formAction={resetWeatherOverride}
                disabled={!hasStoredClimate}
                className="border border-[rgb(var(--sep-colour-79513f))] bg-[rgb(var(--sep-colour-241411))] px-3 py-2 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-d29b86))] transition hover:border-[rgb(var(--sep-colour-a66e55))] hover:bg-[rgb(var(--sep-colour-351b16))] hover:text-[rgb(var(--sep-colour-efb9a2))] disabled:cursor-not-allowed disabled:opacity-35 admin_world_page_button_restore_previous_climate"
              >
                Restore previous climate
              </button>
            </div>

            {hasStoredClimate ? (
              <div className="mt-4 border border-[rgb(var(--sep-colour-76543c))]/45 bg-[rgb(var(--sep-colour-1d130f))] p-3 admin_world_page_div_intensity_2">
                <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-a77b58))] admin_world_page_p_text">
                  Previous climate safely stored
                </p>
                <p className="mt-1 text-[10px] leading-5 text-[rgb(var(--sep-colour-9b8975))] admin_world_page_p_text_2">
                  It will return automatically when the timed override expires,
                  or immediately if you use Restore previous climate.
                </p>
              </div>
            ) : null}

            <label className="mt-5 flex gap-3 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-100c09))] p-4 text-sm text-[rgb(var(--sep-colour-c7b394))] admin_world_page_label_intensity">
              <input className="admin_world_page_input_automatic_weather"
                name="automaticWeather"
                type="checkbox"
                defaultChecked={state.automatic_weather}
              />
              <span className="admin_world_page_span_intensity">
                <strong className="block font-normal text-[rgb(var(--sep-colour-dfc79c))] admin_world_page_strong_intensity">
                  Automatic weather
                </strong>
                <span className="mt-1 block text-xs leading-5 text-[rgb(var(--sep-colour-847766))] admin_world_page_span_intensity_2">
                  Keep Sepulchria&apos;s normal weather simulation active.
                </span>
              </span>
            </label>

            <label className="mt-5 block text-xs text-[rgb(var(--sep-colour-9a815f))] admin_world_page_label_intensity_2">
              Current / staff-selected conditions
              <select
                name="weather"
                defaultValue={state.weather}
                className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0f0b09))] p-3 text-[rgb(var(--sep-colour-e1cba3))] admin_world_page_select_weather"
              >
                {WEATHER.map((weather) => (
                  <option className="admin_world_page_option_option" key={weather} value={weather}>
                    {weather.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-5 block text-xs text-[rgb(var(--sep-colour-9a815f))] admin_world_page_label_intensity_3">
              Intensity
              <select
                name="weatherIntensity"
                defaultValue={state.weather_intensity}
                className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0f0b09))] p-3 text-[rgb(var(--sep-colour-e1cba3))] admin_world_page_select_weather_intensity"
              >
                <option className="admin_world_page_option_light" value="light">Light</option>
                <option className="admin_world_page_option_moderate" value="moderate">Moderate</option>
                <option className="admin_world_page_option_heavy" value="heavy">Heavy</option>
              </select>
            </label>

            <label className="mt-5 block text-xs text-[rgb(var(--sep-colour-9a815f))] admin_world_page_label_intensity_4">
              Hold this staff weather for
              <select
                name="overrideHours"
                defaultValue="0"
                className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0f0b09))] p-3 text-[rgb(var(--sep-colour-e1cba3))] admin_world_page_select_override_hours"
              >
                <option className="admin_world_page_option_0_2" value="0">No temporary override</option>
                <option className="admin_world_page_option_1_2" value="1">1 game hour</option>
                <option className="admin_world_page_option_3" value="3">3 game hours</option>
                <option className="admin_world_page_option_6" value="6">6 game hours</option>
                <option className="admin_world_page_option_12_2" value="12">12 game hours</option>
              </select>
            </label>
          </section>

          <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-6 lg:col-span-2 admin_world_page_section_time_amp_weather">
            <div className="grid gap-5 lg:grid-cols-2 admin_world_page_div_time_amp_weather_3">
              <div className="admin_world_page_div_temperature">
                <h3 className="font-serif text-xl text-[rgb(var(--sep-colour-e2cda4))] admin_world_page_h3_temperature">
                  Temperature
                </h3>
                <p className="mt-2 text-xs leading-6 text-[rgb(var(--sep-colour-897b69))] admin_world_page_p_temperature">
                  Temperature can be included in the same temporary climate
                  event. Its previous value is stored with the weather.
                </p>

                <label className="mt-5 flex gap-3 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-100c09))] p-4 text-sm text-[rgb(var(--sep-colour-c7b394))] admin_world_page_label_temperature">
                  <input className="admin_world_page_input_automatic_temperature"
                    name="automaticTemperature"
                    type="checkbox"
                    defaultChecked={state.automatic_temperature}
                  />
                  <span className="admin_world_page_span_temperature">
                    <strong className="block font-normal text-[rgb(var(--sep-colour-dfc79c))] admin_world_page_strong_temperature">
                      Automatic temperature
                    </strong>
                    <span className="mt-1 block text-xs leading-5 text-[rgb(var(--sep-colour-847766))] admin_world_page_span_temperature_2">
                      Keep natural temperature progression enabled outside
                      temporary overrides.
                    </span>
                  </span>
                </label>
              </div>

              <div className="admin_world_page_div_hold_staff_temperature">
                <label className="block text-xs text-[rgb(var(--sep-colour-9a815f))] admin_world_page_label_hold_staff_temperature">
                  Current / staff-selected temperature °C
                  <input
                    name="temperatureC"
                    type="number"
                    min="-60"
                    max="60"
                    defaultValue={state.temperature_c}
                    className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0f0b09))] p-3 text-[rgb(var(--sep-colour-e1cba3))] admin_world_page_input_temperature_c"
                  />
                </label>

                <label className="mt-5 block text-xs text-[rgb(var(--sep-colour-9a815f))] admin_world_page_label_hold_staff_temperature_2">
                  Hold this staff temperature for
                  <select
                    name="temperatureOverrideHours"
                    defaultValue="0"
                    className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0f0b09))] p-3 text-[rgb(var(--sep-colour-e1cba3))] admin_world_page_select_temperature_override_hours"
                  >
                    <option className="admin_world_page_option_0_3" value="0">No temporary override</option>
                    <option className="admin_world_page_option_1_3" value="1">1 game hour</option>
                    <option className="admin_world_page_option_3_2" value="3">3 game hours</option>
                    <option className="admin_world_page_option_6_2" value="6">6 game hours</option>
                    <option className="admin_world_page_option_12_3" value="12">12 game hours</option>
                  </select>
                </label>
              </div>
            </div>
          </section>

          <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] p-5 lg:col-span-2 admin_world_page_section_time_amp_weather_2">
            <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-876a46))] admin_world_page_p_time_amp_weather_6">
              Temporary override example
            </p>
            <p className="mt-3 text-xs leading-6 text-[rgb(var(--sep-colour-8f8271))] admin_world_page_p_time_amp_weather_7">
              If the world is Clear at 24°C and staff imposes Snow at 5°C for
              one game hour, Clear at 24°C is stored first. At expiry—or when
              Restore previous climate is pressed—the stored Clear at 24°C
              state returns exactly.
            </p>
          </section>

          <button className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-6 py-4 text-[10px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))] lg:col-span-2 admin_world_page_button_apply_world_state">
            Apply world state
          </button>
        </form>
      </div>
    </main>
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
    <div className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4 admin_world_page_div_container">
      <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))] admin_world_page_p_text_3">
        {label}
      </p>
      <p className="mt-2 font-serif text-lg text-[rgb(var(--sep-colour-ddc69d))] admin_world_page_p_text_4">
        {value}
      </p>
    </div>
  );
}

function ImageFact({
  label,
  value,
  image,
}: {
  label: string;
  value: string;
  image: string;
}) {
  return (
    <div className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4 admin_world_page_div_container_2">
      <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))] admin_world_page_p_text_5">
        {label}
      </p>

      <div className="mt-2 flex items-center gap-3 admin_world_page_div_container_3">
        <img
          src={image}
          alt={value}
          width={34}
          height={34}
          className="block h-[34px] w-[34px] shrink-0 object-contain admin_world_page_img_image"
        />

        <p className="font-serif text-lg capitalize text-[rgb(var(--sep-colour-ddc69d))] admin_world_page_p_text_6">
          {value}
        </p>
      </div>
    </div>
  );
}
