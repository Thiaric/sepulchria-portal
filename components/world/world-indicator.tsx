"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useWorldState } from "@/components/world/world-state-provider";
import { getLunarPhase } from "@/lib/world/lunar";

const ZONE = "Europe/London";
const ICONS: Record<string,string> = {
  clear:"☀", partly_cloudy:"◐", cloudy:"☁", overcast:"☁",
  fog:"≋", drizzle:"☂", rain:"☂", heavy_rain:"☂",
  storm:"ϟ", snow:"❄", heavy_snow:"❄", hail:"◆",
};

function label(value:string) {
  return value.replaceAll("_"," ").replace(/\b\w/g,l=>l.toUpperCase());
}

function dateParts(date:Date) {
  const parts=new Intl.DateTimeFormat("en-GB",{
    timeZone:ZONE,year:"numeric",month:"numeric",day:"numeric"
  }).formatToParts(date);
  const n=(type:string)=>Number(parts.find(p=>p.type===type)?.value??0);
  return {year:n("year"),month:n("month"),day:n("day")};
}

function Calendar({date}:{date:Date}) {
  const {year,month,day}=dateParts(date);
  const first=new Date(Date.UTC(year,month-1,1,12)).getUTCDay();
  const count=new Date(Date.UTC(year,month,0,12)).getUTCDate();
  const cells:(number|null)[]=[
    ...Array.from({length:first},()=>null),
    ...Array.from({length:count},(_,i)=>i+1),
  ];
  while(cells.length%7) cells.push(null);
  const title=new Intl.DateTimeFormat("en-GB",{
    timeZone:ZONE,month:"long",year:"numeric"
  }).format(new Date(Date.UTC(year,month-1,15,12)));

  return <div>
    <p className="font-serif text-lg text-[#dfc79c]">{title}</p>
    <div className="mt-3 grid grid-cols-7 gap-px border border-[#60482e]/35 bg-[#60482e]/25">
      {["S","M","T","W","T","F","S"].map((x,i)=>
        <div key={`${x}-${i}`} className="bg-[#100c09] py-2 text-center text-[8px] text-[#796a56]">{x}</div>
      )}
      {cells.map((x,i)=>
        <div key={i} className={`flex aspect-square items-center justify-center bg-[#15100d] text-[10px] ${
          x===day ? "bg-[#2a1d12] font-semibold text-[#f0d39f] shadow-[inset_0_0_0_1px_#a67b45]" : "text-[#a99a85]"
        }`}>{x??""}</div>
      )}
    </div>
  </div>;
}

export function WorldIndicator() {
  const {state,gameDate}=useWorldState();
  const [open,setOpen]=useState(false);
  const [mounted,setMounted]=useState(false);
  useEffect(()=>setMounted(true),[]);
  useEffect(()=>{
    if(!open)return;
    const close=(e:KeyboardEvent)=>{if(e.key==="Escape")setOpen(false)};
    window.addEventListener("keydown",close);
    return()=>window.removeEventListener("keydown",close);
  },[open]);

  const time=useMemo(()=>new Intl.DateTimeFormat("en-GB",{
    timeZone:ZONE,hour:"2-digit",minute:"2-digit",hour12:false
  }).format(gameDate),[gameDate]);
  const shortDate=useMemo(()=>new Intl.DateTimeFormat("en-GB",{
    timeZone:ZONE,day:"2-digit",month:"short"
  }).format(gameDate),[gameDate]);
  const fullDate=useMemo(()=>new Intl.DateTimeFormat("en-GB",{
    timeZone:ZONE,weekday:"long",day:"numeric",month:"long",year:"numeric"
  }).format(gameDate),[gameDate]);
  const lunar=useMemo(()=>getLunarPhase(gameDate),[gameDate]);

  return <>
    <button type="button" onClick={()=>setOpen(true)}
      className="hidden h-10 items-center gap-2 border border-[#614b31] bg-[#17120f] px-3 text-[#c9aa79] transition hover:border-[#8d6b42] hover:bg-[#201711] md:flex"
      title={`${fullDate} · ${lunar.name} · ${label(state.weather)}`}
      aria-label="Open in-game calendar">
      <span>{ICONS[state.weather]??"◌"}</span>
      <span className="text-[9px] uppercase tracking-[0.15em]">{state.temperature_c}°C</span>
      <span>·</span>
      <span className="font-serif text-sm text-[#e0c89e]">{time}</span>
      <span className="hidden text-[#6f6252] xl:inline">·</span>
      <span className="hidden text-[9px] uppercase tracking-[0.12em] text-[#a38c69] xl:inline">{shortDate}</span>
      <span className="hidden text-[#6f6252] 2xl:inline">·</span>
      <span className="hidden text-base 2xl:inline">{lunar.symbol}</span>
    </button>

    {mounted&&open?createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
        <section role="dialog" aria-modal="true" className="relative w-full max-w-lg border border-[#765937]/70 bg-[#120d0a] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.85)] sm:p-6">
          <button type="button" onClick={()=>setOpen(false)}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center border border-[#60482e]/60 bg-[#17110f] text-[#c8a875]">×</button>
          <p className="text-[8px] uppercase tracking-[0.26em] text-[#886c48]">Aureth · World Calendar</p>
          <h2 className="mt-2 pr-10 font-serif text-2xl text-[#e2cda4]">{fullDate}</h2>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <Fact label="Time" value={time}/>
            <Fact label="Weather" value={label(state.weather)}/>
            <Fact label="Temperature" value={`${state.temperature_c}°C`}/>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_150px]">
            <Calendar date={gameDate}/>
            <div className="border border-[#60482e]/40 bg-[#100c09] p-4 text-center">
              <p className="text-[8px] uppercase tracking-[0.2em] text-[#806b50]">Lunar phase</p>
              <div className="mt-3 text-5xl leading-none">{lunar.symbol}</div>
              <p className="mt-3 font-serif text-base text-[#dfc79c]">{lunar.name}</p>
              <p className="mt-2 text-[9px] leading-4 text-[#827563]">{lunar.illumination}% illuminated</p>
              <p className="text-[9px] leading-4 text-[#6f6456]">Day {lunar.ageDays} of the lunar cycle</p>
            </div>
          </div>
          
        </section>
      </div>,document.body):null}
  </>;
}

function Fact({label:heading,value}:{label:string;value:string}) {
  return <div className="border border-[#60482e]/35 bg-[#15100d] p-3">
    <p className="text-[7px] uppercase tracking-[0.18em] text-[#776650]">{heading}</p>
    <p className="mt-1 truncate font-serif text-sm text-[#d8bd91]">{value}</p>
  </div>;
}
