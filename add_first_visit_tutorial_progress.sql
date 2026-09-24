-- Sepulchria first-visit tutorial progress.
-- Run once in Supabase SQL Editor.

create table if not exists public.user_tutorial_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  tour_key text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz null,
  primary key (user_id, tour_key),
  constraint user_tutorial_progress_key_check
    check (
      tour_key in (
        'portal-home',
        'game-location',
        'house-of-chances',
        'character-sheet',
        'odd-jobs',
        'gathering',
        'crafting',
        'breeze-lodgings',
        'sepulchria-map',
        'area',
        'characters-directory',
        'store',
        'weather',
        'city-people',
        'skins',
        'notifications',
        'private-messages',
        'messages-conversation',
        'instant-chat',
        'ancestries',
        'ancestry-detail',
        'associations',
        'association-detail',
        'orders',
        'order-detail',
        'warping',
        'feats',
        'character-profile',
        'character-inventory',
        'character-ledger',
        'character-trophies',
        'character-feats',
        'character-warping',
        'character-offgame',
        'character-log',
        'character-edit',
        'forum',
        'forum-section',
        'forum-topic',
        'market',
        'market-shop',
        'daily-missions',
        'polls',
        'hall-of-renown',
        'players-handbook',
        'codex',
        'tickets',
        'ticket-new',
        'ticket-detail'
      )
    )
);

alter table public.user_tutorial_progress
  enable row level security;

grant select, insert, update
  on public.user_tutorial_progress
  to authenticated;

drop policy if exists user_tutorial_progress_select_own
  on public.user_tutorial_progress;

create policy user_tutorial_progress_select_own
  on public.user_tutorial_progress
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists user_tutorial_progress_insert_own
  on public.user_tutorial_progress;

create policy user_tutorial_progress_insert_own
  on public.user_tutorial_progress
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists user_tutorial_progress_update_own
  on public.user_tutorial_progress;

create policy user_tutorial_progress_update_own
  on public.user_tutorial_progress
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
