import "server-only";

import { AdminActionForm } from "@/components/admin/admin-action-ui";

import { createStorePostPurchaseOffer, toggleStorePostPurchaseOffer } from "@/app/(portal)/admin/store/actions";
import { createAdminClient } from "@/lib/supabase/admin";

const field = "w-full min-w-0 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d7c4a5))] outline-none";
const label = "mb-1 block text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-756958))]";
const button = "inline-flex items-center justify-center border border-[rgb(var(--sep-skin-c1,169_138_96))]/55 bg-[rgb(var(--sep-colour-21170f))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-skin-c1,169_138_96))] transition hover:border-[rgb(var(--sep-skin-c1,169_138_96))]";

export async function StorePostPurchaseOffersAdmin() {
  const admin = createAdminClient();
  const [productsResult, discountsResult, offersResult] = await Promise.all([
    admin.from("store_products").select("id, name, category").order("name"),
    admin.from("store_discount_codes").select("id, code, name, discount_type, discount_value, is_active").order("created_at", { ascending: false }),
    admin.from("store_post_purchase_offers").select("*").order("created_at", { ascending: false }),
  ]);
  const error = productsResult.error ?? discountsResult.error ?? offersResult.error;
  if (error) throw new Error(error.message);
  const products = productsResult.data ?? [];
  const discounts = discountsResult.data ?? [];
  const offers = offersResult.data ?? [];
  const productName = new Map(products.map((row) => [row.id, row.name]));
  const discountName = new Map(discounts.map((row) => [row.id, row.code ?? row.name]));

  return (
    <section className="mt-6 border border-[rgb(var(--sep-skin-c1,169_138_96))]/35 bg-[rgb(var(--sep-colour-15100d))] p-4 sm:p-5 components_admin_store_post_purchase_offers_section_post_purchase_offers">
      <h3 className="font-serif text-2xl text-[rgb(var(--sep-skin-c1,169_138_96))] components_admin_store_post_purchase_offers_h3_post_purchase_offers">Post-purchase offers</h3>
      <p className="mt-2 text-xs leading-5 text-[rgb(var(--sep-skin-c2,211_194_170))] components_admin_store_post_purchase_offers_p_post_purchase_offers">Issue a private, expiring discount code automatically after a qualifying Store purchase.</p>
      <AdminActionForm action={createStorePostPurchaseOffer} successMessage="Post-purchase offer created." className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="components_admin_store_post_purchase_offers_label_post_purchase_offers"><span className={[((label)), "components_admin_store_post_purchase_offers_span_post_purchase_offers"].filter(Boolean).join(" ")}>Name</span><input name="name" required className={[((field)), "components_admin_store_post_purchase_offers_input_name"].filter(Boolean).join(" ")} /></label>
        <label className="components_admin_store_post_purchase_offers_label_post_purchase_offers_2"><span className={[((label)), "components_admin_store_post_purchase_offers_span_post_purchase_offers_2"].filter(Boolean).join(" ")}>Discount template</span><select name="discount_code_template_id" required className={[((field)), "components_admin_store_post_purchase_offers_select_discount_code_template_id"].filter(Boolean).join(" ")} defaultValue=""><option className="components_admin_store_post_purchase_offers_option_discount_code_template_id" value="" disabled>Choose discount…</option>{discounts.map((d) => <option className="components_admin_store_post_purchase_offers_option_discount_code_template_id_2" key={d.id} value={d.id}>{d.code ?? d.name} · {d.discount_type} {d.discount_value}</option>)}</select></label>
        <label className="components_admin_store_post_purchase_offers_label_post_purchase_offers_3"><span className={[((label)), "components_admin_store_post_purchase_offers_span_post_purchase_offers_3"].filter(Boolean).join(" ")}>Trigger product</span><select name="trigger_product_id" className={[((field)), "components_admin_store_post_purchase_offers_select_trigger_product_id"].filter(Boolean).join(" ")} defaultValue=""><option className="components_admin_store_post_purchase_offers_option_trigger_product_id" value="">Use category instead</option>{products.map((p) => <option className="components_admin_store_post_purchase_offers_option_trigger_product_id_2" key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label className="components_admin_store_post_purchase_offers_label_post_purchase_offers_4"><span className={[((label)), "components_admin_store_post_purchase_offers_span_post_purchase_offers_4"].filter(Boolean).join(" ")}>Trigger category</span><select name="trigger_category" className={[((field)), "components_admin_store_post_purchase_offers_select_trigger_category"].filter(Boolean).join(" ")} defaultValue=""><option className="components_admin_store_post_purchase_offers_option_trigger_category" value="">—</option><option className="components_admin_store_post_purchase_offers_option_skin" value="skin">Skin</option><option className="components_admin_store_post_purchase_offers_option_cosmetic" value="cosmetic">Cosmetic</option><option className="components_admin_store_post_purchase_offers_option_music" value="music">Music</option><option className="components_admin_store_post_purchase_offers_option_friend_list" value="friend_list">Friend List</option><option className="components_admin_store_post_purchase_offers_option_private_location" value="private_location">Private Location</option><option className="components_admin_store_post_purchase_offers_option_bundle" value="bundle">Bundle</option></select></label>
        <label className="md:col-span-2 components_admin_store_post_purchase_offers_label_post_purchase_offers_5"><span className={[((label)), "components_admin_store_post_purchase_offers_span_post_purchase_offers_5"].filter(Boolean).join(" ")}>Description</span><input name="description" className={[((field)), "components_admin_store_post_purchase_offers_input_description"].filter(Boolean).join(" ")} /></label>
        <label className="components_admin_store_post_purchase_offers_label_post_purchase_offers_6"><span className={[((label)), "components_admin_store_post_purchase_offers_span_post_purchase_offers_6"].filter(Boolean).join(" ")}>Valid for days</span><input name="valid_for_days" type="number" min="1" defaultValue="14" className={[((field)), "components_admin_store_post_purchase_offers_input_valid_days"].filter(Boolean).join(" ")} /></label>
        <label className="flex items-center gap-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))] components_admin_store_post_purchase_offers_label_post_purchase_offers_7"><input className="components_admin_store_post_purchase_offers_input_active" name="is_active" type="checkbox" defaultChecked />Active</label>
        <label className="components_admin_store_post_purchase_offers_label_post_purchase_offers_8"><span className={[((label)), "components_admin_store_post_purchase_offers_span_post_purchase_offers_7"].filter(Boolean).join(" ")}>Starts</span><input name="starts_at" type="datetime-local" className={[((field)), "components_admin_store_post_purchase_offers_input_starts"].filter(Boolean).join(" ")} /></label>
        <label className="components_admin_store_post_purchase_offers_label_post_purchase_offers_9"><span className={[((label)), "components_admin_store_post_purchase_offers_span_post_purchase_offers_8"].filter(Boolean).join(" ")}>Ends</span><input name="ends_at" type="datetime-local" className={[((field)), "components_admin_store_post_purchase_offers_input_ends"].filter(Boolean).join(" ")} /></label>
        <div className="md:col-span-2 xl:col-span-4 components_admin_store_post_purchase_offers_div_post_purchase_offers"><button className={[((button)), "components_admin_store_post_purchase_offers_button_create_post_purchase_offer"].filter(Boolean).join(" ")}>Create post-purchase offer</button></div>
      </AdminActionForm>
      <div className="mt-5 space-y-2 components_admin_store_post_purchase_offers_div_post_purchase_offers_2">
        {offers.map((offer) => (
          <div key={offer.id} className="flex flex-wrap items-center justify-between gap-3 border border-[rgb(var(--sep-skin-c1,169_138_96))]/20 px-3 py-3 components_admin_store_post_purchase_offers_div_container">
            <div className="components_admin_store_post_purchase_offers_div_container_2"><p className="text-sm text-[rgb(var(--sep-skin-c1,169_138_96))] components_admin_store_post_purchase_offers_p_text">{offer.name}</p><p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-[rgb(var(--sep-skin-c2,211_194_170))] components_admin_store_post_purchase_offers_p_text_2">{offer.trigger_product_id ? `after ${productName.get(offer.trigger_product_id) ?? "product"}` : `after ${offer.trigger_category}`} · {discountName.get(offer.discount_code_template_id) ?? "discount"} · {offer.valid_for_days} days{offer.is_active ? " · active" : " · disabled"}</p></div>
            <AdminActionForm action={toggleStorePostPurchaseOffer} successMessage="Post-purchase offer updated."><input className="components_admin_store_post_purchase_offers_input_id" type="hidden" name="id" value={offer.id} /><input className="components_admin_store_post_purchase_offers_input_next" type="hidden" name="next" value={offer.is_active ? "false" : "true"} /><button className={[((button)), "components_admin_store_post_purchase_offers_button_action"].filter(Boolean).join(" ")}>{offer.is_active ? "Disable" : "Enable"}</button></AdminActionForm>
          </div>
        ))}
      </div>
    </section>
  );
}
