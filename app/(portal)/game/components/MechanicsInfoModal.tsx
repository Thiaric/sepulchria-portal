"use client"

import { useEffect, type ReactNode } from "react";

export function MechanicsInfoModal({
  open,title,subtitle,onClose,children,
}:{
  open:boolean;
  title:string;
  subtitle?:string;
  onClose:()=>void;
  children:ReactNode;
}) {
  useEffect(()=>{
    if(!open)return;
    const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose()};
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[open,onClose]);

  if(!open)return null;

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}
    >
      <div className="min-h-[80dvh] max-h-[82dvh] w-full max-w-2xl overflow-hidden border border-[rgb(var(--sep-colour-765937))]/75 bg-[rgb(var(--sep-colour-100c09))] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[rgb(var(--sep-colour-60482e))]/40 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-[7px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">Information</p>
            <h3 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-e6cfaa))]">{title}</h3>
            {subtitle?<p className="mt-1 text-[9px] leading-4 text-[rgb(var(--sep-colour-8f8271))]">{subtitle}</p>:null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close information"
            className="shrink-0 border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-17110d))] px-2.5 py-1.5 text-sm leading-none text-[rgb(var(--sep-colour-bda77f))] transition hover:border-[rgb(var(--sep-colour-987344))] hover:text-[rgb(var(--sep-colour-efd6a8))]"
          >x</button>
        </div>
        <div className="min-h-[80dvh] max-h-[calc(82dvh-92px)] overflow-y-auto p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}
