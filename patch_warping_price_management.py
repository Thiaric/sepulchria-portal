from __future__ import annotations

from pathlib import Path
import subprocess

ROOT = Path.cwd()
EXPECTED_HEAD = "833dacf6c6446da8db401f9e3ff28e7f89435790"

paths = {
    "constants": ROOT / "lib/warping/constants.ts",
    "tooltip": ROOT / "components/warping/price-tooltip.tsx",
    "catalogue": ROOT / "components/warping/shapes-catalogue.tsx",
    "panel": ROOT / "app/(portal)/game/components/WarpingPanel.tsx",
    "active": ROOT / "components/characters/ActivePriceEffects.tsx",
    "reference": ROOT / "components/admin/warping-reference.tsx",
    "page": ROOT / "app/(portal)/admin/shapes/page.tsx",
    "actions": ROOT / "app/(portal)/admin/shapes/actions.ts",
}

new_hook = ROOT / "lib/warping/use-warping-prices.ts"
new_types = ROOT / "lib/warping/warping-price-types.ts"


def current_head() -> str:
    return subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    ).stdout.strip()


def one(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(
            f"{label}: expected exact snippet once, found {count}. No files were written."
        )
    return text.replace(old, new, 1)


head = current_head()
if head != EXPECTED_HEAD:
    raise RuntimeError(
        "This patch was built against:\n"
        f"  {EXPECTED_HEAD}\n"
        "Your current HEAD is:\n"
        f"  {head}\n\n"
        "No files were changed."
    )

for p in paths.values():
    if not p.exists():
        raise RuntimeError(f"Missing expected file: {p}")

for p in (new_hook, new_types):
    if p.exists():
        raise RuntimeError(f"{p} already exists. No files were changed.")

src = {k: p.read_text(encoding="utf-8") for k, p in paths.items()}
out = dict(src)

# constants.ts
out["constants"] = one(
    out["constants"],
    'import { WARPING_PRICE_DEFINITIONS } from "@/lib/warping/price-definitions";\n\n',
    "",
    "constants price import",
)
out["constants"] = one(
    out["constants"],
    '''export const PRICES = WARPING_PRICE_DEFINITIONS.map(
  (price) => [
    price.key,
    `${price.name} — Stage ${price.stageLabel} — ${price.durationDays} days`,
  ] as const,
);

''',
    "",
    "constants PRICES",
)

# price-tooltip.tsx
out["tooltip"] = one(
    out["tooltip"],
    '''import {
  getWarpingPriceDefinition,
  getWarpingPriceDefinitionFromText,
} from "@/lib/warping/price-definitions";
''',
    '''import {
  useWarpingPrices,
} from "@/lib/warping/use-warping-prices";
''',
    "tooltip import",
)
out["tooltip"] = one(
    out["tooltip"],
    '''  const price =
    getWarpingPriceDefinition(priceKey) ??
    getWarpingPriceDefinitionFromText(displayText);
''',
    '''  const prices =
    useWarpingPrices();

  const cleanDisplayText =
    String(displayText ?? "")
      .replace(
        /\\s*\\(Stage\\s+(?:I|II|III|\\d+)\\)\\s*$/i,
        "",
      )
      .trim()
      .toLowerCase();

  const price =
    (
      priceKey
        ? prices.find(
            (entry) =>
              entry.key === priceKey,
          )
        : undefined
    ) ??
    (
      cleanDisplayText
        ? prices.find(
            (entry) =>
              entry.name
                .trim()
                .toLowerCase() ===
              cleanDisplayText,
          )
        : undefined
    ) ??
    null;
''',
    "tooltip lookup",
)

# shapes-catalogue.tsx
out["catalogue"] = one(
    out["catalogue"],
    '''import {
  PriceTooltip,
} from "@/components/warping/price-tooltip";
''',
    '''import {
  PriceTooltip,
} from "@/components/warping/price-tooltip";
import {
  useWarpingPrices,
} from "@/lib/warping/use-warping-prices";
''',
    "catalogue import",
)
start = out["catalogue"].index("const PRICE_LABELS:")
end = out["catalogue"].index("\n\nfunction durationLabel", start)
out["catalogue"] = out["catalogue"][:start] + out["catalogue"][end + 2:]
out["catalogue"] = one(
    out["catalogue"],
    '''export function ShapesCatalogue({
  shapes,
}: {
  shapes: ShapeCard[];
}) {
  const [q, setQ] = useState("");
''',
    '''export function ShapesCatalogue({
  shapes,
}: {
  shapes: ShapeCard[];
}) {
  const priceDefinitions =
    useWarpingPrices();

  const priceNames =
    useMemo(
      () =>
        new Map(
          priceDefinitions.map(
            (price) => [
              price.key,
              price.name,
            ],
          ),
        ),
      [priceDefinitions],
    );

  const [q, setQ] = useState("");
''',
    "catalogue component",
)
out["catalogue"] = one(
    out["catalogue"],
    '{PRICE_LABELS[shape.price_key] ?? pretty(shape.price_key)}',
    '{priceNames.get(shape.price_key) ?? pretty(shape.price_key)}',
    "catalogue label",
)

# WarpingPanel.tsx
out["panel"] = one(
    out["panel"],
    'import { PriceTooltip } from "@/components/warping/price-tooltip";\n',
    '''import { PriceTooltip } from "@/components/warping/price-tooltip";
import {
  useWarpingPrices,
} from "@/lib/warping/use-warping-prices";
''',
    "panel import",
)
start = out["panel"].index("const PM:")
end = out["panel"].index("\n\nconst SAVE_LABEL:", start)
out["panel"] = out["panel"][:start] + out["panel"][end + 2:]
out["panel"] = one(
    out["panel"],
    '''function ShapeInformation({
  shape,
}: {
  shape: S;
}) {
''',
    '''function ShapeInformation({
  shape,
}: {
  shape: S;
}) {
  const priceDefinitions =
    useWarpingPrices();

''',
    "ShapeInformation hook",
)
out["panel"] = one(
    out["panel"],
    '''  const price =
    shape.price_key &&
    PM[shape.price_key]
      ? PM[shape.price_key][2]
      : "None";
''',
    '''  const price =
    shape.price_key
      ? (
          priceDefinitions.find(
            (entry) =>
              entry.key ===
              String(shape.price_key),
          )?.name ??
          String(shape.price_key)
        )
      : "None";
''',
    "ShapeInformation price",
)
out["panel"] = one(
    out["panel"],
    '''}) {
  const db = useMemo(
    () => createClient(),
    [],
  );
''',
    '''}) {
  const priceDefinitions =
    useWarpingPrices();

  const priceByKey =
    useMemo(
      () =>
        new Map(
          priceDefinitions.map(
            (price) => [
              price.key,
              price,
            ],
          ),
        ),
      [priceDefinitions],
    );

  const db = useMemo(
    () => createClient(),
    [],
  );
''',
    "WarpingPanel price map",
)
out["panel"] = one(
    out["panel"],
    '''      if (
        s.price_key &&
        PM[String(s.price_key)]
      ) {
        const [, , label] =
          PM[String(s.price_key)];

        parts.push(
          `Price [${label}]`,
        );
      }
''',
    '''      if (s.price_key) {
        const priceDefinition =
          priceByKey.get(
            String(s.price_key),
          );

        parts.push(
          `Price [${
            priceDefinition?.name ??
            String(s.price_key)
          }]`,
        );
      }
''',
    "WarpingPanel cast label",
)

# ActivePriceEffects.tsx
out["active"] = '''import "server-only";

import { createClient } from "@/lib/supabase/server";
import { PriceTooltip } from "@/components/warping/price-tooltip";

export async function ActivePriceEffects({
  characterId,
}: {
  characterId: string;
}) {
  const db =
    await createClient();

  const [effectsResult, pricesResult] =
    await Promise.all([
      db
        .from("character_price_effects")
        .select("id,price_key,stage,expires_at")
        .eq("character_id", characterId)
        .gt("expires_at", new Date().toISOString())
        .order("expires_at"),
      db
        .from("warping_prices")
        .select("key,name"),
    ]);

  if (effectsResult.error) {
    throw new Error(effectsResult.error.message);
  }

  if (pricesResult.error) {
    throw new Error(pricesResult.error.message);
  }

  if (!effectsResult.data?.length) {
    return null;
  }

  const priceNames =
    new Map(
      (pricesResult.data ?? []).map(
        (price) => [
          price.key,
          price.name,
        ],
      ),
    );

  return (
    <section
      data-profile-price-box="true"
      className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 p-5 sm:p-6 components_characters_activepriceeffects_section_price"
    >
      <h2 className="font-serif text-[0.9rem] text-[rgb(var(--sep-colour-dec89f))] components_characters_activepriceeffects_h2_price">
        The Price
      </h2>

      <div className="mt-3 flex flex-wrap gap-2 components_characters_activepriceeffects_div_price">
        {effectsResult.data.map(
          (effect) => (
            <PriceTooltip
              key={effect.id}
              priceKey={effect.price_key}
              expiresAt={effect.expires_at}
            >
              <span className="border border-[rgb(var(--sep-colour-765937))]/70 bg-[rgb(var(--sep-colour-21170f))] px-2 py-1 text-[8px] uppercase text-[rgb(var(--sep-colour-d9b77f))] underline decoration-dotted underline-offset-2 components_characters_activepriceeffects_span_text">
                {priceNames.get(effect.price_key) ?? effect.price_key}
                {" · Stage "}
                {effect.stage}
              </span>
            </PriceTooltip>
          ),
        )}
      </div>
    </section>
  );
}
'''

# WarpingReference.tsx
out["reference"] = one(
    out["reference"],
    'import { WARPING_PRICE_DEFINITIONS } from "@/lib/warping/price-definitions";\n',
    'import type { WarpingPriceDefinition } from "@/lib/warping/warping-price-types";\n',
    "reference import",
)
out["reference"] = one(
    out["reference"],
    "export function WarpingReference() {\n",
    '''export function WarpingReference({
  prices,
}: {
  prices: WarpingPriceDefinition[];
}) {
''',
    "reference signature",
)
out["reference"] = one(
    out["reference"],
    "WARPING_PRICE_DEFINITIONS.map((price) => (",
    "prices.map((price) => (",
    "reference map",
)
out["reference"] = one(
    out["reference"],
    "{price.stageLabel} — {price.durationDays} days",
    '{price.stage === 1 ? "I" : price.stage === 2 ? "II" : "III"} — {price.durationDays} days',
    "reference stage label",
)

# admin actions
out["actions"] = one(
    out["actions"],
    'import { createClient } from "@/lib/supabase/server";\n',
    'import { createClient } from "@/lib/supabase/server";\nimport { createAdminClient } from "@/lib/supabase/admin";\n',
    "actions admin import",
)

out["actions"] = out["actions"].rstrip() + r'''

function parseWarpingPrice(formData: FormData) {
  const key = txt(formData, "price_key")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const number = nint(formData, "price_number", 0);
  const stage = nint(formData, "price_stage", 0);
  const durationDays = nint(formData, "duration_days", 0);
  const name = txt(formData, "price_name");
  const manifestation = txt(formData, "manifestation");

  if (!key) throw new Error("Price key is required.");
  if (!name) throw new Error("Price name is required.");
  if (!manifestation) throw new Error("Manifestation is required.");
  if (number < 1) throw new Error("Price number must be at least 1.");
  if (stage < 1 || stage > 3) throw new Error("Price stage must be 1, 2 or 3.");
  if (durationDays < 1) throw new Error("Price duration must be at least 1 day.");

  return {
    key,
    number,
    name,
    stage,
    duration_days: durationDays,
    manifestation,
    updated_at: new Date().toISOString(),
  };
}

export async function createWarpingPrice(formData: FormData) {
  await requireAdminSection("shapes");
  const admin = createAdminClient();
  const payload = parseWarpingPrice(formData);

  const { error } = await admin
    .from("warping_prices")
    .insert(payload);

  if (error) {
    redirect(`/admin/shapes?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/shapes");
  revalidatePath("/game");
  revalidatePath("/character");
  revalidatePath("/warping");
  redirect("/admin/shapes?success=Price%20created");
}

export async function updateWarpingPrice(formData: FormData) {
  await requireAdminSection("shapes");
  const admin = createAdminClient();
  const originalKey = txt(formData, "original_price_key");
  const payload = parseWarpingPrice(formData);

  if (!originalKey) {
    redirect("/admin/shapes?error=Price%20key%20is%20missing");
  }

  if (payload.key !== originalKey) {
    redirect("/admin/shapes?error=Existing%20Price%20keys%20cannot%20be%20changed");
  }

  const { error } = await admin
    .from("warping_prices")
    .update({
      number: payload.number,
      name: payload.name,
      stage: payload.stage,
      duration_days: payload.duration_days,
      manifestation: payload.manifestation,
      updated_at: payload.updated_at,
    })
    .eq("key", originalKey);

  if (error) {
    redirect(`/admin/shapes?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/shapes");
  revalidatePath("/game");
  revalidatePath("/character");
  revalidatePath("/warping");
  redirect("/admin/shapes?success=Price%20updated");
}

export async function deleteWarpingPrice(formData: FormData) {
  await requireAdminSection("shapes");
  const admin = createAdminClient();
  const key = txt(formData, "price_key");

  if (!key) {
    redirect("/admin/shapes?error=Price%20key%20is%20missing");
  }

  const [shapeUsage, effectUsage] = await Promise.all([
    admin.from("shapes").select("id", { count: "exact", head: true }).eq("price_key", key),
    admin.from("character_price_effects").select("id", { count: "exact", head: true }).eq("price_key", key),
  ]);

  const usageError = shapeUsage.error ?? effectUsage.error;
  if (usageError) {
    redirect(`/admin/shapes?error=${encodeURIComponent(usageError.message)}`);
  }

  const shapes = shapeUsage.count ?? 0;
  const effects = effectUsage.count ?? 0;

  if (shapes > 0 || effects > 0) {
    redirect(
      `/admin/shapes?error=${encodeURIComponent(
        `Cannot delete this Price: ${shapes} Shape(s) and ${effects} character Price effect(s) still reference it.`,
      )}`,
    );
  }

  const { error } = await admin
    .from("warping_prices")
    .delete()
    .eq("key", key);

  if (error) {
    redirect(`/admin/shapes?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/shapes");
  revalidatePath("/game");
  revalidatePath("/character");
  revalidatePath("/warping");
  redirect("/admin/shapes?success=Price%20deleted");
}
''' + "\n"

# admin page imports
out["page"] = one(
    out["page"],
    'import { ACTION_WORDS,ATTRIBUTES,ESSENCE_WORDS,LAW_WORDS,MOVEMENTS,PRICES,SAVES,WARPING_SCHOOLS } from "@/lib/warping/constants";',
    'import { ACTION_WORDS,ATTRIBUTES,ESSENCE_WORDS,LAW_WORDS,MOVEMENTS,SAVES,WARPING_SCHOOLS } from "@/lib/warping/constants";',
    "page constants import",
)
out["page"] = one(
    out["page"],
    'import { assignShape,createShape,deleteShape,linkOrderLevel,unlinkOrderLevel,removeAssignment,updateShape } from "./actions";',
    'import { assignShape,createShape,createWarpingPrice,deleteShape,deleteWarpingPrice,linkOrderLevel,unlinkOrderLevel,removeAssignment,updateShape,updateWarpingPrice } from "./actions";',
    "page actions import",
)

out["page"] = one(
    out["page"],
    '''function ShapeForm({
  s,
  action,
}:{
  s?:S;
  action:(
    previous:ShapeActionState,
    formData:FormData,
  )=>Promise<ShapeActionState>;
}){
''',
    '''function ShapeForm({
  s,
  action,
  priceOptions,
}:{
  s?:S;
  action:(
    previous:ShapeActionState,
    formData:FormData,
  )=>Promise<ShapeActionState>;
  priceOptions:readonly (readonly [string,string])[];
}){
''',
    "ShapeForm props",
)
out["page"] = one(
    out["page"],
    "options={PRICES}",
    "options={priceOptions}",
    "ShapeForm dynamic price options",
)

out["page"] = one(
    out["page"],
    '''  const summaryResult=
    await db
      .from("shapes")
      .select("id,name,level,school,word_of_power,is_active")
      .order("level")
      .order("name");

  if(summaryResult.error){
    throw new Error(
      `Unable to load Shapes: ${summaryResult.error.message}`,
    );
  }

  const shapes=
    (summaryResult.data??[]) as S[];
''',
    '''  const [summaryResult,pricesResult]=
    await Promise.all([
      db
        .from("shapes")
        .select("id,name,level,school,word_of_power,is_active")
        .order("level")
        .order("name"),
      db
        .from("warping_prices")
        .select("key,number,name,stage,duration_days,manifestation")
        .order("number"),
    ]);

  const initialLoadError=
    summaryResult.error??
    pricesResult.error;

  if(initialLoadError){
    throw new Error(
      `Unable to load Shapes administration: ${initialLoadError.message}`,
    );
  }

  const shapes=
    (summaryResult.data??[]) as S[];

  const prices=
    (pricesResult.data??[]) as {
      key:string;
      number:number;
      name:string;
      stage:number;
      duration_days:number;
      manifestation:string;
    }[];

  const priceOptions=
    prices.map(
      (price)=>[
        price.key,
        `${price.name} — Stage ${
          price.stage===1
            ?"I"
            :price.stage===2
              ?"II"
              :"III"
        } — ${price.duration_days} days`,
      ] as const,
    );
''',
    "page price query",
)

out["page"] = one(
    out["page"],
    '''        <section
          id="shape-new"
''',
    '''        <details className="mt-8 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]">
          <summary className="cursor-pointer list-none px-5 py-4 transition hover:bg-[rgb(var(--sep-colour-1c140e))]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">Warping Configuration</p>
                <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))]">Price Management</h2>
                <p className="mt-1 text-[10px] text-[rgb(var(--sep-colour-8f8271))]">Create, edit and remove the Prices used by Shapes.</p>
              </div>
              <span className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8c704b))]">{prices.length} Prices · Click to expand</span>
            </div>
          </summary>

          <div className="border-t border-[rgb(var(--sep-colour-60482e))]/35 p-5">
            <div className="space-y-4">
              {prices.map((price)=>(
                <div key={price.key} className="border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] p-4">
                  <form action={updateWarpingPrice} className="grid gap-3 lg:grid-cols-12">
                    <input type="hidden" name="original_price_key" value={price.key}/>
                    <input type="hidden" name="price_key" value={price.key}/>
                    <label className="lg:col-span-1"><span className={lab}>#</span><input required type="number" min={1} name="price_number" defaultValue={price.number} className={cls}/></label>
                    <label className="lg:col-span-3"><span className={lab}>Name</span><input required name="price_name" defaultValue={price.name} className={cls}/></label>
                    <label className="lg:col-span-2"><span className={lab}>Key</span><input value={price.key} readOnly className={`${cls} opacity-65`}/></label>
                    <label className="lg:col-span-1"><span className={lab}>Stage</span><select name="price_stage" defaultValue={price.stage} className={cls}><option value={1}>I</option><option value={2}>II</option><option value={3}>III</option></select></label>
                    <label className="lg:col-span-2"><span className={lab}>Duration Days</span><input required type="number" min={1} name="duration_days" defaultValue={price.duration_days} className={cls}/></label>
                    <div className="flex items-end lg:col-span-3"><button type="submit" className="w-full border border-[rgb(var(--sep-colour-765937))]/60 bg-[rgb(var(--sep-colour-261b12))] px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d2b783))]">Save Price</button></div>
                    <label className="lg:col-span-12"><span className={lab}>Manifestation</span><textarea required rows={3} name="manifestation" defaultValue={price.manifestation} className={cls}/></label>
                  </form>
                  <form action={deleteWarpingPrice} className="mt-3 flex justify-end">
                    <input type="hidden" name="price_key" value={price.key}/>
                    <button type="submit" className="border border-red-900/60 bg-red-950/20 px-3 py-2 text-[7px] uppercase tracking-[0.14em] text-red-300">Delete Price</button>
                  </form>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-[rgb(var(--sep-colour-60482e))]/35 pt-5">
              <h3 className="font-serif text-xl text-[rgb(var(--sep-colour-d8c29b))]">Create New Price</h3>
              <form action={createWarpingPrice} className="mt-4 grid gap-3 lg:grid-cols-12">
                <label className="lg:col-span-1"><span className={lab}>#</span><input required type="number" min={1} name="price_number" className={cls}/></label>
                <label className="lg:col-span-3"><span className={lab}>Name</span><input required name="price_name" className={cls}/></label>
                <label className="lg:col-span-2"><span className={lab}>Key</span><input required name="price_key" placeholder="e.g. glass_skin" pattern="[a-z0-9_]+" className={cls}/></label>
                <label className="lg:col-span-1"><span className={lab}>Stage</span><select name="price_stage" defaultValue={1} className={cls}><option value={1}>I</option><option value={2}>II</option><option value={3}>III</option></select></label>
                <label className="lg:col-span-2"><span className={lab}>Duration Days</span><input required type="number" min={1} name="duration_days" defaultValue={2} className={cls}/></label>
                <div className="flex items-end lg:col-span-3"><button type="submit" className="w-full border border-[rgb(var(--sep-colour-765937))]/60 bg-[rgb(var(--sep-colour-261b12))] px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d2b783))]">Create Price</button></div>
                <label className="lg:col-span-12"><span className={lab}>Manifestation</span><textarea required rows={3} name="manifestation" className={cls}/></label>
              </form>
            </div>
          </div>
        </details>

        <section
          id="shape-new"
''',
    "page price manager",
)

out["page"] = one(
    out["page"],
    '''          <WarpingReference/>
          <ShapeForm action={createShape}/>
''',
    '''          <WarpingReference
            prices={prices.map((price)=>({
              key:price.key,
              number:price.number,
              name:price.name,
              stage:price.stage,
              durationDays:price.duration_days,
              manifestation:price.manifestation,
            }))}
          />
          <ShapeForm
            action={createShape}
            priceOptions={priceOptions}
          />
''',
    "page create shape",
)
out["page"] = one(
    out["page"],
    '''              <ShapeForm
                s={selectedShape}
                action={updateShape}
              />
''',
    '''              <ShapeForm
                s={selectedShape}
                action={updateShape}
                priceOptions={priceOptions}
              />
''',
    "page edit shape",
)

types_text = '''export type WarpingPriceDefinition = {
  key: string;
  number: number;
  name: string;
  stage: number;
  durationDays: number;
  manifestation: string;
};
'''

hook_text = '''"use client";

import { useEffect,useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { WarpingPriceDefinition } from "@/lib/warping/warping-price-types";

let cache:WarpingPriceDefinition[]|null=null;
let loadedAt=0;
let pending:Promise<WarpingPriceDefinition[]>|null=null;

async function loadPrices(){
  if(cache&&Date.now()-loadedAt<30000)return cache;
  if(pending)return pending;

  pending=(async()=>{
    const db=createClient();
    const {data,error}=await db
      .from("warping_prices")
      .select("key,number,name,stage,duration_days,manifestation")
      .order("number");

    if(error)throw new Error(error.message);

    cache=(data??[]).map((row)=>({
      key:String(row.key),
      number:Number(row.number),
      name:String(row.name),
      stage:Number(row.stage),
      durationDays:Number(row.duration_days),
      manifestation:String(row.manifestation??""),
    }));

    loadedAt=Date.now();
    return cache;
  })();

  try{
    return await pending;
  }finally{
    pending=null;
  }
}

export function useWarpingPrices(){
  const [prices,setPrices]=useState<WarpingPriceDefinition[]>(cache??[]);

  useEffect(()=>{
    let active=true;

    void loadPrices()
      .then((next)=>{
        if(active)setPrices(next);
      })
      .catch((error)=>{
        console.error("Unable to load Warping Prices:",error);
      });

    return()=>{active=false;};
  },[]);

  return prices;
}
'''

for token, key in [
    ("WARPING_PRICE_DEFINITIONS", "reference"),
    ("PRICE_LABELS", "catalogue"),
    ("const PM:", "panel"),
    ("options={PRICES}", "page"),
]:
    if token in out[key]:
        raise RuntimeError(f"Validation failed: {token} still remains in {paths[key]}")

for key, p in paths.items():
    p.write_text(out[key], encoding="utf-8")

new_types.write_text(types_text, encoding="utf-8")
new_hook.write_text(hook_text, encoding="utf-8")

print("Patch applied.")
print("Run warping-prices-migration.sql in Supabase BEFORE testing/deploying.")
print("Then:")
print("  git status --short")
print("  git --no-pager diff --stat")
print("  npm run build")
