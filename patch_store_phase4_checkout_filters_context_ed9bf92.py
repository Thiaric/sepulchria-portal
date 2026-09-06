from pathlib import Path
import subprocess

ROOT = Path.cwd()
EXPECTED = "ed9bf928e67245ecdd60b31f57fb77e42e2ac4fb"

def head():
    try:
        return subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    except Exception:
        return None

current = head()
if current and current != EXPECTED:
    raise SystemExit(f"This patch targets {EXPECTED[:7]}, but HEAD is {current[:7]}.")

def write(rel, content):
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    print(f"Wrote {rel}")

def replace_once(rel, old, new, label):
    p = ROOT / rel
    text = p.read_text(encoding="utf-8")
    if new in text:
        print(f"{label}: already applied")
        return
    if old not in text:
        raise SystemExit(f"{label}: expected block not found in {rel}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")
    print(f"{label}: patched")

FILTER = r'''"use client";

import { useEffect, useState } from "react";

type StoreFilterDetail = { query: string; category: string };

function applyFilter(detail: StoreFilterDetail) {
  const query = detail.query.trim().toLowerCase();
  const category = detail.category;

  document.querySelectorAll<HTMLElement>("[data-store-filter-card]").forEach((element) => {
    const name = (element.dataset.storeName ?? "").toLowerCase();
    const productCategory = element.dataset.storeCategory ?? "";
    const matchesName = !query || name.includes(query);
    const matchesCategory = category === "all" || productCategory === category;
    element.hidden = !(matchesName && matchesCategory);
  });

  window.dispatchEvent(new CustomEvent("sepulchria:store-filter-state", { detail }));
}

export function StoreLiveFilterBar({
  placeholder = "Search Store products...",
}: {
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onExternal = (event: Event) => {
      const detail = (event as CustomEvent<StoreFilterDetail>).detail;
      if (detail && typeof detail.query === "string") setQuery(detail.query);
    };
    window.addEventListener("sepulchria:store-filter-request", onExternal);
    return () => window.removeEventListener("sepulchria:store-filter-request", onExternal);
  }, []);

  return (
    <input
      type="search"
      value={query}
      onChange={(event) => {
        const detail = { query: event.target.value, category: "all" };
        setQuery(detail.query);
        applyFilter(detail);
        window.dispatchEvent(new CustomEvent("sepulchria:store-filter-request", { detail }));
      }}
      placeholder={placeholder}
      aria-label={placeholder}
      className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-756958))] focus:border-[rgb(var(--sep-colour-987344))]"
    />
  );
}
'''

CONTEXT = r'''"use client";

import { useEffect, useMemo, useState } from "react";

type ProductRef = { id: string; name: string; category: string };

const LABELS: Record<string, string> = {
  skin: "Skins",
  cosmetic: "Cosmetics",
  music: "Music",
  friend_list: "Friend List",
  private_location: "Private Locations",
  bundle: "Bundles",
};

export function StoreContextPanel({ admin = false }: { admin?: boolean }) {
  const [products, setProducts] = useState<ProductRef[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    const collect = () => {
      setProducts(
        Array.from(document.querySelectorAll<HTMLElement>("[data-store-product]"))
          .map((element) => ({
            id: element.id,
            name: element.dataset.storeName ?? "Product",
            category: element.dataset.storeCategory ?? "other",
          }))
          .filter((entry) => Boolean(entry.id)),
      );
    };

    collect();
    const observer = new MutationObserver(collect);
    observer.observe(document.body, { childList: true, subtree: true });

    const onState = (event: Event) => {
      const detail = (event as CustomEvent<{ query?: string; category?: string }>).detail;
      if (typeof detail?.query === "string") setQuery(detail.query);
      if (typeof detail?.category === "string") setCategory(detail.category);
    };
    window.addEventListener("sepulchria:store-filter-state", onState);

    return () => {
      observer.disconnect();
      window.removeEventListener("sepulchria:store-filter-state", onState);
    };
  }, []);

  function apply(nextQuery: string, nextCategory: string) {
    setQuery(nextQuery);
    setCategory(nextCategory);
    const detail = { query: nextQuery, category: nextCategory };
    window.dispatchEvent(new CustomEvent("sepulchria:store-filter-request", { detail }));

    document.querySelectorAll<HTMLElement>("[data-store-filter-card]").forEach((element) => {
      const name = (element.dataset.storeName ?? "").toLowerCase();
      const productCategory = element.dataset.storeCategory ?? "";
      const matchesName = !nextQuery.trim() || name.includes(nextQuery.trim().toLowerCase());
      const matchesCategory = nextCategory === "all" || productCategory === nextCategory;
      element.hidden = !(matchesName && matchesCategory);
    });
  }

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category))),
    [products],
  );

  const filtered = products.filter((product) => {
    const matchesName = !query.trim() || product.name.toLowerCase().includes(query.trim().toLowerCase());
    return matchesName && (category === "all" || product.category === category);
  });

  return (
    <div className="flex min-h-0 flex-col">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8c704b))]">
        {admin ? "Store Administration" : "Sepulchria Store"}
      </p>
      <h3 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">Find a product</h3>

      <input
        type="search"
        value={query}
        onChange={(event) => apply(event.target.value, category)}
        placeholder="Live search..."
        className="mt-3 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-d7c4a5))] outline-none"
      />

      <div className="mt-3 flex flex-wrap gap-1.5">
        <button type="button" onClick={() => apply(query, "all")} className="border border-[rgb(var(--sep-colour-60482e))]/45 px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a99b89))]">All</button>
        {categories.map((key) => (
          <button key={key} type="button" onClick={() => apply(query, key)} className="border border-[rgb(var(--sep-colour-60482e))]/45 px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a99b89))]">
            {LABELS[key] ?? key}
          </button>
        ))}
      </div>

      <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto">
        {categories.map((group) => {
          const groupProducts = filtered.filter((product) => product.category === group);
          if (!groupProducts.length) return null;
          return (
            <section key={group}>
              <p className="mb-2 text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">{LABELS[group] ?? group}</p>
              <div className="space-y-1.5">
                {groupProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => document.getElementById(product.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    className="w-full border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] px-2.5 py-2 text-left text-[9px] text-[rgb(var(--sep-colour-b9a98f))] transition hover:border-[rgb(var(--sep-colour-987344))]/70 hover:text-[rgb(var(--sep-colour-efd9aa))]"
                  >
                    {product.name}
                  </button>
                ))}
              </div>
            </section>
          );
        })}
        {!filtered.length ? <p className="text-[9px] leading-4 text-[rgb(var(--sep-colour-756958))]">No products match this filter.</p> : null}
      </div>
    </div>
  );
}
'''

ACTIONS = r'''"use server";

import { revalidatePath } from "next/cache";
import { createPremiumFeatureGrantNotification } from "@/lib/premium-features/notifications";
import { createClient } from "@/lib/supabase/server";

export type StorePurchaseState = { ok: boolean; error: string | null; orderId: string | null };

export async function purchaseStoreProductWithRemnants(
  _previousState: StorePurchaseState,
  formData: FormData,
): Promise<StorePurchaseState> {
  const productId = String(formData.get("productId") ?? "").trim();
  if (!productId) return { ok: false, error: "Store product is missing.", orderId: null };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in.", orderId: null };

  const [characterResult, productResult] = await Promise.all([
    supabase.from("characters").select("id").eq("user_id", user.id).maybeSingle(),
    supabase.from("store_products").select("name").eq("id", productId).maybeSingle(),
  ]);

  if (characterResult.error || !characterResult.data) {
    return { ok: false, error: characterResult.error?.message ?? "Character not found.", orderId: null };
  }

  const { data, error } = await supabase.rpc("purchase_store_product_with_remnants", { p_product_id: productId });
  if (error) return { ok: false, error: error.message, orderId: null };

  try {
    await createPremiumFeatureGrantNotification({
      characterId: characterResult.data.id,
      createdBy: user.id,
      title: "Store purchase complete",
      body: `You purchased ${productResult.data?.name ?? "a Store product"} with Remnants. Your unlock is available immediately.`,
      href: "/store",
    });
  } catch (notificationError) {
    console.error("Store purchase succeeded, but its notification could not be created:", notificationError);
  }

  for (const path of ["/store", "/appearance", "/cosmetics", "/friends", "/private-locations", "/character", "/game"]) {
    revalidatePath(path);
  }
  revalidatePath("/", "layout");

  return { ok: true, error: null, orderId: typeof data === "string" ? data : String(data ?? "") };
}
'''

BUTTON = r'''"use client";

import { useActionState, useEffect } from "react";
import { purchaseStoreProductWithRemnants, type StorePurchaseState } from "@/app/(portal)/store/actions";

const initialState: StorePurchaseState = { ok: false, error: null, orderId: null };

export function StoreRemnantPurchaseButton({ productId, amount }: { productId: string; amount: number }) {
  const [state, action, pending] = useActionState(purchaseStoreProductWithRemnants, initialState);

  useEffect(() => {
    if (state.ok) window.location.reload();
  }, [state.ok]);

  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="productId" value={productId} />
      <button type="submit" disabled={pending} className="w-full border border-[rgb(var(--sep-colour-987344))]/70 bg-[rgb(var(--sep-colour-2a1d12))] px-3 py-2 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd9aa))] transition hover:border-[rgb(var(--sep-colour-b78b50))] disabled:cursor-wait disabled:opacity-55">
        {pending ? "Purchasing..." : `Buy for 🝈 ${amount} Remnants`}
      </button>
      {state.error ? <p className="mt-2 text-[9px] leading-4 text-red-300">{state.error}</p> : null}
    </form>
  );
}
'''

SQL = r'''-- Sepulchria Store — Phase 4 Remnant checkout + fulfilment
begin;

create or replace function public.purchase_store_product_with_remnants(p_product_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_character_id uuid;
  v_product public.store_products%rowtype;
  v_price public.store_product_prices%rowtype;
  v_balance bigint;
  v_new_balance bigint;
  v_order_id uuid;
  v_order_item_id uuid;
  v_grant public.store_product_grants%rowtype;
  v_all_owned boolean := true;
begin
  if v_user_id is null then raise exception 'You must be signed in.'; end if;

  select id into v_character_id from public.characters where user_id = v_user_id limit 1;
  if v_character_id is null then raise exception 'No character is attached to this account.'; end if;

  select * into v_product from public.store_products
  where id = p_product_id and is_active = true
    and (available_from is null or available_from <= now())
    and (available_until is null or available_until > now());
  if not found then raise exception 'This Store product is not available.'; end if;

  select * into v_price from public.store_product_prices
  where product_id = p_product_id and is_active = true and remnants_amount is not null
  order by created_at asc limit 1;
  if not found then raise exception 'This Store product does not have a Remnant price.'; end if;

  if not exists (select 1 from public.store_product_grants where product_id = p_product_id) then
    raise exception 'This Store product has no fulfilment grants.';
  end if;

  for v_grant in select * from public.store_product_grants where product_id = p_product_id loop
    if v_grant.grant_type = 'portal_skin' then
      if not exists (select 1 from public.user_portal_skin_entitlements e where e.user_id=v_user_id and e.skin_id=v_grant.portal_skin_id and e.enabled=true) then v_all_owned := false; end if;
    elsif v_grant.grant_type = 'cosmetic' then
      if not exists (select 1 from public.character_cosmetic_entitlements e where e.character_id=v_character_id and e.cosmetic_item_id=v_grant.cosmetic_item_id and e.enabled=true) then v_all_owned := false; end if;
    elsif v_grant.grant_type = 'music' then
      if not exists (select 1 from public.character_music_entitlements e where e.character_id=v_character_id and e.music_track_id=v_grant.music_track_id and e.enabled=true) then v_all_owned := false; end if;
    elsif v_grant.grant_type = 'feature' then
      if not exists (select 1 from public.character_feature_entitlements e where e.character_id=v_character_id and e.feature_key=v_grant.feature_key and e.enabled=true) then v_all_owned := false; end if;
    else
      v_all_owned := false;
    end if;
  end loop;

  if v_all_owned then raise exception 'You already own everything included in this product.'; end if;

  select balance into v_balance from public.character_wallets where character_id=v_character_id for update;
  if not found then raise exception 'Character wallet not found.'; end if;
  if v_balance < v_price.remnants_amount then raise exception 'Not enough Remnants.'; end if;

  v_new_balance := v_balance - v_price.remnants_amount;
  update public.character_wallets set balance=v_new_balance where character_id=v_character_id;

  insert into public.store_orders (
    user_id, character_id, status, payment_method, currency,
    subtotal_money_minor, discount_money_minor, total_money_minor,
    subtotal_remnants, discount_remnants, total_remnants, paid_at, fulfilled_at
  ) values (
    v_user_id, v_character_id, 'fulfilled', 'remnants', null,
    0,0,0, v_price.remnants_amount,0,v_price.remnants_amount, now(),now()
  ) returning id into v_order_id;

  insert into public.store_order_items (
    order_id, product_id, product_slug_snapshot, product_name_snapshot,
    product_type_snapshot, category_snapshot, quantity,
    unit_money_minor_snapshot, total_money_minor_snapshot,
    unit_remnants_snapshot, total_remnants_snapshot
  ) values (
    v_order_id, v_product.id, v_product.slug, v_product.name,
    v_product.product_type, v_product.category, 1,
    null,null,v_price.remnants_amount,v_price.remnants_amount
  ) returning id into v_order_item_id;

  for v_grant in select * from public.store_product_grants where product_id=p_product_id order by created_at asc loop
    insert into public.store_order_grants (
      order_id, order_item_id, grant_type, portal_skin_id, cosmetic_item_id,
      music_track_id, feature_key, quantity, fulfilled_at
    ) values (
      v_order_id, v_order_item_id, v_grant.grant_type, v_grant.portal_skin_id,
      v_grant.cosmetic_item_id, v_grant.music_track_id, v_grant.feature_key,
      v_grant.quantity, now()
    );

    if v_grant.grant_type = 'portal_skin' then
      insert into public.user_portal_skin_entitlements (user_id,skin_id,enabled,source,note,granted_by,granted_at,updated_at)
      values (v_user_id,v_grant.portal_skin_id,true,'paid','Purchased from the Sepulchria Store with Remnants.',v_user_id,now(),now())
      on conflict (user_id,skin_id) do update set enabled=true,source='paid',note=excluded.note,granted_at=now(),updated_at=now();
    elsif v_grant.grant_type = 'cosmetic' then
      insert into public.character_cosmetic_entitlements (character_id,cosmetic_item_id,enabled,source,note,granted_at,granted_by,updated_at)
      values (v_character_id,v_grant.cosmetic_item_id,true,'paid','Purchased from the Sepulchria Store with Remnants.',now(),v_user_id,now())
      on conflict (character_id,cosmetic_item_id) do update set enabled=true,source='paid',note=excluded.note,granted_at=now(),granted_by=v_user_id,updated_at=now();
    elsif v_grant.grant_type = 'music' then
      insert into public.character_music_entitlements (character_id,music_track_id,enabled,source,note,granted_at)
      values (v_character_id,v_grant.music_track_id,true,'paid','Purchased from the Sepulchria Store with Remnants.',now())
      on conflict (character_id,music_track_id) do update set enabled=true,source='paid',note=excluded.note,granted_at=now();
    elsif v_grant.grant_type = 'feature' then
      insert into public.character_feature_entitlements (character_id,feature_key,enabled,source,note,granted_by,granted_at,updated_at)
      values (v_character_id,v_grant.feature_key,true,'paid','Purchased from the Sepulchria Store with Remnants.',v_user_id,now(),now())
      on conflict (character_id,feature_key) do update set enabled=true,source='paid',note=excluded.note,granted_by=v_user_id,granted_at=now(),updated_at=now();
    end if;
  end loop;

  insert into public.remnant_ledger (character_id,amount,balance_after,reason)
  values (v_character_id,-v_price.remnants_amount,v_new_balance,'Sepulchria Store purchase: ' || v_product.name);

  return v_order_id;
end;
$$;

revoke all on function public.purchase_store_product_with_remnants(uuid) from public;
grant execute on function public.purchase_store_product_with_remnants(uuid) to authenticated;
commit;
'''

write("components/store/store-live-filter-bar.tsx", FILTER)
write("components/portal/store-context-panel.tsx", CONTEXT)
write("app/(portal)/store/actions.ts", ACTIONS)
write("components/store/store-remnant-purchase-button.tsx", BUTTON)
write("sepulchria_store_phase4_remnant_checkout.sql", SQL)

# ---- player store surgical edits ----
replace_once(
    "app/(portal)/store/page.tsx",
    'import { createClient } from "@/lib/supabase/server";',
    'import { StoreLiveFilterBar } from "@/components/store/store-live-filter-bar";\nimport { StoreRemnantPurchaseButton } from "@/components/store/store-remnant-purchase-button";\nimport { createClient } from "@/lib/supabase/server";',
    "Player Store imports",
)

replace_once(
    "app/(portal)/store/page.tsx",
    '''type Skin = {
  id: string;
  name: string;
};''',
    '''type Skin = {
  id: string;
  slug: string;
  name: string;
  description: string;
};''',
    "Skin preview fields",
)

replace_once(
    "app/(portal)/store/page.tsx",
    '.from("portal_skins")\n      .select("id, name")',
    '.from("portal_skins")\n      .select("id, slug, name, description")',
    "Skin query",
)

replace_once(
    "app/(portal)/store/page.tsx",
    '''  const skinNames = new Map(
    skins.map((skin) => [skin.id, skin.name]),
  );''',
    '''  const skinNames = new Map(
    skins.map((skin) => [skin.id, skin.name]),
  );

  const skinDetails = new Map(
    skins.map((skin) => [skin.id, skin]),
  );''',
    "Skin detail map",
)

replace_once(
    "app/(portal)/store/page.tsx",
    '''              <p className="mt-2 max-w-3xl text-[11px] leading-5 text-[rgb(var(--sep-colour-a99b89))]">
                Unlock skins, cosmetics, Friend List access, Private Locations
                and curated bundles using real money or Remnants.
              </p>''',
    '''              <p className="mt-2 max-w-3xl text-[11px] leading-5 text-[rgb(var(--sep-colour-a99b89))]">
                Unlock skins, cosmetics, music, Friend List access, Private Locations
                and curated bundles using real money or Remnants.
              </p>''',
    "Store description music",
)

replace_once(
    "app/(portal)/store/page.tsx",
    '''          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">''',
    '''          </div>

          <div className="mt-4">
            <StoreLiveFilterBar />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">''',
    "Store top live filter",
)

# pass skinDetails to both card call sites
p = ROOT / "app/(portal)/store/page.tsx"
text = p.read_text(encoding="utf-8")
text = text.replace("                    skinNames={skinNames}\n                    cosmeticNames={cosmeticNames}", "                    skinNames={skinNames}\n                    skinDetails={skinDetails}\n                    cosmeticNames={cosmeticNames}")
p.write_text(text, encoding="utf-8")
print("Store card skinDetails props: patched")

replace_once(
    "app/(portal)/store/page.tsx",
    '''  skinNames,
  cosmeticNames,''',
    '''  skinNames,
  skinDetails,
  cosmeticNames,''',
    "Store card skinDetails argument",
)

replace_once(
    "app/(portal)/store/page.tsx",
    '''  skinNames: Map<string, string>;
  cosmeticNames: Map<string, string>;''',
    '''  skinNames: Map<string, string>;
  skinDetails: Map<string, Skin>;
  cosmeticNames: Map<string, string>;''',
    "Store card skinDetails type",
)

replace_once(
    "app/(portal)/store/page.tsx",
    '''}) {
  const grantLabels = grants.map((grant) => {''',
    '''}) {
  const skinGrant = grants.find(
    (grant) =>
      grant.grant_type === "portal_skin" &&
      grant.portal_skin_id,
  );

  const skin =
    skinGrant?.portal_skin_id
      ? skinDetails.get(skinGrant.portal_skin_id)
      : null;

  const grantLabels = grants.map((grant) => {''',
    "Store skin preview resolution",
)

replace_once(
    "app/(portal)/store/page.tsx",
    '''    <article
      className={[''',
    '''    <article
      id={featured ? undefined : `store-product-${product.id}`}
      data-store-product={featured ? undefined : "true"}
      data-store-filter-card
      data-store-name={product.name}
      data-store-category={product.category}
      className={[''',
    "Store product anchors",
)

p = ROOT / "app/(portal)/store/page.tsx"
text = p.read_text(encoding="utf-8")
text = text.replace('"group flex min-w-0 flex-col overflow-hidden border bg-[rgb(var(--sep-colour-100c09))]",', '"group flex h-full min-h-[390px] min-w-0 flex-col overflow-hidden border bg-[rgb(var(--sep-colour-100c09))]",')
text = text.replace('className="relative aspect-[16/7] shrink-0 border-b', 'className="relative h-36 shrink-0 overflow-hidden border-b')
text = text.replace('className="h-full w-full object-cover opacity-75 transition group-hover:opacity-90"', 'className="h-full w-full object-contain p-3 opacity-80 transition group-hover:opacity-100"')
p.write_text(text, encoding="utf-8")
print("Store equal card/image sizing: patched")

replace_once(
    "app/(portal)/store/page.tsx",
    '''        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img''',
    '''        {skin ? (
          <StoreSkinMiniPreview skin={skin} />
        ) : product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img''',
    "Store skin miniature",
)

# Replace disabled checkout button block with Remnant purchase support.
p = ROOT / "app/(portal)/store/page.tsx"
text = p.read_text(encoding="utf-8")
old = '''          <button
            type="button"
            disabled
            title={
              owned
                ? "Already owned"
                : "Checkout will be enabled in the next Store phase."
            }
            className={[
              "mt-3 w-full border px-3 py-2 text-[8px] uppercase tracking-[0.16em]",
              owned
                ? "cursor-default border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-15100d))] text-[rgb(var(--sep-colour-756958))]"
                : "cursor-not-allowed border-[rgb(var(--sep-colour-80613b))]/45 bg-[rgb(var(--sep-colour-21170f))] text-[rgb(var(--sep-colour-a99069))]",
            ].join(" ")}
          >
            {owned ? "Owned" : "Checkout coming next"}
          </button>'''
new = '''          {owned ? (
            <button
              type="button"
              disabled
              className="mt-3 w-full cursor-default border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-756958))]"
            >
              Owned
            </button>
          ) : remnantPrices.length ? (
            <StoreRemnantPurchaseButton
              productId={product.id}
              amount={remnantPrices[0].amount}
            />
          ) : moneyPrices.length ? (
            <button
              type="button"
              disabled
              className="mt-3 w-full cursor-not-allowed border border-[rgb(var(--sep-colour-80613b))]/45 bg-[rgb(var(--sep-colour-21170f))] px-3 py-2 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-a99069))]"
            >
              Paddle checkout next
            </button>
          ) : null}'''
if old not in text:
    raise SystemExit("Remnant checkout block: expected old button not found")
text = text.replace(old, new, 1)

mini = r'''

function StoreSkinMiniPreview({ skin }: { skin: Skin }) {
  return (
    <div
      data-portal-skin={skin.slug}
      className="portal-skin-scope flex h-full w-full items-center justify-center p-3"
    >
      <div
        className="flex h-full w-full flex-col border p-3"
        style={{
          background: "rgb(var(--sep-colour-120f0d))",
          borderColor: "rgb(var(--sep-skin-c1) / .48)",
          color: "rgb(var(--sep-skin-c2))",
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="font-serif text-base" style={{ color: "rgb(var(--sep-skin-c1))" }}>
            {skin.name}
          </p>
          <div
            className="h-7 w-7 shrink-0 rounded-full"
            style={{
              background: "conic-gradient(from -90deg, rgb(var(--sep-colour-120f0d)) 0deg 120deg, rgb(var(--sep-skin-c1)) 120deg 240deg, rgb(var(--sep-skin-c2)) 240deg 360deg)",
              border: "1px solid rgb(var(--sep-skin-c1) / .60)",
            }}
          />
        </div>
        <p className="mt-2 line-clamp-2 text-[9px] leading-4">{skin.description}</p>
        <div
          className="mt-auto pt-2 text-[7px] uppercase tracking-[0.14em]"
          style={{
            borderTop: "1px solid rgb(var(--sep-skin-c1) / .28)",
            color: "rgb(var(--sep-skin-c1))",
          }}
        >
          Portal skin preview
        </div>
      </div>
    </div>
  );
}
'''
text += mini
p.write_text(text, encoding="utf-8")
print("Remnant purchase button + skin preview component: patched")

# ---- admin store ----
replace_once(
    "app/(portal)/admin/store/page.tsx",
    'import { requireAdminSection } from "@/lib/auth/require-staff";',
    'import { StoreLiveFilterBar } from "@/components/store/store-live-filter-bar";\nimport { requireAdminSection } from "@/lib/auth/require-staff";',
    "Admin Store filter import",
)

replace_once(
    "app/(portal)/admin/store/page.tsx",
    '''        <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-skin-c2,211_194_170))]">
          Create products and bundles, choose what they unlock, set real-money
          and Remnant prices, and manage promotion codes.
        </p>''',
    '''        <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-skin-c2,211_194_170))]">
          Create products and bundles, choose what they unlock, set real-money
          and Remnant prices, and manage promotion codes.
        </p>

        <div className="mt-4">
          <StoreLiveFilterBar placeholder="Filter Store products by name..." />
        </div>''',
    "Admin Store top filter",
)

replace_once(
    "app/(portal)/admin/store/page.tsx",
    '''                <details
                  key={product.id}
                  className="border border-[rgb(var(--sep-skin-c1,169_138_96))]/30 bg-[rgb(var(--sep-colour-120e0b))]"
                >''',
    '''                <details
                  key={product.id}
                  id={`admin-store-product-${product.id}`}
                  data-store-product="true"
                  data-store-filter-card
                  data-store-name={product.name}
                  data-store-category={product.category}
                  className="scroll-mt-4 border border-[rgb(var(--sep-skin-c1,169_138_96))]/30 bg-[rgb(var(--sep-colour-120e0b))]"
                >''',
    "Admin Store product anchors",
)

# ---- right sidebar routing ----
replace_once(
    "components/portal/portal-responsive-right-sidebar.tsx",
    'import { PollsContextPanel } from "@/components/polls/polls-context-panel";',
    'import { PollsContextPanel } from "@/components/polls/polls-context-panel";\nimport { StoreContextPanel } from "@/components/portal/store-context-panel";',
    "Store context import",
)

replace_once(
    "components/portal/portal-responsive-right-sidebar.tsx",
    '''  const isAdminMissionsPath =
    pathname === "/admin/missions";''',
    '''  const isAdminMissionsPath =
    pathname === "/admin/missions";

  const isAdminStorePath =
    pathname === "/admin/store";

  const isStorePath =
    pathname === "/store";''',
    "Store context path flags",
)

replace_once(
    "components/portal/portal-responsive-right-sidebar.tsx",
    '''              ) : isAdminMissionsPath ? (
                <AdminMissionsContext
                  key={`missions-${adminRevision}`}
                />
              ) : isAdminLocationsPath ? (''',
    '''              ) : isAdminMissionsPath ? (
                <AdminMissionsContext
                  key={`missions-${adminRevision}`}
                />
              ) : isAdminStorePath ? (
                <StoreContextPanel
                  key={`admin-store-${adminRevision}`}
                  admin
                />
              ) : isStorePath ? (
                <StoreContextPanel />
              ) : isAdminLocationsPath ? (''',
    "Store context routing",
)

print("PATCH COMPLETE")
print("Run sepulchria_store_phase4_remnant_checkout.sql in Supabase SQL Editor, then npm run build.")
