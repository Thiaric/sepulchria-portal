-- Masters' Notes duration / expiry
-- NULL = permanent
-- timestamp = hide the note once this moment is reached

alter table public.characters
add column if not exists master_notes_expires_at timestamptz;

comment on column public.characters.master_notes_expires_at is
'Expiry time for Masters Notes. NULL means permanent.';
