-- Sepulchria combat consistency: Passive Shape-style Feats
-- Target app commit: e97789f2a7eab2d9d7c38a86b177eba277770405
--
-- Passive Feats do not activate in Location chat. Their Shape-style Self
-- profile is materialised as a non-dispellable character_effect while the
-- Character owns the Feat. Assignment expiry still ends the passive effect.

begin;

create or replace function public.sync_passive_feat_effect_for_assignment(
  p_assignment_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
begin
  -- Remove the previous synthetic passive row first. Active/cast Feat effects
  -- use their cast/activation id as source_instance_id and are dispellable.
  delete from public.character_effects
  where source_type = 'feat'
    and source_instance_id = p_assignment_id
    and dispellable = false;

  insert into public.character_effects (
    target_character_id,
    source_type,
    source_definition_id,
    mechanics_definition_id,
    source_instance_id,
    source_character_id,
    source_name,
    source_level,
    effect_nature,
    conditions,
    muscles_modifier,
    reflexes_modifier,
    vigour_modifier,
    brains_modifier,
    shrewd_modifier,
    presence_modifier,
    max_health_modifier,
    warping_affinity_modifier,
    warps_per_day_modifier,
    starts_at,
    expires_at,
    dispellable
  )
  select
    cg.character_id,
    'feat',
    g.id,
    s.id,
    cg.id,
    cg.character_id,
    g.name,
    1,
    coalesce(s.effect_nature, 'beneficial'),
    coalesce(s.self_conditions, '{}'::text[]),
    coalesce(s.self_muscles_modifier, 0),
    coalesce(s.self_reflexes_modifier, 0),
    coalesce(s.self_vigour_modifier, 0),
    coalesce(s.self_brains_modifier, 0),
    coalesce(s.self_shrewd_modifier, 0),
    coalesce(s.self_presence_modifier, 0),
    case
      when btrim(coalesce(s.self_max_hp_change, '')) ~ '^[+-]?[0-9]+$'
        then btrim(s.self_max_hp_change)::integer
      else 0
    end,
    0,
    0,
    v_now,
    cg.expires_at,
    false
  from public.character_gifts cg
  join public.gifts g
    on g.id = cg.gift_id
  join public.shapes s
    on s.feat_id = g.id
   and s.is_feat_backing = true
  where cg.id = p_assignment_id
    and g.is_active = true
    and g.effect_mode = 'passive'
    and s.is_active = true
    and (
      cg.expires_at is null
      or cg.expires_at > v_now
    )
    and (
      cardinality(coalesce(s.self_conditions, '{}'::text[])) > 0
      or coalesce(s.self_muscles_modifier, 0) <> 0
      or coalesce(s.self_reflexes_modifier, 0) <> 0
      or coalesce(s.self_vigour_modifier, 0) <> 0
      or coalesce(s.self_brains_modifier, 0) <> 0
      or coalesce(s.self_shrewd_modifier, 0) <> 0
      or coalesce(s.self_presence_modifier, 0) <> 0
      or (
        btrim(coalesce(s.self_max_hp_change, '')) ~ '^[+-]?[0-9]+$'
        and btrim(s.self_max_hp_change)::integer <> 0
      )
    );
end
$$;

create or replace function public.trg_sync_passive_feat_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.character_effects
    where source_type = 'feat'
      and source_instance_id = old.id
      and dispellable = false;

    return old;
  end if;

  perform public.sync_passive_feat_effect_for_assignment(new.id);
  return new;
end
$$;

drop trigger if exists sync_passive_feat_assignment
  on public.character_gifts;

create trigger sync_passive_feat_assignment
after insert or update of gift_id, character_id, expires_at
on public.character_gifts
for each row
execute function public.trg_sync_passive_feat_assignment();

drop trigger if exists delete_passive_feat_assignment
  on public.character_gifts;

create trigger delete_passive_feat_assignment
after delete
on public.character_gifts
for each row
execute function public.trg_sync_passive_feat_assignment();

create or replace function public.trg_sync_passive_feat_from_gift()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select id
    from public.character_gifts
    where gift_id = new.id
  loop
    perform public.sync_passive_feat_effect_for_assignment(r.id);
  end loop;

  return new;
end
$$;

drop trigger if exists sync_passive_feat_from_gift
  on public.gifts;

create trigger sync_passive_feat_from_gift
after update of name, is_active, effect_mode
on public.gifts
for each row
execute function public.trg_sync_passive_feat_from_gift();

create or replace function public.trg_sync_passive_feat_from_shape()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_feat_id uuid;
begin
  v_feat_id := coalesce(new.feat_id, old.feat_id);

  if v_feat_id is null then
    return coalesce(new, old);
  end if;

  for r in
    select id
    from public.character_gifts
    where gift_id = v_feat_id
  loop
    perform public.sync_passive_feat_effect_for_assignment(r.id);
  end loop;

  return coalesce(new, old);
end
$$;

drop trigger if exists sync_passive_feat_from_shape
  on public.shapes;

create trigger sync_passive_feat_from_shape
after insert or update of
  feat_id,
  is_active,
  effect_nature,
  self_conditions,
  self_muscles_modifier,
  self_reflexes_modifier,
  self_vigour_modifier,
  self_brains_modifier,
  self_shrewd_modifier,
  self_presence_modifier,
  self_max_hp_change
on public.shapes
for each row
when (new.is_feat_backing = true)
execute function public.trg_sync_passive_feat_from_shape();

-- Remove a synthetic passive row before its backing Shape disappears.
create or replace function public.trg_remove_passive_feat_shape_effects()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_feat_backing = true then
    delete from public.character_effects
    where source_type = 'feat'
      and mechanics_definition_id = old.id
      and dispellable = false;
  end if;

  return old;
end
$$;

drop trigger if exists remove_passive_feat_shape_effects
  on public.shapes;

create trigger remove_passive_feat_shape_effects
before delete
on public.shapes
for each row
execute function public.trg_remove_passive_feat_shape_effects();

-- Backfill all currently-owned Passive Feats.
do $$
declare
  r record;
begin
  for r in
    select id
    from public.character_gifts
  loop
    perform public.sync_passive_feat_effect_for_assignment(r.id);
  end loop;
end
$$;

commit;
