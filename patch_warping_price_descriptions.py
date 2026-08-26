#!/usr/bin/env python3
from __future__ import annotations

import re
import shutil
import sys
from pathlib import Path

ROOT = Path.cwd()

CONSTANTS = ROOT / "lib/warping/constants.ts"
REFERENCE = ROOT / "components/admin/warping-reference.tsx"
CATALOGUE = ROOT / "components/warping/shapes-catalogue.tsx"
WARPING_PANEL = ROOT / "app/(portal)/game/components/WarpingPanel.tsx"
ACTIVE_PRICES = ROOT / "components/characters/ActivePriceEffects.tsx"
ROOM_MESSAGES = ROOT / "app/(portal)/game/components/RoomMessageList.tsx"

PRICE_DEFS = ROOT / "lib/warping/price-definitions.ts"
PRICE_TOOLTIP = ROOT / "components/warping/price-tooltip.tsx"

BACKUP = ".bak-price-descriptions"

PRICE_DEFS_CONTENT = r'''export type WarpingPriceDefinition = {
  key: string;
  number: number;
  name: string;
  stage: 1 | 2 | 3;
  stageLabel: "I" | "II" | "III";
  durationDays: 2 | 5 | 10;
  manifestation: string;
};

export const WARPING_PRICE_DEFINITIONS: readonly WarpingPriceDefinition[] = [
  { key: "cinder_eyes", number: 1, name: "Cinder Eyes", stage: 1, stageLabel: "I", durationDays: 2, manifestation: "The Warper's eyes change colour, developing an unnatural metallic or Cinder-like quality." },
  { key: "luminous_veins", number: 2, name: "Luminous Veins", stage: 1, stageLabel: "I", durationDays: 2, manifestation: "Faintly luminous veins become visible beneath the skin, intensifying when the Current is channelled." },
  { key: "cinderblood", number: 3, name: "Cinderblood", stage: 1, stageLabel: "I", durationDays: 2, manifestation: "Traces of Cinder manifest within the Warper's blood." },
  { key: "dreamtouched", number: 4, name: "Dreamtouched", stage: 1, stageLabel: "I", durationDays: 2, manifestation: "The Warper experiences intensely vivid dreams, some of which appear prophetic." },
  { key: "beastmarked", number: 5, name: "Beastmarked", stage: 1, stageLabel: "I", durationDays: 2, manifestation: "Animals instinctively react to the Warper's presence, whether through attraction, submission, agitation or fear." },
  { key: "bloomwake", number: 6, name: "Bloomwake", stage: 2, stageLabel: "II", durationDays: 5, manifestation: "Plant life responds unnaturally to the Warper's presence, blooming or growing around them." },
  { key: "witherwake", number: 7, name: "Witherwake", stage: 2, stageLabel: "II", durationDays: 5, manifestation: "Nearby plant life wilts, discolours or withers in response to the Warper's presence." },
  { key: "upstream", number: 8, name: "Upstream", stage: 2, stageLabel: "II", durationDays: 5, manifestation: "Water near the Warper occasionally defies gravity or flows in impossible directions." },
  { key: "unbound_shadow", number: 9, name: "Unbound Shadow", stage: 2, stageLabel: "II", durationDays: 5, manifestation: "The Warper's shadow sometimes moves independently of the body casting it." },
  { key: "starbound", number: 10, name: "Starbound", stage: 2, stageLabel: "II", durationDays: 5, manifestation: "Stars appear subtly to change position or follow the Warper from their perspective." },
  { key: "false_remembrance", number: 11, name: "False Remembrance", stage: 2, stageLabel: "II", durationDays: 5, manifestation: "People around the Warper occasionally remember events involving them that never actually occurred." },
  { key: "current_sighted", number: 12, name: "Current-Sighted", stage: 3, stageLabel: "III", durationDays: 10, manifestation: "The Warper gains direct perception of the Current woven through reality for the duration of the manifestation." },
  { key: "godwhispered", number: 13, name: "Godwhispered", stage: 3, stageLabel: "III", durationDays: 10, manifestation: "The Warper hears what appear to be the distant voices of the dead gods." },
  { key: "realitys_misstep", number: 14, name: "Reality's Misstep", stage: 3, stageLabel: "III", durationDays: 10, manifestation: "Reality occasionally fails to behave normally around the Warper: reflections lag, distances seem subtly wrong, or their physical presence appears momentarily displaced." },
  { key: "unmoored", number: 15, name: "Unmoored", stage: 3, stageLabel: "III", durationDays: 10, manifestation: "The Warper's relationship with ordinary physical reality becomes visibly unstable: gravity, light, matter or space may react incorrectly to their presence." },
] as const;

export const WARPING_PRICE_BY_KEY = Object.fromEntries(
  WARPING_PRICE_DEFINITIONS.map((price) => [price.key, price]),
) as Record<string, WarpingPriceDefinition>;

export function getWarpingPriceDefinition(key: string | null | undefined): WarpingPriceDefinition | null {
  return key ? WARPING_PRICE_BY_KEY[key] ?? null : null;
}

export function getWarpingPriceDefinitionFromText(value: string | null | undefined): WarpingPriceDefinition | null {
  if (!value) return null;
  const cleanName = value.replace(/\s*\(Stage\s+(?:I|II|III|\d+)\)\s*$/i, "").trim().toLowerCase();
  return WARPING_PRICE_DEFINITIONS.find((price) => price.name.toLowerCase() === cleanName) ?? null;
}
'''

PRICE_TOOLTIP_CONTENT = r'''import type { ReactNode } from "react";
import {
  getWarpingPriceDefinition,
  getWarpingPriceDefinitionFromText,
} from "@/lib/warping/price-definitions";

export function PriceTooltip({
  priceKey,
  displayText,
  children,
  className = "",
}: {
  priceKey?: string | null;
  displayText?: string | null;
  children: ReactNode;
  className?: string;
}) {
  const price =
    getWarpingPriceDefinition(priceKey) ??
    getWarpingPriceDefinitionFromText(displayText);

  if (!price) return <>{children}</>;

  return (
    <span className={`group/price relative inline-flex cursor-help ${className}`} tabIndex={0}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-[80] mb-2 hidden w-[280px] max-w-[80vw] -translate-x-1/2 border border-[rgb(var(--sep-colour-765937))]/70 bg-[rgb(var(--sep-colour-0b0806))] px-3 py-2.5 text-left normal-case tracking-normal shadow-xl group-hover/price:block group-focus-within/price:block"
      >
        <span className="block font-serif text-[12px] text-[rgb(var(--sep-colour-dec89f))]">{price.name}</span>
        <span className="mt-1 block text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-b99765))]">
          Stage {price.stageLabel} · {price.durationDays} days
        </span>
        <span className="mt-2 block text-[9px] leading-4 text-[rgb(var(--sep-colour-b9aa94))]">
          {price.manifestation}
        </span>
      </span>
    </span>
  );
}
'''

def backup(path: Path) -> None:
    dest = path.with_name(path.name + BACKUP)
    if not dest.exists():
        shutil.copy2(path, dest)

def main() -> None:
    required = [CONSTANTS, REFERENCE, CATALOGUE, WARPING_PANEL, ACTIVE_PRICES, ROOM_MESSAGES]
    missing = [str(p.relative_to(ROOT)) for p in required if not p.exists()]
    if missing:
        raise RuntimeError("Run from repo root. Missing: " + ", ".join(missing))
    if PRICE_DEFS.exists() or PRICE_TOOLTIP.exists():
        raise RuntimeError("Price description files already exist; refusing to overwrite.")

    for p in required:
        backup(p)

    PRICE_DEFS.write_text(PRICE_DEFS_CONTENT, encoding="utf-8")
    PRICE_TOOLTIP.write_text(PRICE_TOOLTIP_CONTENT, encoding="utf-8")

    # constants.ts
    text = CONSTANTS.read_text(encoding="utf-8")
    text = 'import { WARPING_PRICE_DEFINITIONS } from "@/lib/warping/price-definitions";\n\n' + text
    pattern = re.compile(r'export const PRICES = \[\n.*?\n\] as const;', re.S)
    replacement = '''export const PRICES = WARPING_PRICE_DEFINITIONS.map(
  (price) => [
    price.key,
    `${price.name} — Stage ${price.stageLabel} — ${price.durationDays} days`,
  ] as const,
);'''
    text, n = pattern.subn(replacement, text, count=1)
    if n != 1:
        raise RuntimeError("Could not replace PRICES in constants.ts")
    CONSTANTS.write_text(text, encoding="utf-8")

    # warping-reference.tsx
    text = REFERENCE.read_text(encoding="utf-8")
    text = 'import { WARPING_PRICE_DEFINITIONS } from "@/lib/warping/price-definitions";\n\n' + text
    marker = '''        <div className="mt-5">
          <h4 className="font-serif text-base text-[rgb(var(--sep-colour-d8c29b))]">Movements</h4>'''
    table = '''        <div className="mt-5">
          <h4 className="font-serif text-base text-[rgb(var(--sep-colour-d8c29b))]">Prices</h4>
          <div className="mt-2 max-h-[520px] overflow-y-auto border border-[rgb(var(--sep-colour-60482e))]/35">
            <table className="w-full text-left text-[10px]">
              <thead className="sticky top-0 bg-[rgb(var(--sep-colour-1d150f))] text-[rgb(var(--sep-colour-9e825d))]">
                <tr><th className="px-3 py-2">#</th><th className="px-3 py-2">Price</th><th className="px-3 py-2">Stage / Duration</th><th className="px-3 py-2">Manifestation while active</th></tr>
              </thead>
              <tbody>
                {WARPING_PRICE_DEFINITIONS.map((price) => (
                  <tr key={price.key} className="border-t border-[rgb(var(--sep-colour-60482e))]/25 align-top">
                    <td className="px-3 py-2 text-[rgb(var(--sep-colour-8e785a))]">{price.number}</td>
                    <td className="px-3 py-2 font-serif text-[rgb(var(--sep-colour-d9c29b))]">{price.name}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-[rgb(var(--sep-colour-c2ac88))]">{price.stageLabel} — {price.durationDays} days</td>
                    <td className="px-3 py-2 leading-5 text-[rgb(var(--sep-colour-a99b89))]">{price.manifestation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

'''
    if marker not in text:
        raise RuntimeError("Could not locate Movements section")
    text = text.replace(marker, table + marker, 1)
    REFERENCE.write_text(text, encoding="utf-8")

    # shapes-catalogue.tsx
    text = CATALOGUE.read_text(encoding="utf-8")
    anchor = '''import {
  ShapeExtendedDescription,
} from "@/components/warping/shape-extended-description";
'''
    if anchor in text:
        text = text.replace(anchor, anchor + '''import {
  PriceTooltip,
} from "@/components/warping/price-tooltip";
''', 1)
    old = '''                {shape.price_key
                  ? PRICE_LABELS[shape.price_key] ??
                    pretty(shape.price_key)
                  : "None"}'''
    new = '''                {shape.price_key ? (
                  <PriceTooltip priceKey={shape.price_key}>
                    <span className="underline decoration-dotted underline-offset-2">
                      {PRICE_LABELS[shape.price_key] ?? pretty(shape.price_key)}
                    </span>
                  </PriceTooltip>
                ) : (
                  "None"
                )}'''
    if old not in text:
        raise RuntimeError("Could not locate Shape catalogue Price renderer")
    text = text.replace(old, new, 1)
    CATALOGUE.write_text(text, encoding="utf-8")

    # WarpingPanel.tsx
    text = WARPING_PANEL.read_text(encoding="utf-8")
    anchor = 'import { getShapeAccessForCurrentCharacter } from "../warping-progression-actions";'
    if anchor not in text:
        raise RuntimeError("Could not locate WarpingPanel import anchor")
    text = text.replace(anchor, anchor + '\nimport { PriceTooltip } from "@/components/warping/price-tooltip";', 1)
    old = '<span><b className="text-[rgb(var(--sep-colour-cdb48d))]">Price:</b> {price}</span>'
    new = '<span><b className="text-[rgb(var(--sep-colour-cdb48d))]">Price:</b> {shape.price_key?<PriceTooltip priceKey={shape.price_key}><span className="underline decoration-dotted underline-offset-2">{price}</span></PriceTooltip>:price}</span>'
    if old not in text:
        raise RuntimeError("Could not locate WarpingPanel Price renderer")
    text = text.replace(old, new, 1)
    WARPING_PANEL.write_text(text, encoding="utf-8")

    # ActivePriceEffects.tsx
    active = r'''import "server-only";
import { createClient } from "@/lib/supabase/server";
import { PriceTooltip } from "@/components/warping/price-tooltip";
import { getWarpingPriceDefinition } from "@/lib/warping/price-definitions";

export async function ActivePriceEffects({characterId}:{characterId:string}) {
  const db=await createClient();
  const q=await db.from("character_price_effects").select("id,price_key,stage,expires_at").eq("character_id",characterId).gt("expires_at",new Date().toISOString()).order("expires_at");
  if(q.error)throw Error(q.error.message);
  if(!q.data?.length)return null;

  return <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 p-5 sm:p-6">
    <h2 className="font-serif text-2xl text-[rgb(var(--sep-colour-dec89f))]">The Price</h2>
    <div className="mt-3 flex flex-wrap gap-2">
      {q.data.map(effect=>{
        const def=getWarpingPriceDefinition(effect.price_key);
        return <PriceTooltip key={effect.id} priceKey={effect.price_key}>
          <span className="border border-[rgb(var(--sep-colour-765937))]/70 bg-[rgb(var(--sep-colour-21170f))] px-2 py-1 text-[8px] uppercase text-[rgb(var(--sep-colour-d9b77f))] underline decoration-dotted underline-offset-2">
            {def?.name??effect.price_key} · Stage {effect.stage}
          </span>
        </PriceTooltip>;
      })}
    </div>
  </section>;
}
'''
    ACTIVE_PRICES.write_text(active, encoding="utf-8")

    # RoomMessageList.tsx
    text = ROOM_MESSAGES.read_text(encoding="utf-8")
    anchor = 'import { ReportButton } from "@/components/reports/report-button";\n'
    if anchor not in text:
        raise RuntimeError("Could not locate RoomMessageList import anchor")
    text = text.replace(anchor, anchor + 'import { PriceTooltip } from "@/components/warping/price-tooltip";\n', 1)
    start = text.find("  function shapeTagText(characterId:string){")
    end = text.find("  useEffect(() => {", start)
    if start == -1 or end == -1:
        raise RuntimeError("Could not locate chat tag helper functions")
    helper = r'''  function renderShapeTagGroups(characterId:string,trailingDivider:boolean){
    const tags=activeShapeTags[characterId];
    if(!tags)return null;

    const normalGroups:string[]=[];
    if(tags.buffs.length)normalGroups.push(tags.buffs.join(" - "));
    if(tags.debuffs.length)normalGroups.push(tags.debuffs.join(" - "));
    if(tags.conditions.length)normalGroups.push(tags.conditions.join(" - "));

    if(!normalGroups.length&&!tags.prices.length)return null;

    return (
      <span className="text-[9px] uppercase tracking-[.04em] text-[rgb(var(--sep-colour-b99765))]">
        {" | "}
        {normalGroups.length?normalGroups.join(" | "):null}
        {normalGroups.length&&tags.prices.length?" | ":null}
        {tags.prices.map((price,index)=>(
          <Fragment key={`${price}-${index}`}>
            {index>0?" - ":null}
            <PriceTooltip displayText={price}>
              <span className="underline decoration-dotted underline-offset-2">{price}</span>
            </PriceTooltip>
          </Fragment>
        ))}
        {trailingDivider?" | ":null}
      </span>
    );
  }

  function shapeTagText(characterId:string){
    return renderShapeTagGroups(characterId,true);
  }

  function shapeTagHeaderText(characterId:string){
    return renderShapeTagGroups(characterId,false);
  }

'''
    text = text[:start] + helper + text[end:]
    ROOM_MESSAGES.write_text(text, encoding="utf-8")

    print("Applied Price descriptions/reference patch.")
    print("Run: npm run build")
    print("Backups use suffix:", BACKUP)

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"PATCH FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
