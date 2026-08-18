import { AdminActionForm } from "@/components/admin/admin-action-form";
import { requireStaff } from "@/lib/auth/require-staff";
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
  "w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-2.5 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]";

const buttonClass =
  "border border-[#987344] bg-[#3b2919] px-4 py-2.5 text-[8px] uppercase tracking-[0.16em] text-[#efd6a8] transition hover:bg-[#4a321e]";

export default async function AdminMarketPage() {
  await requireStaff();
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
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[#8c704b]">
          Administration
        </p>
        <h1 className="mt-2 font-serif text-4xl text-[#ead5ac]">
          Market Management
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-[#a99b89]">
          Create Market shops and manage their catalogues, prices and stock.
          Buying and selling transactions will be connected in Economy 3.
        </p>

        <section
          id="market-shop-new"
          className="mt-8 border border-[#60482e]/45 bg-[#15100d] p-5 sm:p-6"
        >
          <p className="text-[9px] uppercase tracking-[0.22em] text-[#806b50]">
            New shop
          </p>
          <h2 className="mt-2 font-serif text-2xl text-[#dfc99f]">
            Create Market Shop
          </h2>

          <AdminActionForm
            action={createMarketShop}
            className="mt-5 grid gap-3 md:grid-cols-2"
          >
            <input name="name" required placeholder="Shop name" className={inputClass} />
            <input name="slug" placeholder="slug (optional)" className={inputClass} />
            <input name="imageUrl" placeholder="Image / banner URL" className={inputClass} />
            <input type="number" name="sortOrder" min={0} defaultValue={0} className={inputClass} />
            <textarea
              name="description"
              rows={3}
              placeholder="Shop description"
              className={`${inputClass} md:col-span-2`}
            />
            <div className="flex items-center justify-between gap-3 md:col-span-2">
              <label className="flex items-center gap-2 text-xs text-[#aa987e]">
                <input type="checkbox" name="isActive" defaultChecked className="accent-[#8b673d]" />
                Active
              </label>
              <button type="submit" className={buttonClass}>Create Shop</button>
            </div>
          </AdminActionForm>
        </section>

        <div className="mt-6 space-y-5">
          {shops.map((shop) => {
            const shopListings = listings.filter((listing) => listing.shop_id === shop.id);

            return (
              <section
                key={shop.id}
                id={`market-shop-${shop.id}`}
                className="scroll-mt-6 border border-[#60482e]/45 bg-[#15100d] p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[8px] uppercase tracking-[0.18em] text-[#806b50]">
                      Market shop
                    </p>
                    <h2 className="mt-1 font-serif text-2xl text-[#dfc99f]">
                      {shop.name}
                    </h2>
                  </div>
                  <span className="text-[8px] uppercase tracking-[0.14em] text-[#756958]">
                    {shopListings.length} listings
                  </span>
                </div>

                <AdminActionForm
                  action={updateMarketShop}
                  className="mt-5 grid gap-3 md:grid-cols-2"
                >
                  <input type="hidden" name="shopId" value={shop.id} />
                  <input name="name" required defaultValue={shop.name} className={inputClass} />
                  <input name="slug" required defaultValue={shop.slug} className={inputClass} />
                  <input name="imageUrl" defaultValue={shop.image_url ?? ""} className={inputClass} />
                  <input type="number" name="sortOrder" min={0} defaultValue={shop.sort_order} className={inputClass} />
                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={shop.description}
                    className={`${inputClass} md:col-span-2`}
                  />
                  <div className="flex items-center justify-between gap-3 md:col-span-2">
                    <label className="flex items-center gap-2 text-xs text-[#aa987e]">
                      <input type="checkbox" name="isActive" defaultChecked={shop.is_active} className="accent-[#8b673d]" />
                      Active
                    </label>
                    <button type="submit" className={buttonClass}>Save Shop</button>
                  </div>
                </AdminActionForm>

                <div className="mt-6 border-t border-[#60482e]/30 pt-5">
                  <p className="text-[8px] uppercase tracking-[0.18em] text-[#806b50]">
                    Add catalogue entry
                  </p>

                  <AdminActionForm
                    action={createMarketListing}
                    className="mt-3 grid gap-2 lg:grid-cols-[minmax(180px,1.4fr)_110px_110px_120px_110px_90px_auto]"
                  >
                    <input type="hidden" name="shopId" value={shop.id} />

                    <select name="itemId" required defaultValue="" className={inputClass}>
                      <option value="" disabled>Choose active Item</option>
                      {activeItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} · {item.quality}
                        </option>
                      ))}
                    </select>

                    <input type="number" name="buyPrice" min={0} required placeholder="Buy price" className={inputClass} />
                    <input type="number" name="sellPrice" min={0} placeholder="Buyback" className={inputClass} />

                    <select name="stockMode" defaultValue="unlimited" className={inputClass}>
                      <option value="unlimited">Unlimited</option>
                      <option value="finite">Finite</option>
                    </select>

                    <input type="number" name="stockQuantity" min={0} placeholder="Quantity" className={inputClass} />
                    <input type="number" name="sortOrder" min={0} defaultValue={0} className={inputClass} />

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-[8px] text-[#9b8970]">
                        <input type="checkbox" name="isActive" defaultChecked className="accent-[#8b673d]" />
                        Active
                      </label>
                      <button type="submit" className={buttonClass}>Add</button>
                    </div>
                  </AdminActionForm>
                </div>

                {shopListings.length ? (
                  <div className="mt-4 space-y-2">
                    {shopListings.map((listing) => {
                      const item = one(listing.item);

                      return (
                        <AdminActionForm
                          key={listing.id}
                          action={updateMarketListing}
                          className="grid gap-2 border border-[#59432c]/35 bg-[#100c09] p-3 lg:grid-cols-[minmax(180px,1.4fr)_110px_110px_120px_110px_90px_auto]"
                        >
                          <input type="hidden" name="listingId" value={listing.id} />

                          <div className="min-w-0 self-center">
                            <p className="truncate font-serif text-sm text-[#cfb78e]">
                              {item?.name ?? "Unknown Item"}
                            </p>
                            <p className="text-[7px] uppercase tracking-[0.12em] text-[#6f6252]">
                              {item?.quality ?? ""}
                              {item && !item.is_active ? " · Item inactive" : ""}
                            </p>
                          </div>

                          <input type="number" name="buyPrice" min={0} required defaultValue={listing.buy_price} className={inputClass} />
                          <input type="number" name="sellPrice" min={0} defaultValue={listing.sell_price ?? ""} className={inputClass} />

                          <select name="stockMode" defaultValue={listing.stock_mode} className={inputClass}>
                            <option value="unlimited">Unlimited</option>
                            <option value="finite">Finite</option>
                          </select>

                          <input
                            type="number"
                            name="stockQuantity"
                            min={0}
                            defaultValue={listing.stock_quantity ?? ""}
                            placeholder="Quantity"
                            className={inputClass}
                          />

                          <input type="number" name="sortOrder" min={0} defaultValue={listing.sort_order} className={inputClass} />

                          <div className="flex flex-wrap items-center gap-2">
                            <label className="flex items-center gap-1 text-[8px] text-[#9b8970]">
                              <input
                                type="checkbox"
                                name="isActive"
                                defaultChecked={listing.is_active}
                                className="accent-[#8b673d]"
                              />
                              Active
                            </label>

                            <button type="submit" className={buttonClass}>
                              Save
                            </button>

                            <button
                              type="submit"
                              formAction={removeMarketListing}
                              className="border border-red-900/50 bg-red-950/15 px-3 py-2.5 text-[8px] uppercase tracking-[0.12em] text-red-300"
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
