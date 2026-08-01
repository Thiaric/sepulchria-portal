/*
  Account deletion support.

  Supabase does not allow direct DELETE statements against storage.objects.
  This function only lists objects owned by a user; the server action then
  removes them through the official Storage API before deleting the Auth user.
*/

create or replace function public.list_user_storage_objects(
  target_user_id uuid
)
returns table (
  bucket_id text,
  name text
)
language sql
security definer
set search_path = storage, public, pg_temp
as $$
  select
    objects.bucket_id,
    objects.name
  from storage.objects as objects
  where objects.owner_id =
    target_user_id::text
  order by
    objects.bucket_id,
    objects.name;
$$;

revoke all
on function public.list_user_storage_objects(uuid)
from public, anon, authenticated;

grant execute
on function public.list_user_storage_objects(uuid)
to service_role;
