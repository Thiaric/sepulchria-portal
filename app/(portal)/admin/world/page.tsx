import { requireStaff } from "@/lib/auth/require-staff";
import { getWorldState } from "@/lib/world/get-world-state";
import {
  updateWorldState,
} from "./actions";

const WEATHER = [
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
] as const;

function seasonFor(
  date: Date,
) {
  const month =
    date.getMonth() + 1;

  if (
    month >= 3 &&
    month <= 5
  ) {
    return "Spring";
  }

  if (
    month >= 6 &&
    month <= 8
  ) {
    return "Summer";
  }

  if (
    month >= 9 &&
    month <= 11
  ) {
    return "Autumn";
  }

  return "Winter";
}

function phaseFor(
  date: Date,
) {
  const hour = date.getHours();

  if (hour < 5) {
    return "Night";
  }

  if (hour < 7) {
    return "Dawn";
  }

  if (hour < 18) {
    return "Day";
  }

  if (hour < 20) {
    return "Dusk";
  }

  return "Night";
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
  }>;
}) {
  await requireStaff();

  const state =
    await getWorldState();

  const { saved } =
    await searchParams;

  const gameDate =
    new Date(
      state.game_datetime,
    );

  const season =
    seasonFor(gameDate);

  const phase =
    phaseFor(gameDate);

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-5xl">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[#8c704b]">
          World control
        </p>

        <h2 className="mt-2 font-serif text-3xl text-[#e2cda4]">
          Time & weather
        </h2>

        <p className="mt-3 text-sm leading-7 text-[#a99b89]">
          Aureth can run its own
          seasonal weather. Staff may
          still impose temporary
          conditions whenever a plot
          requires them.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <WorldFact
            label="Season"
            value={season}
          />

          <WorldFact
            label="Time of day"
            value={phase}
          />

          <WorldFact
            label="Weather engine"
            value={
              state.automatic_weather
                ? "Automatic"
                : "Staff controlled"
            }
          />
        </div>

        {saved ? (
          <p className="mt-5 border border-[#42624a] bg-[#122019] p-3 text-sm text-[#9fd0a9]">
            World state updated.
          </p>
        ) : null}

        <form
          action={updateWorldState}
          className="mt-7 grid gap-5 lg:grid-cols-2"
        >
          <section className="border border-[#60482e]/45 bg-[#15100d] p-6">
            <h3 className="font-serif text-xl text-[#e2cda4]">
              World clock
            </h3>

            <label className="mt-5 block text-xs text-[#9a815f]">
              Game date & time

              <input
                name="gameDatetime"
                type="datetime-local"
                defaultValue={
                  state.game_datetime.slice(
                    0,
                    16,
                  )
                }
                required
                className="mt-2 w-full border border-[#60482e] bg-[#0f0b09] p-3 text-[#e1cba3]"
              />
            </label>

            <label className="mt-5 flex gap-3 text-sm text-[#b8a58a]">
              <input
                name="automaticTime"
                type="checkbox"
                defaultChecked={
                  state.automatic_time
                }
              />

              Keep time moving
              automatically
            </label>

            <label className="mt-5 block text-xs text-[#9a815f]">
              Time scale

              <select
                name="timeScale"
                defaultValue={String(
                  state.time_scale,
                )}
                className="mt-2 w-full border border-[#60482e] bg-[#0f0b09] p-3 text-[#e1cba3]"
              >
                <option value="0">
                  Paused
                </option>
                <option value=".5">
                  0.5×
                </option>
                <option value="1">
                  1× real time
                </option>
                <option value="2">
                  2×
                </option>
                <option value="4">
                  4×
                </option>
                <option value="8">
                  8×
                </option>
                <option value="12">
                  12×
                </option>
                <option value="24">
                  24×
                </option>
              </select>
            </label>
          </section>

          <section className="border border-[#60482e]/45 bg-[#15100d] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-serif text-xl text-[#e2cda4]">
                  Weather
                </h3>

                <p className="mt-2 text-xs leading-6 text-[#897b69]">
                  Automatic weather uses
                  season, game time,
                  current conditions and
                  temperature to choose
                  believable transitions.
                </p>
              </div>
            </div>

            <label className="mt-5 flex gap-3 border border-[#60482e]/40 bg-[#100c09] p-4 text-sm text-[#c7b394]">
              <input
                name="automaticWeather"
                type="checkbox"
                defaultChecked={
                  state.automatic_weather
                }
              />

              <span>
                <strong className="block font-normal text-[#dfc79c]">
                  Automatic weather
                </strong>

                <span className="mt-1 block text-xs leading-5 text-[#847766]">
                  When enabled,
                  Sepulchria's weather
                  evolves without staff
                  intervention.
                </span>
              </span>
            </label>

            <label className="mt-5 block text-xs text-[#9a815f]">
              Current / staff-selected
              conditions

              <select
                name="weather"
                defaultValue={
                  state.weather
                }
                className="mt-2 w-full border border-[#60482e] bg-[#0f0b09] p-3 text-[#e1cba3]"
              >
                {WEATHER.map(
                  (weather) => (
                    <option
                      key={weather}
                      value={weather}
                    >
                      {weather.replaceAll(
                        "_",
                        " ",
                      )}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="mt-5 block text-xs text-[#9a815f]">
              Intensity

              <select
                name="weatherIntensity"
                defaultValue={
                  state.weather_intensity
                }
                className="mt-2 w-full border border-[#60482e] bg-[#0f0b09] p-3 text-[#e1cba3]"
              >
                <option value="light">
                  Light
                </option>
                <option value="moderate">
                  Moderate
                </option>
                <option value="heavy">
                  Heavy
                </option>
              </select>
            </label>

            <label className="mt-5 block text-xs text-[#9a815f]">
              Temperature °C

              <input
                name="temperatureC"
                type="number"
                min="-60"
                max="60"
                defaultValue={
                  state.temperature_c
                }
                className="mt-2 w-full border border-[#60482e] bg-[#0f0b09] p-3 text-[#e1cba3]"
              />
            </label>

            <label className="mt-5 block text-xs text-[#9a815f]">
              Hold this staff weather for

              <select
                name="overrideHours"
                defaultValue="0"
                className="mt-2 w-full border border-[#60482e] bg-[#0f0b09] p-3 text-[#e1cba3]"
              >
                <option value="0">
                  No override — simulation
                  may continue normally
                </option>
                <option value="1">
                  1 game hour
                </option>
                <option value="3">
                  3 game hours
                </option>
                <option value="6">
                  6 game hours
                </option>
                <option value="12">
                  12 game hours
                </option>
              </select>
            </label>
          </section>

          <section className="lg:col-span-2 border border-[#60482e]/45 bg-[#100c09] p-5">
            <p className="text-[8px] uppercase tracking-[0.22em] text-[#876a46]">
              Simulation behaviour
            </p>

            <p className="mt-3 text-xs leading-6 text-[#8f8271]">
              Spring favours showers,
              cloud and fog. Summer is
              warmer and clearer, with
              afternoon storms possible.
              Autumn favours cloud, rain
              and fog. Winter is colder,
              with rain converted to snow
              when temperatures permit.
              Dawn and night are cooler
              and more prone to fog;
              daytime is warmer.
            </p>
          </section>

          <button className="lg:col-span-2 border border-[#987344] bg-[#3b2919] px-6 py-4 text-[10px] uppercase tracking-[0.2em] text-[#efd6a8] transition hover:border-[#b98c50] hover:bg-[#50371f]">
            Apply world state
          </button>
        </form>
      </div>
    </main>
  );
}

function WorldFact({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border border-[#60482e]/45 bg-[#15100d] p-4">
      <p className="text-[8px] uppercase tracking-[0.2em] text-[#806b50]">
        {label}
      </p>

      <p className="mt-2 font-serif text-lg text-[#ddc69d]">
        {value}
      </p>
    </div>
  );
}
