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
  deleteStoreDiscount,
  deleteStoreGrant,
  deleteStorePrice,
  deleteStoreProduct,
  saveStorePrice,
  syncExistingPremiumCatalogueToStore,
  toggleStoreDiscount,
  updateStoreDiscount,
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
    discountProductScopesResult,
  ] = await Promise.all([
    admin.from("store_products").select("*").order("sort_order").order("name"),
    admin.from("store_product_prices").select("*").order("created_at"),
    admin.from("store_product_grants").select("*").order("created_at"),
    admin.from("portal_skins").select("id, slug, name, is_active").order("name"),
    admin.from("cosmetic_items").select("id, slug, name, category, is_active").order("category").order("name"),
    admin.from("music_tracks")
      .select("id, track_key, name, description, is_active, is_personal_selectable, sort_order").order("sort_order").order("name"),
    admin.from("store_discount_codes").select("*").order("created_at", { ascending: false }),
    admin.from("store_discount_code_products").select("discount_code_id, product_id"),
  ]);

  for (const result of [
    productsResult,
    pricesResult,
    grantsResult,
    skinsResult,
    cosmeticsResult,
    musicResult,
    discountsResult,
    discountProductScopesResult,
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
  const discountProductScopes = discountProductScopesResult.data ?? [];

  const productIdsByDiscount = new Map<string, Set<string>>();
  for (const row of discountProductScopes) {
    const current =
      productIdsByDiscount.get(String(row.discount_code_id)) ??
      new Set<string>();
    current.add(String(row.product_id));
    productIdsByDiscount.set(String(row.discount_code_id), current);
  }

  const skinById = new Map(skins.map((x) => [x.id, x.name]));
  const cosmeticById = new Map(cosmetics.map((x) => [x.id, x.name]));
  const musicById = new Map(musicTracks.map((x) => [x.id, x.name]));

  return (
    <main className="admin-compact h-full min-h-0 max-h-full overflow-y-auto p-5 sm:p-7 lg:p-9 admin_store_page_main_main">
      <div className="mx-auto max-w-7xl admin_store_page_div_sepulchria_store">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))] admin_store_page_p_sepulchria_store">
          Administration
        </p>

        <h2 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-skin-c1,169_138_96))] admin_store_page_h2_sepulchria_store">
          Sepulchria Store
        </h2>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-skin-c2,211_194_170))] admin_store_page_p_sepulchria_store_2">
          Create products and bundles, choose what they unlock, set real-money
          and Remnant prices, and manage promotion codes.
        </p>

        <div className="mt-4 admin_store_page_div_sepulchria_store_2">
          <StoreLiveFilterBar placeholder="Filter Store products by name..." />
        </div>

        <section
          id="store-catalogue-sync"
          className="mt-8 scroll-mt-6 border border-[rgb(var(--sep-skin-c1,169_138_96))]/35 bg-[rgb(var(--sep-colour-15100d))] p-4 sm:p-5 admin_store_page_section_store_catalogue_sync"
        >
          <div className="flex flex-wrap items-end justify-between gap-4 admin_store_page_div_store_catalogue_sync">
            <div className="admin_store_page_div_existing_premium_catalogue">
              <h3 className="font-serif text-2xl text-[rgb(var(--sep-skin-c1,169_138_96))] admin_store_page_h3_existing_premium_catalogue">
                Existing premium catalogue
              </h3>

              <p className="mt-2 max-w-3xl text-xs leading-5 text-[rgb(var(--sep-skin-c2,211_194_170))] admin_store_page_p_existing_premium_catalogue">
                Import or refresh every existing cosmetic, every premium skin,
                every music track, Friend List and Private Location as Store
                products. Cinder Original is excluded because it is the default
                skin. No prices are created or changed.
              </p>
            </div>

            <AdminActionForm action={syncExistingPremiumCatalogueToStore} successMessage="Catalogue synced to Store.">
              <button className={[((button)), "admin_store_page_button_sync_catalogue_store"].filter(Boolean).join(" ")}>
                Sync catalogue to Store
              </button>
            </AdminActionForm>
          </div>
        </section>

        <StoreCommerceOperationsAdmin />

        <section id="store-create-product" className="mt-8 scroll-mt-6 border border-[rgb(var(--sep-skin-c1,169_138_96))]/35 bg-[rgb(var(--sep-colour-15100d))] p-4 sm:p-5 admin_store_page_section_store_create_product">
          <h3 className="font-serif text-2xl text-[rgb(var(--sep-skin-c1,169_138_96))] admin_store_page_h3_store_create_product">
            Create product
          </h3>

          <AdminActionForm action={createStoreProduct} successMessage="Product created." className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="admin_store_page_label_store_create_product">
              <span className={[((label)), "admin_store_page_span_store_create_product"].filter(Boolean).join(" ")}>Name</span>
              <input name="name" required className={[((field)), "admin_store_page_input_name"].filter(Boolean).join(" ")} />
            </label>
            <label className="admin_store_page_label_store_create_product_2">
              <span className={[((label)), "admin_store_page_span_store_create_product_2"].filter(Boolean).join(" ")}>Slug</span>
              <input name="slug" required placeholder="moonlit-skin" className={[((field)), "admin_store_page_input_slug"].filter(Boolean).join(" ")} />
            </label>
            <label className="admin_store_page_label_store_create_product_3">
              <span className={[((label)), "admin_store_page_span_store_create_product_3"].filter(Boolean).join(" ")}>Category</span>
              <select name="category" defaultValue="cosmetic" className={[((field)), "admin_store_page_select_category"].filter(Boolean).join(" ")}>
                <option className="admin_store_page_option_skin" value="skin">Skin</option>
                <option className="admin_store_page_option_cosmetic" value="cosmetic">Cosmetic</option>
                <option className="admin_store_page_option_music" value="music">Music</option>
                <option className="admin_store_page_option_friend_list" value="friend_list">Friend List</option>
                <option className="admin_store_page_option_private_location" value="private_location">Private Location</option>
                <option className="admin_store_page_option_bundle" value="bundle">Bundle</option>
              </select>
            </label>
            <label className="admin_store_page_label_store_create_product_4">
              <span className={[((label)), "admin_store_page_span_store_create_product_4"].filter(Boolean).join(" ")}>Sort order</span>
              <input name="sort_order" type="number" defaultValue="0" className={[((field)), "admin_store_page_input_sort_order"].filter(Boolean).join(" ")} />
            </label>

            <label className="md:col-span-2 xl:col-span-3 admin_store_page_label_store_create_product_5">
              <span className={[((label)), "admin_store_page_span_store_create_product_5"].filter(Boolean).join(" ")}>Description</span>
              <textarea name="description" rows={3} className={[((field)), "admin_store_page_textarea_description"].filter(Boolean).join(" ")} />
            </label>

            <label className="admin_store_page_label_store_create_product_6">
              <span className={[((label)), "admin_store_page_span_store_create_product_6"].filter(Boolean).join(" ")}>Image URL</span>
              <input name="image_url" className={[((field)), "admin_store_page_input_image_url"].filter(Boolean).join(" ")} />
            </label>

            <label className="flex items-center gap-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))] admin_store_page_label_store_create_product_7">
              <input className="admin_store_page_input_active" name="is_active" type="checkbox" defaultChecked />
              Active
            </label>

            <label className="flex items-center gap-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))] admin_store_page_label_store_create_product_8">
              <input className="admin_store_page_input_featured" name="is_featured" type="checkbox" />
              Featured
            </label>

            <div className="md:col-span-2 xl:col-span-4 admin_store_page_div_store_create_product">
              <button className={[((button)), "admin_store_page_button_create_product"].filter(Boolean).join(" ")}>Create product</button>
            </div>
          </AdminActionForm>
        </section>

        <section id="store-products" className="mt-6 scroll-mt-6 admin_store_page_section_store_products">
          <h3 className="font-serif text-2xl text-[rgb(var(--sep-skin-c1,169_138_96))] admin_store_page_h3_store_products">
            Products & bundles
          </h3>

          <div className="mt-4 space-y-4 admin_store_page_div_store_products">
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
                  className="scroll-mt-4 border border-[rgb(var(--sep-skin-c1,169_138_96))]/30 bg-[rgb(var(--sep-colour-120e0b))] admin_store_page_details_details"
                >
                  <summary className="cursor-pointer px-4 py-4 sm:px-5 admin_store_page_summary_summary">
                    <div className="flex flex-wrap items-center justify-between gap-3 admin_store_page_div_container">
                      <div className="admin_store_page_div_container_2">
                        <span className="font-serif text-xl text-[rgb(var(--sep-skin-c1,169_138_96))] admin_store_page_span_text">
                          {product.name}
                        </span>
                        <span className="ml-3 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-skin-c2,211_194_170))] admin_store_page_span_text_2">
                          {product.category}
                        </span>
                      </div>
                      <span className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-skin-c2,211_194_170))] admin_store_page_span_text_3">
                        {product.is_active ? "Active" : "Hidden"}
                      </span>
                    </div>
                  </summary>

                  <div className="border-t border-[rgb(var(--sep-skin-c1,169_138_96))]/20 p-4 sm:p-5 admin_store_page_div_container_3">
                    <AdminActionForm action={updateStoreProduct} successMessage="Product saved." className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <input className="admin_store_page_input_id" type="hidden" name="id" value={product.id} />
                      <label className="admin_store_page_label_label">
                        <span className={[((label)), "admin_store_page_span_text_4"].filter(Boolean).join(" ")}>Name</span>
                        <input name="name" defaultValue={product.name} required className={[((field)), "admin_store_page_input_name_2"].filter(Boolean).join(" ")} />
                      </label>
                      <label className="admin_store_page_label_label_2">
                        <span className={[((label)), "admin_store_page_span_text_5"].filter(Boolean).join(" ")}>Slug</span>
                        <input name="slug" defaultValue={product.slug} required className={[((field)), "admin_store_page_input_slug_2"].filter(Boolean).join(" ")} />
                      </label>
                      <label className="admin_store_page_label_label_3">
                        <span className={[((label)), "admin_store_page_span_text_6"].filter(Boolean).join(" ")}>Category</span>
                        <select name="category" defaultValue={product.category} className={[((field)), "admin_store_page_select_category_2"].filter(Boolean).join(" ")}>
                          <option className="admin_store_page_option_skin_2" value="skin">Skin</option>
                          <option className="admin_store_page_option_cosmetic_2" value="cosmetic">Cosmetic</option>
                          <option className="admin_store_page_option_music_2" value="music">Music</option>
                          <option className="admin_store_page_option_friend_list_2" value="friend_list">Friend List</option>
                          <option className="admin_store_page_option_private_location_2" value="private_location">Private Location</option>
                          <option className="admin_store_page_option_bundle_2" value="bundle">Bundle</option>
                        </select>
                      </label>
                      <label className="admin_store_page_label_label_4">
                        <span className={[((label)), "admin_store_page_span_text_7"].filter(Boolean).join(" ")}>Sort</span>
                        <input name="sort_order" type="number" defaultValue={product.sort_order} className={[((field)), "admin_store_page_input_sort_order_2"].filter(Boolean).join(" ")} />
                      </label>

                      <label className="md:col-span-2 xl:col-span-3 admin_store_page_label_label_5">
                        <span className={[((label)), "admin_store_page_span_text_8"].filter(Boolean).join(" ")}>Description</span>
                        <textarea name="description" rows={3} defaultValue={product.description} className={[((field)), "admin_store_page_textarea_description_2"].filter(Boolean).join(" ")} />
                      </label>

                      <label className="admin_store_page_label_label_6">
                        <span className={[((label)), "admin_store_page_span_text_9"].filter(Boolean).join(" ")}>Image URL</span>
                        <input name="image_url" defaultValue={product.image_url ?? ""} className={[((field)), "admin_store_page_input_image_url_2"].filter(Boolean).join(" ")} />
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={`${product.name} preview`}
                            className="mt-2 max-h-28 max-w-full border border-[rgb(var(--sep-skin-c1,169_138_96))]/25 bg-[rgb(var(--sep-colour-100c09))] object-contain p-1 admin_store_page_img_image"
                          />
                        ) : null}
                      </label>

                      <label className="flex items-center gap-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))] admin_store_page_label_label_7">
                        <input className="admin_store_page_input_active_2" name="is_active" type="checkbox" defaultChecked={product.is_active} />
                        Active
                      </label>

                      <label className="flex items-center gap-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))] admin_store_page_label_label_8">
                        <input className="admin_store_page_input_featured_2" name="is_featured" type="checkbox" defaultChecked={product.is_featured} />
                        Featured
                      </label>

                      <div className="md:col-span-2 xl:col-span-4 admin_store_page_div_container_4">
                        <button className={[((button)), "admin_store_page_button_save_product"].filter(Boolean).join(" ")}>Save product</button>
                      </div>
                    </AdminActionForm>

                    <div className="mt-6 grid gap-5 xl:grid-cols-2 admin_store_page_div_container_5">
                      <div className="border border-[rgb(var(--sep-skin-c1,169_138_96))]/20 p-4 admin_store_page_div_pricing">
                        <h4 className="font-serif text-lg text-[rgb(var(--sep-skin-c1,169_138_96))] admin_store_page_h4_pricing">
                          Pricing
                        </h4>

                        <div className="mt-3 space-y-2 admin_store_page_div_pricing_2">
                          {productPrices.map((price) => (
                            <div key={price.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--sep-skin-c1,169_138_96))]/15 pb-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))] admin_store_page_div_container_6">
                              <span className="admin_store_page_span_text_10">
                                {moneyLabel(price.money_amount_minor, price.currency)}
                                {price.money_amount_minor !== null && price.remnants_amount !== null ? " · " : ""}
                                {price.remnants_amount !== null ? `${price.remnants_amount} Remnants` : ""}
                              </span>
                              <AdminActionForm action={deleteStorePrice} successMessage="Price removed.">
                                <input className="admin_store_page_input_id_2" type="hidden" name="id" value={price.id} />
                                <button className={[((dangerButton)), "admin_store_page_button_remove"].filter(Boolean).join(" ")}>Remove</button>
                              </AdminActionForm>
                            </div>
                          ))}
                        </div>

                        <AdminActionForm action={saveStorePrice} successMessage="Price saved and synced." className="mt-4 grid gap-3 sm:grid-cols-2">
                          <input className="admin_store_page_input_product_id" type="hidden" name="product_id" value={product.id} />
                          <label className="admin_store_page_label_pricing">
                            <span className={[((label)), "admin_store_page_span_pricing"].filter(Boolean).join(" ")}>Currency</span>
                            <input name="currency" defaultValue="GBP" maxLength={3} className={[((field)), "admin_store_page_input_currency"].filter(Boolean).join(" ")} />
                          </label>
                          <label className="admin_store_page_label_pricing_2">
                            <span className={[((label)), "admin_store_page_span_pricing_2"].filter(Boolean).join(" ")}>Money price in pence</span>
                            <input name="money_amount_minor" type="number" min="0" placeholder="399 = £3.99" className={[((field)), "admin_store_page_input_money_amount_minor"].filter(Boolean).join(" ")} />
                          </label>
                          <label className="admin_store_page_label_pricing_3">
                            <span className={[((label)), "admin_store_page_span_pricing_3"].filter(Boolean).join(" ")}>Remnants</span>
                            <input name="remnants_amount" type="number" min="0" className={[((field)), "admin_store_page_input_remnants_amount"].filter(Boolean).join(" ")} />
                          </label>
                          <div className="border border-[rgb(var(--sep-colour-60482e))]/25 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[9px] text-[rgb(var(--sep-colour-756958))] admin_store_page_div_pricing_3">Stripe IDs are created and maintained automatically.</div>
                          <div className="sm:col-span-2 admin_store_page_div_pricing_4">
                            <button className={[((button)), "admin_store_page_button_save_price"].filter(Boolean).join(" ")}>Save price</button>
                          </div>
                        </AdminActionForm>
                      </div>

                      <div className="border border-[rgb(var(--sep-skin-c1,169_138_96))]/20 p-4 admin_store_page_div_product_unlocks">
                        <h4 className="font-serif text-lg text-[rgb(var(--sep-skin-c1,169_138_96))] admin_store_page_h4_product_unlocks">
                          What this product unlocks
                        </h4>

                        <div className="mt-3 space-y-2 admin_store_page_div_product_unlocks_2">
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
                              <div key={grant.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--sep-skin-c1,169_138_96))]/15 pb-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))] admin_store_page_div_container_7">
                                <span className="admin_store_page_span_text_11">{text}</span>
                                <AdminActionForm action={deleteStoreGrant} successMessage="Unlock removed.">
                                  <input className="admin_store_page_input_id_3" type="hidden" name="id" value={grant.id} />
                                  <button className={[((dangerButton)), "admin_store_page_button_remove_2"].filter(Boolean).join(" ")}>Remove</button>
                                </AdminActionForm>
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-4 grid gap-3 admin_store_page_div_product_unlocks_3">
                          <AdminActionForm action={addStoreGrant} successMessage="Unlock added." className="grid gap-2 sm:grid-cols-[1fr_auto]">
                            <input className="admin_store_page_input_product_id_2" type="hidden" name="product_id" value={product.id} />
                            <input className="admin_store_page_input_grant_type" type="hidden" name="grant_type" value="portal_skin" />
                            <select name="target" className={[((field)), "admin_store_page_select_product_unlocks"].filter(Boolean).join(" ")}>
                              {skins.filter((x) => x.is_active).map((skin) => (
                                <option className="admin_store_page_option_option" key={skin.id} value={skin.id}>{skin.name}</option>
                              ))}
                            </select>
                            <button className={[((button)), "admin_store_page_button_add_skin"].filter(Boolean).join(" ")}>Add skin</button>
                          </AdminActionForm>

                          <AdminActionForm action={addStoreGrant} successMessage="Unlock added." className="grid gap-2 sm:grid-cols-[1fr_auto]">
                            <input className="admin_store_page_input_product_id_3" type="hidden" name="product_id" value={product.id} />
                            <input className="admin_store_page_input_grant_type_2" type="hidden" name="grant_type" value="cosmetic" />
                            <select name="target" className={[((field)), "admin_store_page_select_product_unlocks_2"].filter(Boolean).join(" ")}>
                              {cosmetics.filter((x) => x.is_active).map((item) => (
                                <option className="admin_store_page_option_option_2" key={item.id} value={item.id}>
                                  {item.name} · {item.category}
                                </option>
                              ))}
                            </select>
                            <button className={[((button)), "admin_store_page_button_add_cosmetic"].filter(Boolean).join(" ")}>Add cosmetic</button>
                          </AdminActionForm>

                          <AdminActionForm action={addStoreGrant} successMessage="Unlock added." className="grid gap-2 sm:grid-cols-[1fr_auto]">
                            <input className="admin_store_page_input_product_id_4" type="hidden" name="product_id" value={product.id} />
                            <input className="admin_store_page_input_grant_type_3" type="hidden" name="grant_type" value="music" />
                            <select name="target" className={[((field)), "admin_store_page_select_product_unlocks_3"].filter(Boolean).join(" ")}>
                              {musicTracks.filter((x) => x.is_active && x.is_personal_selectable).map((track) => (
                                <option className="admin_store_page_option_option_3" key={track.id} value={track.id}>
                                  {track.name}
                                </option>
                              ))}
                            </select>
                            <button className={[((button)), "admin_store_page_button_add_music"].filter(Boolean).join(" ")}>Add music</button>
                          </AdminActionForm>

                          <AdminActionForm action={addStoreGrant} successMessage="Unlock added." className="grid gap-2 sm:grid-cols-[1fr_auto]">
                            <input className="admin_store_page_input_product_id_5" type="hidden" name="product_id" value={product.id} />
                            <input className="admin_store_page_input_grant_type_4" type="hidden" name="grant_type" value="feature" />
                            <select name="target" className={[((field)), "admin_store_page_select_product_unlocks_4"].filter(Boolean).join(" ")}>
                              <option className="admin_store_page_option_friend_list_3" value="friend_list">Friend List</option>
                              <option className="admin_store_page_option_private_chat" value="private_chat">Private Location</option>
                            </select>
                            <button className={[((button)), "admin_store_page_button_add_feature"].filter(Boolean).join(" ")}>Add feature</button>
                          </AdminActionForm>
                        </div>
                      </div>
                    </div>

                    <AdminActionForm action={deleteStoreProduct} successMessage="Product deleted." className="mt-5">
                      <input className="admin_store_page_input_id_4" type="hidden" name="id" value={product.id} />
                      <button className={[((dangerButton)), "admin_store_page_button_delete_product"].filter(Boolean).join(" ")}>Delete product</button>
                    </AdminActionForm>
                  </div>
                </details>
              );
            })}

            {!products.length ? (
              <div className="border border-dashed border-[rgb(var(--sep-skin-c1,169_138_96))]/30 p-8 text-center text-sm text-[rgb(var(--sep-skin-c2,211_194_170))] admin_store_page_div_container_8">
                No Store products yet. Create the first one above.
              </div>
            ) : null}
          </div>
        </section>

        <section id="store-discounts" className="mt-8 scroll-mt-6 border border-[rgb(var(--sep-skin-c1,169_138_96))]/35 bg-[rgb(var(--sep-colour-15100d))] p-4 sm:p-5 admin_store_page_section_store_discounts">
          <h3 className="font-serif text-2xl text-[rgb(var(--sep-skin-c1,169_138_96))] admin_store_page_h3_store_discounts">
            Discount codes
          </h3>

          <AdminActionForm action={createStoreDiscount} successMessage="Discount created." className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="admin_store_page_label_store_discounts">
              <span className={[((label)), "admin_store_page_span_store_discounts"].filter(Boolean).join(" ")}>Name</span>
              <input name="name" required className={[((field)), "admin_store_page_input_name_3"].filter(Boolean).join(" ")} />
            </label>
            <label className="admin_store_page_label_store_discounts_2">
              <span className={[((label)), "admin_store_page_span_store_discounts_2"].filter(Boolean).join(" ")}>Code</span>
              <input name="code" placeholder="SEP20" className={[((field)), "admin_store_page_input_code"].filter(Boolean).join(" ")} />
            </label>
            <label className="admin_store_page_label_store_discounts_3">
              <span className={[((label)), "admin_store_page_span_store_discounts_3"].filter(Boolean).join(" ")}>Type</span>
              <select name="discount_type" defaultValue="percentage" className={[((field)), "admin_store_page_select_discount_type"].filter(Boolean).join(" ")}>
                <option className="admin_store_page_option_percentage" value="percentage">Percentage</option>
                <option className="admin_store_page_option_fixed_money" value="fixed_money">Fixed real money</option>
                <option className="admin_store_page_option_fixed_remnants" value="fixed_remnants">Fixed Remnants</option>
              </select>
            </label>
            <label className="admin_store_page_label_store_discounts_4">
              <span className={[((label)), "admin_store_page_span_store_discounts_4"].filter(Boolean).join(" ")}>Value</span>
              <input name="discount_value" type="number" min="1" required className={[((field)), "admin_store_page_input_discount_value"].filter(Boolean).join(" ")} />
            </label>
            <label className="admin_store_page_label_store_discounts_5">
              <span className={[((label)), "admin_store_page_span_store_discounts_5"].filter(Boolean).join(" ")}>Currency</span>
              <input name="currency" defaultValue="GBP" maxLength={3} className={[((field)), "admin_store_page_input_currency_2"].filter(Boolean).join(" ")} />
            </label>
            <label className="admin_store_page_label_store_discounts_6">
              <span className={[((label)), "admin_store_page_span_store_discounts_6"].filter(Boolean).join(" ")}>Scope</span>
              <select name="scope_type" defaultValue="all" className={[((field)), "admin_store_page_select_scope_type"].filter(Boolean).join(" ")}>
                <option className="admin_store_page_option_all" value="all">Everything</option>
                <option className="admin_store_page_option_products" value="products">Selected products</option>
                <option className="admin_store_page_option_category" value="category">Category</option>
              </select>
            </label>
            <label className="admin_store_page_label_store_discounts_7">
              <span className={[((label)), "admin_store_page_span_store_discounts_7"].filter(Boolean).join(" ")}>Category scope</span>
              <select name="scope_category" className={[((field)), "admin_store_page_select_scope_category"].filter(Boolean).join(" ")} defaultValue="">
                <option className="admin_store_page_option_scope_category" value="">—</option>
                <option className="admin_store_page_option_skin_3" value="skin">Skin</option>
                <option className="admin_store_page_option_cosmetic_3" value="cosmetic">Cosmetic</option>
                <option className="admin_store_page_option_music_3" value="music">Music</option>
                <option className="admin_store_page_option_friend_list_4" value="friend_list">Friend List</option>
                <option className="admin_store_page_option_private_location_3" value="private_location">Private Location</option>
                <option className="admin_store_page_option_bundle_3" value="bundle">Bundle</option>
              </select>
            </label>
            <label className="admin_store_page_label_store_discounts_8">
              <span className={[((label)), "admin_store_page_span_store_discounts_8"].filter(Boolean).join(" ")}>Product scope</span>
              <select name="product_ids" multiple size={5} className={[((field)), "admin_store_page_select_product_ids"].filter(Boolean).join(" ")}>
                {products.map((product) => <option className="admin_store_page_option_product_ids" key={product.id} value={product.id}>{product.name}</option>)}
              </select>
            </label>
            <label className="admin_store_page_label_store_discounts_9">
              <span className={[((label)), "admin_store_page_span_store_discounts_9"].filter(Boolean).join(" ")}>Minimum money (minor units)</span>
              <input name="minimum_money_minor" type="number" min="0" className={[((field)), "admin_store_page_input_minimum_money_minor"].filter(Boolean).join(" ")} />
            </label>
            <label className="admin_store_page_label_store_discounts_10">
              <span className={[((label)), "admin_store_page_span_store_discounts_10"].filter(Boolean).join(" ")}>Minimum Remnants</span>
              <input name="minimum_remnants" type="number" min="0" className={[((field)), "admin_store_page_input_minimum_remnants"].filter(Boolean).join(" ")} />
            </label>
            <label className="admin_store_page_label_store_discounts_11">
              <span className={[((label)), "admin_store_page_span_store_discounts_11"].filter(Boolean).join(" ")}>Max total uses</span>
              <input name="max_redemptions" type="number" min="1" className={[((field)), "admin_store_page_input_store_discounts"].filter(Boolean).join(" ")} />
            </label>
            <label className="admin_store_page_label_store_discounts_12">
              <span className={[((label)), "admin_store_page_span_store_discounts_12"].filter(Boolean).join(" ")}>Max uses / user</span>
              <input name="max_redemptions_per_user" type="number" min="1" defaultValue="1" className={[((field)), "admin_store_page_input_store_discounts_2"].filter(Boolean).join(" ")} />
            </label>
            <label className="admin_store_page_label_store_discounts_13">
              <span className={[((label)), "admin_store_page_span_store_discounts_13"].filter(Boolean).join(" ")}>Starts</span>
              <input name="starts_at" type="datetime-local" className={[((field)), "admin_store_page_input_starts"].filter(Boolean).join(" ")} />
            </label>
            <label className="admin_store_page_label_store_discounts_14">
              <span className={[((label)), "admin_store_page_span_store_discounts_14"].filter(Boolean).join(" ")}>Ends</span>
              <input name="ends_at" type="datetime-local" className={[((field)), "admin_store_page_input_ends"].filter(Boolean).join(" ")} />
            </label>
            <div className="flex flex-wrap items-end gap-4 admin_store_page_div_public_code">
              <label className="flex items-center gap-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))] admin_store_page_label_public_code">
                <input className="admin_store_page_input_public" name="is_public" type="checkbox" defaultChecked />
                Public code
              </label>
              <label className="flex items-center gap-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))] admin_store_page_label_public_code_2">
                <input className="admin_store_page_input_active_3" name="is_active" type="checkbox" defaultChecked />
                Active
              </label>
            </div>

            <div className="md:col-span-2 xl:col-span-4 admin_store_page_div_store_discounts">
              <button className={[((button)), "admin_store_page_button_create_discount"].filter(Boolean).join(" ")}>Create discount</button>
            </div>
          </AdminActionForm>

          <div className="mt-5 space-y-2 admin_store_page_div_store_discounts_2">
            {discounts.map((discount) => {
              const selectedProductIds =
                productIdsByDiscount.get(String(discount.id)) ??
                new Set<string>();

              return (
                <details
                  key={discount.id}
                  className="border border-[rgb(var(--sep-skin-c1,169_138_96))]/20 admin_store_page_details_details_2"
                >
                  <summary className="cursor-pointer px-3 py-3 admin_store_page_summary_summary_2">
                    <div className="flex flex-wrap items-center justify-between gap-3 admin_store_page_div_container_9">
                      <div className="admin_store_page_div_container_10">
                        <p className="text-sm text-[rgb(var(--sep-skin-c1,169_138_96))] admin_store_page_p_text">
                          {discount.code ?? discount.name}
                        </p>
                        <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-[rgb(var(--sep-skin-c2,211_194_170))] admin_store_page_p_text_2">
                          {discount.discount_type} · {discount.discount_value}
                          {discount.is_active ? " · active" : " · disabled"}
                        </p>
                      </div>
                      <span className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))] admin_store_page_span_text_12">
                        Edit
                      </span>
                    </div>
                  </summary>

                  <div className="border-t border-[rgb(var(--sep-skin-c1,169_138_96))]/20 p-3 sm:p-4 admin_store_page_div_container_11">
                    <AdminActionForm
                      action={updateStoreDiscount}
                      successMessage="Discount saved."
                      className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
                    >
                      <input className="admin_store_page_input_id_5" type="hidden" name="id" value={discount.id} />

                      <label className="admin_store_page_label_label_9"><span className={[((label)), "admin_store_page_span_text_13"].filter(Boolean).join(" ")}>Name</span><input name="name" required defaultValue={discount.name ?? ""} className={[((field)), "admin_store_page_input_name_4"].filter(Boolean).join(" ")} /></label>
                      <label className="admin_store_page_label_label_10"><span className={[((label)), "admin_store_page_span_text_14"].filter(Boolean).join(" ")}>Code</span><input name="code" defaultValue={discount.code ?? ""} className={[((field)), "admin_store_page_input_code_2"].filter(Boolean).join(" ")} /></label>
                      <label className="admin_store_page_label_label_11"><span className={[((label)), "admin_store_page_span_text_15"].filter(Boolean).join(" ")}>Type</span><select name="discount_type" defaultValue={discount.discount_type} className={[((field)), "admin_store_page_select_discount_type_2"].filter(Boolean).join(" ")}><option className="admin_store_page_option_percentage_2" value="percentage">Percentage</option><option className="admin_store_page_option_fixed_money_2" value="fixed_money">Fixed real money</option><option className="admin_store_page_option_fixed_remnants_2" value="fixed_remnants">Fixed Remnants</option></select></label>
                      <label className="admin_store_page_label_label_12"><span className={[((label)), "admin_store_page_span_text_16"].filter(Boolean).join(" ")}>Value</span><input name="discount_value" type="number" min="1" required defaultValue={discount.discount_value ?? ""} className={[((field)), "admin_store_page_input_discount_value_2"].filter(Boolean).join(" ")} /></label>
                      <label className="admin_store_page_label_label_13"><span className={[((label)), "admin_store_page_span_text_17"].filter(Boolean).join(" ")}>Currency</span><input name="currency" defaultValue={discount.currency ?? "GBP"} maxLength={3} className={[((field)), "admin_store_page_input_currency_3"].filter(Boolean).join(" ")} /></label>
                      <label className="admin_store_page_label_label_14"><span className={[((label)), "admin_store_page_span_text_18"].filter(Boolean).join(" ")}>Scope</span><select name="scope_type" defaultValue={discount.scope_type} className={[((field)), "admin_store_page_select_scope_type_2"].filter(Boolean).join(" ")}><option className="admin_store_page_option_all_2" value="all">Everything</option><option className="admin_store_page_option_products_2" value="products">Selected products</option><option className="admin_store_page_option_category_2" value="category">Category</option></select></label>
                      <label className="admin_store_page_label_label_15"><span className={[((label)), "admin_store_page_span_text_19"].filter(Boolean).join(" ")}>Category scope</span><select name="scope_category" className={[((field)), "admin_store_page_select_scope_category_2"].filter(Boolean).join(" ")} defaultValue={discount.scope_category ?? ""}><option className="admin_store_page_option_scope_category_2" value="">—</option><option className="admin_store_page_option_skin_4" value="skin">Skin</option><option className="admin_store_page_option_cosmetic_4" value="cosmetic">Cosmetic</option><option className="admin_store_page_option_music_4" value="music">Music</option><option className="admin_store_page_option_friend_list_5" value="friend_list">Friend List</option><option className="admin_store_page_option_private_location_4" value="private_location">Private Location</option><option className="admin_store_page_option_bundle_4" value="bundle">Bundle</option></select></label>
                      <label className="admin_store_page_label_label_16"><span className={[((label)), "admin_store_page_span_text_20"].filter(Boolean).join(" ")}>Product scope</span><select name="product_ids" multiple size={5} className={[((field)), "admin_store_page_select_product_ids_2"].filter(Boolean).join(" ")} defaultValue={[...selectedProductIds]}>{products.map((product) => <option className="admin_store_page_option_product_ids_2" key={product.id} value={product.id}>{product.name}</option>)}</select></label>
                      <label className="admin_store_page_label_label_17"><span className={[((label)), "admin_store_page_span_text_21"].filter(Boolean).join(" ")}>Minimum money (minor units)</span><input name="minimum_money_minor" type="number" min="0" defaultValue={discount.minimum_money_minor ?? ""} className={[((field)), "admin_store_page_input_minimum_money_minor_2"].filter(Boolean).join(" ")} /></label>
                      <label className="admin_store_page_label_label_18"><span className={[((label)), "admin_store_page_span_text_22"].filter(Boolean).join(" ")}>Minimum Remnants</span><input name="minimum_remnants" type="number" min="0" defaultValue={discount.minimum_remnants ?? ""} className={[((field)), "admin_store_page_input_minimum_remnants_2"].filter(Boolean).join(" ")} /></label>
                      <label className="admin_store_page_label_label_19"><span className={[((label)), "admin_store_page_span_text_23"].filter(Boolean).join(" ")}>Max total uses</span><input name="max_redemptions" type="number" min="1" defaultValue={discount.max_redemptions ?? ""} className={[((field)), "admin_store_page_input_field"].filter(Boolean).join(" ")} /></label>
                      <label className="admin_store_page_label_label_20"><span className={[((label)), "admin_store_page_span_text_24"].filter(Boolean).join(" ")}>Max uses / user</span><input name="max_redemptions_per_user" type="number" min="1" defaultValue={discount.max_redemptions_per_user ?? 1} className={[((field)), "admin_store_page_input_field_2"].filter(Boolean).join(" ")} /></label>
                      <label className="admin_store_page_label_label_21"><span className={[((label)), "admin_store_page_span_text_25"].filter(Boolean).join(" ")}>Starts</span><input name="starts_at" type="datetime-local" defaultValue={discount.starts_at ? String(discount.starts_at).slice(0, 16) : ""} className={[((field)), "admin_store_page_input_starts_2"].filter(Boolean).join(" ")} /></label>
                      <label className="admin_store_page_label_label_22"><span className={[((label)), "admin_store_page_span_text_26"].filter(Boolean).join(" ")}>Ends</span><input name="ends_at" type="datetime-local" defaultValue={discount.ends_at ? String(discount.ends_at).slice(0, 16) : ""} className={[((field)), "admin_store_page_input_ends_2"].filter(Boolean).join(" ")} /></label>

                      <div className="flex flex-wrap items-end gap-4 admin_store_page_div_public_code_2">
                        <label className="flex items-center gap-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))] admin_store_page_label_public_code_3"><input className="admin_store_page_input_public_2" name="is_public" type="checkbox" defaultChecked={discount.is_public} />Public code</label>
                        <label className="flex items-center gap-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))] admin_store_page_label_public_code_4"><input className="admin_store_page_input_active_4" name="is_active" type="checkbox" defaultChecked={discount.is_active} />Active</label>
                      </div>

                      <div className="md:col-span-2 xl:col-span-4 admin_store_page_div_container_12"><button className={[((button)), "admin_store_page_button_save_discount"].filter(Boolean).join(" ")}>Save discount</button></div>
                    </AdminActionForm>

                    <div className="mt-3 flex flex-wrap gap-2 admin_store_page_div_container_13">
                      <AdminActionForm action={toggleStoreDiscount} successMessage="Discount updated.">
                        <input className="admin_store_page_input_id_6" type="hidden" name="id" value={discount.id} />
                        <input className="admin_store_page_input_next" type="hidden" name="next" value={discount.is_active ? "false" : "true"} />
                        <button className={[((button)), "admin_store_page_button_action"].filter(Boolean).join(" ")}>{discount.is_active ? "Disable" : "Enable"}</button>
                      </AdminActionForm>

                      <AdminActionForm action={deleteStoreDiscount} successMessage="Discount deleted.">
                        <input className="admin_store_page_input_id_7" type="hidden" name="id" value={discount.id} />
                        <button className={[((dangerButton)), "admin_store_page_button_delete_discount"].filter(Boolean).join(" ")}>Delete discount</button>
                      </AdminActionForm>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </section>

        <StorePostPurchaseOffersAdmin />
      </div>
    </main>
  );
}
