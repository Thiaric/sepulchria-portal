drop policy if exists "staff can delete order headquarters"
on public.order_headquarters;

create policy "staff can delete order headquarters"
on public.order_headquarters
for delete
to authenticated
using (
  exists (
    select 1
    from public.staff_members
    where staff_members.user_id = auth.uid()
      and staff_members.role in (
        'owner',
        'admin',
        'moderator',
        'master'
      )
  )
);
