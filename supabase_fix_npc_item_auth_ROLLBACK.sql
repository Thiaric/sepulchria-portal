begin;

revoke execute on function public.use_character_inventory_record_targeted_as_staff(
  uuid,text,uuid,uuid
) from authenticated;

grant execute on function public.use_character_inventory_record_targeted_as_staff(
  uuid,text,uuid,uuid
) to service_role;

commit;
