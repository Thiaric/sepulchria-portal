-- Sepulchria full cosmetic system extension.
-- Run in Supabase SQL Editor after applying the Python patch.

alter table public.cosmetic_items
  drop constraint if exists cosmetic_items_category_check;

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
      'header_control_frame',
      'left_panel_frame',
      'right_panel_frame',
      'centre_panel_frame',
      'location_frame',
      'location_atmosphere'
    )
  );

alter table public.character_cosmetic_preferences
  add column if not exists equipped_portrait_frame_id uuid references public.cosmetic_items(id) on delete set null,
  add column if not exists equipped_profile_background_id uuid references public.cosmetic_items(id) on delete set null,
  add column if not exists equipped_pm_frame_id uuid references public.cosmetic_items(id) on delete set null,
  add column if not exists equipped_instant_chat_frame_id uuid references public.cosmetic_items(id) on delete set null,
  add column if not exists equipped_forum_frame_id uuid references public.cosmetic_items(id) on delete set null,
  add column if not exists equipped_action_style_id uuid references public.cosmetic_items(id) on delete set null,
  add column if not exists equipped_nameplate_id uuid references public.cosmetic_items(id) on delete set null,
  add column if not exists equipped_profile_crest_id uuid references public.cosmetic_items(id) on delete set null,
  add column if not exists equipped_action_flourish_id uuid references public.cosmetic_items(id) on delete set null,
  add column if not exists equipped_whisper_style_id uuid references public.cosmetic_items(id) on delete set null,
  add column if not exists equipped_header_control_frame_id uuid references public.cosmetic_items(id) on delete set null,
  add column if not exists equipped_left_panel_frame_id uuid references public.cosmetic_items(id) on delete set null,
  add column if not exists equipped_right_panel_frame_id uuid references public.cosmetic_items(id) on delete set null,
  add column if not exists equipped_centre_panel_frame_id uuid references public.cosmetic_items(id) on delete set null,
  add column if not exists equipped_location_frame_id uuid references public.cosmetic_items(id) on delete set null,
  add column if not exists equipped_location_atmosphere_id uuid references public.cosmetic_items(id) on delete set null;

create or replace function public.validate_extended_cosmetic_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  slot record;
  actual_category text;
  owned boolean;
begin
  for slot in
    select *
    from (
      values
        ('sheet_frame', new.equipped_sheet_frame_id),
        ('chat_frame', new.equipped_chat_frame_id),
        ('portrait_frame', new.equipped_portrait_frame_id),
        ('profile_background', new.equipped_profile_background_id),
        ('pm_frame', new.equipped_pm_frame_id),
        ('instant_chat_frame', new.equipped_instant_chat_frame_id),
        ('forum_frame', new.equipped_forum_frame_id),
        ('action_style', new.equipped_action_style_id),
        ('nameplate', new.equipped_nameplate_id),
        ('profile_crest', new.equipped_profile_crest_id),
        ('action_flourish', new.equipped_action_flourish_id),
        ('whisper_style', new.equipped_whisper_style_id),
        ('header_control_frame', new.equipped_header_control_frame_id),
        ('left_panel_frame', new.equipped_left_panel_frame_id),
        ('right_panel_frame', new.equipped_right_panel_frame_id),
        ('centre_panel_frame', new.equipped_centre_panel_frame_id),
        ('location_frame', new.equipped_location_frame_id),
        ('location_atmosphere', new.equipped_location_atmosphere_id)
    ) as slots(expected_category, cosmetic_id)
  loop
    if slot.cosmetic_id is null then
      continue;
    end if;

    select category
    into actual_category
    from public.cosmetic_items
    where id = slot.cosmetic_id
      and is_active = true;

    if actual_category is distinct from slot.expected_category then
      raise exception 'Cosmetic % does not belong in slot %',
        slot.cosmetic_id,
        slot.expected_category;
    end if;

    select exists (
      select 1
      from public.character_cosmetic_entitlements e
      where e.character_id = new.character_id
        and e.cosmetic_item_id = slot.cosmetic_id
        and e.enabled = true
    )
    into owned;

    if not owned then
      raise exception 'Character does not own cosmetic %',
        slot.cosmetic_id;
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists validate_extended_cosmetic_preferences
  on public.character_cosmetic_preferences;

create trigger validate_extended_cosmetic_preferences
before insert or update
on public.character_cosmetic_preferences
for each row
execute function public.validate_extended_cosmetic_preferences();

create or replace function public.unequip_revoked_extended_cosmetic()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.enabled = true then
    return new;
  end if;

  update public.character_cosmetic_preferences
  set
    equipped_sheet_frame_id = case when equipped_sheet_frame_id = new.cosmetic_item_id then null else equipped_sheet_frame_id end,
    equipped_chat_frame_id = case when equipped_chat_frame_id = new.cosmetic_item_id then null else equipped_chat_frame_id end,
    equipped_portrait_frame_id = case when equipped_portrait_frame_id = new.cosmetic_item_id then null else equipped_portrait_frame_id end,
    equipped_profile_background_id = case when equipped_profile_background_id = new.cosmetic_item_id then null else equipped_profile_background_id end,
    equipped_pm_frame_id = case when equipped_pm_frame_id = new.cosmetic_item_id then null else equipped_pm_frame_id end,
    equipped_instant_chat_frame_id = case when equipped_instant_chat_frame_id = new.cosmetic_item_id then null else equipped_instant_chat_frame_id end,
    equipped_forum_frame_id = case when equipped_forum_frame_id = new.cosmetic_item_id then null else equipped_forum_frame_id end,
    equipped_action_style_id = case when equipped_action_style_id = new.cosmetic_item_id then null else equipped_action_style_id end,
    equipped_nameplate_id = case when equipped_nameplate_id = new.cosmetic_item_id then null else equipped_nameplate_id end,
    equipped_profile_crest_id = case when equipped_profile_crest_id = new.cosmetic_item_id then null else equipped_profile_crest_id end,
    equipped_action_flourish_id = case when equipped_action_flourish_id = new.cosmetic_item_id then null else equipped_action_flourish_id end,
    equipped_whisper_style_id = case when equipped_whisper_style_id = new.cosmetic_item_id then null else equipped_whisper_style_id end,
    equipped_header_control_frame_id = case when equipped_header_control_frame_id = new.cosmetic_item_id then null else equipped_header_control_frame_id end,
    equipped_left_panel_frame_id = case when equipped_left_panel_frame_id = new.cosmetic_item_id then null else equipped_left_panel_frame_id end,
    equipped_right_panel_frame_id = case when equipped_right_panel_frame_id = new.cosmetic_item_id then null else equipped_right_panel_frame_id end,
    equipped_centre_panel_frame_id = case when equipped_centre_panel_frame_id = new.cosmetic_item_id then null else equipped_centre_panel_frame_id end,
    equipped_location_frame_id = case when equipped_location_frame_id = new.cosmetic_item_id then null else equipped_location_frame_id end,
    equipped_location_atmosphere_id = case when equipped_location_atmosphere_id = new.cosmetic_item_id then null else equipped_location_atmosphere_id end,
    updated_at = now()
  where character_id = new.character_id;

  return new;
end;
$$;

drop trigger if exists unequip_revoked_extended_cosmetic
  on public.character_cosmetic_entitlements;

create trigger unequip_revoked_extended_cosmetic
after insert or update of enabled
on public.character_cosmetic_entitlements
for each row
execute function public.unequip_revoked_extended_cosmetic();
