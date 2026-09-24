-- Sepulchria tutorial system — add private-message conversation tutorial.
-- Run once after the Stage 2 tutorial SQL.

alter table public.user_tutorial_progress
  drop constraint if exists user_tutorial_progress_key_check;

alter table public.user_tutorial_progress
  add constraint user_tutorial_progress_key_check
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
      'codex'
    )
  );
