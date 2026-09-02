-- Add Off-Character Message Frame cosmetic category / equip slot.
-- Run once in the Supabase SQL editor before testing equip/unequip.

begin;

alter table public.character_cosmetic_preferences
  add column if not exists equipped_off_character_message_frame_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.character_cosmetic_preferences'::regclass
      and conname = 'character_cosmetic_preferences_off_character_message_frame_fkey'
  ) then
    alter table public.character_cosmetic_preferences
      add constraint character_cosmetic_preferences_off_character_message_frame_fkey
      foreign key (equipped_off_character_message_frame_id)
      references public.cosmetic_items(id)
      on delete set null;
  end if;
end
$$;

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.cosmetic_items'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%category%'
  loop
    execute format(
      'alter table public.cosmetic_items drop constraint %I',
      constraint_record.conname
    );
  end loop;

  alter table public.cosmetic_items
    add constraint cosmetic_items_category_check
    check (
      category in (
        'sheet_frame',
        'chat_frame',
        'portrait_frame',
        'profile_background',
        'pm_frame',
        'instant_chat_frame',
        'forum_frame',
        'action_style',
        'nameplate',
        'profile_crest',
        'action_flourish',
        'whisper_style',
        'off_character_message_frame',
        'header_control_frame',
        'left_panel_frame',
        'right_panel_frame',
        'centre_panel_frame',
        'location_frame',
        'location_atmosphere'
      )
    );
end
$$;

commit;
