begin;

-- Preserve the current function bodies and only widen the target-character guard
-- from non-system Characters to normal Characters OR system Characters linked to an NPC.
DO $$
DECLARE
  fn text;
BEGIN
  SELECT pg_get_functiondef(p.oid)
  INTO fn
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public'
    AND p.proname='staff_grant_inventory_item'
  LIMIT 1;

  IF fn IS NULL THEN
    RAISE EXCEPTION 'staff_grant_inventory_item not found';
  END IF;

  fn := replace(
    fn,
    'where id=p_character_id and coalesce(is_system,false)=false',
    'where id=p_character_id and (coalesce(is_system,false)=false or exists (select 1 from public.npcs n where n.character_id=public.characters.id))'
  );

  EXECUTE fn;
END $$;

DO $$
DECLARE
  fn text;
BEGIN
  SELECT pg_get_functiondef(p.oid)
  INTO fn
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public'
    AND p.proname='staff_create_unique_item_for_character'
  LIMIT 1;

  IF fn IS NULL THEN
    RAISE EXCEPTION 'staff_create_unique_item_for_character not found';
  END IF;

  fn := replace(
    fn,
    'where id=p_character_id and coalesce(is_system,false)=false',
    'where id=p_character_id and (coalesce(is_system,false)=false or exists (select 1 from public.npcs n where n.character_id=public.characters.id))'
  );

  EXECUTE fn;
END $$;

commit;
