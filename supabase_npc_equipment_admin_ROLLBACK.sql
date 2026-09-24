begin;

drop function if exists public.equip_npc_inventory_record_as_staff(
  uuid, text, uuid
);

drop function if exists public.unequip_npc_inventory_record_as_staff(
  uuid, text, uuid
);

commit;
