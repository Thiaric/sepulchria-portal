import { redirect } from "next/navigation";

import {
  PortalSkinGallery,
  type AppearanceSkin,
} from "@/components/portal/portal-skin-gallery";
import { createClient } from "@/lib/supabase/server";

export default async function AppearancePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    skinsResult,
    entitlementsResult,
  ] = await Promise.all([
    supabase
      .from("portal_skins")
      .select(`
        id,
        slug,
        name,
        description,
        preview_image_url,
        price_pence,
        is_default,
        sort_order
      `)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),

    supabase
      .from("user_portal_skin_entitlements")
      .select("skin_id, enabled, source")
      .eq("user_id", user.id)
      .eq("enabled", true),
  ]);

  if (skinsResult.error) {
    throw new Error(
      `Unable to load portal skins: ${skinsResult.error.message}`,
    );
  }

  if (entitlementsResult.error) {
    throw new Error(
      `Unable to load portal skin access: ${entitlementsResult.error.message}`,
    );
  }

  const entitlements = new Map(
    (entitlementsResult.data ?? []).map((entry) => [
      String(entry.skin_id),
      entry.source as "paid" | "staff",
    ]),
  );

  const skins: AppearanceSkin[] =
    (skinsResult.data ?? []).map((entry) => ({
      id: String(entry.id),
      slug: String(entry.slug),
      name: String(entry.name),
      description: entry.description ?? "",
      previewImageUrl: entry.preview_image_url ?? null,
      pricePence: entry.price_pence ?? null,
      isDefault: entry.is_default === true,
      owned:
        entry.is_default === true ||
        entitlements.has(String(entry.id)),
      source:
        entitlements.get(String(entry.id)) ?? null,
    }));

  return (
    <main className="appearance_page_main_main">
      <div className="mx-auto max-w-5xl appearance_page_div_portal_appearance">
        

        <h1 className="mt-1 font-serif text-3xl text-[rgb(var(--sep-colour-ead5ac))] appearance_page_h1_portal_appearance">
          Portal Appearance
        </h1>

        <p className="mt-2 max-w-3xl text-xs leading-5 text-[rgb(var(--sep-colour-928674))] appearance_page_p_portal_appearance">
          Choose the appearance used throughout your Sepulchria
          portal. Premium skins belong to your account, so they
          remain available even if you create a different character.
        </p>

        <div className="mt-5 appearance_page_div_portal_appearance_2">
          <PortalSkinGallery skins={skins} />
        </div>
      </div>
    </main>
  );
}
