-- Sepulchria unified active-effect engine
-- Built for commit e4093e84378593f997ef603792444785ae2f00cb
--
-- IMPORTANT:
--   * Shapes, Feats and temporary Item effects all resolve into public.character_effects.
--   * Shape Dispel: Feats + Items always; Shapes up to the dispelling Shape level.
--   * Feat Dispel: Feats; Shapes level 1-3; never Items.
--   * Item Dispel: Feats + Items; Shapes level 1-3.
--   * Manual Conditions are mirrored into character_effects but are not dispellable.
--   * Feats keep Ancestry/Order ownership and use hidden Shape definitions only for
--     the shared target/save/effect builder. Runtime effects are tagged source_type='feat'.

create extension if not exists pgcrypto;

alter table public.shapes
  add column if not exists is_feat_backing boolean not null default false;

alter table public.shapes
  add column if not exists feat_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'shapes_feat_id_fkey'
  ) then
    alter table public.shapes
      add constraint shapes_feat_id_fkey
      foreign key (feat_id)
      references public.gifts(id)
      on delete cascade;
  end if;
end
$$;

create unique index if not exists shapes_feat_id_unique
  on public.shapes(feat_id)
  where feat_id is not null;

create index if not exists shapes_is_feat_backing_idx
  on public.shapes(is_feat_backing);

alter table public.items
  add column if not exists is_dispel boolean not null default false;

create table if not exists public.character_effects (
  id uuid primary key default gen_random_uuid(),
  target_character_id uuid not null references public.characters(id) on delete cascade,

  source_type text not null
    check (source_type in ('shape','feat','item','manual')),
  source_definition_id uuid null,
  mechanics_definition_id uuid null,
  source_instance_id uuid null,
  source_character_id uuid null references public.characters(id) on delete set null,
  source_name text not null default 'Effect',
  source_level integer not null default 1 check (source_level >= 1),
  effect_nature text not null default 'mixed',

  conditions text[] not null default '{}',
  muscles_modifier integer not null default 0,
  reflexes_modifier integer not null default 0,
  vigour_modifier integer not null default 0,
  brains_modifier integer not null default 0,
  shrewd_modifier integer not null default 0,
  presence_modifier integer not null default 0,
  max_health_modifier integer not null default 0,
  warping_affinity_modifier integer not null default 0,
  warps_per_day_modifier integer not null default 0,

  starts_at timestamptz not null default now(),
  expires_at timestamptz null,
  ended_at timestamptz null,

  dispellable boolean not null default true,
  dispelled_at timestamptz null,
  dispelled_by_source_type text null
    check (
      dispelled_by_source_type is null
      or dispelled_by_source_type in ('shape','feat','item')
    ),
  dispelled_by_source_id uuid null,

  created_by_user_id uuid null,
  created_by_role text null
);

create index if not exists character_effects_target_active_idx
  on public.character_effects(target_character_id, source_type, expires_at);

create index if not exists character_effects_source_idx
  on public.character_effects(source_type, source_definition_id);

create unique index if not exists character_effects_source_instance_unique
  on public.character_effects(source_type, source_instance_id)
  where source_instance_id is not null
    and source_type in ('item','manual');

alter table public.character_effects enable row level security;

drop policy if exists character_effects_read_authenticated
  on public.character_effects;

create policy character_effects_read_authenticated
  on public.character_effects
  for select
  to authenticated
  using (true);

grant select on public.character_effects to authenticated;

-- Existing active Shape effects -> central table.
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
  starts_at,
  expires_at,
  dispellable,
  dispelled_at,
  ended_at
)
select
  e.target_character_id,
  case when coalesce(s.is_feat_backing,false) then 'feat' else 'shape' end,
  case when coalesce(s.is_feat_backing,false) then s.feat_id else e.shape_id end,
  e.shape_id,
  e.id,
  e.source_character_id,
  coalesce(s.name,'Effect'),
  case when coalesce(s.is_feat_backing,false) then 1 else coalesce(e.shape_level,1) end,
  coalesce(e.effect_nature,'mixed'),
  coalesce(e.conditions,'{}'::text[]),
  coalesce(e.muscles_modifier,0),
  coalesce(e.reflexes_modifier,0),
  coalesce(e.vigour_modifier,0),
  coalesce(e.brains_modifier,0),
  coalesce(e.shrewd_modifier,0),
  coalesce(e.presence_modifier,0),
  coalesce(e.max_hp_modifier,0),
  coalesce(e.starts_at,now()),
  e.expires_at,
  true,
  e.dispelled_at,
  e.dispelled_at
from public.character_shape_effects e
left join public.shapes s on s.id = e.shape_id
where not exists (
  select 1
  from public.character_effects ce
  where ce.source_instance_id = e.id
    and ce.source_type = case when coalesce(s.is_feat_backing,false) then 'feat' else 'shape' end
);

-- Existing manual Conditions -> central table.
insert into public.character_effects (
  target_character_id,
  source_type,
  source_instance_id,
  source_name,
  source_level,
  effect_nature,
  conditions,
  starts_at,
  dispellable,
  created_by_user_id,
  created_by_role
)
select
  c.character_id,
  'manual',
  c.id,
  c.label,
  1,
  'mixed',
  array[c.label],
  c.created_at,
  false,
  c.created_by_user_id,
  c.created_by_role
from public.character_conditions c
where not exists (
  select 1
  from public.character_effects ce
  where ce.source_type='manual'
    and ce.source_instance_id=c.id
);

-- Keep manual Conditions mirrored while the existing editor remains the authoring UI.
create or replace function public.sync_character_condition_to_effect()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    update public.character_effects
       set ended_at = coalesce(ended_at, now())
     where source_type='manual'
       and source_instance_id=old.id;
    return old;
  end if;

  insert into public.character_effects (
    target_character_id,
    source_type,
    source_instance_id,
    source_name,
    source_level,
    effect_nature,
    conditions,
    starts_at,
    dispellable,
    created_by_user_id,
    created_by_role
  )
  values (
    new.character_id,
    'manual',
    new.id,
    new.label,
    1,
    'mixed',
    array[new.label],
    new.created_at,
    false,
    new.created_by_user_id,
    new.created_by_role
  )
  on conflict (source_type,source_instance_id)
  where source_instance_id is not null and source_type in ('item','manual')
  do update set
    target_character_id=excluded.target_character_id,
    source_name=excluded.source_name,
    conditions=excluded.conditions,
    ended_at=null,
    created_by_user_id=excluded.created_by_user_id,
    created_by_role=excluded.created_by_role;

  return new;
end
$$;

drop trigger if exists character_conditions_effect_sync
  on public.character_conditions;

create trigger character_conditions_effect_sync
after insert or update or delete
on public.character_conditions
for each row
execute function public.sync_character_condition_to_effect();

-- Temporary Item effects are still created by the existing Item RPC.
-- Mirror that runtime row into character_effects so all Conditions/buffs/debuffs
-- and all Dispel systems read one authoritative active-effect table.
create or replace function public.sync_active_item_effect_to_character_effect()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  j jsonb;
  v_conditions text[];
  v_id uuid;
begin
  if tg_op='DELETE' then
    j := to_jsonb(old);
    v_id := (j->>'id')::uuid;

    update public.character_effects
       set ended_at=coalesce(ended_at,now())
     where source_type='item'
       and source_instance_id=v_id;

    return old;
  end if;

  j := to_jsonb(new);
  v_id := (j->>'id')::uuid;

  select coalesce(array_agg(value), '{}'::text[])
    into v_conditions
  from jsonb_array_elements_text(
    case
      when jsonb_typeof(j->'conditions')='array'
        then j->'conditions'
      else '[]'::jsonb
    end
  ) value;

  insert into public.character_effects (
    target_character_id,
    source_type,
    source_definition_id,
    source_instance_id,
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
    ended_at,
    dispellable
  )
  values (
    (j->>'character_id')::uuid,
    'item',
    nullif(j->>'item_id','')::uuid,
    v_id,
    coalesce(nullif(j->>'source_name',''),'Item effect'),
    1,
    'mixed',
    v_conditions,
    coalesce((j->>'muscles_modifier')::integer,0),
    coalesce((j->>'reflexes_modifier')::integer,0),
    coalesce((j->>'vigour_modifier')::integer,0),
    coalesce((j->>'brains_modifier')::integer,0),
    coalesce((j->>'shrewd_modifier')::integer,0),
    coalesce((j->>'presence_modifier')::integer,0),
    coalesce((j->>'max_health_modifier')::integer,0),
    coalesce((j->>'warping_affinity_modifier')::integer,0),
    coalesce((j->>'warps_per_day_modifier')::integer,0),
    coalesce((j->>'activated_at')::timestamptz,now()),
    nullif(j->>'expires_at','')::timestamptz,
    case
      when coalesce((j->>'expires_at')::timestamptz, now()+interval '1 minute') <= now()
        then now()
      else null
    end,
    true
  )
  on conflict (source_type,source_instance_id)
  where source_instance_id is not null and source_type in ('item','manual')
  do update set
    target_character_id=excluded.target_character_id,
    source_definition_id=excluded.source_definition_id,
    source_name=excluded.source_name,
    conditions=excluded.conditions,
    muscles_modifier=excluded.muscles_modifier,
    reflexes_modifier=excluded.reflexes_modifier,
    vigour_modifier=excluded.vigour_modifier,
    brains_modifier=excluded.brains_modifier,
    shrewd_modifier=excluded.shrewd_modifier,
    presence_modifier=excluded.presence_modifier,
    max_health_modifier=excluded.max_health_modifier,
    warping_affinity_modifier=excluded.warping_affinity_modifier,
    warps_per_day_modifier=excluded.warps_per_day_modifier,
    starts_at=excluded.starts_at,
    expires_at=excluded.expires_at,
    ended_at=excluded.ended_at,
    dispelled_at=null,
    dispelled_by_source_type=null,
    dispelled_by_source_id=null;

  return new;
end
$$;

drop trigger if exists active_item_effect_central_sync
  on public.character_active_item_effects;

create trigger active_item_effect_central_sync
after insert or update or delete
on public.character_active_item_effects
for each row
execute function public.sync_active_item_effect_to_character_effect();

-- Backfill existing temporary Item effects.
insert into public.character_effects (
  target_character_id,
  source_type,
  source_definition_id,
  source_instance_id,
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
  e.character_id,
  'item',
  e.item_id,
  e.id,
  coalesce(e.source_name,'Item effect'),
  1,
  'mixed',
  coalesce(e.conditions,'{}'::text[]),
  coalesce(e.muscles_modifier,0),
  coalesce(e.reflexes_modifier,0),
  coalesce(e.vigour_modifier,0),
  coalesce(e.brains_modifier,0),
  coalesce(e.shrewd_modifier,0),
  coalesce(e.presence_modifier,0),
  coalesce(e.max_health_modifier,0),
  coalesce(e.warping_affinity_modifier,0),
  coalesce(e.warps_per_day_modifier,0),
  coalesce(e.activated_at,now()),
  e.expires_at,
  true
from public.character_active_item_effects e
where not exists (
  select 1
  from public.character_effects ce
  where ce.source_type='item'
    and ce.source_instance_id=e.id
);

-- Legacy temporary Feats which have not yet been saved through the new
-- Shape-style Feat builder are also mirrored into the same active-effect table.
create unique index if not exists character_effects_legacy_feat_activation_unique
  on public.character_effects(source_instance_id)
  where source_type='feat' and mechanics_definition_id is null and source_instance_id is not null;

create or replace function public.sync_gift_activation_to_character_effect()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ownership record;
  v_gift record;
  v_target uuid;
begin
  if tg_op='DELETE' then
    update public.character_effects
       set ended_at=coalesce(ended_at,now())
     where source_type='feat'
       and mechanics_definition_id is null
       and source_instance_id=old.id;
    return old;
  end if;

  select cg.character_id,cg.gift_id
    into v_ownership
    from public.character_gifts cg
   where cg.id=new.character_gift_id;

  if not found then
    return new;
  end if;

  -- New-style Feats resolve through their hidden mechanics definition and are
  -- inserted directly by the shared Shape/Feat runtime instead.
  if exists (
    select 1 from public.shapes s
    where s.feat_id=v_ownership.gift_id
      and s.is_feat_backing=true
  ) then
    update public.character_effects
       set ended_at=coalesce(ended_at,now())
     where source_type='feat'
       and mechanics_definition_id is null
       and source_instance_id=new.id;
    return new;
  end if;

  select * into v_gift
    from public.gifts g
   where g.id=v_ownership.gift_id;

  if not found or v_gift.effect_mode<>'temporary' then
    return new;
  end if;

  v_target:=coalesce(new.target_character_id,v_ownership.character_id);

  insert into public.character_effects (
    target_character_id,source_type,source_definition_id,mechanics_definition_id,
    source_instance_id,source_character_id,source_name,source_level,effect_nature,
    conditions,muscles_modifier,reflexes_modifier,vigour_modifier,brains_modifier,
    shrewd_modifier,presence_modifier,max_health_modifier,warping_affinity_modifier,
    warps_per_day_modifier,starts_at,expires_at,ended_at,dispellable
  ) values (
    v_target,'feat',v_ownership.gift_id,null,new.id,v_ownership.character_id,
    v_gift.name,1,'mixed','{}'::text[],
    coalesce(v_gift.muscles_modifier,0),coalesce(v_gift.reflexes_modifier,0),
    coalesce(v_gift.vigour_modifier,0),coalesce(v_gift.brains_modifier,0),
    coalesce(v_gift.shrewd_modifier,0),coalesce(v_gift.presence_modifier,0),
    coalesce(v_gift.max_health_modifier,0),coalesce(v_gift.warping_affinity_modifier,0),
    coalesce(v_gift.warps_per_day_modifier,0),coalesce(new.activated_at,now()),
    new.expires_at,new.ended_at,true
  )
  on conflict (source_instance_id)
  where source_type='feat' and mechanics_definition_id is null and source_instance_id is not null
  do update set
    target_character_id=excluded.target_character_id,
    source_definition_id=excluded.source_definition_id,
    source_character_id=excluded.source_character_id,
    source_name=excluded.source_name,
    muscles_modifier=excluded.muscles_modifier,
    reflexes_modifier=excluded.reflexes_modifier,
    vigour_modifier=excluded.vigour_modifier,
    brains_modifier=excluded.brains_modifier,
    shrewd_modifier=excluded.shrewd_modifier,
    presence_modifier=excluded.presence_modifier,
    max_health_modifier=excluded.max_health_modifier,
    warping_affinity_modifier=excluded.warping_affinity_modifier,
    warps_per_day_modifier=excluded.warps_per_day_modifier,
    starts_at=excluded.starts_at,
    expires_at=excluded.expires_at,
    ended_at=excluded.ended_at;

  return new;
end
$$;

drop trigger if exists gift_activation_central_sync
  on public.gift_activations;

create trigger gift_activation_central_sync
after insert or update or delete
on public.gift_activations
for each row
execute function public.sync_gift_activation_to_character_effect();

-- Backfill currently-active legacy Feat activations.
insert into public.character_effects (
  target_character_id,source_type,source_definition_id,source_instance_id,
  source_character_id,source_name,source_level,effect_nature,conditions,
  muscles_modifier,reflexes_modifier,vigour_modifier,brains_modifier,
  shrewd_modifier,presence_modifier,max_health_modifier,warping_affinity_modifier,
  warps_per_day_modifier,starts_at,expires_at,ended_at,dispellable
)
select
  coalesce(ga.target_character_id,cg.character_id),'feat',g.id,ga.id,cg.character_id,
  g.name,1,'mixed','{}'::text[],
  coalesce(g.muscles_modifier,0),coalesce(g.reflexes_modifier,0),
  coalesce(g.vigour_modifier,0),coalesce(g.brains_modifier,0),
  coalesce(g.shrewd_modifier,0),coalesce(g.presence_modifier,0),
  coalesce(g.max_health_modifier,0),coalesce(g.warping_affinity_modifier,0),
  coalesce(g.warps_per_day_modifier,0),ga.activated_at,ga.expires_at,ga.ended_at,true
from public.gift_activations ga
join public.character_gifts cg on cg.id=ga.character_gift_id
join public.gifts g on g.id=cg.gift_id
where g.effect_mode='temporary'
  and not exists (select 1 from public.shapes s where s.feat_id=g.id and s.is_feat_backing=true)
  and not exists (
    select 1 from public.character_effects ce
    where ce.source_type='feat' and ce.mechanics_definition_id is null
      and ce.source_instance_id=ga.id
  );

comment on table public.character_effects is
  'Single runtime source of active Conditions and temporary attribute/Max-Health effects from Shapes, Feats, Items and manual Conditions.';
