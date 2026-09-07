import { AdminActionForm } from "@/components/admin/admin-action-ui";
import { StoreLiveFilterBar } from "@/components/store/store-live-filter-bar";
import { StorePostPurchaseOffersAdmin } from "@/components/admin/store-post-purchase-offers";
import { StoreCommerceOperationsAdmin } from "@/components/admin/store-commerce-operations";
import { requireAdminSection } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  addStoreGrant,
  createStoreDiscount,
  createStoreProduct,
  deleteStoreGrant,
  deleteStorePrice,
  deleteStoreProduct,
  saveStorePrice,
  syncExistingPremiumCatalogueToStore,
  toggleStoreDiscount,
  updateStoreProduct,
} from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const field =
  "w-full min-w-0 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d7c4a5))] outline-none";
const label =
  "mb-1 block text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-756958))]";
const button =
  "inline-flex items-center justify-center border border-[rgb(var(--sep-skin-c1,169_138_96))]/55 bg-[rgb(var(--sep-colour-21170f))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-skin-c1,169_138_96))] transition hover:border-[rgb(var(--sep-skin-c1,169_138_96))]";
const dangerButton =
  "inline-flex items-center justify-center border border-red-900/55 bg-red-950/20 px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-red-300";

function moneyLabel(minor: number | null, currency: string | null) {
  if (minor === null || !currency) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(minor / 100);
}

export default async function AdminStorePage() {
  await requireAdminSection("store");
  const admin = createAdminClient();

  const [
    productsResult,
    pricesResult,
    grantsResult,
    skinsResult,
    cosmeticsResult,
    musicResult,
    discountsResult,
  ] = await Promise.all([
    admin.from("store_products").select("*").order("sort_order").order("name"),
    admin.from("store_product_prices").select("*").order("created_at"),
    admin.from("store_product_grants").select("*").order("created_at"),
    admin.from("portal_skins").select("id, slug, name, is_active").order("name"),
    admin.from("cosmetic_items").select("id, slug, name, category, is_active").order("category").order("name"),
    admin.from("music_tracks")
      .select("id, track_key, name, description, is_active, is_personal_selectable, sort_order").order("sort_order").order("name"),
    admin.from("store_discount_codes").select("*").order("created_at", { ascending: false }),
  ]);

  for (const result of [
    productsResult,
    pricesResult,
    grantsResult,
    skinsResult,
    cosmeticsResult,
    musicResult,
    discountsResult,
  ]) {
    if (result.error) throw new Error(result.error.message);
  }

  const products = productsResult.data ?? [];
  const prices = pricesResult.data ?? [];
  const grants = grantsResult.data ?? [];
  const skins = skinsResult.data ?? [];
  const cosmetics = cosmeticsResult.data ?? [];
  const musicTracks = musicResult.data ?? [];
  const discounts = discountsResult.data ?? [];

  const skinById = new Map(skins.map((x) => [x.id, x.name]));
  const cosmeticById = new Map(cosmetics.map((x) => [x.id, x.name]));
  const musicById = new Map(musicTracks.map((x) => [x.id, x.name]));

  return (
    <main className="admin-compact h-full min-h-0 max-h-full overflow-y-auto p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))]">
          Administration
        </p>

        <h2 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-skin-c1,169_138_96))]">
          Sepulchria Store
        </h2>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-skin-c2,211_194_170))]">
          Create products and bundles, choose what they unlock, set real-money
          and Remnant prices, and manage promotion codes.
        </p>

        <div className="mt-4">
          <StoreLiveFilterBar placeholder="Filter Store products by name..." />
        </div>

        <section
          id="store-catalogue-sync"
          className="mt-8 scroll-mt-6 border border-[rgb(var(--sep-skin-c1,169_138_96))]/35 bg-[rgb(var(--sep-colour-15100d))] p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h3 className="font-serif text-2xl text-[rgb(var(--sep-skin-c1,169_138_96))]">
                Existing premium catalogue
              </h3>

              <p className="mt-2 max-w-3xl text-xs leading-5 text-[rgb(var(--sep-skin-c2,211_194_170))]">
                Import or refresh every existing cosmetic, every premium skin,
                every music track, Friend List and Private Location as Store
                products. Cinder Original is excluded because it is the default
                skin. No prices are created or changed.
              </p>
            </div>

            <AdminActionForm action={syncExistingPremiumCatalogueToStore} successMessage="Catalogue synced to Store.">
              <button className={button}>
                Sync catalogue to Store
              </button>
            </AdminActionForm>
          </div>
        </section>

        <StoreCommerceOperationsAdmin />

        <section id="store-create-product" className="mt-8 scroll-mt-6 border border-[rgb(var(--sep-skin-c1,169_138_96))]/35 bg-[rgb(var(--sep-colour-15100d))] p-4 sm:p-5">
          <h3 className="font-serif text-2xl text-[rgb(var(--sep-skin-c1,169_138_96))]">
            Create product
          </h3>

          <AdminActionForm action={createStoreProduct} successMessage="Product created." className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label>
              <span className={label}>Name</span>
              <input name="name" required className={field} />
            </label>
            <label>
              <span className={label}>Slug</span>
              <input name="slug" required placeholder="moonlit-skin" className={field} />
            </label>
            <label>
              <span className={label}>Category</span>
              <select name="category" defaultValue="cosmetic" className={field}>
                <option value="skin">Skin</option>
                <option value="cosmetic">Cosmetic</option>
                <option value="music">Music</option>
                <option value="friend_list">Friend List</option>
                <option value="private_location">Private Location</option>
                <option value="bundle">Bundle</option>
              </select>
            </label>
            <label>
              <span className={label}>Sort order</span>
              <input name="sort_order" type="number" defaultValue="0" className={field} />
            </label>

            <label className="md:col-span-2 xl:col-span-3">
              <span className={label}>Description</span>
              <textarea name="description" rows={3} className={field} />
            </label>

            <label>
              <span className={label}>Image URL</span>
              <input name="image_url" className={field} />
            </label>

            <label className="flex items-center gap-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))]">
              <input name="is_active" type="checkbox" defaultChecked />
              Active
            </label>

            <label className="flex items-center gap-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))]">
              <input name="is_featured" type="checkbox" />
              Featured
            </label>

            <div className="md:col-span-2 xl:col-span-4">
              <button className={button}>Create product</button>
            </div>
          </AdminActionForm>
        </section>

        <section id="store-products" className="mt-6 scroll-mt-6">
          <h3 className="font-serif text-2xl text-[rgb(var(--sep-skin-c1,169_138_96))]">
            Products & bundles
          </h3>

          <div className="mt-4 space-y-4">
            {products.map((product) => {
              const productPrices = prices.filter((p) => p.product_id === product.id);
              const productGrants = grants.filter((g) => g.product_id === product.id);

              return (
                <details
                  key={product.id}
                  id={`admin-store-product-${product.id}`}
                  data-store-product="true"
                  data-store-filter-card
                  data-store-name={product.name}
                  data-store-category={product.category}
                  className="scroll-mt-4 border border-[rgb(var(--sep-skin-c1,169_138_96))]/30 bg-[rgb(var(--sep-colour-120e0b))]"
                >
                  <summary className="cursor-pointer px-4 py-4 sm:px-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="font-serif text-xl text-[rgb(var(--sep-skin-c1,169_138_96))]">
                          {product.name}
                        </span>
                        <span className="ml-3 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-skin-c2,211_194_170))]">
                          {product.category}
                        </span>
                      </div>
                      <span className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-skin-c2,211_194_170))]">
                        {product.is_active ? "Active" : "Hidden"}
                      </span>
                    </div>
                  </summary>

                  <div className="border-t border-[rgb(var(--sep-skin-c1,169_138_96))]/20 p-4 sm:p-5">
                    <AdminActionForm action={updateStoreProduct} successMessage="Product saved." className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <input type="hidden" name="id" value={product.id} />
                      <label>
                        <span className={label}>Name</span>
                        <input name="name" defaultValue={product.name} required className={field} />
                      </label>
                      <label>
                        <span className={label}>Slug</span>
                        <input name="slug" defaultValue={product.slug} required className={field} />
                      </label>
                      <label>
                        <span className={label}>Category</span>
                        <select name="category" defaultValue={product.category} className={field}>
                          <option value="skin">Skin</option>
                          <option value="cosmetic">Cosmetic</option>
                          <option value="music">Music</option>
                          <option value="friend_list">Friend List</option>
                          <option value="private_location">Private Location</option>
                          <option value="bundle">Bundle</option>
                        </select>
                      </label>
                      <label>
                        <span className={label}>Sort</span>
                        <input name="sort_order" type="number" defaultValue={product.sort_order} className={field} />
                      </label>

                      <label className="md:col-span-2 xl:col-span-3">
                        <span className={label}>Description</span>
                        <textarea name="description" rows={3} defaultValue={product.description} className={field} />
                      </label>

                      <label>
                        <span className={label}>Image URL</span>
                        <input name="image_url" defaultValue={product.image_url ?? ""} className={field} />
                      </label>

                      <label className="flex items-center gap-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))]">
                        <input name="is_active" type="checkbox" defaultChecked={product.is_active} />
                        Active
                      </label>

                      <label className="flex items-center gap-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))]">
                        <input name="is_featured" type="checkbox" defaultChecked={product.is_featured} />
                        Featured
                      </label>

                      <div className="md:col-span-2 xl:col-span-4">
                        <button className={button}>Save product</button>
                      </div>
                    </AdminActionForm>

                    <div className="mt-6 grid gap-5 xl:grid-cols-2">
                      <div className="border border-[rgb(var(--sep-skin-c1,169_138_96))]/20 p-4">
                        <h4 className="font-serif text-lg text-[rgb(var(--sep-skin-c1,169_138_96))]">
                          Pricing
                        </h4>

                        <div className="mt-3 space-y-2">
                          {productPrices.map((price) => (
                            <div key={price.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--sep-skin-c1,169_138_96))]/15 pb-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))]">
                              <span>
                                {moneyLabel(price.money_amount_minor, price.currency)}
                                {price.money_amount_minor !== null && price.remnants_amount !== null ? " · " : ""}
                                {price.remnants_amount !== null ? `${price.remnants_amount} Remnants` : ""}
                              </span>
                              <AdminActionForm action={deleteStorePrice} successMessage="Price removed.">
                                <input type="hidden" name="id" value={price.id} />
                                <button className={dangerButton}>Remove</button>
                              </AdminActionForm>
                            </div>
                          ))}
                        </div>

                        <AdminActionForm action={saveStorePrice} successMessage="Price saved and synced." className="mt-4 grid gap-3 sm:grid-cols-2">
                          <input type="hidden" name="product_id" value={product.id} />
                          <label>
                            <span className={label}>Currency</span>
                            <input name="currency" defaultValue="GBP" maxLength={3} className={field} />
                          </label>
                          <label>
                            <span className={label}>Money price in pence</span>
                            <input name="money_amount_minor" type="number" min="0" placeholder="399 = £3.99" className={field} />
                          </label>
                          <label>
                            <span className={label}>Remnants</span>
                            <input name="remnants_amount" type="number" min="0" className={field} />
                          </label>
                          <div className="border border-[rgb(var(--sep-colour-60482e))]/25 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[9px] text-[rgb(var(--sep-colour-756958))]">Paddle IDs are created and maintained automatically.</div>
                          <div className="sm:col-span-2">
                            <button className={button}>Save price</button>
                          </div>
                        </AdminActionForm>
                      </div>

                      <div className="border border-[rgb(var(--sep-skin-c1,169_138_96))]/20 p-4">
                        <h4 className="font-serif text-lg text-[rgb(var(--sep-skin-c1,169_138_96))]">
                          What this product unlocks
                        </h4>

                        <div className="mt-3 space-y-2">
                          {productGrants.map((grant) => {
                            const text =
                              grant.grant_type === "portal_skin"
                                ? `Skin · ${skinById.get(grant.portal_skin_id) ?? grant.portal_skin_id}`
                                : grant.grant_type === "cosmetic"
                                  ? `Cosmetic · ${cosmeticById.get(grant.cosmetic_item_id) ?? grant.cosmetic_item_id}`
                                  : grant.grant_type === "music"
                                    ? `Music · ${musicById.get(grant.music_track_id) ?? grant.music_track_id}`
                                    : `Feature · ${grant.feature_key === "private_chat" ? "Private Location" : "Friend List"}`;

                            return (
                              <div key={grant.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--sep-skin-c1,169_138_96))]/15 pb-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))]">
                                <span>{text}</span>
                                <AdminActionForm action={deleteStoreGrant} successMessage="Unlock removed.">
                                  <input type="hidden" name="id" value={grant.id} />
                                  <button className={dangerButton}>Remove</button>
                                </AdminActionForm>
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-4 grid gap-3">
                          <AdminActionForm action={addStoreGrant} successMessage="Unlock added." className="grid gap-2 sm:grid-cols-[1fr_auto]">
                            <input type="hidden" name="product_id" value={product.id} />
                            <input type="hidden" name="grant_type" value="portal_skin" />
                            <select name="target" className={field}>
                              {skins.filter((x) => x.is_active).map((skin) => (
                                <option key={skin.id} value={skin.id}>{skin.name}</option>
                              ))}
                            </select>
                            <button className={button}>Add skin</button>
                          </AdminActionForm>

                          <AdminActionForm action={addStoreGrant} successMessage="Unlock added." className="grid gap-2 sm:grid-cols-[1fr_auto]">
                            <input type="hidden" name="product_id" value={product.id} />
                            <input type="hidden" name="grant_type" value="cosmetic" />
                            <select name="target" className={field}>
                              {cosmetics.filter((x) => x.is_active).map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name} · {item.category}
                                </option>
                              ))}
                            </select>
                            <button className={button}>Add cosmetic</button>
                          </AdminActionForm>

                          <AdminActionForm action={addStoreGrant} successMessage="Unlock added." className="grid gap-2 sm:grid-cols-[1fr_auto]">
                            <input type="hidden" name="product_id" value={product.id} />
                            <input type="hidden" name="grant_type" value="music" />
                            <select name="target" className={field}>
                              {musicTracks.filter((x) => x.is_active && x.is_personal_selectable).map((track) => (
                                <option key={track.id} value={track.id}>
                                  {track.name}
                                </option>
                              ))}
                            </select>
                            <button className={button}>Add music</button>
                          </AdminActionForm>

                          <AdminActionForm action={addStoreGrant} successMessage="Unlock added." className="grid gap-2 sm:grid-cols-[1fr_auto]">
                            <input type="hidden" name="product_id" value={product.id} />
                            <input type="hidden" name="grant_type" value="feature" />
                            <select name="target" className={field}>
                              <option value="friend_list">Friend List</option>
                              <option value="private_chat">Private Location</option>
                            </select>
                            <button className={button}>Add feature</button>
                          </AdminActionForm>
                        </div>
                      </div>
                    </div>

                    <AdminActionForm action={deleteStoreProduct} successMessage="Product deleted." className="mt-5">
                      <input type="hidden" name="id" value={product.id} />
                      <button className={dangerButton}>Delete product</button>
                    </AdminActionForm>
                  </div>
                </details>
              );
            })}

            {!products.length ? (
              <div className="border border-dashed border-[rgb(var(--sep-skin-c1,169_138_96))]/30 p-8 text-center text-sm text-[rgb(var(--sep-skin-c2,211_194_170))]">
                No Store products yet. Create the first one above.
              </div>
            ) : null}
          </div>
        </section>

        <section id="store-discounts" className="mt-8 scroll-mt-6 border border-[rgb(var(--sep-skin-c1,169_138_96))]/35 bg-[rgb(var(--sep-colour-15100d))] p-4 sm:p-5">
          <h3 className="font-serif text-2xl text-[rgb(var(--sep-skin-c1,169_138_96))]">
            Discount codes
          </h3>

          <AdminActionForm action={createStoreDiscount} successMessage="Discount created." className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label>
              <span className={label}>Name</span>
              <input name="name" required className={field} />
            </label>
            <label>
              <span className={label}>Code</span>
              <input name="code" placeholder="SEP20" className={field} />
            </label>
            <label>
              <span className={label}>Type</span>
              <select name="discount_type" defaultValue="percentage" className={field}>
                <option value="percentage">Percentage</option>
                <option value="fixed_money">Fixed real money</option>
                <option value="fixed_remnants">Fixed Remnants</option>
              </select>
            </label>
            <label>
              <span className={label}>Value</span>
              <input name="discount_value" type="number" min="1" required className={field} />
            </label>
            <label>
              <span className={label}>Currency</span>
              <input name="currency" defaultValue="GBP" maxLength={3} className={field} />
            </label>
            <label>
              <span className={label}>Scope</span>
              <select name="scope_type" defaultValue="all" className={field}>
                <option value="all">Everything</option>
                <option value="products">Selected products</option>
                <option value="category">Category</option>
              </select>
            </label>
            <label>
              <span className={label}>Category scope</span>
              <select name="scope_category" className={field} defaultValue="">
                <option value="">—</option>
                <option value="skin">Skin</option>
                <option value="cosmetic">Cosmetic</option>
                <option value="music">Music</option>
                <option value="friend_list">Friend List</option>
                <option value="private_location">Private Location</option>
                <option value="bundle">Bundle</option>
              </select>
            </label>
            <label>
              <span className={label}>Product scope</span>
              <select name="product_ids" multiple size={5} className={field}>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
            </label>
            <label>
              <span className={label}>Minimum money (minor units)</span>
              <input name="minimum_money_minor" type="number" min="0" className={field} />
            </label>
            <label>
              <span className={label}>Minimum Remnants</span>
              <input name="minimum_remnants" type="number" min="0" className={field} />
            </label>
            <label>
              <span className={label}>Max total uses</span>
              <input name="max_redemptions" type="number" min="1" className={field} />
            </label>
            <label>
              <span className={label}>Max uses / user</span>
              <input name="max_redemptions_per_user" type="number" min="1" defaultValue="1" className={field} />
            </label>
            <label>
              <span className={label}>Starts</span>
              <input name="starts_at" type="datetime-local" className={field} />
            </label>
            <label>
              <span className={label}>Ends</span>
              <input name="ends_at" type="datetime-local" className={field} />
            </label>
            <div className="flex flex-wrap items-end gap-4">
              <label className="flex items-center gap-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))]">
                <input name="is_public" type="checkbox" defaultChecked />
                Public code
              </label>
              <label className="flex items-center gap-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))]">
                <input name="is_active" type="checkbox" defaultChecked />
                Active
              </label>
            </div>

            <div className="md:col-span-2 xl:col-span-4">
              <button className={button}>Create discount</button>
            </div>
          </AdminActionForm>

          <div className="mt-5 space-y-2">
            {discounts.map((discount) => (
              <div key={discount.id} className="flex flex-wrap items-center justify-between gap-3 border border-[rgb(var(--sep-skin-c1,169_138_96))]/20 px-3 py-3">
                <div>
                  <p className="text-sm text-[rgb(var(--sep-skin-c1,169_138_96))]">
                    {discount.code ?? discount.name}
                  </p>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-[rgb(var(--sep-skin-c2,211_194_170))]">
                    {discount.discount_type} · {discount.discount_value}
                    {discount.is_active ? " · active" : " · disabled"}
                  </p>
                </div>

                <AdminActionForm action={toggleStoreDiscount} successMessage="Discount updated.">
                  <input type="hidden" name="id" value={discount.id} />
                  <input type="hidden" name="next" value={discount.is_active ? "false" : "true"} />
                  <button className={button}>
                    {discount.is_active ? "Disable" : "Enable"}
                  </button>
                </AdminActionForm>
              </div>
            ))}
          </div>
        </section>

        <StorePostPurchaseOffersAdmin />
      </div>
    </main>
  );
}
