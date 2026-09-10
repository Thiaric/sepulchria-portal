import {
  CosmeticsFeatureManager,
  type CosmeticAdminRow,
} from "@/components/admin/cosmetics-feature-manager";
import { requireAdminSection } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminCosmeticsPage() {
  await requireAdminSection("cosmetics");
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("cosmetic_items")
    .select("id, slug, name, description, category, preview_image_url, asset_url, preview_storage_path, asset_storage_path, config_json, is_active, sort_order, created_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Unable to load Cosmetics: ${error.message}`);
  }

  return (
    <main className="p-5 sm:p-7 lg:p-9 admin_cosmetics_page_main_main">
      <div className="mx-auto max-w-7xl admin_cosmetics_page_div_cosmetics">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))] admin_cosmetics_page_p_cosmetics">
          Administration
        </p>
        <h2 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))] admin_cosmetics_page_h2_cosmetics">
          Cosmetics
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-colour-a99b89))] admin_cosmetics_page_p_cosmetics_2">
          Manage collectible visual treatments for character sheets and location chat.
          Store pricing and Stripe fulfilment are managed through the Store system.
        </p>
        <CosmeticsFeatureManager initialItems={(data ?? []) as CosmeticAdminRow[]} />
      </div>
    </main>
  );
}
