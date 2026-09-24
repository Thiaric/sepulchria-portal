-- Sepulchria Codex chapter narration
-- Run once in Supabase SQL Editor.

alter table public.codex_chapters
  add column if not exists read_audio_url text;

comment on column public.codex_chapters.read_audio_url is
  'Optional direct browser-playable audio URL for the narrated reading of this Codex chapter.';
