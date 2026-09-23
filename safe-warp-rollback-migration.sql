-- Sepulchria — safe failed-Warp rollback
-- Target application commit: a01652ce245e577f107cdc94c02a340ca543e3f7
--
-- Purpose:
--   * failed setup / room-announcement stages can refund a normal Warp or
--     equipped-Item Shape charge when no irreversible Shape mechanics have run;
--   * Price duration added by the failed cast is restored;
--   * failed casts remain as audit rows but do not count against normal Warps;
--   * Item-powered casts do not count against normal Warps in runtime totals.

begin;

-- Keep a failed cast for audit/FK integrity, especially when an existing Price
-- effect was extended and now points at that cast.
alter table public.shape_casts
  drop constraint if exists shape_casts_status_check;

alter table public.shape_casts
  add constraint shape_casts_status_check
  check (
    status in (
      'resolving',
      'resolved',
      'failed'
    )
  );

create or replace function public.rollback_failed_shape_cast(
  p_cast_id uuid,
  p_character_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cast public.shape_casts%rowtype;
  v_price_key text;
  v_price_days integer;
  v_price record;
  v_restored_expiry timestamptz;
  v_reset_date date;
  v_used integer;
begin
  select sc.*
    into v_cast
  from public.shape_casts sc
  where sc.id = p_cast_id
    and sc.caster_character_id = p_character_id
    and sc.status = 'resolving'
  for update;

  if v_cast.id is null then
    return jsonb_build_object(
      'rolled_back', false,
      'reason', 'That Warp is no longer eligible for rollback.'
    );
  end if;

  -- Never refund a cast whose target mechanics have already been resolved.
  if exists (
    select 1
    from public.shape_cast_targets t
    where t.cast_id = p_cast_id
      and (
        t.resolved_at is not null
        or t.outcome not in ('pending', 'manual')
      )
  ) then
    return jsonb_build_object(
      'rolled_back', false,
      'reason', 'The Warp already resolved one or more targets.'
    );
  end if;

  -- Persistent Shape/Feat effects created from this cast prove mechanics ran.
  if exists (
    select 1
    from public.character_effects e
    where e.source_instance_id = p_cast_id
  ) then
    return jsonb_build_object(
      'rolled_back', false,
      'reason', 'The Warp already created a persistent effect.'
    );
  end if;

  /*
   * create_price_for_shape_cast either creates a new Price row or extends an
   * existing active row by exactly duration_days. Restore that duration before
   * marking the cast failed.
   */
  select
    s.price_key,
    wp.duration_days
  into
    v_price_key,
    v_price_days
  from public.shapes s
  left join public.warping_prices wp
    on wp.key = s.price_key
  where s.id = v_cast.shape_id;

  if v_price_key is not null and v_price_days is not null then
    for v_price in
      select
        cpe.id,
        cpe.expires_at
      from public.character_price_effects cpe
      where cpe.cast_id = p_cast_id
        and cpe.character_id = p_character_id
        and cpe.price_key = v_price_key
      for update
    loop
      v_restored_expiry :=
        v_price.expires_at -
        make_interval(days => v_price_days);

      /*
       * If subtracting this cast's duration takes the row back to/before the
       * cast time, this cast created the Price row rather than extending one.
       */
      if v_restored_expiry <= v_cast.created_at then
        delete from public.character_price_effects
        where id = v_price.id;
      else
        update public.character_price_effects
        set expires_at = v_restored_expiry
        where id = v_price.id;
      end if;
    end loop;
  end if;

  -- Refund an Item-Shape reservation/charge from the UTC day of the cast.
  if v_cast.resource_type = 'item'
     and v_cast.item_shape_id is not null
     and v_cast.item_record_kind is not null
     and v_cast.item_record_id is not null then

    v_reset_date :=
      (v_cast.created_at at time zone 'utc')::date;

    update public.character_item_shape_usage
    set
      charges_used = greatest(0, charges_used - 1),
      updated_at = now()
    where character_id = p_character_id
      and item_shape_id = v_cast.item_shape_id
      and item_record_kind = v_cast.item_record_kind
      and item_record_id = v_cast.item_record_id
      and reset_date = v_reset_date
      and charges_used > 0
    returning charges_used
    into v_used;

    if v_used = 0 then
      delete from public.character_item_shape_usage
      where character_id = p_character_id
        and item_shape_id = v_cast.item_shape_id
        and item_record_kind = v_cast.item_record_kind
        and item_record_id = v_cast.item_record_id
        and reset_date = v_reset_date
        and charges_used = 0;
    end if;
  end if;

  -- Pending/manual target rows must disappear so no Save popup survives.
  delete from public.shape_cast_targets
  where cast_id = p_cast_id;

  update public.shape_casts
  set
    status = 'failed',
    dispel_target_character_id = null,
    dispel_effect_id = null
  where id = p_cast_id;

  return jsonb_build_object(
    'rolled_back', true,
    'resource_type', v_cast.resource_type
  );
end
$$;

revoke all on function public.rollback_failed_shape_cast(
  uuid,
  uuid
) from public;

revoke all on function public.rollback_failed_shape_cast(
  uuid,
  uuid
) from authenticated;

grant execute on function public.rollback_failed_shape_cast(
  uuid,
  uuid
) to service_role;


/*
 * Current runtime used to count every shape_cast row, including Item-powered
 * casts. It must count normal Character-resource casts only, and ignore casts
 * explicitly rolled back as failed.
 */
create or replace function public.get_my_warping_runtime()
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  c public.characters%rowtype;
  b timestamptz := public.warping_reset_boundary(now());
  used int := 0;
  ss jsonb := '[]';
  ee jsonb := '[]';
  pp jsonb := '[]';
begin
  select *
    into c
  from public.characters
  where user_id = auth.uid()
  limit 1;

  if c.id is null then
    raise exception 'Character not found';
  end if;

  select count(*)
    into used
  from public.shape_casts
  where caster_character_id = c.id
    and resource_type = 'character'
    and status <> 'failed'
    and created_at >= b;

  select coalesce(
    jsonb_agg(to_jsonb(q) order by q.level, q.name),
    '[]'
  )
  into ss
  from (
    select
      s.*,
      bool_or(cs.level_override) level_override,
      bool_or(cs.acquisition_source = 'order') order_granted,
      string_agg(distinct cs.acquisition_source, ',') acquisition_source,
      (
        bool_or(cs.level_override)
        or bool_or(cs.acquisition_source = 'order')
        or s.level <= c.warping_affinity
      ) level_available
    from public.character_shapes cs
    join public.shapes s
      on s.id = cs.shape_id
    where cs.character_id = c.id
      and s.is_active = true
    group by s.id
  ) q;

  select coalesce(
    jsonb_agg(to_jsonb(q) order by q.starts_at desc),
    '[]'
  )
  into ee
  from (
    select
      e.*,
      s.name shape_name,
      s.word_of_power
    from public.character_shape_effects e
    join public.shapes s
      on s.id = e.shape_id
    where e.target_character_id = c.id
      and e.dispelled_at is null
      and (
        e.expires_at is null
        or e.expires_at > now()
      )
  ) q;

  select coalesce(
    jsonb_agg(to_jsonb(q) order by q.expires_at desc),
    '[]'
  )
  into pp
  from (
    select *
    from public.character_price_effects
    where character_id = c.id
      and expires_at > now()
  ) q;

  return jsonb_build_object(
    'character_id', c.id,
    'affinity', c.warping_affinity,
    'warps_per_day', c.warps_per_day,
    'warps_used', used,
    'warps_remaining', greatest(0, c.warps_per_day - used),
    'reset_boundary', b,
    'next_reset', b + interval '1 day',
    'shapes', ss,
    'active_effects', ee,
    'active_prices', pp
  );
end
$function$;

commit;
