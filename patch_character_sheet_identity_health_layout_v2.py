#!/usr/bin/env python3
from pathlib import Path
import argparse
import subprocess

BASELINE = "1d6e253e2c0c1c17471af5dce3608357583654b1"

FILES = [
    "app/(portal)/character/page.tsx",
    "components/characters/public-character-profile.tsx",
    "components/characters/character-order-summary.tsx",
    "components/characters/public-character-order.tsx",
    "components/characters/character-mechanics-display.tsx",
    "types/public-character.ts",
    "lib/orders/get-public-order-membership.ts",
]

def die(message):
    raise SystemExit(f"ERROR: {message}. Nothing written.")

def baseline_text(path):
    try:
        return subprocess.check_output(
            ["git", "show", f"{BASELINE}:{path}"],
            text=True,
            encoding="utf-8",
        )
    except subprocess.CalledProcessError:
        die(f"could not read {path} from baseline commit")

def once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        die(f"{label}: expected exact baseline block once, found {count}")
    return text.replace(old, new, 1)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    root = Path.cwd()
    if not (root / "package.json").exists():
        die("run this from the sepulchria-portal root")

    head = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
    if head != BASELINE:
        die(f"HEAD is {head}; expected {BASELINE}")

    out = {path: baseline_text(path) for path in FILES}

    # types/public-character.ts
    p = "types/public-character.ts"
    s = out[p]
    s = once(
        s,
        '    slug: string;\n    colour: string | null;\n  };',
        '    slug: string;\n    icon_url: string | null;\n    colour: string | null;\n  };',
        "public order icon type",
    )
    out[p] = s

    # lib/orders/get-public-order-membership.ts
    p = "lib/orders/get-public-order-membership.ts"
    s = out[p]
    s = once(
        s,
        '          name,\n          slug,\n          colour,',
        '          name,\n          slug,\n          icon_url,\n          colour,',
        "public order icon select",
    )
    s = once(
        s,
        '      slug: string;\n      colour: string | null;\n      association:',
        '      slug: string;\n      icon_url: string | null;\n      colour: string | null;\n      association:',
        "public order icon row type",
    )
    s = once(
        s,
        '      slug: order.slug,\n      colour: order.colour,',
        '      slug: order.slug,\n      icon_url: order.icon_url,\n      colour: order.colour,',
        "public order icon return",
    )
    out[p] = s

    # character-order-summary.tsx: replace entire file with compact server card
    out["components/characters/character-order-summary.tsx"] = '''import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

type Relation<T> = T | T[] | null;

function one<T>(value: Relation<T>): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function CharacterOrderSummary({
  characterId,
}: {
  characterId: string;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("order_memberships")
    .select(`
      order:orders!order_memberships_order_id_fkey(
        id,
        name,
        slug,
        icon_url,
        colour
      ),
      job:order_jobs!order_memberships_order_job_id_fkey(
        id,
        name
      )
    `)
    .eq("character_id", characterId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "Unable to load character Order:",
      error.message,
    );
  }

  const order = data
    ? one(
        data.order as Relation<{
          id: string;
          name: string;
          slug: string;
          icon_url: string | null;
          colour: string | null;
        }>,
      )
    : null;

  const role = data
    ? one(
        data.job as Relation<{
          id: string;
          name: string;
        }>,
      )
    : null;

  const colour = order?.colour ?? "#8d6d3e";
  const display = order
    ? `${order.name} - ${role?.name ?? "No specific role"}`
    : "No Order";

  return (
    <Link
      href={order ? `/orders/${order.slug}` : "/orders"}
      title={display}
      className="group flex min-w-0 items-center gap-2.5 border border-[rgb(var(--sep-colour-59432c))]/45 bg-black/15 px-2.5 py-2 transition hover:bg-[rgb(var(--sep-colour-1b140f))]"
      style={{
        backgroundImage: `linear-gradient(90deg, ${colour}18, transparent 55%)`,
      }}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden border bg-[rgb(var(--sep-colour-0d0907))] font-serif text-[10px]"
        style={{
          borderColor: `${colour}88`,
          color: colour,
        }}
      >
        {order?.icon_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={order.icon_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          order?.name.charAt(0).toUpperCase() ?? "?"
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[7px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-735f47))]">
          Order
        </p>
        <p
          className="mt-0.5 truncate text-[11px]"
          style={{ color: order ? colour : "#675e52" }}
        >
          {display}
        </p>
      </div>
    </Link>
  );
}
'''

    # public-character-order.tsx: compact card
    out["components/characters/public-character-order.tsx"] = '''import Link from "next/link";

import type { PublicOrderMembership } from "@/types/public-character";

export function PublicCharacterOrder({
  membership,
}: {
  membership: PublicOrderMembership | null;
}) {
  const colour =
    membership?.order.colour ??
    membership?.association?.colour ??
    "#8d6d3e";

  const display = membership
    ? `${membership.order.name} - ${membership.job?.name ?? "No specific role"}`
    : "No Order";

  return (
    <Link
      href={membership ? `/orders/${membership.order.slug}` : "/orders"}
      title={display}
      className="group flex min-w-0 items-center gap-2.5 border border-[rgb(var(--sep-colour-59432c))]/45 bg-black/15 px-2.5 py-2 transition hover:bg-[rgb(var(--sep-colour-1b140f))]"
      style={{
        backgroundImage: `linear-gradient(90deg, ${colour}18, transparent 55%)`,
      }}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden border bg-[rgb(var(--sep-colour-0d0907))] font-serif text-[10px]"
        style={{
          borderColor: `${colour}88`,
          color: colour,
        }}
      >
        {membership?.order.icon_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={membership.order.icon_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          membership?.order.name.charAt(0).toUpperCase() ?? "?"
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[7px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-735f47))]">
          Order
        </p>
        <p
          className="mt-0.5 truncate text-[11px]"
          style={{ color: membership ? colour : "#675e52" }}
        >
          {display}
        </p>
      </div>
    </Link>
  );
}
'''

    # mechanics: remove existing Health section and add standalone health component
    p = "components/characters/character-mechanics-display.tsx"
    s = out[p]

    calc_start = s.index("  const maxHealth =")
    return_start = s.index("\n  return (", calc_start)
    s = s[:calc_start] + s[return_start:]

    health_heading = s.index("\n            Health\n")
    section_start = s.rfind("      <section", 0, health_heading)
    section_end_marker = "      </section>\n    </div>\n  );\n}"
    section_end = s.index(section_end_marker, health_heading)
    s = s[:section_start] + s[section_end + len("      </section>\n"):]

    health_component = '''

export async function CharacterHealthDisplay({
  characterId,
}: {
  characterId: string;
}) {
  const supabase = await createClient();

  const { data: character, error } = await supabase
    .from("characters")
    .select(
      "muscles, reflexes, vigor, brains, shrewd, presence_score, current_health",
    )
    .eq("id", characterId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load character health: ${error.message}`,
    );
  }

  if (!character) {
    return null;
  }

  const breakdown = await getCharacterAttributeBreakdown(
    characterId,
    {
      muscles: character.muscles,
      reflexes: character.reflexes,
      vigor: character.vigor,
      brains: character.brains,
      shrewd: character.shrewd,
      presence_score: character.presence_score,
    },
  );

  const maxHealth =
    breakdown.vigor.effective === null
      ? null
      : Math.max(
          0,
          breakdown.vigor.effective * 10 +
            breakdown.giftMaxHealth +
            breakdown.itemMaxHealth +
            breakdown.activeItemMaxHealth +
            breakdown.shapeMaxHealth,
        );

  const currentHealth =
    maxHealth === null
      ? null
      : Math.max(
          0,
          Math.min(
            character.current_health ?? maxHealth,
            maxHealth,
          ),
        );

  const healthPercentage =
    maxHealth && currentHealth !== null
      ? Math.round((currentHealth / maxHealth) * 100)
      : 0;

  return (
    <section className="flex h-full min-h-[88px] flex-col justify-center border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 px-4 py-3">
      <div className="flex items-end justify-between gap-4">
        <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
          Health
        </p>

        <p className="font-serif text-xl text-[rgb(var(--sep-colour-e1c28d))]">
          {currentHealth === null || maxHealth === null
            ? "—"
            : `${currentHealth} / ${maxHealth}`}
        </p>
      </div>

      <div className="mt-2 h-2 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-0d0907))]">
        <div
          className="h-full bg-gradient-to-r from-[rgb(var(--sep-colour-7b2f2a))] via-[rgb(var(--sep-colour-a94f3f))] to-[rgb(var(--sep-colour-c26a50))] transition-[width] duration-300"
          style={{ width: `${healthPercentage}%` }}
        />
      </div>

      {maxHealth !== null ? (
        <p className="mt-2 text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-776957))]">
          Maximum = Effective Vigour × 10
          {breakdown.giftMaxHealth !== 0
            ? ` ${signed(breakdown.giftMaxHealth)} Feat`
            : ""}
          {breakdown.itemMaxHealth !== 0
            ? ` ${signed(breakdown.itemMaxHealth)} Item`
            : ""}
          {breakdown.activeItemMaxHealth !== 0
            ? ` ${signed(breakdown.activeItemMaxHealth)} Active Item`
            : ""}
          {breakdown.shapeMaxHealth !== 0
            ? ` ${signed(breakdown.shapeMaxHealth)} Shape`
            : ""}
        </p>
      ) : null}
    </section>
  );
}
'''
    s = s.rstrip() + health_component
    out[p] = s

    # own page
    p = "app/(portal)/character/page.tsx"
    s = out[p]
    s = once(
        s,
        'import { CharacterMechanicsDisplay } from "@/components/characters/character-mechanics-display";',
        'import { CharacterHealthDisplay, CharacterMechanicsDisplay } from "@/components/characters/character-mechanics-display";',
        "own health import",
    )

    old = '''              <div className="h-full">
                <CompactHeritageCard
                  label="Ancestry"
                  entry={race}
                  href={
                    race
                      ? `/ancestries/${race.slug}`
                      : "/ancestries"
                  }
                />
              </div>

              <div className="h-full">
                {character.id ? (
                  <CharacterOrderSummary
                    characterId={character.id}
                  />
                ) : null}
              </div>'''

    new = '''              <div className="mx-auto w-full max-w-[180px] space-y-2 lg:mx-0">
                <CompactHeritageCard
                  label="Ancestry"
                  entry={race}
                  href={
                    race
                      ? `/ancestries/${race.slug}`
                      : "/ancestries"
                  }
                />

                {character.id ? (
                  <CharacterOrderSummary
                    characterId={character.id}
                  />
                ) : null}
              </div>

              <div className="h-full">
                {character.id ? (
                  <CharacterHealthDisplay
                    characterId={character.id}
                  />
                ) : null}
              </div>'''
    s = once(s, old, new, "own lower identity row")

    s = once(
        s,
        'className="group flex h-full min-w-0 items-center gap-3 border bg-[rgb(var(--sep-colour-120e0b))] p-3 transition hover:bg-[rgb(var(--sep-colour-1b140f))]"',
        'className="group flex min-w-0 items-center gap-2.5 border bg-black/15 px-2.5 py-2 transition hover:bg-[rgb(var(--sep-colour-1b140f))]"',
        "own compact ancestry card",
    )
    s = once(
        s,
        'className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border bg-black/20 font-serif text-sm"',
        'className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden border bg-black/20 font-serif text-[10px]"',
        "own ancestry icon",
    )
    s = once(
        s,
        'className="mt-0.5 font-serif text-base text-[rgb(var(--sep-colour-e1c99f))]"',
        'className="mt-0.5 truncate text-[11px] text-[rgb(var(--sep-colour-e1c99f))]"',
        "own ancestry text",
    )
    out[p] = s

    # public profile
    p = "components/characters/public-character-profile.tsx"
    s = out[p]
    s = once(
        s,
        'import { CharacterMechanicsDisplay } from "@/components/characters/character-mechanics-display";',
        'import { CharacterHealthDisplay, CharacterMechanicsDisplay } from "@/components/characters/character-mechanics-display";',
        "public health import",
    )

    old = '''            <div className="h-full">
              <CompactHeritageCard
                label="Ancestry"
                entry={character.race}
                href={
                  character.race
                    ? `/ancestries/${character.race.slug}`
                    : "/ancestries"
                }
              />
            </div>

            <div className="h-full">
              <PublicCharacterOrder
                membership={
                  character.orderMembership
                }
              />
            </div>'''

    new = '''            <div className="mx-auto w-full max-w-[180px] space-y-2 lg:mx-0">
              <CompactHeritageCard
                label="Ancestry"
                entry={character.race}
                href={
                  character.race
                    ? `/ancestries/${character.race.slug}`
                    : "/ancestries"
                }
              />

              <PublicCharacterOrder
                membership={
                  character.orderMembership
                }
              />
            </div>

            <div className="h-full">
              <CharacterHealthDisplay
                characterId={character.id}
              />
            </div>'''
    s = once(s, old, new, "public lower identity row")

    s = once(
        s,
        'className="group flex h-full min-w-0 items-center gap-3 border bg-[rgb(var(--sep-colour-120e0b))] p-3 transition hover:bg-[rgb(var(--sep-colour-1b140f))]"',
        'className="group flex min-w-0 items-center gap-2.5 border bg-black/15 px-2.5 py-2 transition hover:bg-[rgb(var(--sep-colour-1b140f))]"',
        "public compact ancestry card",
    )
    s = once(
        s,
        'className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border bg-black/20 font-serif text-sm"',
        'className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden border bg-black/20 font-serif text-[10px]"',
        "public ancestry icon",
    )
    s = once(
        s,
        'sizes="40px"',
        'sizes="32px"',
        "public ancestry image size",
    )
    s = once(
        s,
        'className="mt-0.5 font-serif text-base text-[rgb(var(--sep-colour-e1c99f))]"',
        'className="mt-0.5 truncate text-[11px] text-[rgb(var(--sep-colour-e1c99f))]"',
        "public ancestry text",
    )
    out[p] = s

    print("Baseline:", head[:7])
    print("Prepared:")
    print(" - compact Ancestry + Order stacked at portrait width")
    print(" - 32px ancestry/order icons")
    print(" - Order text = Order name - Order role")
    print(" - no Order level/association in this sheet block")
    print(" - Health moved into former Order panel space")
    print(" - Health removed from right mechanics stack")
    print(" - own and public sheets match")

    if args.dry_run:
        print("\nDRY RUN ONLY — no files written.")
        return

    for rel, content in out.items():
        (root / rel).write_text(content, encoding="utf-8")

    print("\nApplied LOCALLY only.")
    print("Next: npm run build")

if __name__ == "__main__":
    main()
