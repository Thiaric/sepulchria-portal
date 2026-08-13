import { requireStaff } from "@/lib/auth/require-staff";
import { getWorldState } from "@/lib/world/get-world-state";
import { getLunarPhase } from "@/lib/world/lunar";
import { AdminLondonClock } from "@/components/world/admin-london-clock";
import { resetWeatherOverride, updateWorldState } from "./actions";

const WEATHER=["clear","partly_cloudy","cloudy","overcast","fog","drizzle","rain","heavy_rain","storm","snow","heavy_snow","hail"] as const;

function seasonFor(date:Date){
  const m=date.getMonth()+1;
  if(m>=3&&m<=5)return"Spring";
  if(m>=6&&m<=8)return"Summer";
  if(m>=9&&m<=11)return"Autumn";
  return"Winter";
}
function phaseFor(date:Date){
  const h=date.getHours();
  if(h<5)return"Night"; if(h<7)return"Dawn"; if(h<18)return"Day"; if(h<20)return"Dusk"; return"Night";
}

export default async function Page({searchParams}:{searchParams:Promise<{saved?:string;weatherReset?:string}>}){
  await requireStaff();
  const state=await getWorldState();
  const {saved,weatherReset}=await searchParams;
  const gameDate=new Date(state.game_datetime);
  const lunar=getLunarPhase(gameDate);

  return <main className="p-5 sm:p-7 lg:p-9">
    <div className="mx-auto max-w-5xl">
      <p className="text-[9px] uppercase tracking-[0.28em] text-[#8c704b]">World control</p>
      <h2 className="mt-2 font-serif text-3xl text-[#e2cda4]">Time &amp; weather</h2>
      <p className="mt-3 text-sm leading-7 text-[#a99b89]">
        Aureth can run its own calendar, lunar cycle, seasonal weather and temperature.
        Staff may still impose temporary or permanent conditions whenever a plot requires them.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-5">
        <Fact label="Season" value={seasonFor(gameDate)}/>
        <Fact label="Time of day" value={phaseFor(gameDate)}/>
        <Fact label="Moon" value={`${lunar.symbol} ${lunar.name}`}/>
        <Fact label="Weather engine" value={state.automatic_weather?(state.weather_override_until_game?"Automatic · held":"Automatic"):"Staff controlled"}/>
        <Fact label="Temperature" value={state.automatic_temperature?`${state.temperature_c}°C · Auto`:`${state.temperature_c}°C · Staff`}/>
      </div>

      {saved?<p className="mt-5 border border-[#42624a] bg-[#122019] p-3 text-sm text-[#9fd0a9]">World state updated.</p>:null}
      {weatherReset?<p className="mt-5 border border-[#42624a] bg-[#122019] p-3 text-sm text-[#9fd0a9]">Staff weather cleared. Automatic weather has resumed.</p>:null}

      <form action={updateWorldState} className="mt-7 grid gap-5 lg:grid-cols-2">
        <section className="border border-[#60482e]/45 bg-[#15100d] p-6">
          <h3 className="font-serif text-xl text-[#e2cda4]">World clock</h3>
          <AdminLondonClock/>
          <label className="mt-5 flex gap-3 text-sm text-[#b8a58a]">
            <input name="automaticTime" type="checkbox" defaultChecked={state.automatic_time}/>
            Keep time moving automatically
          </label>
          <label className="mt-5 block text-xs text-[#9a815f]">Time scale
            <select name="timeScale" defaultValue={String(state.time_scale)} className="mt-2 w-full border border-[#60482e] bg-[#0f0b09] p-3 text-[#e1cba3]">
              <option value="0">Paused</option><option value=".5">0.5×</option><option value="1">1× real time</option>
              <option value="2">2×</option><option value="4">4×</option><option value="8">8×</option><option value="12">12×</option><option value="24">24×</option>
            </select>
          </label>
          <div className="mt-5 border border-[#60482e]/35 bg-[#100c09] p-4">
            <p className="text-[8px] uppercase tracking-[0.2em] text-[#806b50]">Lunar cycle</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-3xl">{lunar.symbol}</span>
              <div><p className="font-serif text-base text-[#dfc79c]">{lunar.name}</p>
              <p className="text-[9px] text-[#796d5e]">{lunar.illumination}% illuminated · day {lunar.ageDays} of the cycle</p></div>
            </div>
          </div>
        </section>

        <section className="border border-[#60482e]/45 bg-[#15100d] p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="font-serif text-xl text-[#e2cda4]">Weather</h3>
              <p className="mt-2 max-w-md text-xs leading-6 text-[#897b69]">Automatic weather uses season, game time, current conditions and temperature to choose believable transitions.</p>
            </div>
            <button type="submit" formAction={resetWeatherOverride}
              className="border border-[#79513f] bg-[#241411] px-3 py-2 text-[8px] uppercase tracking-[0.16em] text-[#d29b86] transition hover:border-[#a66e55] hover:bg-[#351b16] hover:text-[#efb9a2]">
              Reset to automatic
            </button>
          </div>

          <label className="mt-5 flex gap-3 border border-[#60482e]/40 bg-[#100c09] p-4 text-sm text-[#c7b394]">
            <input name="automaticWeather" type="checkbox" defaultChecked={state.automatic_weather}/>
            <span><strong className="block font-normal text-[#dfc79c]">Automatic weather</strong>
            <span className="mt-1 block text-xs leading-5 text-[#847766]">When enabled, Sepulchria&apos;s weather evolves without staff intervention.</span></span>
          </label>

          {state.weather_override_until_game?<div className="mt-4 border border-[#76543c]/45 bg-[#1d130f] p-3">
            <p className="text-[8px] uppercase tracking-[0.18em] text-[#a77b58]">Staff weather currently active</p>
            <p className="mt-1 text-[10px] leading-5 text-[#9b8975]">Use “Reset to automatic” to end the staff hold immediately and let the simulation choose the weather again.</p>
          </div>:null}

          <label className="mt-5 block text-xs text-[#9a815f]">Current / staff-selected conditions
            <select name="weather" defaultValue={state.weather} className="mt-2 w-full border border-[#60482e] bg-[#0f0b09] p-3 text-[#e1cba3]">
              {WEATHER.map(w=><option key={w} value={w}>{w.replaceAll("_"," ")}</option>)}
            </select>
          </label>
          <label className="mt-5 block text-xs text-[#9a815f]">Intensity
            <select name="weatherIntensity" defaultValue={state.weather_intensity} className="mt-2 w-full border border-[#60482e] bg-[#0f0b09] p-3 text-[#e1cba3]">
              <option value="light">Light</option><option value="moderate">Moderate</option><option value="heavy">Heavy</option>
            </select>
          </label>
          <label className="mt-5 block text-xs text-[#9a815f]">Hold this staff weather for
            <select name="overrideHours" defaultValue="0" className="mt-2 w-full border border-[#60482e] bg-[#0f0b09] p-3 text-[#e1cba3]">
              <option value="0">No override — simulation may continue normally</option>
              <option value="1">1 game hour</option><option value="3">3 game hours</option><option value="6">6 game hours</option><option value="12">12 game hours</option>
            </select>
          </label>
        </section>

        <section className="border border-[#60482e]/45 bg-[#15100d] p-6 lg:col-span-2">
          <div className="grid gap-5 lg:grid-cols-2">
            <div><h3 className="font-serif text-xl text-[#e2cda4]">Temperature</h3>
              <p className="mt-2 text-xs leading-6 text-[#897b69]">Automatic temperature reacts to season, game time and current weather. It advances independently from weather changes.</p>
              <label className="mt-5 flex gap-3 border border-[#60482e]/40 bg-[#100c09] p-4 text-sm text-[#c7b394]">
                <input name="automaticTemperature" type="checkbox" defaultChecked={state.automatic_temperature}/>
                <span><strong className="block font-normal text-[#dfc79c]">Automatic temperature</strong>
                <span className="mt-1 block text-xs leading-5 text-[#847766]">Keep temperature moving naturally even while staff temporarily holds the weather.</span></span>
              </label>
            </div>
            <div>
              <label className="block text-xs text-[#9a815f]">Current / staff-selected temperature °C
                <input name="temperatureC" type="number" min="-60" max="60" defaultValue={state.temperature_c} className="mt-2 w-full border border-[#60482e] bg-[#0f0b09] p-3 text-[#e1cba3]"/>
              </label>
              <label className="mt-5 block text-xs text-[#9a815f]">Hold this staff temperature for
                <select name="temperatureOverrideHours" defaultValue="0" className="mt-2 w-full border border-[#60482e] bg-[#0f0b09] p-3 text-[#e1cba3]">
                  <option value="0">No override — keep automatic temperature</option>
                  <option value="1">1 game hour</option><option value="3">3 game hours</option><option value="6">6 game hours</option><option value="12">12 game hours</option>
                </select>
              </label>
              <p className="mt-3 text-[10px] leading-5 text-[#746a5d]">To keep a staff temperature indefinitely, turn Automatic temperature off.</p>
            </div>
          </div>
        </section>

        <section className="border border-[#60482e]/45 bg-[#100c09] p-5 lg:col-span-2">
          <p className="text-[8px] uppercase tracking-[0.22em] text-[#876a46]">Simulation behaviour</p>
          <p className="mt-3 text-xs leading-6 text-[#8f8271]">Weather and temperature continue to use the existing seasonal simulation. The lunar phase now follows the same in-game calendar and therefore advances automatically with world time.</p>
        </section>

        <button className="border border-[#987344] bg-[#3b2919] px-6 py-4 text-[10px] uppercase tracking-[0.2em] text-[#efd6a8] transition hover:border-[#b98c50] hover:bg-[#50371f] lg:col-span-2">Apply world state</button>
      </form>
    </div>
  </main>;
}

function Fact({label,value}:{label:string;value:string}){
  return <div className="border border-[#60482e]/45 bg-[#15100d] p-4">
    <p className="text-[8px] uppercase tracking-[0.2em] text-[#806b50]">{label}</p>
    <p className="mt-2 font-serif text-lg text-[#ddc69d]">{value}</p>
  </div>;
}
