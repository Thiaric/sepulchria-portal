-- Sepulchria NPC parity DB patch - revised after CRLF guard failure
-- Built from the live definitions read after the failed attempt.
--
-- Fixes:
--   1. NPC -> Character opposed Item resolution
--   2. Shape / character_effects modifiers in current maximum Health
--
-- This SQL has NOT been executed by ChatGPT. Run it manually in Supabase.

begin;

-- =====================================================================
-- 1. NPC -> CHARACTER OPPOSED ITEM RESOLUTION
-- =====================================================================

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

-- Clone the CURRENT live staff RPC into private, removing only its two
-- caller-authentication checks. This deliberately leaves every NPC,
-- inventory, target, location, cooldown and effect validation intact.
--
-- Unlike the previous version, this does NOT compare exact whitespace
-- or newline characters, so CRLF/LF formatting cannot trip the guard.
do $patch$
declare
  v_def text;
  v_internal text;
  v_auth_start integer;
  v_npc_check_start integer;
begin
  select pg_get_functiondef(
    'public.use_character_inventory_record_targeted_as_staff(uuid,text,uuid,uuid)'::regprocedure
  )
  into v_def;

  if v_def is null then
    raise exception
      'Expected staff Item RPC was not found.';
  end if;

  -- Structural guards against accidentally cloning a different function.
  if position('if auth.uid() is null then' in v_def) = 0 then
    raise exception
      'Expected Authentication required check was not found.';
  end if;

  if position('if not public.is_staff_user() then' in v_def) = 0 then
    raise exception
      'Expected Staff access required check was not found.';
  end if;

  if position('NPC Character not found.' in v_def) = 0 then
    raise exception
      'Expected NPC validation was not found.';
  end if;

  v_internal := replace(
    v_def,
    'CREATE OR REPLACE FUNCTION public.use_character_inventory_record_targeted_as_staff',
    'CREATE OR REPLACE FUNCTION private.use_character_inventory_record_targeted_internal'
  );

  if v_internal = v_def then
    raise exception
      'Could not rename the cloned Item function.';
  end if;

  /*
   * Remove exactly the caller-level auth block:
   *
   *   if auth.uid() is null ...
   *   if not public.is_staff_user() ...
   *
   * Stop immediately before the existing:
   *
   *   if not exists ( ... NPC Character validation ... )
   *
   * We search by semantic text, not exact whitespace/newlines.
   */
  v_auth_start :=
    position(
      'if auth.uid() is null then'
      in v_internal
    );

  v_npc_check_start :=
    position(
      'if not exists ('
      in substring(
        v_internal
        from v_auth_start
      )
    );

  if v_auth_start = 0 or v_npc_check_start = 0 then
    raise exception
      'Could not locate the staff-auth block boundaries safely.';
  end if;

  -- Convert relative position in substring() into absolute position.
  v_npc_check_start :=
    v_auth_start +
    v_npc_check_start -
    1;

  if v_npc_check_start <= v_auth_start then
    raise exception
      'Staff-auth block boundaries were invalid.';
  end if;

  v_internal :=
    substring(
      v_internal
      from 1
      for v_auth_start - 1
    )
    ||
    substring(
      v_internal
      from v_npc_check_start
    );

  -- Sanity: caller checks must be gone, NPC/inventory checks must remain.
  if position('if auth.uid() is null then' in v_internal) <> 0 then
    raise exception
      'Internal clone still contains the Authentication check.';
  end if;

  if position('if not public.is_staff_user() then' in v_internal) <> 0 then
    raise exception
      'Internal clone still contains the Staff check.';
  end if;

  if position('NPC Character not found.' in v_internal) = 0 then
    raise exception
      'Internal clone unexpectedly lost NPC validation.';
  end if;

  execute v_internal;
end
$patch$;

-- Nobody calling through PostgREST/API gets direct access to the internal helper.
revoke all
on function private.use_character_inventory_record_targeted_internal(
  uuid,
  text,
  uuid,
  uuid
)
from public;

revoke all
on function private.use_character_inventory_record_targeted_internal(
  uuid,
  text,
  uuid,
  uuid
)
from anon;

revoke all
on function private.use_character_inventory_record_targeted_internal(
  uuid,
  text,
  uuid,
  uuid
)
from authenticated;


-- Keep the existing public staff RPC as the authorized external wrapper.
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


-- Modify ONLY the NPC-attacker branch of resolve_opposed_item_use().
-- The function's existing authorization of the target Character/NPC stays intact.
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
      'Expected resolve_opposed_item_use(uuid,boolean) was not found.';
  end if;

  -- These are critical guards from the live function.
  if position(
    'v_my_character = v_action.target_character_id'
    in v_def
  ) = 0 then
    raise exception
      'Target-Character authorization guard was not found.';
  end if;

  if position(
    'v_attacker_is_npc'
    in v_def
  ) = 0 then
    raise exception
      'NPC-attacker branch was not found.';
  end if;

  v_occurrences :=
    (
      length(v_def)
      -
      length(
        replace(
          v_def,
          v_old,
          ''
        )
      )
    )
    /
    length(v_old);

  if v_occurrences <> 1 then
    raise exception
      'Expected exactly one staff Item hand-off; found %.',
      v_occurrences;
  end if;

  v_def :=
    replace(
      v_def,
      v_old,
      v_new
    );

  execute v_def;
end
$patch$;


-- =====================================================================
-- 2. SHAPE / CHARACTER_EFFECT MAXIMUM HEALTH
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
  left join public.races r
    on r.id = c.race_id
  where c.id = p_character_id;

  if not found then
    return 0;
  end if;

  select
    coalesce(oj.vigour_modifier, 0)
  into
    v_order_vigour
  from public.order_memberships om
  join public.order_jobs oj
    on oj.id = om.order_job_id
  where om.character_id = p_character_id
  limit 1;

  v_order_vigour :=
    coalesce(
      v_order_vigour,
      0
    );

  select
    coalesce(
      sum(g.vigour_modifier),
      0
    )::integer
  into
    v_gift_vigour
  from public.character_gifts cg
  join public.gifts g
    on g.id = cg.gift_id
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
  from public.get_character_item_passive_modifiers(
    p_character_id
  ) m;

  v_item_vigour :=
    coalesce(
      v_item_vigour,
      0
    );

  v_item_max_health :=
    coalesce(
      v_item_max_health,
      0
    );

  select
    coalesce(
      sum(a.vigour_modifier),
      0
    )::integer,
    coalesce(
      sum(a.max_health_modifier),
      0
    )::integer
  into
    v_active_vigour,
    v_active_max_health
  from public.character_active_item_effects a
  where a.character_id = p_character_id
    and a.expires_at > now();

  -- NEW: include currently active Shape / persistent Character effects.
  select
    coalesce(
      sum(e.vigour_modifier),
      0
    )::integer,
    coalesce(
      sum(e.max_health_modifier),
      0
    )::integer
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
-- =====================================================================

do $verify$
declare
  v_resolver text;
  v_staff text;
  v_health text;
begin
  select pg_get_functiondef(
    'public.resolve_opposed_item_use(uuid,boolean)'::regprocedure
  )
  into v_resolver;

  select pg_get_functiondef(
    'public.use_character_inventory_record_targeted_as_staff(uuid,text,uuid,uuid)'::regprocedure
  )
  into v_staff;

  select pg_get_functiondef(
    'public.get_character_current_max_health(uuid)'::regprocedure
  )
  into v_health;

  if to_regprocedure(
    'private.use_character_inventory_record_targeted_internal(uuid,text,uuid,uuid)'
  ) is null then
    raise exception
      'Verification failed: private Item helper does not exist.';
  end if;

  if position(
    'private.use_character_inventory_record_targeted_internal('
    in v_resolver
  ) = 0 then
    raise exception
      'Verification failed: opposed Item resolver is not using the private helper.';
  end if;

  if position(
    'if not public.is_staff_user() then'
    in v_staff
  ) = 0 then
    raise exception
      'Verification failed: public staff Item RPC lost its staff authorization.';
  end if;

  if position(
    'from public.character_effects e'
    in v_health
  ) = 0 then
    raise exception
      'Verification failed: max Health does not include character_effects.';
  end if;
end
$verify$;

commit;


-- Optional read-only confirmation after COMMIT.
select
  to_regprocedure(
    'public.use_character_inventory_record_targeted_as_staff(uuid,text,uuid,uuid)'
  ) as public_staff_rpc,
  to_regprocedure(
    'private.use_character_inventory_record_targeted_internal(uuid,text,uuid,uuid)'
  ) as private_internal_rpc,
  (
    position(
      'private.use_character_inventory_record_targeted_internal('
      in pg_get_functiondef(
        'public.resolve_opposed_item_use(uuid,boolean)'::regprocedure
      )
    ) > 0
  ) as npc_opposed_item_fixed,
  (
    position(
      'from public.character_effects e'
      in pg_get_functiondef(
        'public.get_character_current_max_health(uuid)'::regprocedure
      )
    ) > 0
  ) as shape_max_health_fixed;
