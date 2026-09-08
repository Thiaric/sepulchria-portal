-- Sepulchria Character Conditions
-- Base commit:
-- 6a79eb388f4a7955d640ea3eaf0c18907a9aa8b6
--
-- Run this ONCE in Supabase SQL Editor after applying the Python patch.
--
-- Conditions are:
--   * editable by the Character themselves in Character -> Edit
--   * editable in Locations by the Character, and by Owner/Admin/Master
--     for co-located Characters
--   * editable in /admin/characters/[id] by Owner/Admin/Master
--   * visible on own and public Character Sheets
--   * snapshotted automatically onto every new room message

begin;

create table if not exists
  public.character_conditions (
    id uuid primary key
      default gen_random_uuid(),

    character_id uuid not null
      references public.characters(id)
      on delete cascade,

    label text not null,

    created_by_user_id uuid null
      references auth.users(id)
      on delete set null,

    created_by_role text not null
      default 'player',

    created_at timestamptz not null
      default now(),

    constraint
      character_conditions_label_length
      check (
        char_length(
          trim(label)
        )
        between 1 and 40
      ),

    constraint
      character_conditions_created_by_role
      check (
        created_by_role in (
          'player',
          'master',
          'admin',
          'owner'
        )
      )
  );

create unique index if not exists
  character_conditions_character_label_unique
on public.character_conditions (
  character_id,
  lower(label)
);

create index if not exists
  character_conditions_character_created_idx
on public.character_conditions (
  character_id,
  created_at,
  id
);

create or replace function
  public.validate_character_condition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_count integer;
begin
  new.label :=
    regexp_replace(
      trim(new.label),
      '\s+',
      ' ',
      'g'
    );

  if
    char_length(new.label) < 1
    or
    char_length(new.label) > 40
  then
    raise exception
      'Condition must contain between 1 and 40 characters.';
  end if;

  if tg_op = 'INSERT' then
    select count(*)
    into active_count
    from
      public.character_conditions
    where
      character_id =
        new.character_id;

    if
      active_count >= 10
    then
      raise exception
        'A Character may have at most 10 active Conditions.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists
  character_conditions_validate
on public.character_conditions;

create trigger
  character_conditions_validate
before insert or update
on public.character_conditions
for each row
execute function
  public.validate_character_condition();

alter table
  public.character_conditions
enable row level security;

drop policy if exists
  character_conditions_authenticated_read
on public.character_conditions;

create policy
  character_conditions_authenticated_read
on public.character_conditions
for select
to authenticated
using (true);

grant select
on public.character_conditions
to authenticated;

revoke insert, update, delete
on public.character_conditions
from anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where
      pubname =
        'supabase_realtime'
      and
      schemaname =
        'public'
      and
      tablename =
        'character_conditions'
  ) then
    alter publication
      supabase_realtime
    add table
      public.character_conditions;
  end if;
end;
$$;

alter table
  public.room_messages
add column if not exists
  condition_snapshot jsonb
  not null
  default '[]'::jsonb;

create or replace function
  public.snapshot_room_message_conditions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if
    new.character_id
      is null
  then
    new.condition_snapshot :=
      '[]'::jsonb;

    return new;
  end if;

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'label',
          condition_row.label
        )
        order by
          condition_row.created_at,
          condition_row.id
      ),
      '[]'::jsonb
    )
  into
    new.condition_snapshot
  from
    public.character_conditions
      as condition_row
  where
    condition_row.character_id =
      new.character_id;

  return new;
end;
$$;

drop trigger if exists
  room_messages_condition_snapshot
on public.room_messages;

create trigger
  room_messages_condition_snapshot
before insert
on public.room_messages
for each row
execute function
  public.snapshot_room_message_conditions();

commit;
