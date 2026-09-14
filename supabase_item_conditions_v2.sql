begin;

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
