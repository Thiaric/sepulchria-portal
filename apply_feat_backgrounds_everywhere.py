from pathlib import Path

ROOT=Path.cwd()
CAT=ROOT/"components/gifts/gifts-catalogue.tsx"
ADMIN=ROOT/"app/(portal)/admin/gifts/page.tsx"
SELECTOR=ROOT/"components/admin/admin-ancestry-gift-selector.tsx"
CHAR=ROOT/"app/(portal)/admin/characters/[id]/page.tsx"
for f in (CAT,ADMIN,SELECTOR,CHAR):
    if not f.exists(): raise SystemExit(f"ERROR: run from repo root; missing {f}")

UTIL=ROOT/"lib/gifts/feat-background.ts"
UTIL.parent.mkdir(parents=True,exist_ok=True)
UTIL.write_text('''export const FEAT_ANCESTRY_BACKGROUND_SLUGS: Record<string, string> = {
  Aelari:"aelari", Birdfolk:"birdfolk", Cambions:"cambions", Dwarves:"dwarves",
  "Fair Folk":"fair-folk", Gharuk:"gharuk", Littlings:"littlings", Humans:"humans",
  Karesh:"karesh", "Reptilian Folk":"reptilian-folk", Siranthi:"siranthi",
  Vampires:"vampires", Vaskari:"vaskari", Werewolves:"werewolves",
};

export function featAncestrySlug(name: string) {
  return FEAT_ANCESTRY_BACKGROUND_SLUGS[name] ??
    name.trim().toLowerCase().replace(/[\\'’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function featBackgroundFromNames({ ancestryNames=[], hasOrder=false }:{
  ancestryNames?: string[]; hasOrder?: boolean;
}) {
  if (ancestryNames.length === 1)
    return `/backgrounds/feats/ancestries/${featAncestrySlug(ancestryNames[0])}.png`;
  if (ancestryNames.length > 1) return "/backgrounds/feats/ancestry.png";
  if (hasOrder) return "/backgrounds/feats/order.png";
  return "/backgrounds/feats/general.png";
}

export function featBackgroundStyle(image:string) {
  return {
    backgroundImage: `linear-gradient(rgb(var(--sep-colour-100d0b) / 82%), rgb(var(--sep-colour-100d0b) / 82%)), url("${image}")`,
    backgroundSize:"cover", backgroundPosition:"center", backgroundRepeat:"no-repeat",
  };
}
''',encoding="utf-8")

# canonical catalogue
s=CAT.read_text(encoding="utf-8")
imp='import { featBackgroundFromNames, featBackgroundStyle } from "@/lib/gifts/feat-background";\n'
if imp not in s:
    i=s.find("import ")
    s=s[:i]+imp+s[i:]
a=s.find("const FEAT_ANCESTRY_BACKGROUND_SLUGS:")
b=s.find("function RecapBox({",a) if a>=0 else -1
if a>=0 and b>=0: s=s[:a]+s[b:]
if "function featBackgroundImage(gift: GiftCard)" not in s:
    m="function RecapBox({"
    h='''function featBackgroundImage(gift: GiftCard) {
  return featBackgroundFromNames({
    ancestryNames: gift.ancestries.map((ancestry) => ancestry.name),
    hasOrder: gift.roles.length > 0,
  });
}

'''
    if m not in s: raise SystemExit("ERROR catalogue marker")
    s=s.replace(m,h+m,1)
old='''      style={{
        backgroundImage: `
          linear-gradient(
            rgb(var(--sep-colour-100d0b) / 82%),
            rgb(var(--sep-colour-100d0b) / 82%)
          ),
          url("${backgroundImage}")
        `,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}'''
if old in s: s=s.replace(old,'      style={featBackgroundStyle(backgroundImage)}',1)
CAT.write_text(s,encoding="utf-8")

# admin gifts
s=ADMIN.read_text(encoding="utf-8")
imp='import { featBackgroundFromNames, featBackgroundStyle } from "@/lib/gifts/feat-background";\n'
anchor='import { createClient } from "@/lib/supabase/server";\n'
if imp not in s:
    if anchor not in s: raise SystemExit("ERROR admin import")
    s=s.replace(anchor,anchor+imp,1)
if "type GiftRaceLink" not in s:
    s=s.replace('type Race = { id: string; name: string };','''type Race = { id: string; name: string };
type GiftRaceLink = {
  race_id: string;
  race: { id: string; name: string } | { id: string; name: string }[] | null;
};''',1)
s=s.replace('  races: { race_id: string }[] | null;','  races: GiftRaceLink[] | null;',1)
s=s.replace('          races:gift_races(race_id),','''          races:gift_races(
            race_id,
            race:races(id, name)
          ),''',1)
if "function adminGiftBackground" not in s:
    m="function adminTargetLabel(gift: Gift) {"
    h='''function adminGiftBackground(gift: Gift) {
  const ancestryNames = (gift.races ?? [])
    .map((entry) => one(entry.race)?.name ?? null)
    .filter((name): name is string => Boolean(name));
  return featBackgroundFromNames({ ancestryNames, hasOrder: Boolean(gift.roles?.length) });
}

'''
    if m not in s: raise SystemExit("ERROR admin helper")
    s=s.replace(m,h+m,1)
a='''              href={`/admin/gifts?gift=${gift.id}#gift-editor`}
              className={['''
r='''              href={`/admin/gifts?gift=${gift.id}#gift-editor`}
              data-feat-background={adminGiftBackground(gift)}
              style={featBackgroundStyle(adminGiftBackground(gift))}
              className={['''
if "data-feat-background={adminGiftBackground(gift)}" not in s:
    if a not in s: raise SystemExit("ERROR admin card")
    s=s.replace(a,r,1)
s=s.replace('"scroll-mt-6 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-4 py-4 transition hover:border-[rgb(var(--sep-colour-8d693e))] hover:bg-[rgb(var(--sep-colour-17110d))]"','"relative overflow-hidden scroll-mt-6 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-4 py-4 transition hover:border-[rgb(var(--sep-colour-8d693e))]"',1)
s=s.replace('<div className="flex items-start justify-between gap-3 admin_gifts_page_div_container_5">','<div className="relative z-[1] flex items-start justify-between gap-3 admin_gifts_page_div_container_5">',1)
s=s.replace('<div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-[rgb(var(--sep-colour-59432c))]/25 pt-3 admin_gifts_page_div_container_7">','<div className="relative z-[1] mt-3 grid grid-cols-2 gap-1.5 border-t border-[rgb(var(--sep-colour-59432c))]/25 pt-3 admin_gifts_page_div_container_7">',1)
ADMIN.write_text(s,encoding="utf-8")

# selector
s=SELECTOR.read_text(encoding="utf-8")
imp='import { featBackgroundFromNames, featBackgroundStyle } from "@/lib/gifts/feat-background";\n'
if imp not in s:
    a='} from "react";\n'
    if a not in s: raise SystemExit("ERROR selector import")
    s=s.replace(a,a+imp,1)
if "raceNames?: string[];" not in s:
    s=s.replace('  raceIds: string[];\n  choiceGroup:', '  raceIds: string[];\n  raceNames?: string[];\n  choiceGroup:',1)
a='''              const disabled =
                !checked &&
                selected.length >= 2;

              return ('''
r='''              const disabled =
                !checked &&
                selected.length >= 2;

              const backgroundImage =
                featBackgroundFromNames({
                  ancestryNames: gift.raceNames ?? [],
                });

              return ('''
if "const backgroundImage =" not in s:
    if a not in s: raise SystemExit("ERROR selector map")
    s=s.replace(a,r,1)
a='''                  data-sep-ui-ignore="true"
                  disabled={disabled}'''
r='''                  data-sep-ui-ignore="true"
                  data-feat-background={backgroundImage}
                  style={featBackgroundStyle(backgroundImage)}
                  disabled={disabled}'''
if "data-feat-background={backgroundImage}" not in s:
    if a not in s: raise SystemExit("ERROR selector button")
    s=s.replace(a,r,1)
SELECTOR.write_text(s,encoding="utf-8")

# admin character query/data
s=CHAR.read_text(encoding="utf-8")
s=s.replace("races:gift_races(race_id)", "races:gift_races(race_id, race:races(id, name))")
needle='''      raceIds: (gift.races ?? []).map((entry) => entry.race_id),
      choiceGroup:'''
repl='''      raceIds: (gift.races ?? []).map((entry) => entry.race_id),
      raceNames: (gift.races ?? [])
        .map((entry: any) => {
          const race = one<any>(entry.race);
          return race?.name ?? null;
        })
        .filter((name: string | null): name is string => Boolean(name)),
      choiceGroup:'''
if "raceNames:" not in s:
    if needle not in s: raise SystemExit("ERROR admin character options")
    s=s.replace(needle,repl,1)
CHAR.write_text(s,encoding="utf-8")

base=ROOT/"public/backgrounds/feats"
(base/"ancestries").mkdir(parents=True,exist_ok=True)
print("SUCCESS")
print("Shared resolver:",UTIL)
print("Covered: /feats, character sheets, /admin/gifts, /admin/characters/[id] owned Feats and ancestry selector.")
