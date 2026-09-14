#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd()

def write(path_str: str, content: str) -> None:
    path = ROOT / path_str
    if not path.exists():
        raise SystemExit(f"Missing file: {path}")
    path.write_text(content, encoding="utf-8")
    print(f"WRITE {path_str}")

def replace_all(path_str: str, old: str, new: str) -> None:
    path = ROOT / path_str
    if not path.exists():
        raise SystemExit(f"Missing file: {path}")
    text = path.read_text(encoding="utf-8")
    if old not in text:
        print(f"SKIP  {path_str}: pattern not found: {old}")
        return
    text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")
    print(f"PATCH {path_str}")

# 1. Robust server reader for character sheet.
write(
    "lib/items/active-item-effects.ts",
    '''import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ActiveItemEffect = {
  id: string;
  item_id: string;
  source_name: string;
  conditions: string[];
  muscles_modifier: number;
  reflexes_modifier: number;
  vigour_modifier: number;
  brains_modifier: number;
  shrewd_modifier: number;
  presence_modifier: number;
  max_health_modifier: number;
  warping_affinity_modifier: number;
  warps_per_day_modifier: number;
  activated_at: string;
  expires_at: string;
};

function normalizeConditions(
  value: unknown,
): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry).trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => String(entry).trim())
          .filter(Boolean);
      }
    } catch {
      // Ignore malformed JSON and fall through.
    }

    return value
      .replace(/^\\{|\\}$/g, "")
      .split(",")
      .map((entry) =>
        entry
          .replace(/^"|"$/g, "")
          .trim(),
      )
      .filter(Boolean);
  }

  return [];
}

export async function getCharacterActiveItemEffects(
  characterId: string,
): Promise<ActiveItemEffect[]> {
  const supabase = await createClient();

  const { data, error } =
    await supabase.rpc(
      "get_character_active_item_effects_v2",
      {
        p_character_id:
          characterId,
      },
    );

  if (error) {
    throw new Error(
      `Unable to load active Item effects: ${error.message}`,
    );
  }

  return (data ?? []).map(
    (row: any) => ({
      ...row,
      conditions:
        normalizeConditions(
          row.conditions,
        ),
    }),
  ) as ActiveItemEffect[];
}

export function itemEffectDuration(
  effect: ActiveItemEffect,
) {
  const ms =
    new Date(
      effect.expires_at,
    ).getTime() -
    Date.now();

  if (ms <= 0) {
    return "Expired";
  }

  const minutes =
    Math.ceil(ms / 60000);

  if (minutes < 60) {
    return `${minutes}m remaining`;
  }

  const hours =
    Math.ceil(
      minutes / 60,
    );

  if (hours < 48) {
    return `${hours}h remaining`;
  }

  return `${Math.ceil(
    hours / 24,
  )}d remaining`;
}
''',
)

# 2. Ensure chat uses the V2 RPC.
replace_all(
    "app/(portal)/game/components/RoomMessageList.tsx",
    'supabase.rpc("get_active_item_chat_tags",{p_character_ids:ids})',
    'supabase.rpc("get_active_item_chat_tags_v2",{p_character_ids:ids})',
)

# 3. Make chat normalization robust if PostgREST returns anything unexpected.
replace_all(
    "app/(portal)/game/components/RoomMessageList.tsx",
    '''            ...(row.conditions??[]),
''',
    '''            ...(Array.isArray(row.conditions)
              ? row.conditions
              : []),
''',
)

sql = r'''begin;

create or replace function public.get_character_active_item_effects_v2(
  p_character_id uuid
)
returns table (
  id uuid,
  item_id uuid,
  source_name text,
  conditions jsonb,
  muscles_modifier integer,
  reflexes_modifier integer,
  vigour_modifier integer,
  brains_modifier integer,
  shrewd_modifier integer,
  presence_modifier integer,
  max_health_modifier integer,
  warping_affinity_modifier integer,
  warps_per_day_modifier integer,
  activated_at timestamptz,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $function$
  select
    active.id,
    active.item_id,
    active.source_name,
    to_jsonb(
      case
        when cardinality(
          coalesce(
            active.conditions,
            '{}'::text[]
          )
        ) > 0
          then active.conditions
        else coalesce(
          source.conditions,
          '{}'::text[]
        )
      end
    ) as conditions,
    active.muscles_modifier,
    active.reflexes_modifier,
    active.vigour_modifier,
    active.brains_modifier,
    active.shrewd_modifier,
    active.presence_modifier,
    active.max_health_modifier,
    active.warping_affinity_modifier,
    active.warps_per_day_modifier,
    active.activated_at,
    active.expires_at
  from public.character_active_item_effects active
  left join public.item_effects source
    on source.id = active.source_effect_id
  where
    active.character_id =
      p_character_id
    and active.expires_at > now()
  order by
    active.expires_at asc,
    active.activated_at asc,
    active.id asc;
$function$;

create or replace function public.get_active_item_chat_tags_v2(
  p_character_ids uuid[]
)
returns table (
  character_id uuid,
  conditions jsonb
)
language sql
stable
security definer
set search_path = public
as $function$
  with runtime as (
    select
      active.character_id,
      case
        when cardinality(
          coalesce(
            active.conditions,
            '{}'::text[]
          )
        ) > 0
          then active.conditions
        else coalesce(
          source.conditions,
          '{}'::text[]
        )
      end as conditions
    from public.character_active_item_effects active
    left join public.item_effects source
      on source.id =
        active.source_effect_id
    where
      active.character_id =
        any(p_character_ids)
      and active.expires_at > now()
  ),
  flattened as (
    select
      runtime.character_id,
      condition_label
    from runtime
    cross join lateral
      unnest(runtime.conditions)
        as condition_label
    where
      btrim(condition_label) <> ''
  )
  select
    ids.character_id,
    to_jsonb(
      coalesce(
        (
          select array_agg(
            distinct f.condition_label
            order by f.condition_label
          )
          from flattened f
          where
            f.character_id =
              ids.character_id
        ),
        '{}'::text[]
      )
    ) as conditions
  from (
    select distinct
      unnest(p_character_ids)
        as character_id
  ) ids;
$function$;

grant execute
on function public.get_character_active_item_effects_v2(uuid)
to authenticated;

grant execute
on function public.get_active_item_chat_tags_v2(uuid[])
to authenticated;

commit;

-- Verification: both of these should contain "Warm".
select *
from public.get_character_active_item_effects_v2(
  '37f69d7c-bcdf-4e03-9d39-ccae5c8cd750'::uuid
);

select *
from public.get_active_item_chat_tags_v2(
  array[
    '37f69d7c-bcdf-4e03-9d39-ccae5c8cd750'::uuid
  ]
);
'''

sql_path = ROOT / "supabase_item_conditions_v2.sql"
sql_path.write_text(sql, encoding="utf-8")
print(f"WRITE {sql_path.name}")

print()
print("DONE")
print("1) Run supabase_item_conditions_v2.sql in Supabase SQL Editor")
print("2) npm run build")
print("3) Hard-refresh the character sheet and location")
