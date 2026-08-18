"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type SavedAdminState = { pathname:string; scrollX:number; scrollY:number; openDetails:string[]; activeField:string|null };
type PendingAdminAction = { pathname:string; buttonText:string; hiddenFields:Array<{name:string;value:string}> };

const STORAGE_KEY = "sepulchria-admin-interaction-state";
const ACTION_KEY = "sepulchria-admin-pending-action";
const DATA_CHANGED_EVENT = "sepulchria:admin-data-changed";

function detailKey(details:HTMLDetailsElement,index:number) {
  if (details.id) return `id:${details.id}`;
  const hiddenId=details.querySelector<HTMLInputElement>('input[type="hidden"][name$="Id"], input[type="hidden"][name$="_id"], input[type="hidden"][name="id"]');
  if (hiddenId?.value) return `hidden:${hiddenId.name}:${hiddenId.value}`;
  return `index:${index}`;
}

function captureState() {
  const details=Array.from(document.querySelectorAll<HTMLDetailsElement>("details"));
  const active=document.activeElement;
  const activeField=active instanceof HTMLInputElement||active instanceof HTMLTextAreaElement||active instanceof HTMLSelectElement ? active.name||active.id||null : null;
  const state:SavedAdminState={pathname:window.location.pathname,scrollX:window.scrollX,scrollY:window.scrollY,openDetails:details.map((entry,index)=>({entry,key:detailKey(entry,index)})).filter(({entry})=>entry.open).map(({key})=>key),activeField};
  sessionStorage.setItem(STORAGE_KEY,JSON.stringify(state));
}

function restoreState() {
  const raw=sessionStorage.getItem(STORAGE_KEY); if(!raw)return;
  let state:SavedAdminState|null=null;
  try{state=JSON.parse(raw) as SavedAdminState}catch{sessionStorage.removeItem(STORAGE_KEY);return}
  if(!state||state.pathname!==window.location.pathname)return;
  const wanted=new Set(state.openDetails);
  Array.from(document.querySelectorAll<HTMLDetailsElement>("details")).forEach((entry,index)=>{entry.open=wanted.has(detailKey(entry,index));});
  window.scrollTo({left:state.scrollX,top:state.scrollY,behavior:"instant"});
  if(state.activeField){const fields=Array.from(document.querySelectorAll<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>("input, textarea, select"));fields.find((field)=>field.name===state!.activeField||field.id===state!.activeField)?.focus({preventScroll:true});}
}

function pendingLabel(text:string){const value=text.trim().toLowerCase();if(value.includes("delete")||value.includes("remove"))return "Deleting...";if(value.includes("create")||value.includes("publish")||value.includes("add"))return "Creating...";if(value.includes("assign"))return "Assigning...";if(value.includes("hide")||value.includes("show")||value.includes("toggle"))return "Updating...";return "Saving...";}

function hiddenFingerprint(form:HTMLFormElement){return Array.from(form.querySelectorAll<HTMLInputElement>('input[type="hidden"]')).filter((input)=>input.name&&input.value&&!input.name.startsWith("$ACTION_")).slice(0,5).map((input)=>({name:input.name,value:input.value}));}

function findActionForm(pending:PendingAdminAction){const forms=Array.from(document.querySelectorAll<HTMLFormElement>(".admin-compact form"));if(pending.hiddenFields.length){const exact=forms.find((form)=>pending.hiddenFields.every(({name,value})=>Array.from(form.querySelectorAll<HTMLInputElement>(`input[type="hidden"][name="${CSS.escape(name)}"]`)).some((input)=>input.value===value)));if(exact)return exact;}return forms.find((form)=>Array.from(form.querySelectorAll<HTMLButtonElement>('button[type="submit"], button:not([type])')).some((button)=>(button.textContent??"").trim()===pending.buttonText))??null;}

function clearFeedback(form:HTMLFormElement){form.querySelectorAll("[data-admin-action-feedback]").forEach((node)=>node.remove());}

function showFeedback(pending:PendingAdminAction,type:"success"|"error",message:string){const form=findActionForm(pending);if(!form)return;clearFeedback(form);const buttons=Array.from(form.querySelectorAll<HTMLButtonElement>('button[type="submit"], button:not([type])'));const button=buttons.find((candidate)=>(candidate.dataset.adminOriginalText??candidate.textContent??"").trim()===pending.buttonText)??buttons[buttons.length-1]??null;if(!button)return;const feedback=document.createElement("span");feedback.dataset.adminActionFeedback="true";feedback.setAttribute("role",type==="error"?"alert":"status");feedback.textContent=type==="success"?`✓ ${message}`:`✕ ${message}`;feedback.className=type==="success"?"mr-3 inline-flex min-h-9 flex-1 items-center justify-end text-right text-[10px] leading-5 text-[#9fd0a9]":"mr-3 inline-flex min-h-9 flex-1 items-center justify-end text-right text-[10px] leading-5 text-[#d8a49a]";button.parentElement?.insertBefore(feedback,button);window.setTimeout(()=>feedback.remove(),type==="success"?6000:10000);}

function finishPendingAction(){const raw=sessionStorage.getItem(ACTION_KEY);if(!raw)return;let pending:PendingAdminAction|null=null;try{pending=JSON.parse(raw) as PendingAdminAction}catch{sessionStorage.removeItem(ACTION_KEY);return}if(!pending||pending.pathname!==window.location.pathname)return;const params=new URLSearchParams(window.location.search);const success=params.get("success")??params.get("created");const error=params.get("error");if(!success&&!error)return;showFeedback(pending,error?"error":"success",error??(success==="1"?"Saved successfully.":success)??"Saved successfully.");sessionStorage.removeItem(ACTION_KEY);if(!error)window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT));params.delete("success");params.delete("error");params.delete("created");const nextSearch=params.toString();window.history.replaceState(window.history.state,"",`${window.location.pathname}${nextSearch?`?${nextSearch}`:""}${window.location.hash}`);}

export function AdminInteractionKeeper(){const pathname=usePathname();useEffect(()=>{if("scrollRestoration" in window.history)window.history.scrollRestoration="manual";const onSubmit=(event:SubmitEvent)=>{const form=event.target instanceof HTMLFormElement?event.target:null;if(!form||!form.closest(".admin-compact"))return;captureState();const submitter=event.submitter instanceof HTMLButtonElement?event.submitter:form.querySelector<HTMLButtonElement>('button[type="submit"]');if(!submitter)return;const originalText=(submitter.dataset.adminOriginalText??submitter.textContent??"Save").trim();submitter.dataset.adminOriginalText=originalText;sessionStorage.setItem(ACTION_KEY,JSON.stringify({pathname:window.location.pathname,buttonText:originalText,hiddenFields:hiddenFingerprint(form)} satisfies PendingAdminAction));submitter.disabled=true;submitter.setAttribute("aria-busy","true");submitter.textContent=pendingLabel(originalText);submitter.classList.add("cursor-wait","opacity-60");clearFeedback(form);};document.addEventListener("submit",onSubmit,true);const restoreAndFinish=()=>{restoreState();finishPendingAction();};const firstRestore=window.requestAnimationFrame(restoreAndFinish);let restoreFrame:number|null=null;const observer=new MutationObserver(()=>{if(restoreFrame!==null)window.cancelAnimationFrame(restoreFrame);restoreFrame=window.requestAnimationFrame(()=>{restoreAndFinish();restoreFrame=null;});});observer.observe(document.body,{childList:true,subtree:true});return()=>{document.removeEventListener("submit",onSubmit,true);window.cancelAnimationFrame(firstRestore);if(restoreFrame!==null)window.cancelAnimationFrame(restoreFrame);observer.disconnect();};},[pathname]);return null;}
