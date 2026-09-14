begin;

insert into storage.buckets (
  id,
  name,
  public
)
values (
  'rich-text-images',
  'rich-text-images',
  true
)
on conflict (id)
do update
set public = true;

create table if not exists public.rich_text_images (
  id uuid primary key default gen_random_uuid(),
  sha256 text not null unique,
  storage_path text not null unique,
  public_url text not null,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  uploaded_by_user_id uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists rich_text_images_created_at_idx
on public.rich_text_images (created_at desc);

alter table public.rich_text_images enable row level security;

commit;
