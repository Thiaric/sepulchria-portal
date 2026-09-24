"use server";

import { notFound } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveCharacterAttributes } from "@/lib/characters/get-effective-character-attributes";

function admin(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SECRET_KEY;
  if(!url||!key)throw new Error("Missing Supabase server credentials.");
  return createAdminClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
function one<T>(value:T|T[]|null):T|null{
  return Array.isArray(value)?value[0]??null:value;
}

export default async function NpcSheetPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const session=await createClient();
  const auth=await session.auth.getUser();
  if(!auth.data.user)notFound();

  const db=admin();
  const result=await db
    .from("npcs")
    .select(`
      id,name,pronouns,portrait_url,description,current_room_id,is_active,is_location_active,
      race:races(id,name,icon_url),
      order:orders(id,name),
      character:characters!npcs_character_id_fkey(
        id,display_name,current_health,muscles,reflexes,vigor,brains,shrewd,presence_score,life_state
      )
    `)
    .eq("id",id)
    .eq("is_active",true)
    .eq("is_location_active",true)
    .maybeSingle();

  if(result.error||!result.data)notFound();

  const npc:any=result.data;
  const character:any=one(npc.character);
  if(!character)notFound();

  const attrs=await getEffectiveCharacterAttributes(character.id,{
    muscles:character.muscles,
    reflexes:character.reflexes,
    vigor:character.vigor,
    brains:character.brains,
    shrewd:character.shrewd,
    presence_score:character.presence_score,
  });

  const race:any=one(npc.race);
  const order:any=one(npc.order);

  return <div className="mx-auto w-full max-w-4xl p-6">
    <div className="border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-15100d))] p-6">
      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="h-40 w-32 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-100c09))]">
          {npc.portrait_url
            ? <img src={npc.portrait_url} alt="" className="h-full w-full object-cover"/>
            : <div className="flex h-full items-center justify-center font-serif text-4xl text-[rgb(var(--sep-colour-8e7555))]">{npc.name?.charAt(0)??"?"}</div>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-876a46))]">NPC</p>
          <h1 className="mt-1 font-serif text-3xl text-[rgb(var(--sep-colour-e0c79a))]">{npc.name}</h1>
          <p className="mt-2 text-xs text-[rgb(var(--sep-colour-9d8d78))]">{[race?.name,order?.name,npc.pronouns].filter(Boolean).join(" · ")}</p>
          {npc.description?<p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[rgb(var(--sep-colour-b7a68d))]">{npc.description}</p>:null}
        </div>
      </div>

      <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border border-[rgb(var(--sep-colour-59432c))]/40 p-3">
          <p className="text-[8px] uppercase text-[rgb(var(--sep-colour-75644f))]">Health</p>
          <p className="mt-1 font-serif text-xl">{character.current_health??0}</p>
        </div>
        <div className="border border-[rgb(var(--sep-colour-59432c))]/40 p-3">
          <p className="text-[8px] uppercase text-[rgb(var(--sep-colour-75644f))]">State</p>
          <p className="mt-1 font-serif text-xl">{character.life_state}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[
          ["Muscles",attrs.muscles],
          ["Reflexes",attrs.reflexes],
          ["Vigour",attrs.vigor],
          ["Brains",attrs.brains],
          ["Shrewd",attrs.shrewd],
          ["Presence",attrs.presence_score],
        ].map(([label,value])=><div key={String(label)} className="border border-[rgb(var(--sep-colour-59432c))]/40 p-3">
          <p className="text-[8px] uppercase text-[rgb(var(--sep-colour-75644f))]">{label}</p>
          <p className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d7bd91))]">{String(value??0)}</p>
        </div>)}
      </div>
    </div>
  </div>;
}
