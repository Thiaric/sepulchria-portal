from __future__ import annotations

from pathlib import Path
import subprocess
import sys

BASE = "6ea946aac69e8b86f67b02f6d22409d91438620c"

FILES = {
    "opposed_ui": Path("app/(portal)/game/components/PendingOpposedActions.tsx"),
    "shape_ui": Path("app/(portal)/game/components/PendingShapeResponses.tsx"),
    "warping": Path("app/(portal)/game/warping-actions.ts"),
}

def fail(msg: str) -> None:
    print(f"PATCH FAILED: {msg}")
    sys.exit(1)

def once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail(f"{label}: expected exactly 1 match, found {count}")
    return text.replace(old, new, 1)

head = subprocess.check_output(
    ["git", "rev-parse", "HEAD"],
    text=True,
    stderr=subprocess.STDOUT,
).strip()

if head != BASE:
    fail(f"This patch is for {BASE}, but current HEAD is {head}.")

for path in FILES.values():
    if not path.exists():
        fail(f"Missing file: {path}")

# PendingOpposedActions.tsx
path = FILES["opposed_ui"]
text = path.read_text(encoding="utf-8")

text = once(
    text,
    '  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);\n'
    '  const [attributes, setAttributes] =\n'
    '    useState<CharacterAttributes | null>(null);',
    '  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);\n'
    '  const [attributes, setAttributes] =\n'
    '    useState<CharacterAttributes | null>(null);\n'
    '  const [characterId, setCharacterId] =\n'
    '    useState<string | null>(null);',
    "PendingOpposedActions add characterId",
)

old_effect = '''  useEffect(() => {
    let active = true;

    async function load() {
      const { data: characterId } =
        await supabase.rpc("my_character_id");
      if (!active || !characterId) return;

      const { data } = await supabase
        .from("opposed_actions")
        .select(`
          id,
          action_label,
          attack_total,
          allowed_counters,
          attacker:characters!opposed_actions_attacker_character_id_fkey(display_name)
        `)
        .eq("target_character_id", characterId)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true });

      if (active) {
        setPendingActions((data ?? []) as PendingAction[]);
      }
    }

    void load();
    const timer = window.setInterval(() => void load(), 3000);
    const channel = supabase
      .channel(`opposed-actions-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "opposed_actions" },
        () => void load(),
      )
      .subscribe();

    return () => {
      active = false;
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [supabase, state.submittedAt]);'''

new_effect = '''  useEffect(() => {
    let active = true;

    void supabase
      .rpc("my_character_id")
      .then(({ data }) => {
        if (active) {
          setCharacterId(
            typeof data === "string"
              ? data
              : null,
          );
        }
      });

    return () => {
      active = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!characterId) return;

    let active = true;

    async function load() {
      const { data } = await supabase
        .from("opposed_actions")
        .select(`
          id,
          action_label,
          attack_total,
          allowed_counters,
          attacker:characters!opposed_actions_attacker_character_id_fkey(display_name)
        `)
        .eq("target_character_id", characterId)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true });

      if (active) {
        setPendingActions((data ?? []) as PendingAction[]);
      }
    }

    void load();

    const timer = window.setInterval(
      () => void load(),
      10_000,
    );

    const channel = supabase
      .channel(`opposed-actions-${characterId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "opposed_actions",
          filter: `target_character_id=eq.${characterId}`,
        },
        () => void load(),
      )
      .subscribe();

    return () => {
      active = false;
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [
    supabase,
    characterId,
    state.submittedAt,
  ]);'''

text = once(text, old_effect, new_effect, "PendingOpposedActions optimise effect")
path.write_text(text, encoding="utf-8")

# PendingShapeResponses.tsx
path = FILES["shape_ui"]
text = path.read_text(encoding="utf-8")

text = once(
    text,
    ' const [attributes,setAttributes]=useState<CharacterAttributes|null>(null);\n'
    ' const [state,action]=useActionState(resolveIncomingShape,initial);',
    ' const [attributes,setAttributes]=useState<CharacterAttributes|null>(null);\n'
    ' const [characterId,setCharacterId]=useState<string|null>(null);\n'
    ' const [state,action]=useActionState(resolveIncomingShape,initial);',
    "PendingShapeResponses add characterId",
)

old_effect = ''' useEffect(()=>{
  let live=true;
  async function load(){
   const me=await db.rpc("my_character_id");
   if(!live||!me.data)return;

   const q=await db.from("shape_cast_targets").select(`id,created_at,target_character_id,other_effect_choice,cast:shape_casts!shape_cast_targets_cast_id_fkey(id,caster:characters!shape_casts_caster_character_id_fkey(id,display_name),shape:shapes!shape_casts_shape_id_fkey(*))`).eq("target_character_id",me.data).eq("outcome","pending").order("created_at",{ascending:true});
   if(!live)return;
   setRows((q.data??[]).filter((row:any)=>{
    const cast=one(row.cast),caster=one(cast?.caster),s=one(cast?.shape);
    if(!s||caster?.id===me.data)return false;
    return resolutionFor(row,s,caster).mode==="save";
   }));

   const dq=await db.from("shape_casts").select(`id,created_at,dispel_effect_id,dispel_target_character_id,caster:characters!shape_casts_caster_character_id_fkey(id,display_name),shape:shapes!shape_casts_shape_id_fkey(*)`).eq("dispel_target_character_id",me.data).not("dispel_effect_id","is",null).order("created_at",{ascending:true});
   if(!live)return;
   setDispelRows((dq.data??[]).filter((row:any)=>{
    const s=one(row.shape);
    return Boolean(s?.is_dispel);
   }));
  }

  void load();
  const timer=window.setInterval(()=>void load(),2500);
  const targetChannel=db.channel(`shape-target-${crypto.randomUUID()}`).on("postgres_changes",{event:"*",schema:"public",table:"shape_cast_targets"},()=>void load()).subscribe();
  const dispelChannel=db.channel(`shape-dispel-${crypto.randomUUID()}`).on("postgres_changes",{event:"*",schema:"public",table:"shape_casts"},()=>void load()).subscribe();
  return()=>{live=false;window.clearInterval(timer);void db.removeChannel(targetChannel);void db.removeChannel(dispelChannel)};
 },[db,state.submittedAt,dispelState.submittedAt]);'''

new_effect = ''' useEffect(()=>{
  let live=true;
  void db.rpc("my_character_id").then(({data})=>{
   if(live)setCharacterId(typeof data==="string"?data:null);
  });
  return()=>{live=false};
 },[db]);

 useEffect(()=>{
  if(!characterId)return;
  let live=true;

  async function load(){
   const [q,dq]=await Promise.all([
    db.from("shape_cast_targets").select(`id,created_at,target_character_id,other_effect_choice,cast:shape_casts!shape_cast_targets_cast_id_fkey(id,caster:characters!shape_casts_caster_character_id_fkey(id,display_name),shape:shapes!shape_casts_shape_id_fkey(*))`).eq("target_character_id",characterId).eq("outcome","pending").order("created_at",{ascending:true}),
    db.from("shape_casts").select(`id,created_at,dispel_effect_id,dispel_target_character_id,caster:characters!shape_casts_caster_character_id_fkey(id,display_name),shape:shapes!shape_casts_shape_id_fkey(*)`).eq("dispel_target_character_id",characterId).not("dispel_effect_id","is",null).order("created_at",{ascending:true}),
   ]);

   if(!live)return;

   setRows((q.data??[]).filter((row:any)=>{
    const cast=one(row.cast),caster=one(cast?.caster),s=one(cast?.shape);
    if(!s||caster?.id===characterId)return false;
    return resolutionFor(row,s,caster).mode==="save";
   }));

   setDispelRows((dq.data??[]).filter((row:any)=>{
    const s=one(row.shape);
    return Boolean(s?.is_dispel);
   }));
  }

  void load();
  const timer=window.setInterval(()=>void load(),10_000);

  const targetChannel=db.channel(`shape-target-${characterId}`).on(
   "postgres_changes",
   {event:"*",schema:"public",table:"shape_cast_targets",filter:`target_character_id=eq.${characterId}`},
   ()=>void load(),
  ).subscribe();

  const dispelChannel=db.channel(`shape-dispel-${characterId}`).on(
   "postgres_changes",
   {event:"*",schema:"public",table:"shape_casts",filter:`dispel_target_character_id=eq.${characterId}`},
   ()=>void load(),
  ).subscribe();

  return()=>{live=false;window.clearInterval(timer);void db.removeChannel(targetChannel);void db.removeChannel(dispelChannel)};
 },[db,characterId,state.submittedAt,dispelState.submittedAt]);'''

text = once(text, old_effect, new_effect, "PendingShapeResponses optimise effect")
path.write_text(text, encoding="utf-8")

# warping-actions.ts: parallel independent effective-attribute calculations
path = FILES["warping"]
text = path.read_text(encoding="utf-8")

text = once(
    text,
    ' const saveOptions=resolution.saveOptions;if(!saveOptions.includes(choice))throw Error("That Save is unavailable.");const a=SAVE[choice];if(!a)throw Error("Invalid Save.");const mod=await eff(c,a),r=randomInt(1,21),total=r+mod,dc=11+(resolution.dcAttribute?await eff(caster,resolution.dcAttribute):0),saved=total>=dc;',
    ' const saveOptions=resolution.saveOptions;if(!saveOptions.includes(choice))throw Error("That Save is unavailable.");const a=SAVE[choice];if(!a)throw Error("Invalid Save.");const [mod,dcMod]=await Promise.all([eff(c,a),resolution.dcAttribute?eff(caster,resolution.dcAttribute):Promise.resolve(0)]),r=randomInt(1,21),total=r+mod,dc=11+dcMod,saved=total>=dc;',
    "warping incoming Shape parallel attrs",
)

text = once(
    text,
    ' const mod=await eff(c,sa),roll=randomInt(1,21),total=roll+mod,dc=11+(resolution.dcAttribute?await eff(caster,resolution.dcAttribute):0),saved=total>=dc;',
    ' const [mod,dcMod]=await Promise.all([eff(c,sa),resolution.dcAttribute?eff(caster,resolution.dcAttribute):Promise.resolve(0)]),roll=randomInt(1,21),total=roll+mod,dc=11+dcMod,saved=total>=dc;',
    "warping incoming Dispel parallel attrs",
)

path.write_text(text, encoding="utf-8")

# Verify
opposed = FILES["opposed_ui"].read_text(encoding="utf-8")
shape = FILES["shape_ui"].read_text(encoding="utf-8")
warping = FILES["warping"].read_text(encoding="utf-8")

checks = {
    "opposed one-time character id": "const [characterId, setCharacterId]" in opposed,
    "opposed filtered realtime": "filter: `target_character_id=eq.${characterId}`" in opposed,
    "opposed 10s fallback": "10_000" in opposed,
    "opposed Responding unchanged": '"Responding..."' in opposed,
    "shape one-time character id": "const [characterId,setCharacterId]" in shape,
    "shape parallel queries": "const [q,dq]=await Promise.all([" in shape,
    "shape target filter": "filter:`target_character_id=eq.${characterId}`" in shape,
    "shape dispel filter": "filter:`dispel_target_character_id=eq.${characterId}`" in shape,
    "shape Responding unchanged": '"Responding..."' in shape,
    "shape save attrs parallel": "const [mod,dcMod]=await Promise.all([eff(c,a)" in warping,
    "dispel save attrs parallel": "const [mod,dcMod]=await Promise.all([eff(c,sa)" in warping,
}

bad = [name for name, ok in checks.items() if not ok]
if bad:
    fail("Verification failed: " + ", ".join(bad))

print("PATCH APPLIED SUCCESSFULLY")
print("Base commit:", BASE)
for p in FILES.values():
    print(" -", p)
print("No mechanics, formulas, rolls, damage, counters, cooldowns, or outcomes changed.")
print("Next: npm run build")
