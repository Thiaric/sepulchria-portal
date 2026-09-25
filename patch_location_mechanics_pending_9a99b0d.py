from pathlib import Path
import subprocess, sys, re

BASE = '9a99b0d1e05f650104da7e5d32d6119da374e82a'
files = {
 'room': Path('app/(portal)/game/components/RoomChatForm.tsx'),
 'feat': Path('app/(portal)/game/components/MechanicalFeatPanel.tsx'),
 'npc': Path('app/(portal)/game/components/NpcControlPanel.tsx'),
 'opposed': Path('app/(portal)/game/components/PendingOpposedActions.tsx'),
 'shape': Path('app/(portal)/game/components/PendingShapeResponses.tsx'),
}

def fail(msg):
 print('PATCH FAILED:', msg); sys.exit(1)

def once(text, old, new, label):
 c=text.count(old)
 if c!=1: fail(f'{label}: expected 1 match, found {c}')
 return text.replace(old,new,1)

head=subprocess.check_output(['git','rev-parse','HEAD'], text=True).strip()
if head!=BASE: fail(f'Patch is for {BASE}, current HEAD is {head}')
for p in files.values():
 if not p.exists(): fail(f'Missing {p}')

# RoomChatForm
p=files['room']; t=p.read_text(encoding='utf-8')
anchor='function SubmitButton({\n  disabled,\n  onPrepare,\n}: {'
helper='''function PendingActionButton({\n  label,\n  pendingLabel,\n  disabled = false,\n  formAction,\n  formNoValidate = false,\n  className,\n  title,\n  ariaLabel,\n}: {\n  label: ReactNode;\n  pendingLabel: ReactNode;\n  disabled?: boolean;\n  formAction?: string | ((formData: FormData) => void | Promise<void>);\n  formNoValidate?: boolean;\n  className: string;\n  title?: string;\n  ariaLabel?: string;\n}) {\n  const { pending } = useFormStatus();\n  return (\n    <button type="submit" formAction={formAction} formNoValidate={formNoValidate} disabled={disabled || pending} title={title} aria-label={ariaLabel} className={className}>\n      {pending ? pendingLabel : label}\n    </button>\n  );\n}\n\nfunction SubmitButton({\n  disabled,\n  onPrepare,\n}: {'''
t=once(t,anchor,helper,'insert room pending helper')
repls=[
('''                <button\n                  type="submit"\n                  disabled={!weaponTargetId && !weaponExternalTarget.trim()}\n                  className="border border-[rgb(var(--sep-colour-85653c))] bg-[rgb(var(--sep-colour-342617))] px-5 py-2.5 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd4a0))] transition hover:bg-[rgb(var(--sep-colour-4a351f))] disabled:cursor-not-allowed disabled:opacity-40 game_components_roomchatform_button_attack"\n                >\n                  Attack\n                </button>''','''                <PendingActionButton\n                  label="Attack"\n                  pendingLabel="Attacking..."\n                  disabled={!weaponTargetId && !weaponExternalTarget.trim()}\n                  className="border border-[rgb(var(--sep-colour-85653c))] bg-[rgb(var(--sep-colour-342617))] px-5 py-2.5 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd4a0))] transition hover:bg-[rgb(var(--sep-colour-4a351f))] disabled:cursor-not-allowed disabled:opacity-40 game_components_roomchatform_button_attack"\n                />''','weapon attack'),
('''              <button\n                type="submit"\n                className="mt-2 border border-[rgb(var(--sep-colour-85653c))] bg-[rgb(var(--sep-colour-342617))] px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-efd4a0))] game_components_roomchatform_button_unarmed_attack"\n              >\n                Unarmed Attack\n              </button>''','''              <PendingActionButton\n                label="Unarmed Attack"\n                pendingLabel="Attacking..."\n                className="mt-2 border border-[rgb(var(--sep-colour-85653c))] bg-[rgb(var(--sep-colour-342617))] px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-efd4a0))] disabled:cursor-not-allowed disabled:opacity-40 game_components_roomchatform_button_unarmed_attack"\n              />''','unarmed'),
('''              <button\n                type="submit"\n                className="mt-2 border border-[rgb(var(--sep-colour-85653c))] bg-[rgb(var(--sep-colour-342617))] px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-efd4a0))] game_components_roomchatform_button_roll_action"\n              >\n                Roll Action\n              </button>''','''              <PendingActionButton\n                label="Roll Action"\n                pendingLabel="Rolling..."\n                className="mt-2 border border-[rgb(var(--sep-colour-85653c))] bg-[rgb(var(--sep-colour-342617))] px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-efd4a0))] disabled:cursor-not-allowed disabled:opacity-40 game_components_roomchatform_button_roll_action"\n              />''','roll action'),
('''                  <button\n                    type="submit"\n                    formAction={giftUseAction}\n                    formNoValidate\n                    className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-21190f))] px-4 py-2.5 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d6bb8d))] transition hover:border-[rgb(var(--sep-colour-a17a49))] game_components_roomchatform_button_show_feat"\n                  >\n                    Show Feat\n                  </button>''','''                  <PendingActionButton label="Show Feat" pendingLabel="Showing..." formAction={giftUseAction} formNoValidate className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-21190f))] px-4 py-2.5 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d6bb8d))] transition hover:border-[rgb(var(--sep-colour-a17a49))] disabled:cursor-not-allowed disabled:opacity-40 game_components_roomchatform_button_show_feat" />''','show feat'),
('''                    <button\n                      type="submit"\n                      formAction={giftAction}\n                      formNoValidate\n                      disabled={\n                        selectedGift.targetMode === "other" &&\n                        !giftTargetId\n                      }\n                      className="border border-[rgb(var(--sep-colour-85653c))] bg-[rgb(var(--sep-colour-342617))] px-4 py-2.5 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-efd4a0))] transition hover:bg-[rgb(var(--sep-colour-4a351f))] game_components_roomchatform_button_activate_feat"\n                    >\n                      Activate Feat\n                    </button>''','''                    <PendingActionButton label="Activate Feat" pendingLabel="Activating..." formAction={giftAction} formNoValidate disabled={selectedGift.targetMode === "other" && !giftTargetId} className="border border-[rgb(var(--sep-colour-85653c))] bg-[rgb(var(--sep-colour-342617))] px-4 py-2.5 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-efd4a0))] transition hover:bg-[rgb(var(--sep-colour-4a351f))] disabled:cursor-not-allowed disabled:opacity-40 game_components_roomchatform_button_activate_feat" />''','activate feat'),
('''                  <button\n                    type="submit"\n                    formAction={giftUseAction}\n                    formNoValidate\n                    disabled={\n                      selectedGift.targetMode === "other" &&\n                      !giftTargetId\n                    }\n                    className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-21190f))] px-4 py-2.5 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d6bb8d))] transition hover:border-[rgb(var(--sep-colour-a17a49))] game_components_roomchatform_button_use_feat"\n                  >\n                    Use Feat\n                  </button>''','''                  <PendingActionButton label="Use Feat" pendingLabel="Using..." formAction={giftUseAction} formNoValidate disabled={selectedGift.targetMode === "other" && !giftTargetId} className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-21190f))] px-4 py-2.5 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d6bb8d))] transition hover:border-[rgb(var(--sep-colour-a17a49))] disabled:cursor-not-allowed disabled:opacity-40 game_components_roomchatform_button_use_feat" />''','use feat'),
]
for old,new,label in repls: t=once(t,old,new,label)
# item button regex to avoid giant exact block
pat=r'''<button\n                  type="submit"\n                  disabled=\{\n                    Boolean\([\s\S]*?\n                  className="border border-\[rgb\(var\(--sep-colour-85653c\)\)\] bg-\[rgb\(var\(--sep-colour-342617\)\)\] px-5 py-2\.5 text-\[9px\] uppercase tracking-\[0\.18em\] text-\[rgb\(var\(--sep-colour-efd4a0\)\)\] transition hover:bg-\[rgb\(var\(--sep-colour-4a351f\)\)\] disabled:cursor-not-allowed disabled:opacity-40 game_components_roomchatform_button_use_item"\n                >\n                  Use Item\n                </button>'''
m=re.search(pat,t)
if not m: fail('use item block not found')
old=m.group(0)
new=old.replace('<button\n                  type="submit"','<PendingActionButton\n                  label="Use Item"\n                  pendingLabel="Using..."').replace('\n                >\n                  Use Item\n                </button>','\n                />')
t=t.replace(old,new,1)
# take leave
old='''            <button\n              type="submit"\n              title="Take Leave"\n              aria-label="Take Leave"\n              className="flex h-6 w-6 items-center justify-center border border-[rgb(var(--sep-colour-8f3f36))] bg-[rgb(var(--sep-colour-351714))] text-[11px] text-[rgb(var(--sep-colour-e6a097))] transition hover:border-[rgb(var(--sep-colour-c65a4d))] hover:text-[rgb(var(--sep-colour-ffd0c9))] game_components_roomchatform_button_take_leave"\n            >\n              <span className="game_components_roomchatform_span_take_leave" aria-hidden="true">↪</span>\n            </button>'''
new='''            <PendingActionButton label={<span className="game_components_roomchatform_span_take_leave" aria-hidden="true">↪</span>} pendingLabel="Leaving..." title="Take Leave" ariaLabel="Take Leave" className="flex h-6 min-w-6 items-center justify-center border border-[rgb(var(--sep-colour-8f3f36))] bg-[rgb(var(--sep-colour-351714))] px-1 text-[8px] uppercase text-[rgb(var(--sep-colour-e6a097))] transition hover:border-[rgb(var(--sep-colour-c65a4d))] hover:text-[rgb(var(--sep-colour-ffd0c9))] disabled:cursor-not-allowed disabled:opacity-40 game_components_roomchatform_button_take_leave" />'''
t=once(t,old,new,'take leave')
p.write_text(t,encoding='utf-8')

# MechanicalFeatPanel
p=files['feat']; t=p.read_text(encoding='utf-8')
t=once(t,'import { useRouter } from "next/navigation";','import { useRouter } from "next/navigation";\nimport { useFormStatus } from "react-dom";','feat import')
anchor='export function MechanicalFeatPanel({'
helper='''function MechanicalFeatSubmitButton({ action, disabled, cooldown, cooldownRemaining }: { action: (payload: FormData) => void; disabled: boolean; cooldown: boolean; cooldownRemaining: string | null; }) {\n  const { pending } = useFormStatus();\n  return <button type="submit" formAction={action} formNoValidate disabled={disabled || pending} className={`border px-4 py-2.5 text-[8px] uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-40 ${cooldown ? "border-[rgb(var(--sep-skin-c2))]/35 bg-[rgb(var(--sep-skin-c2))]/10 text-[rgb(var(--sep-skin-c2))]" : "border-[rgb(var(--sep-skin-c1))]/45 bg-[rgb(var(--sep-skin-c1))]/10 text-[rgb(var(--sep-skin-c1))] hover:bg-[rgb(var(--sep-skin-c1))]/15"}`}>{pending ? "Using..." : cooldown ? `Cooldown · ${cooldownRemaining}` : "Use Feat"}</button>;\n}\n\nexport function MechanicalFeatPanel({'''
t=once(t,anchor,helper,'feat helper')
pat=r'''        <button\n          type="submit"\n          formAction=\{action\}[\s\S]*?        </button>'''
m=re.search(pat,t)
if not m: fail('mechanical feat submit not found')
new='''        <MechanicalFeatSubmitButton action={action} disabled={cooldown || targets.length === 0} cooldown={cooldown} cooldownRemaining={cooldownRemaining} />'''
t=t[:m.start()]+new+t[m.end():]
p.write_text(t,encoding='utf-8')

# Generic helper text for response files
# PendingOpposedActions
p=files['opposed']; t=p.read_text(encoding='utf-8')
t=once(t,'} from "react";','} from "react";\nimport { useFormStatus } from "react-dom";','opposed import')
needle='''function signed(value: number) {\n  return value >= 0 ? `+${value}` : String(value);\n}'''
helper='''function signed(value: number) {\n  return value >= 0 ? `+${value}` : String(value);\n}\n\nfunction PendingResponseButton({label,name,value,className}:{label:string;name:string;value:string;className:string}) {\n  const { pending, data } = useFormStatus();\n  const mine = pending && data?.get(name) === value;\n  return <button type="submit" name={name} value={value} disabled={pending} className={className}>{mine ? "Responding..." : label}</button>;\n}'''
t=once(t,needle,helper,'opposed helper')
# replace counter buttons using bounded region
start=t.index('              {pendingAction.allowed_counters.map((counter) => (')
end=t.index('            </form>',start)
region=t[start:end]
new='''              {pendingAction.allowed_counters.map((counter) => (\n                <PendingResponseButton key={counter} name="counter_kind" value={counter} label={`${COUNTER_LABELS[counter] ?? counter} (${attributes ? signed(Number(attributes[COUNTER_ATTRIBUTES[counter]] ?? 0)) : "…"})`} className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-2a1c11))] px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-dfc18f))] transition hover:border-[rgb(var(--sep-colour-a47b48))] disabled:cursor-not-allowed disabled:opacity-40 game_components_pendingopposedactions_button_counter_kind" />\n              ))}\n              <PendingResponseButton name="counter_kind" value="__do_nothing__" label="Do nothing" className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-2a1c11))] px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-dfc18f))] transition hover:border-[rgb(var(--sep-colour-a47b48))] disabled:cursor-not-allowed disabled:opacity-40 game_components_pendingopposedactions_button_do_nothing" />\n'''
t=t[:start]+new+t[end:]
p.write_text(t,encoding='utf-8')

# PendingShapeResponses
p=files['shape']; t=p.read_text(encoding='utf-8')
t=once(t,'import {useActionState,useEffect,useMemo,useState} from "react";','import {useActionState,useEffect,useMemo,useState} from "react";\nimport {useFormStatus} from "react-dom";','shape import')
needle='const sign=(n:number)=>n>=0?`+${n}`:String(n);'
helper='''const sign=(n:number)=>n>=0?`+${n}`:String(n);\nfunction PendingShapeResponseButton({label,name,value,className}:{label:string;name:string;value:string;className:string}){const {pending,data}=useFormStatus();const mine=pending&&data?.get(name)===value;return <button type="submit" name={name} value={value} disabled={pending} className={className}>{mine?"Responding...":label}</button>}'''
t=once(t,needle,helper,'shape helper')
# two save blocks
for marker in ['game_components_pendingshaperesponses_button_save_choice','className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-2a1c11))] px-3 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-dfc18f))]"']:
 pass
old='''     {resolution.saves.map((x:string)=><button key={x} type="submit" name="save_choice" value={x} className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-2a1c11))] px-3 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-dfc18f))] game_components_pendingshaperesponses_button_save_choice">{L[x]??x} ({sign(Number(attributes?.[A[x]]??0))})</button>)}\n     <button type="submit" name="save_choice" value="__do_nothing__" className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-2a1c11))] px-3 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-dfc18f))] game_components_pendingshaperesponses_button_do_nothing">Do nothing</button>'''
new='''     {resolution.saves.map((x:string)=><PendingShapeResponseButton key={x} name="save_choice" value={x} label={`${L[x]??x} (${sign(Number(attributes?.[A[x]]??0))})`} className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-2a1c11))] px-3 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-dfc18f))] disabled:cursor-not-allowed disabled:opacity-40 game_components_pendingshaperesponses_button_save_choice" />)}\n     <PendingShapeResponseButton name="save_choice" value="__do_nothing__" label="Do nothing" className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-2a1c11))] px-3 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-dfc18f))] disabled:cursor-not-allowed disabled:opacity-40 game_components_pendingshaperesponses_button_do_nothing" />'''
t=once(t,old,new,'shape response buttons')
old='''     {resolution.saves.map((x:string)=><button key={x} type="submit" name="save_choice" value={x} className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-2a1c11))] px-3 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-dfc18f))]">{L[x]??x} ({sign(Number(attributes?.[A[x]]??0))})</button>)}\n     <button type="submit" name="save_choice" value="__do_nothing__" className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-2a1c11))] px-3 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-dfc18f))]">Do nothing</button>'''
new='''     {resolution.saves.map((x:string)=><PendingShapeResponseButton key={x} name="save_choice" value={x} label={`${L[x]??x} (${sign(Number(attributes?.[A[x]]??0))})`} className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-2a1c11))] px-3 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-dfc18f))] disabled:cursor-not-allowed disabled:opacity-40" />)}\n     <PendingShapeResponseButton name="save_choice" value="__do_nothing__" label="Do nothing" className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-2a1c11))] px-3 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-dfc18f))] disabled:cursor-not-allowed disabled:opacity-40" />'''
t=once(t,old,new,'dispel response buttons')
p.write_text(t,encoding='utf-8')

# NpcControlPanel
p=files['npc']; t=p.read_text(encoding='utf-8')
t=once(t,'import { useActionState,useCallback,useEffect,useMemo,useState,useTransition } from "react";','import { useActionState,useCallback,useEffect,useMemo,useState,useTransition } from "react";\nimport { useFormStatus } from "react-dom";','npc import')
needle='const EMPTY:NpcControlData={npcs:[],races:[],orders:[]};'
helper='''const EMPTY:NpcControlData={npcs:[],races:[],orders:[]};\nfunction NpcPendingSubmitButton({label,pendingLabel,disabled=false,name,value,className}:{label:string;pendingLabel:string;disabled?:boolean;name?:string;value?:string;className:string}){const {pending,data}=useFormStatus();const mine=pending&&(!name||data?.get(name)===value);return <button type="submit" name={name} value={value} disabled={disabled||pending} className={className}>{mine?pendingLabel:label}</button>}'''
t=once(t,needle,helper,'npc helper')
# incoming opposed one-line blocks
t=once(t,'{(entry.allowed_counters??[]).map((counter:string)=><button key={counter} type="submit" name="counter_kind" value={counter} className="border border-[rgb(var(--sep-colour-765937))] px-3 py-2 text-[8px] uppercase">{NPC_COUNTER_LABELS[counter]??counter} ({mod(counter)})</button>)}','{(entry.allowed_counters??[]).map((counter:string)=><NpcPendingSubmitButton key={counter} name="counter_kind" value={counter} label={`${NPC_COUNTER_LABELS[counter]??counter} (${mod(counter)})`} pendingLabel="Responding..." className="border border-[rgb(var(--sep-colour-765937))] px-3 py-2 text-[8px] uppercase disabled:cursor-not-allowed disabled:opacity-40" />)}','npc counters')
t=once(t,'<button type="submit" name="counter_kind" value="__do_nothing__" className="border border-[rgb(var(--sep-colour-765937))] px-3 py-2 text-[8px] uppercase">Do nothing</button>','<NpcPendingSubmitButton name="counter_kind" value="__do_nothing__" label="Do nothing" pendingLabel="Responding..." className="border border-[rgb(var(--sep-colour-765937))] px-3 py-2 text-[8px] uppercase disabled:cursor-not-allowed disabled:opacity-40" />','npc do nothing opposed')
old='{(entry.saveOptions??[]).map((save:string)=><button key={save} type="submit" name="save_choice" value={save} className="border border-[rgb(var(--sep-colour-765937))] px-3 py-2 text-[8px] uppercase">{NPC_COUNTER_LABELS[save]??save} ({mod(save)})</button>)}'
new='{(entry.saveOptions??[]).map((save:string)=><NpcPendingSubmitButton key={save} name="save_choice" value={save} label={`${NPC_COUNTER_LABELS[save]??save} (${mod(save)})`} pendingLabel="Responding..." className="border border-[rgb(var(--sep-colour-765937))] px-3 py-2 text-[8px] uppercase disabled:cursor-not-allowed disabled:opacity-40" />)}'
if t.count(old)!=2: fail(f'npc save option blocks expected 2, found {t.count(old)}')
t=t.replace(old,new,2)
old='<button type="submit" name="save_choice" value="__do_nothing__" className="border border-[rgb(var(--sep-colour-765937))] px-3 py-2 text-[8px] uppercase">Do nothing</button>'
new='<NpcPendingSubmitButton name="save_choice" value="__do_nothing__" label="Do nothing" pendingLabel="Responding..." className="border border-[rgb(var(--sep-colour-765937))] px-3 py-2 text-[8px] uppercase disabled:cursor-not-allowed disabled:opacity-40" />'
if t.count(old)!=2: fail(f'npc save do-nothing blocks expected 2, found {t.count(old)}')
t=t.replace(old,new,2)
# main mechanics simple buttons
t=once(t,'<button className="mt-1 border border-[rgb(var(--sep-colour-8d6d3e))]/70 px-3 py-2 text-[8px] uppercase">Roll</button>','<NpcPendingSubmitButton label="Roll" pendingLabel="Rolling..." className="mt-1 border border-[rgb(var(--sep-colour-8d6d3e))]/70 px-3 py-2 text-[8px] uppercase disabled:cursor-not-allowed disabled:opacity-40" />','npc roll')
# feat block regex
pat=r'''              <button\n                disabled=\{targetMode==="other"&&!mechanicsTarget\}[\s\S]*?              </button>'''
m=re.search(pat,t)
if not m: fail('npc feat button not found')
new='''              <NpcPendingSubmitButton disabled={targetMode==="other"&&!mechanicsTarget} label={(g.effectMode??g.effect_mode)==="passive"?"Show Feat":(g.effectMode??g.effect_mode)==="temporary"?"Activate Feat":"Use Feat"} pendingLabel={(g.effectMode??g.effect_mode)==="passive"?"Showing...":(g.effectMode??g.effect_mode)==="temporary"?"Activating...":"Using..."} className="mt-1 border border-[rgb(var(--sep-colour-8d6d3e))]/70 px-3 py-2 text-[8px] uppercase disabled:cursor-not-allowed disabled:opacity-40" />'''
t=t[:m.start()]+new+t[m.end():]
t=once(t,'<button disabled={!selectedItem||!mechanics.items?.find((x:any)=>x.record_id===selectedItem)?.is_usable} className="mt-1 border border-[rgb(var(--sep-colour-8d6d3e))]/70 px-3 py-2 text-[8px] uppercase disabled:opacity-40">Use Item</button>','<NpcPendingSubmitButton label="Use Item" pendingLabel="Using..." disabled={!selectedItem||!mechanics.items?.find((x:any)=>x.record_id===selectedItem)?.is_usable} className="mt-1 border border-[rgb(var(--sep-colour-8d6d3e))]/70 px-3 py-2 text-[8px] uppercase disabled:cursor-not-allowed disabled:opacity-40" />','npc item')
t=once(t,'<button disabled={!mechanicsTarget} className="border border-[rgb(var(--sep-colour-8d6d3e))]/70 px-3 py-2 text-[8px] uppercase disabled:opacity-40">Unarmed Attack</button>','<NpcPendingSubmitButton label="Unarmed Attack" pendingLabel="Attacking..." disabled={!mechanicsTarget} className="border border-[rgb(var(--sep-colour-8d6d3e))]/70 px-3 py-2 text-[8px] uppercase disabled:cursor-not-allowed disabled:opacity-40" />','npc unarmed')
t=once(t,'<button disabled={!mechanicsTarget} className="border border-[rgb(var(--sep-colour-8d6d3e))]/70 px-3 py-2 text-[8px] uppercase disabled:opacity-40">Attack with {i.name}</button>','<NpcPendingSubmitButton label={`Attack with ${i.name}`} pendingLabel="Attacking..." disabled={!mechanicsTarget} className="border border-[rgb(var(--sep-colour-8d6d3e))]/70 px-3 py-2 text-[8px] uppercase disabled:cursor-not-allowed disabled:opacity-40" />','npc weapon')
p.write_text(t,encoding='utf-8')

# verify
for key,p in files.items():
 s=p.read_text(encoding='utf-8')
 if key=='room' and 'function PendingActionButton(' not in s: fail('room verification')
 if key=='feat' and 'MechanicalFeatSubmitButton' not in s: fail('feat verification')
 if key=='npc' and 'NpcPendingSubmitButton' not in s: fail('npc verification')
 if key=='opposed' and 'PendingResponseButton' not in s: fail('opposed verification')
 if key=='shape' and 'PendingShapeResponseButton' not in s: fail('shape verification')

print('PATCH APPLIED SUCCESSFULLY')
print('Base:', BASE)
for p in files.values(): print(' -',p)
print('Next: npm run build')
