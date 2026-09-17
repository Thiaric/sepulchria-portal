-- SEPULCHRIA DEATH SYSTEM UPGRADE
-- Generated for master commit 87f1c990ae586b33c8601fbd530d2d51dc4496bc
-- Run this ONCE in the Supabase SQL editor BEFORE running npm run build.

begin;

alter table public.characters
  add column if not exists died_at timestamptz;

update public.characters
set died_at = coalesce(died_at, zero_hp_at, updated_at, now())
where life_state = 'dead'
  and died_at is null;

alter table public.character_death_rules
  add column if not exists essence_window_minutes integer not null default 60,
  add column if not exists auto_revive_health integer not null default 1,
  add column if not exists ghost_chat_enabled boolean not null default true,
  add column if not exists ghost_movement_enabled boolean not null default true,
  add column if not exists death_announcement_template text not null default
    '{character} is Dead. Their essence will cling to their body for the next {minutes} minutes. Items, Shapes and Feats that possess healing powers and can be used on others can still be used on them during this time to bring them back. After that only a Level IX Resurrection Shape can bring them back, or the Current must be allowed to work its way in time...';

alter table public.rooms
  add column if not exists allow_dead_ghosts boolean not null default false;

alter table public.character_death_events
  add column if not exists revived_at timestamptz,
  add column if not exists revival_source text;

create table if not exists public.death_resurrection_maluses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.character_resurrection_maluses (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null
    references public.characters(id) on delete cascade,
  death_event_id uuid
    references public.character_death_events(id) on delete set null,
  malus_id uuid
    references public.death_resurrection_maluses(id) on delete set null,
  narrative_text text not null,
  applied_at timestamptz not null default now(),
  cleared_at timestamptz,
  changed_by_user_id uuid references auth.users(id) on delete set null
);

create index if not exists character_resurrection_maluses_character_idx
  on public.character_resurrection_maluses(character_id, applied_at desc);

create index if not exists characters_dead_lookup_idx
  on public.characters(life_state, died_at)
  where life_state = 'dead';

insert into public.death_resurrection_maluses
  (name, description, sort_order)
values
  ('Echo of the Last Breath', 'Their voice occasionally carries a faint second whisper a fraction of a second behind it.', 10),
  ('Cold Thread', 'Their body never seems quite warm again, even beside a fire.', 20),
  ('Current-Sick Dreams', 'Sleep brings vivid dreams of impossible currents of light and places they have never visited.', 30),
  ('Hollow Reflection', 'Mirrors and still water sometimes seem a heartbeat slow to reflect them.', 40),
  ('Borrowed Heartbeat', 'Their heartbeat occasionally falls into an unsettling rhythm before returning to normal.', 50),
  ('Veil-Touched', 'Animals sometimes hesitate around them, sensing something they cannot understand.', 60),
  ('Ash on the Tongue', 'Strong emotions can leave a faint taste of ash or metal in their mouth.', 70),
  ('Memory Scar', 'One mundane memory from before their death has become strangely indistinct.', 80),
  ('Grave-Light', 'In darkness, their eyes sometimes catch light where there should be none.', 90),
  ('The Distant Call', 'In complete silence they occasionally think they hear someone speaking their name from far away.', 100),
  ('Shadow Afterimage', 'Their shadow can appear to linger for the briefest instant after they move.', 110),
  ('The Missing Moment', 'They occasionally lose a few seconds of subjective time, as though the Current briefly pulls at them again.', 120)
on conflict (name) do nothing;

-- Dead Characters may only send OFFGAME private messages.
create or replace function public.enforce_dead_private_message_mode()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state text;
begin
  select life_state::text
  into v_state
  from public.characters
  where id = new.sender_character_id;

  if v_state = 'dead'
     and coalesce(new.message_mode::text, 'ongame') <> 'offgame' then
    raise exception
      'Dead Characters may only send Off-game private messages.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_dead_private_message_mode
  on public.direct_messages;

create trigger trg_dead_private_message_mode
before insert or update of message_mode, sender_character_id
on public.direct_messages
for each row
execute function public.enforce_dead_private_message_mode();

-- Dead Characters may only post in OFFGAME forum sections.
create or replace function public.enforce_dead_forum_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state text;
  v_section_type text;
begin
  if new.author_character_id is null then
    return new;
  end if;

  select life_state::text
  into v_state
  from public.characters
  where id = new.author_character_id;

  if v_state <> 'dead' then
    return new;
  end if;

  select fs.section_type::text
  into v_section_type
  from public.forum_topics ft
  join public.forum_sections fs
    on fs.id = ft.section_id
  where ft.id = new.topic_id;

  if coalesce(v_section_type, '') <> 'offgame' then
    raise exception
      'Dead Characters may only use Offgame forum sections.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_dead_forum_post
  on public.forum_posts;

create trigger trg_dead_forum_post
before insert or update of topic_id, author_character_id
on public.forum_posts
for each row
execute function public.enforce_dead_forum_post();

-- Dead Characters cannot create Shape casts.
create or replace function public.enforce_living_shape_caster()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state text;
begin
  select life_state::text
  into v_state
  from public.characters
  where id = new.caster_character_id;

  if v_state = 'dead' then
    raise exception 'Dead Characters cannot Warp Shapes.';
  elsif v_state = 'death_save_pending' then
    raise exception
      'Characters at Death''s Threshold cannot Warp Shapes.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_living_shape_caster
  on public.shape_casts;

create trigger trg_living_shape_caster
before insert or update of caster_character_id
on public.shape_casts
for each row
execute function public.enforce_living_shape_caster();

-- Dead Characters cannot attack, use opposed Attributes, or Counter.
create or replace function public.enforce_living_opposed_action()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attacker_state text;
  v_target_state text;
begin
  select life_state::text
  into v_attacker_state
  from public.characters
  where id = new.attacker_character_id;

  select life_state::text
  into v_target_state
  from public.characters
  where id = new.target_character_id;

  if v_attacker_state <> 'alive' then
    raise exception
      'Dead or dying Characters cannot perform opposed Actions.';
  end if;

  if v_target_state = 'dead' then
    raise exception
      'Dead Characters cannot be targeted by attacks or opposed Attribute Actions.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_living_opposed_action
  on public.opposed_actions;

create trigger trg_living_opposed_action
before insert or update of attacker_character_id, target_character_id
on public.opposed_actions
for each row
execute function public.enforce_living_opposed_action();

-- Dead Character location messages are allowed only as Ghosts in configured rooms.
create or replace function public.enforce_dead_room_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state text;
  v_room_allowed boolean;
  v_ghost_chat boolean;
begin
  if new.character_id is null
     or coalesce(new.speaker_type::text, '') = 'system' then
    return new;
  end if;

  select life_state::text
  into v_state
  from public.characters
  where id = new.character_id;

  if v_state <> 'dead' then
    return new;
  end if;

  select allow_dead_ghosts
  into v_room_allowed
  from public.rooms
  where id = new.room_id;

  select ghost_chat_enabled
  into v_ghost_chat
  from public.character_death_rules
  where singleton = true;

  if coalesce(v_ghost_chat, true) is not true
     or coalesce(v_room_allowed, false) is not true then
    raise exception
      'Ghosts cannot speak in this Location.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_dead_room_message
  on public.room_messages;

create trigger trg_dead_room_message
before insert or update of room_id, character_id, speaker_type
on public.room_messages
for each row
execute function public.enforce_dead_room_message();

-- Shape targets: dead Characters are valid only for healing during the Essence
-- Window, or for any Level IX Shape with a positive Other healing profile.
create or replace function public.enforce_dead_shape_target()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state text;
  v_died_at timestamptz;
  v_zero_hp_at timestamptz;
  v_window integer;
  v_level integer;
  v_choice text;
  v_heal_dice text;
  v_heal_attribute text;
  v_healing boolean;
begin
  if new.target_character_id is null then
    return new;
  end if;

  select life_state::text, died_at, zero_hp_at
  into v_state, v_died_at, v_zero_hp_at
  from public.characters
  where id = new.target_character_id;

  if v_state <> 'dead' then
    return new;
  end if;

  select
    s.level,
    coalesce(new.other_effect_choice, 'beneficial'),
    case
      when coalesce(new.other_effect_choice, 'beneficial') = 'harmful'
        then s.other_alt_heal_dice
      else s.other_heal_dice
    end,
    case
      when coalesce(new.other_effect_choice, 'beneficial') = 'harmful'
        then s.other_alt_heal_attribute
      else s.other_heal_attribute
    end
  into
    v_level,
    v_choice,
    v_heal_dice,
    v_heal_attribute
  from public.shape_casts sc
  join public.shapes s on s.id = sc.shape_id
  where sc.id = new.cast_id;

  v_healing :=
    (
      nullif(trim(coalesce(v_heal_dice, '')), '') is not null
      and left(trim(v_heal_dice), 1) <> '-'
    )
    or nullif(trim(coalesce(v_heal_attribute, '')), '') is not null;

  -- Any Level IX Shape with a positive Other healing profile is a Resurrection Shape.
  if v_level = 9 and v_healing then
    return new;
  end if;

  if not v_healing then
    raise exception
      'Only healing Shapes can target a dead Character during the Essence Window.';
  end if;

  select essence_window_minutes
  into v_window
  from public.character_death_rules
  where singleton = true;

  v_window := coalesce(v_window, 60);

  if coalesce(v_died_at, v_zero_hp_at) is null
     or now() >
       coalesce(v_died_at, v_zero_hp_at) +
       make_interval(mins => v_window) then
    raise exception
      'This Character''s essence has faded. Only a Level IX Resurrection Shape can target them now.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_dead_shape_target
  on public.shape_cast_targets;

create trigger trg_dead_shape_target
before insert or update of target_character_id, cast_id, other_effect_choice
on public.shape_cast_targets
for each row
execute function public.enforce_dead_shape_target();

commit;
