import { AdminLondonClock } from "@/components/world/admin-london-clock";
import { requireStaff } from "@/lib/auth/require-staff";
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
  await requireStaff();

  const state = await getWorldState();
  const { saved, weatherReset } = await searchParams;
  const gameDate = new Date(state.game_datetime);
  const lunar = getLunarPhase(gameDate);
  const hasStoredClimate = Boolean(state.climate_override_snapshot);

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-5xl">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))]">
          World control
        </p>

        <h2 className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-e2cda4))]">
          Time &amp; weather
        </h2>

        <p className="mt-3 text-sm leading-7 text-[rgb(var(--sep-colour-a99b89))]">
          {formatAurethDate(gameDate)}. Temporary staff climate changes
          remember the world exactly as it was before the override and restore
          that state when the override expires or when staff resets it.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-5">
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
          <p className="mt-5 border border-[rgb(var(--sep-colour-42624a))] bg-[rgb(var(--sep-colour-122019))] p-3 text-sm text-[rgb(var(--sep-colour-9fd0a9))]">
            World state updated.
          </p>
        ) : null}

        {weatherReset === "1" ? (
          <p className="mt-5 border border-[rgb(var(--sep-colour-42624a))] bg-[rgb(var(--sep-colour-122019))] p-3 text-sm text-[rgb(var(--sep-colour-9fd0a9))]">
            Temporary climate cancelled. The exact pre-override weather and
            temperature have been restored.
          </p>
        ) : null}

        {weatherReset === "empty" ? (
          <p className="mt-5 border border-[rgb(var(--sep-colour-6a573a))] bg-[rgb(var(--sep-colour-1b160e))] p-3 text-sm text-[rgb(var(--sep-colour-c5a978))]">
            There is no stored temporary climate to restore.
          </p>
        ) : null}

        <form
          action={updateWorldState}
          className="mt-7 grid gap-5 lg:grid-cols-2"
        >
          <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-6">
            <h3 className="font-serif text-xl text-[rgb(var(--sep-colour-e2cda4))]">
              World clock
            </h3>

            <AdminLondonClock />

            <label className="mt-5 flex gap-3 text-sm text-[rgb(var(--sep-colour-b8a58a))]">
              <input
                name="automaticTime"
                type="checkbox"
                defaultChecked={state.automatic_time}
              />
              Keep time moving automatically
            </label>

            <label className="mt-5 block text-xs text-[rgb(var(--sep-colour-9a815f))]">
              Time scale
              <select
                name="timeScale"
                defaultValue={String(state.time_scale)}
                className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0f0b09))] p-3 text-[rgb(var(--sep-colour-e1cba3))]"
              >
                <option value="0">Paused</option>
                <option value=".5">0.5×</option>
                <option value="1">1× real time</option>
                <option value="2">2×</option>
                <option value="4">4×</option>
                <option value="8">8×</option>
                <option value="12">12×</option>
                <option value="24">24×</option>
              </select>
            </label>

            <div className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] p-4">
              <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))]">
                Aureth calendar
              </p>
              <p className="mt-2 font-serif text-base text-[rgb(var(--sep-colour-dfc79c))]">
                {formatAurethDate(gameDate)}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <img
    src={lunar.symbol}
    alt={lunar.name}
    className="mx-auto h-20 w-20 object-contain"
  />
                <div>
                  <p className="font-serif text-base text-[rgb(var(--sep-colour-dfc79c))]">
                    {lunar.name}
                  </p>
                  <p className="text-[9px] text-[rgb(var(--sep-colour-796d5e))]">
                    {lunar.illumination}% illuminated · day {lunar.ageDays} of
                    the cycle
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-serif text-xl text-[rgb(var(--sep-colour-e2cda4))]">
                  Weather
                </h3>
                <p className="mt-2 max-w-md text-xs leading-6 text-[rgb(var(--sep-colour-897b69))]">
                  A timed override stores the climate that existed immediately
                  before it. Reset restores that stored state rather than
                  generating new weather.
                </p>
              </div>

              <button
                type="submit"
                formAction={resetWeatherOverride}
                disabled={!hasStoredClimate}
                className="border border-[rgb(var(--sep-colour-79513f))] bg-[rgb(var(--sep-colour-241411))] px-3 py-2 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-d29b86))] transition hover:border-[rgb(var(--sep-colour-a66e55))] hover:bg-[rgb(var(--sep-colour-351b16))] hover:text-[rgb(var(--sep-colour-efb9a2))] disabled:cursor-not-allowed disabled:opacity-35"
              >
                Restore previous climate
              </button>
            </div>

            {hasStoredClimate ? (
              <div className="mt-4 border border-[rgb(var(--sep-colour-76543c))]/45 bg-[rgb(var(--sep-colour-1d130f))] p-3">
                <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-a77b58))]">
                  Previous climate safely stored
                </p>
                <p className="mt-1 text-[10px] leading-5 text-[rgb(var(--sep-colour-9b8975))]">
                  It will return automatically when the timed override expires,
                  or immediately if you use Restore previous climate.
                </p>
              </div>
            ) : null}

            <label className="mt-5 flex gap-3 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-100c09))] p-4 text-sm text-[rgb(var(--sep-colour-c7b394))]">
              <input
                name="automaticWeather"
                type="checkbox"
                defaultChecked={state.automatic_weather}
              />
              <span>
                <strong className="block font-normal text-[rgb(var(--sep-colour-dfc79c))]">
                  Automatic weather
                </strong>
                <span className="mt-1 block text-xs leading-5 text-[rgb(var(--sep-colour-847766))]">
                  Keep Sepulchria&apos;s normal weather simulation active.
                </span>
              </span>
            </label>

            <label className="mt-5 block text-xs text-[rgb(var(--sep-colour-9a815f))]">
              Current / staff-selected conditions
              <select
                name="weather"
                defaultValue={state.weather}
                className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0f0b09))] p-3 text-[rgb(var(--sep-colour-e1cba3))]"
              >
                {WEATHER.map((weather) => (
                  <option key={weather} value={weather}>
                    {weather.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-5 block text-xs text-[rgb(var(--sep-colour-9a815f))]">
              Intensity
              <select
                name="weatherIntensity"
                defaultValue={state.weather_intensity}
                className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0f0b09))] p-3 text-[rgb(var(--sep-colour-e1cba3))]"
              >
                <option value="light">Light</option>
                <option value="moderate">Moderate</option>
                <option value="heavy">Heavy</option>
              </select>
            </label>

            <label className="mt-5 block text-xs text-[rgb(var(--sep-colour-9a815f))]">
              Hold this staff weather for
              <select
                name="overrideHours"
                defaultValue="0"
                className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0f0b09))] p-3 text-[rgb(var(--sep-colour-e1cba3))]"
              >
                <option value="0">No temporary override</option>
                <option value="1">1 game hour</option>
                <option value="3">3 game hours</option>
                <option value="6">6 game hours</option>
                <option value="12">12 game hours</option>
              </select>
            </label>
          </section>

          <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-6 lg:col-span-2">
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <h3 className="font-serif text-xl text-[rgb(var(--sep-colour-e2cda4))]">
                  Temperature
                </h3>
                <p className="mt-2 text-xs leading-6 text-[rgb(var(--sep-colour-897b69))]">
                  Temperature can be included in the same temporary climate
                  event. Its previous value is stored with the weather.
                </p>

                <label className="mt-5 flex gap-3 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-100c09))] p-4 text-sm text-[rgb(var(--sep-colour-c7b394))]">
                  <input
                    name="automaticTemperature"
                    type="checkbox"
                    defaultChecked={state.automatic_temperature}
                  />
                  <span>
                    <strong className="block font-normal text-[rgb(var(--sep-colour-dfc79c))]">
                      Automatic temperature
                    </strong>
                    <span className="mt-1 block text-xs leading-5 text-[rgb(var(--sep-colour-847766))]">
                      Keep natural temperature progression enabled outside
                      temporary overrides.
                    </span>
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-xs text-[rgb(var(--sep-colour-9a815f))]">
                  Current / staff-selected temperature °C
                  <input
                    name="temperatureC"
                    type="number"
                    min="-60"
                    max="60"
                    defaultValue={state.temperature_c}
                    className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0f0b09))] p-3 text-[rgb(var(--sep-colour-e1cba3))]"
                  />
                </label>

                <label className="mt-5 block text-xs text-[rgb(var(--sep-colour-9a815f))]">
                  Hold this staff temperature for
                  <select
                    name="temperatureOverrideHours"
                    defaultValue="0"
                    className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0f0b09))] p-3 text-[rgb(var(--sep-colour-e1cba3))]"
                  >
                    <option value="0">No temporary override</option>
                    <option value="1">1 game hour</option>
                    <option value="3">3 game hours</option>
                    <option value="6">6 game hours</option>
                    <option value="12">12 game hours</option>
                  </select>
                </label>
              </div>
            </div>
          </section>

          <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] p-5 lg:col-span-2">
            <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-876a46))]">
              Temporary override example
            </p>
            <p className="mt-3 text-xs leading-6 text-[rgb(var(--sep-colour-8f8271))]">
              If the world is Clear at 24°C and staff imposes Snow at 5°C for
              one game hour, Clear at 24°C is stored first. At expiry—or when
              Restore previous climate is pressed—the stored Clear at 24°C
              state returns exactly.
            </p>
          </section>

          <button className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-6 py-4 text-[10px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))] lg:col-span-2">
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
    <div className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4">
      <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))]">
        {label}
      </p>
      <p className="mt-2 font-serif text-lg text-[rgb(var(--sep-colour-ddc69d))]">
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
    <div className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4">
      <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))]">
        {label}
      </p>

      <div className="mt-2 flex items-center gap-3">
        <img
          src={image}
          alt={value}
          width={34}
          height={34}
          className="block h-[34px] w-[34px] shrink-0 object-contain"
        />

        <p className="font-serif text-lg capitalize text-[rgb(var(--sep-colour-ddc69d))]">
          {value}
        </p>
      </div>
    </div>
  );
}
