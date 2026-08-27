-- =========================================================
-- SEPULCHRIA — RECIPE ITEMS + ATOMIC RECIPE LEARNING
--
-- Recipe books/scrolls are ordinary Items:
-- - can be assigned through existing Assign Items tools
-- - can be stocked/sold through the existing Market
-- - using one teaches its linked crafting recipe
-- - one copy is consumed only when learning succeeds
-- =========================================================

begin;

-- ---------------------------------------------------------
-- 1. LINK NORMAL ITEMS TO A CRAFTING RECIPE
-- ---------------------------------------------------------

alter table public.items
add column if not exists teaches_recipe_id uuid
references public.crafting_recipes(id)
on delete set null;

create index if not exists idx_items_teaches_recipe
on public.items(teaches_recipe_id)
where teaches_recipe_id is not null;


-- ---------------------------------------------------------
-- 2. ATOMIC LEARN-RECIPE FUNCTION
-- ---------------------------------------------------------

create or replace function public.learn_recipe_from_item(
    p_character_id uuid,
    p_record_kind text,
    p_record_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_item_id uuid;
    v_quantity integer;
    v_item_name text;
    v_recipe_id uuid;
    v_recipe_name text;
    v_item_active boolean;
    v_item_usable boolean;
    v_use_behaviour text;
begin
    -- Only the logged-in owner may learn for this character.
    if not exists (
        select 1
        from public.characters c
        where c.id = p_character_id
          and c.user_id = auth.uid()
    ) then
        raise exception 'You cannot use items for this character.';
    end if;

    -- Lock and resolve the actual owned inventory record.
    if p_record_kind = 'standard' then
        select ci.item_id, ci.quantity
        into v_item_id, v_quantity
        from public.character_items ci
        where ci.id = p_record_id
          and ci.character_id = p_character_id
          and ci.quantity > 0
        for update;

        if not found then
            raise exception 'That Item is not in your Inventory.';
        end if;

    elsif p_record_kind = 'unique' then
        select cii.item_id
        into v_item_id
        from public.character_item_instances cii
        where cii.id = p_record_id
          and cii.owner_character_id = p_character_id
          and cii.vault_status = 'owned'
        for update;

        if not found then
            raise exception 'That Item is not in your Inventory.';
        end if;

    else
        raise exception 'Invalid Item record kind.';
    end if;

    -- Load the Item definition and linked recipe.
    select
        i.name,
        i.teaches_recipe_id,
        i.is_active,
        i.is_usable,
        i.use_behaviour
    into
        v_item_name,
        v_recipe_id,
        v_item_active,
        v_item_usable,
        v_use_behaviour
    from public.items i
    where i.id = v_item_id;

    if not found then
        raise exception 'The Item definition could not be loaded.';
    end if;

    if not v_item_active then
        raise exception 'This Item is inactive.';
    end if;

    if not v_item_usable then
        raise exception 'This Item cannot be used.';
    end if;

    if v_recipe_id is null then
        raise exception 'This Item does not teach a crafting recipe.';
    end if;

    -- Recipe items use the existing consumable behaviour.
    if v_use_behaviour is distinct from 'consumable' then
        raise exception 'Recipe Items must use consumable behaviour.';
    end if;

    select cr.name
    into v_recipe_name
    from public.crafting_recipes cr
    where cr.id = v_recipe_id
      and cr.is_active = true;

    if not found then
        raise exception 'The recipe taught by this Item is unavailable.';
    end if;

    -- Do NOT consume duplicate recipe books.
    if exists (
        select 1
        from public.character_recipes known
        where known.character_id = p_character_id
          and known.recipe_id = v_recipe_id
    ) then
        return jsonb_build_object(
            'success', false,
            'already_known', true,
            'recipe_id', v_recipe_id,
            'recipe_name', v_recipe_name,
            'message', 'This character already knows ' || v_recipe_name || '.'
        );
    end if;

    insert into public.character_recipes (
        character_id,
        recipe_id
    )
    values (
        p_character_id,
        v_recipe_id
    );

    -- Consume exactly one physical recipe Item.
    if p_record_kind = 'standard' then
        if v_quantity <= 1 then
            delete from public.character_items
            where id = p_record_id
              and character_id = p_character_id;
        else
            update public.character_items
            set
                quantity = quantity - 1,
                updated_at = now()
            where id = p_record_id
              and character_id = p_character_id;
        end if;
    else
        delete from public.character_item_instances
        where id = p_record_id
          and owner_character_id = p_character_id
          and vault_status = 'owned';
    end if;

    return jsonb_build_object(
        'success', true,
        'already_known', false,
        'recipe_id', v_recipe_id,
        'recipe_name', v_recipe_name,
        'item_name', v_item_name,
        'message', 'Learned recipe: ' || v_recipe_name || '.'
    );
end;
$$;

revoke all on function public.learn_recipe_from_item(uuid, text, uuid)
from public;

grant execute on function public.learn_recipe_from_item(uuid, text, uuid)
to authenticated;


-- ---------------------------------------------------------
-- 3. CREATE RECIPE BOOK ITEMS FOR THE CURRENT 10 RECIPES
--
-- They deliberately use Book / Document with no subcategory.
-- They are stackable normal inventory Items, so existing:
-- Assign Items / Market / trading / rewards all work.
-- ---------------------------------------------------------

with recipe_item_data (
    recipe_slug,
    item_name,
    item_slug,
    description,
    quality,
    reference_value,
    sort_order
) as (
    values
        (
            'craft-mendicants-red-phial',
            'Recipe: Mendicant''s Red Phial',
            'recipe-mendicants-red-phial',
            'A practical handwritten formula explaining how to prepare Mendicant''s Red Phial. Using this document teaches the recipe.',
            'average',
            90,
            10
        ),
        (
            'craft-hearthblood-tonic',
            'Recipe: Hearthblood Tonic',
            'recipe-hearthblood-tonic',
            'A compact alchemical formula for Hearthblood Tonic. Using this document teaches the recipe.',
            'average',
            160,
            20
        ),
        (
            'craft-tonic-of-the-second-breath',
            'Recipe: Tonic of the Second Breath',
            'recipe-tonic-of-the-second-breath',
            'Notes on the measured preparation of Bitterroot, Juniper Berries and spirit used in Tonic of the Second Breath. Using this document teaches the recipe.',
            'fine',
            260,
            30
        ),
        (
            'craft-twin-mercy-elixir',
            'Recipe: Twin Mercy Elixir',
            'recipe-twin-mercy-elixir',
            'A refined medicinal formula describing the preparation of Twin Mercy Elixir. Using this document teaches the recipe.',
            'fine',
            420,
            40
        ),
        (
            'craft-dockhands-hookblade',
            'Pattern: Dockhand''s Hookblade',
            'recipe-dockhands-hookblade',
            'A smith''s working pattern for the crude but dependable Dockhand''s Hookblade. Using this document teaches the recipe.',
            'average',
            110,
            100
        ),
        (
            'craft-sharp-cleaver',
            'Pattern: Sharp Cleaver',
            'recipe-sharp-cleaver',
            'A smith''s pattern describing the proportions and assembly of a Sharp Cleaver. Using this document teaches the recipe.',
            'average',
            150,
            110
        ),
        (
            'craft-gatewardens-hammer',
            'Pattern: Gatewarden''s Hammer',
            'recipe-gatewardens-hammer',
            'A workshop pattern for forging and hafting a Gatewarden''s Hammer. Using this document teaches the recipe.',
            'average',
            180,
            120
        ),
        (
            'craft-splintered-levy-shield',
            'Pattern: Splintered Levy Shield',
            'recipe-splintered-levy-shield',
            'A simple construction pattern for a reinforced levy shield. Using this document teaches the recipe.',
            'average',
            120,
            130
        ),
        (
            'craft-mercenarys-leather-harness',
            'Pattern: Mercenary''s Leather Harness',
            'recipe-mercenarys-leather-harness',
            'A leatherworker''s cutting and assembly pattern for a Mercenary''s Leather Harness. Using this document teaches the recipe.',
            'fine',
            300,
            140
        ),
        (
            'craft-preservation-satchel',
            'Pattern: Preservation Satchel',
            'recipe-preservation-satchel',
            'A specialist pattern describing the layered construction and treatment of a Preservation Satchel. Using this document teaches the recipe.',
            'fine',
            380,
            150
        )
),
book_category as (
    select id
    from public.item_categories
    where slug = 'book-document'
    limit 1
)
insert into public.items (
    name,
    slug,
    description,
    category_id,
    subcategory_id,
    quality,
    transfer_policy,
    is_quest_item,
    is_active,
    stackable,
    max_stack,
    reference_value,
    is_usable,
    use_behaviour,
    target_mode,
    sort_order,
    teaches_recipe_id
)
select
    d.item_name,
    d.item_slug,
    d.description,
    bc.id,
    null,
    d.quality,
    'free',
    false,
    true,
    true,
    99,
    d.reference_value,
    true,
    'consumable',
    'self',
    d.sort_order,
    cr.id
from recipe_item_data d
cross join book_category bc
join public.crafting_recipes cr
    on cr.slug = d.recipe_slug
where not exists (
    select 1
    from public.items existing
    where existing.slug = d.item_slug
);

-- If a recipe Item already existed from a previous partial run,
-- ensure its recipe link and usable settings are correct.
with links(recipe_slug, item_slug) as (
    values
        ('craft-mendicants-red-phial', 'recipe-mendicants-red-phial'),
        ('craft-hearthblood-tonic', 'recipe-hearthblood-tonic'),
        ('craft-tonic-of-the-second-breath', 'recipe-tonic-of-the-second-breath'),
        ('craft-twin-mercy-elixir', 'recipe-twin-mercy-elixir'),
        ('craft-dockhands-hookblade', 'recipe-dockhands-hookblade'),
        ('craft-sharp-cleaver', 'recipe-sharp-cleaver'),
        ('craft-gatewardens-hammer', 'recipe-gatewardens-hammer'),
        ('craft-splintered-levy-shield', 'recipe-splintered-levy-shield'),
        ('craft-mercenarys-leather-harness', 'recipe-mercenarys-leather-harness'),
        ('craft-preservation-satchel', 'recipe-preservation-satchel')
)
update public.items i
set
    teaches_recipe_id = cr.id,
    is_usable = true,
    use_behaviour = 'consumable',
    target_mode = 'self',
    updated_at = now()
from links l
join public.crafting_recipes cr
    on cr.slug = l.recipe_slug
where i.slug = l.item_slug;

commit;


-- ---------------------------------------------------------
-- VERIFY
-- ---------------------------------------------------------

select
    i.name as recipe_item,
    i.slug,
    cr.name as teaches,
    i.is_usable,
    i.use_behaviour,
    i.reference_value
from public.items i
join public.crafting_recipes cr
    on cr.id = i.teaches_recipe_id
order by cr.sort_order, cr.name;
