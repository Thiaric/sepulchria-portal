-- Sepulchria NPC parity DB patch for state inspected with 396a15b
--
-- Fixes:
-- A) NPC -> Character opposed Item resolution.
-- B) Max Health includes active character_effects Vigour + Max Health modifiers.
--
-- IMPORTANT:
-- This SQL is provided for YOU to run manually.
-- It has NOT been executed on your Supabase project.

begin;

-- =====================================================================
-- A. SAFE INTERNAL NPC ITEM-USE PATH
-- =====================================================================

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

do $patch$
declare
  v_def text;
  v_internal text;
  v_auth_block constant text :=
E'  if auth.uid() is null then\n'
|| E'    raise exception ''Authentication required.'';\n'
|| E'  end if;\n'
|| E'\n'
|| E'  if not public.is_staff_user() then\n'
|| E'    raise exception ''Staff access required.'';\n'
|| E'  end if;\n'
|| E'\n';
begin
  select pg_get_functiondef(
    'public.use_character_inventory_record_targeted_as_staff(uuid,text,uuid,uuid)'::regprocedure
  )
  into v_def;

  if v_def is null then
    raise exception
      'Expected function public.use_character_inventory_record_targeted_as_staff(uuid,text,uuid,uuid) was not found.';
  end if;

  if position(v_auth_block in v_def) = 0 then
    raise exception
      'The staff Item RPC no longer matches the inspected version; aborting rather than weakening authorization accidentally.';
  end if;

  v_internal := replace(
    v_def,
    'CREATE OR REPLACE FUNCTION public.use_character_inventory_record_targeted_as_staff',
    'CREATE OR REPLACE FUNCTION private.use_character_inventory_record_targeted_internal'
  );

  v_internal := replace(
    v_internal,
    v_auth_block,
    ''
  );

  execute v_internal;
end
$patch$;

revoke all
on function private.use_character_inventory_record_targeted_internal(uuid,text,uuid,uuid)
from public;

revoke all
on function private.use_character_inventory_record_targeted_internal(uuid,text,uuid,uuid)
from anon;

revoke all
on function private.use_character_inventory_record_targeted_internal(uuid,text,uuid,uuid)
from authenticated;

-- Preserve the existing public staff-only entry point.
create or replace function public.use_character_inventory_record_targeted_as_staff(
  p_source_character_id uuid,
  p_record_kind text,
  p_record_id uuid,
  p_target_character_id uuid default null::uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not public.is_staff_user() then
    raise exception 'Staff access required.';
  end if;

  return private.use_character_inventory_record_targeted_internal(
    p_source_character_id,
    p_record_kind,
    p_record_id,
    p_target_character_id
  );
end;
$function$;

-- Change only the already-authorized NPC-attacker hand-off inside
-- resolve_opposed_item_use(). Its existing target authorization remains intact.
do $patch$
declare
  v_def text;
  v_old constant text :=
    'public.use_character_inventory_record_targeted_as_staff(';
  v_new constant text :=
    'private.use_character_inventory_record_targeted_internal(';
  v_occurrences integer;
begin
  select pg_get_functiondef(
    'public.resolve_opposed_item_use(uuid,boolean)'::regprocedure
  )
  into v_def;

  if v_def is null then
    raise exception
      'Expected function public.resolve_opposed_item_use(uuid,boolean) was not found.';
  end if;

  v_occurrences :=
    (
      length(v_def) -
      length(replace(v_def, v_old, ''))
    ) / length(v_old);

  if v_occurrences <> 1 then
    raise exception
      'Expected exactly one NPC staff-RPC hand-off in resolve_opposed_item_use(); found %.',
      v_occurrences;
  end if;

  v_def := replace(
    v_def,
    v_old,
    v_new
  );

  execute v_def;
end
$patch$;


-- =====================================================================
-- B. SHAPE / CHARACTER_EFFECT MAX HEALTH
-- =====================================================================

create or replace function public.get_character_current_max_health(
  p_character_id uuid
)
returns integer
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_base_vigour integer := 0;
  v_ancestry_vigour integer := 0;
  v_order_vigour integer := 0;
  v_gift_vigour integer := 0;
  v_item_vigour integer := 0;
  v_item_max_health integer := 0;
  v_active_vigour integer := 0;
  v_active_max_health integer := 0;
  v_effect_vigour integer := 0;
  v_effect_max_health integer := 0;
begin
  select
    coalesce(c.vigor, 0),
    coalesce(r.vigour_modifier, 0)
  into
    v_base_vigour,
    v_ancestry_vigour
  from public.characters c
  left join public.races r on r.id = c.race_id
  where c.id = p_character_id;

  if not found then
    return 0;
  end if;

  select coalesce(oj.vigour_modifier, 0)
  into v_order_vigour
  from public.order_memberships om
  join public.order_jobs oj on oj.id = om.order_job_id
  where om.character_id = p_character_id
  limit 1;

  v_order_vigour := coalesce(v_order_vigour, 0);

  select coalesce(sum(g.vigour_modifier), 0)::integer
  into v_gift_vigour
  from public.character_gifts cg
  join public.gifts g on g.id = cg.gift_id
  where cg.character_id = p_character_id
    and g.is_active = true
    and (
      g.effect_mode = 'passive'
      or (
        g.effect_mode = 'temporary'
        and exists (
          select 1
          from public.gift_activations ga
          where ga.character_gift_id = cg.id
            and ga.ended_at is null
            and ga.health_reverted_at is null
            and ga.activated_at <= now()
            and ga.expires_at > now()
        )
      )
    );

  select
    m.vigour_modifier,
    m.max_health_modifier
  into
    v_item_vigour,
    v_item_max_health
  from public.get_character_item_passive_modifiers(p_character_id) m;

  v_item_vigour := coalesce(v_item_vigour, 0);
  v_item_max_health := coalesce(v_item_max_health, 0);

  select
    coalesce(sum(a.vigour_modifier), 0)::integer,
    coalesce(sum(a.max_health_modifier), 0)::integer
  into
    v_active_vigour,
    v_active_max_health
  from public.character_active_item_effects a
  where a.character_id = p_character_id
    and a.expires_at > now();

  select
    coalesce(sum(e.vigour_modifier), 0)::integer,
    coalesce(sum(e.max_health_modifier), 0)::integer
  into
    v_effect_vigour,
    v_effect_max_health
  from public.character_effects e
  where e.target_character_id = p_character_id
    and e.ended_at is null
    and e.dispelled_at is null
    and (
      e.starts_at is null
      or e.starts_at <= now()
    )
    and (
      e.expires_at is null
      or e.expires_at > now()
    );

  return greatest(
    0,
    (
      v_base_vigour
      + v_gift_vigour
      + v_item_vigour
      + v_active_vigour
      + v_effect_vigour
      + v_ancestry_vigour
      + v_order_vigour
    ) * 10
    + v_item_max_health
    + v_active_max_health
    + v_effect_max_health
  );
end;
$function$;


-- =====================================================================
-- VERIFICATION
-- These SELECTs do not modify application data.
-- =====================================================================

select
  to_regprocedure(
    'public.use_character_inventory_record_targeted_as_staff(uuid,text,uuid,uuid)'
  ) as staff_rpc;

select
  to_regprocedure(
    'private.use_character_inventory_record_targeted_internal(uuid,text,uuid,uuid)'
  ) as internal_rpc;

select
  position(
    'private.use_character_inventory_record_targeted_internal('
    in pg_get_functiondef(
      'public.resolve_opposed_item_use(uuid,boolean)'::regprocedure
    )
  ) > 0 as opposed_item_uses_private_helper;

select
  position(
    'from public.character_effects e'
    in pg_get_functiondef(
      'public.get_character_current_max_health(uuid)'::regprocedure
    )
  ) > 0 as max_health_includes_character_effects;

commit;
