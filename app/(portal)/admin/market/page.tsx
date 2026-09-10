

import { AdminActionForm } from "@/components/admin/admin-action-form";
import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

import {
  createMarketListing,
  createMarketShop,
  removeMarketListing,
  updateMarketListing,
  updateMarketShop,
} from "./actions";

type Shop = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
};

type Item = {
  id: string;
  name: string;
  is_active: boolean;
  quality: string;
  reference_value: number | null;
};

type Listing = {
  id: string;
  shop_id: string;
  item_id: string;
  buy_price: number;
  sell_price: number | null;
  stock_mode: "finite" | "unlimited";
  stock_quantity: number | null;
  is_active: boolean;
  sort_order: number;
  item: { name: string; quality: string; is_active: boolean } |
    { name: string; quality: string; is_active: boolean }[] | null;
};

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

const inputClass =
  "w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))]";

const buttonClass =
  "border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-2.5 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:bg-[rgb(var(--sep-colour-4a321e))]";

export default async function AdminMarketPage() {
  await requireAdminSection("market");
  const supabase = createAdminClient();

  const [shopsResult, itemsResult, listingsResult] = await Promise.all([
    supabase
      .from("market_shops")
      .select("id, name, slug, description, image_url, is_active, sort_order")
      .order("sort_order", { ascending: true })
      .order("name"),
    supabase
      .from("items")
      .select("id, name, is_active, quality, reference_value")
      .order("sort_order", { ascending: true })
      .order("name"),
    supabase
      .from("market_listings")
      .select(`
        id,
        shop_id,
        item_id,
        buy_price,
        sell_price,
        stock_mode,
        stock_quantity,
        is_active,
        sort_order,
        item:items(name,quality,is_active)
      `)
      .order("sort_order", { ascending: true }),
  ]);

  const firstError =
    shopsResult.error ?? itemsResult.error ?? listingsResult.error;

  if (firstError) {
    throw new Error(`Unable to load Market administration: ${firstError.message}`);
  }

  const shops = (shopsResult.data ?? []) as Shop[];
  const items = (itemsResult.data ?? []) as Item[];
  const listings = (listingsResult.data ?? []) as unknown as Listing[];
  const activeItems = items.filter((item) => item.is_active);

  return (
    <main className="p-5 sm:p-7 lg:p-9 admin_market_page_main_main">
      <div className="mx-auto max-w-7xl admin_market_page_div_market_management">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))] admin_market_page_p_market_management">
          Administration
        </p>
        <h1 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))] admin_market_page_h1_market_management">
          Market Management
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-[rgb(var(--sep-colour-a99b89))] admin_market_page_p_market_management_2">
          Create Market shops and manage their catalogues, prices and stock.
          Buying and selling transactions will be connected in Economy 3.
        </p>

        <section
          id="market-shop-new"
          className="mt-8 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 sm:p-6 admin_market_page_section_market_shop_new"
        >
          <p className="text-[9px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))] admin_market_page_p_market_shop_new">
            New shop
          </p>
          <h2 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))] admin_market_page_h2_market_shop_new">
            Create Market Shop
          </h2>

          <AdminActionForm
            action={createMarketShop}
            className="mt-5 grid gap-3 md:grid-cols-2"
          >
            <input name="name" required placeholder="Shop name" className={[((inputClass)), "admin_market_page_input_name"].filter(Boolean).join(" ")} />
            <input name="slug" placeholder="slug (optional)" className={[((inputClass)), "admin_market_page_input_slug"].filter(Boolean).join(" ")} />
            <input name="imageUrl" placeholder="Image / banner URL" className={[((inputClass)), "admin_market_page_input_image_url"].filter(Boolean).join(" ")} />
            <input type="number" name="sortOrder" min={0} defaultValue={0} className={[((inputClass)), "admin_market_page_input_sort_order"].filter(Boolean).join(" ")} />
            <textarea
              name="description"
              rows={3}
              placeholder="Shop description"
              className={[((`${inputClass} md:col-span-2`)), "admin_market_page_textarea_description"].filter(Boolean).join(" ")}
            />
            <div className="flex items-center justify-between gap-3 md:col-span-2 admin_market_page_div_active">
              <label className="flex items-center gap-2 text-xs text-[rgb(var(--sep-colour-aa987e))] admin_market_page_label_active">
                <input type="checkbox" name="isActive" defaultChecked className="accent-[rgb(var(--sep-colour-8b673d))] admin_market_page_input_active" />
                Active
              </label>
              <button type="submit" className={[((buttonClass)), "admin_market_page_button_create_shop"].filter(Boolean).join(" ")}>Create Shop</button>
            </div>
          </AdminActionForm>
        </section>

        <div className="mt-6 space-y-5 admin_market_page_div_market_management_2">
          {shops.map((shop) => {
            const shopListings = listings.filter((listing) => listing.shop_id === shop.id);

            return (
              <section
                key={shop.id}
                id={`market-shop-${shop.id}`}
                className="scroll-mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 sm:p-6 admin_market_page_section_section"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 admin_market_page_div_container">
                  <div className="admin_market_page_div_container_2">
                    <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] admin_market_page_p_text">
                      Market shop
                    </p>
                    <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))] admin_market_page_h2_heading">
                      {shop.name}
                    </h2>
                  </div>
                  <span className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))] admin_market_page_span_text">
                    {shopListings.length} listings
                  </span>
                </div>

                <AdminActionForm
                  action={updateMarketShop}
                  className="mt-5 grid gap-3 md:grid-cols-2"
                >
                  <input className="admin_market_page_input_shop_id" type="hidden" name="shopId" value={shop.id} />
                  <input name="name" required defaultValue={shop.name} className={[((inputClass)), "admin_market_page_input_name_2"].filter(Boolean).join(" ")} />
                  <input name="slug" required defaultValue={shop.slug} className={[((inputClass)), "admin_market_page_input_slug_2"].filter(Boolean).join(" ")} />
                  <input name="imageUrl" defaultValue={shop.image_url ?? ""} className={[((inputClass)), "admin_market_page_input_image_url_2"].filter(Boolean).join(" ")} />
                  <input type="number" name="sortOrder" min={0} defaultValue={shop.sort_order} className={[((inputClass)), "admin_market_page_input_sort_order_2"].filter(Boolean).join(" ")} />
                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={shop.description}
                    className={[((`${inputClass} md:col-span-2`)), "admin_market_page_textarea_description_2"].filter(Boolean).join(" ")}
                  />
                  <div className="flex items-center justify-between gap-3 md:col-span-2 admin_market_page_div_active_2">
                    <label className="flex items-center gap-2 text-xs text-[rgb(var(--sep-colour-aa987e))] admin_market_page_label_active_2">
                      <input type="checkbox" name="isActive" defaultChecked={shop.is_active} className="accent-[rgb(var(--sep-colour-8b673d))] admin_market_page_input_active_2" />
                      Active
                    </label>
                    <button type="submit" className={[((buttonClass)), "admin_market_page_button_save_shop"].filter(Boolean).join(" ")}>Save Shop</button>
                  </div>
                </AdminActionForm>

                <div className="mt-6 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-5 admin_market_page_div_container_3">
                  <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] admin_market_page_p_text_2">
                    Add catalogue entry
                  </p>

                  <AdminActionForm
                    action={createMarketListing}
                    className="mt-3 grid gap-2 lg:grid-cols-[minmax(180px,1.4fr)_110px_110px_120px_110px_90px_auto]"
                  >
                    <input className="admin_market_page_input_shop_id_2" type="hidden" name="shopId" value={shop.id} />

                    <select name="itemId" required defaultValue="" className={[((inputClass)), "admin_market_page_select_item_id"].filter(Boolean).join(" ")}>
                      <option className="admin_market_page_option_item_id" value="" disabled>Choose active Item</option>
                      {activeItems.map((item) => (
                        <option className="admin_market_page_option_option" key={item.id} value={item.id}>
                          {item.name} · {item.quality}
                        </option>
                      ))}
                    </select>

                    <input type="number" name="buyPrice" min={0} required placeholder="Buy price" className={[((inputClass)), "admin_market_page_input_buy_price"].filter(Boolean).join(" ")} />
                    <input type="number" name="sellPrice" min={0} placeholder="Shop Buyback" className={[((inputClass)), "admin_market_page_input_sell_price"].filter(Boolean).join(" ")} />

                    <select name="stockMode" defaultValue="unlimited" className={[((inputClass)), "admin_market_page_select_stock_mode"].filter(Boolean).join(" ")}>
                      <option className="admin_market_page_option_unlimited" value="unlimited">Unlimited</option>
                      <option className="admin_market_page_option_finite" value="finite">Finite</option>
                    </select>

                    <input type="number" name="stockQuantity" min={0} placeholder="Quantity" className={[((inputClass)), "admin_market_page_input_stock_quantity"].filter(Boolean).join(" ")} />
                    <input type="number" name="sortOrder" min={0} defaultValue={0} className={[((inputClass)), "admin_market_page_input_sort_order_3"].filter(Boolean).join(" ")} />

                    <div className="flex items-center gap-2 admin_market_page_div_active_3">
                      <label className="flex items-center gap-1 text-[8px] text-[rgb(var(--sep-colour-9b8970))] admin_market_page_label_active_3">
                        <input type="checkbox" name="isActive" defaultChecked className="accent-[rgb(var(--sep-colour-8b673d))] admin_market_page_input_active_3" />
                        Active
                      </label>
                      <button type="submit" className={[((buttonClass)), "admin_market_page_button_add"].filter(Boolean).join(" ")}>Add</button>
                    </div>
                  </AdminActionForm>
                </div>

                {shopListings.length ? (
                  <div className="mt-4 space-y-2 admin_market_page_div_container_4">
                    {shopListings.map((listing) => {
                      const item = one(listing.item);

                      return (
                        <AdminActionForm
                          key={listing.id}
                          action={updateMarketListing}
                          className="grid gap-2 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] p-3 lg:grid-cols-[minmax(180px,1.4fr)_110px_110px_120px_110px_90px_auto]"
                        >
                          <input className="admin_market_page_input_listing_id" type="hidden" name="listingId" value={listing.id} />

                          <div className="min-w-0 self-center admin_market_page_div_container_5">
                            <p className="truncate font-serif text-sm text-[rgb(var(--sep-colour-cfb78e))] admin_market_page_p_text_3">
                              {item?.name ?? "Unknown Item"}
                            </p>
                            <p className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-6f6252))] admin_market_page_p_text_4">
                              {item?.quality ?? ""}
                              {item && !item.is_active ? " · Item inactive" : ""}
                            </p>
                          </div>

                          <input type="number" name="buyPrice" min={0} required defaultValue={listing.buy_price} className={[((inputClass)), "admin_market_page_input_buy_price_2"].filter(Boolean).join(" ")} />
                          <input type="number" name="sellPrice" min={0} defaultValue={listing.sell_price ?? ""} className={[((inputClass)), "admin_market_page_input_sell_price_2"].filter(Boolean).join(" ")} />

                          <select name="stockMode" defaultValue={listing.stock_mode} className={[((inputClass)), "admin_market_page_select_stock_mode_2"].filter(Boolean).join(" ")}>
                            <option className="admin_market_page_option_unlimited_2" value="unlimited">Unlimited</option>
                            <option className="admin_market_page_option_finite_2" value="finite">Finite</option>
                          </select>

                          <input
                            type="number"
                            name="stockQuantity"
                            min={0}
                            defaultValue={listing.stock_quantity ?? ""}
                            placeholder="Quantity"
                            className={[((inputClass)), "admin_market_page_input_stock_quantity_2"].filter(Boolean).join(" ")}
                          />

                          <input type="number" name="sortOrder" min={0} defaultValue={listing.sort_order} className={[((inputClass)), "admin_market_page_input_sort_order_4"].filter(Boolean).join(" ")} />

                          <div className="flex flex-wrap items-center gap-2 admin_market_page_div_active_4">
                            <label className="flex items-center gap-1 text-[8px] text-[rgb(var(--sep-colour-9b8970))] admin_market_page_label_active_4">
                              <input
                                type="checkbox"
                                name="isActive"
                                defaultChecked={listing.is_active}
                                className="accent-[rgb(var(--sep-colour-8b673d))] admin_market_page_input_active_4"
                              />
                              Active
                            </label>

                            <button type="submit" className={[((buttonClass)), "admin_market_page_button_save"].filter(Boolean).join(" ")}>
                              Save
                            </button>

                            <button
                              type="submit"
                              formAction={removeMarketListing}
                              className="border border-red-900/50 bg-red-950/15 px-3 py-2.5 text-[8px] uppercase tracking-[0.12em] text-red-300 admin_market_page_button_remove"
                            >
                              Remove
                            </button>
                          </div>
                        </AdminActionForm>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
