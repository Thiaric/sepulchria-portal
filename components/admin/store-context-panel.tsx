"use client";

function jumpTo(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

const button =
  "w-full border border-[rgb(var(--sep-skin-c1,169_138_96))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-skin-c2,211_194_170))] transition hover:border-[rgb(var(--sep-skin-c1,169_138_96))] hover:text-[rgb(var(--sep-skin-c1,169_138_96))]";

export function StoreContextPanel() {
  return (
    <div className="flex h-full min-h-0 flex-col components_admin_store_context_panel_div_sepulchria_store">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-skin-c2,211_194_170))] components_admin_store_context_panel_p_sepulchria_store">
        Store administration
      </p>
      <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-skin-c1,169_138_96))] components_admin_store_context_panel_h2_sepulchria_store">
        Sepulchria Store
      </h2>
      <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-skin-c2,211_194_170))] components_admin_store_context_panel_p_sepulchria_store_2">
        Jump between catalogue creation, product configuration and discounts.
      </p>

      <div className="mt-4 space-y-2 components_admin_store_context_panel_div_sepulchria_store_2">
        <button type="button" className={[((button)), "components_admin_store_context_panel_button_create_product"].filter(Boolean).join(" ")} onClick={() => jumpTo("store-create-product")}>
          Create Product
        </button>
        <button type="button" className={[((button)), "components_admin_store_context_panel_button_products_bundles"].filter(Boolean).join(" ")} onClick={() => jumpTo("store-products")}>
          Products & Bundles
        </button>
        <button type="button" className={[((button)), "components_admin_store_context_panel_button_discount_codes"].filter(Boolean).join(" ")} onClick={() => jumpTo("store-discounts")}>
          Discount Codes
        </button>
      </div>
    </div>
  );
}
