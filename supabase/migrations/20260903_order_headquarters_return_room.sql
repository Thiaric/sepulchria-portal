alter table public.order_memberships
add column if not exists return_room_id uuid
references public.rooms(id)
on delete set null;
