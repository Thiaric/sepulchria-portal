from pathlib import Path

ROOT = Path.cwd()

actions = ROOT / "app/(portal)/admin/store/actions.ts"
page = ROOT / "app/(portal)/admin/store/page.tsx"

for path in (actions, page):
    if not path.exists():
        raise SystemExit(f"Missing file: {path}")

# ------------------------------------------------------------
# Add catalogue sync action
# ------------------------------------------------------------
text = actions.read_text(encoding="utf-8")

if "export async function syncExistingPremiumCatalogueToStore" not in text:
    marker = 'export async function createStoreProduct(formData: FormData) {'
    if marker not in text:
        raise SystemExit("Could not find createStoreProduct in Store actions.")

    sync_action = r'''function catalogueProductSlug(prefix: string, value: string) {
  const base = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!base) {
    throw new Error(`Unable to build Store slug for ${prefix}.`);
  }

  return `${prefix}-${base}`;
}

export async function syncExistingPremiumCatalogueToStore() {
  await requireAdminSection("store");
  const admin = createAdminClient();

  const [
    skinsResult,
    cosmeticsResult,
    musicResult,
  ] = await Promise.all([
    admin
      .from("portal_skins")
      .select(
        "id, slug, name, description, preview_image_url, is_default, is_active, sort_order",
      )
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),

    admin
      .from("cosmetic_items")
      .select(
        "id, slug, name, description, category, preview_image_url, asset_url, is_active, sort_order",
      )
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),

    admin
      .from("music_tracks")
      .select(
        "id, track_key, name, description, is_active, is_personal_selectable, sort_order",
      )
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  for (const result of [
    skinsResult,
    cosmeticsResult,
    musicResult,
  ]) {
    if (result.error) {
      throw new Error(
        `Unable to read premium catalogue: ${result.error.message}`,
      );
    }
  }

  async function upsertProduct(input: {
    slug: string;
    name: string;
    description: string;
    imageUrl: string | null;
    category:
      | "skin"
      | "cosmetic"
      | "music"
      | "friend_list"
      | "private_location";
    isActive: boolean;
    sortOrder: number;
  }) {
    const { data, error } = await admin
      .from("store_products")
      .upsert(
        {
          slug: input.slug,
          name: input.name,
          description: input.description,
          image_url: input.imageUrl,
          product_type: "single",
          category: input.category,
          is_active: input.isActive,
          is_featured: false,
          sort_order: input.sortOrder,
        },
        {
          onConflict: "slug",
        },
      )
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(
        `Unable to sync Store product "${input.name}": ${
          error?.message ?? "No product returned."
        }`,
      );
    }

    return String(data.id);
  }

  async function ensureGrant(input: {
    productId: string;
    grantType:
      | "portal_skin"
      | "cosmetic"
      | "music"
      | "feature";
    portalSkinId?: string;
    cosmeticItemId?: string;
    musicTrackId?: string;
    featureKey?: "friend_list" | "private_chat";
  }) {
    let query = admin
      .from("store_product_grants")
      .select("id")
      .eq("product_id", input.productId)
      .eq("grant_type", input.grantType);

    if (input.portalSkinId) {
      query = query.eq("portal_skin_id", input.portalSkinId);
    }

    if (input.cosmeticItemId) {
      query = query.eq("cosmetic_item_id", input.cosmeticItemId);
    }

    if (input.musicTrackId) {
      query = query.eq("music_track_id", input.musicTrackId);
    }

    if (input.featureKey) {
      query = query.eq("feature_key", input.featureKey);
    }

    const { data: existing, error: existingError } =
      await query.maybeSingle();

    if (existingError) {
      throw new Error(
        `Unable to check Store grant: ${existingError.message}`,
      );
    }

    if (existing) {
      return;
    }

    const { error } = await admin
      .from("store_product_grants")
      .insert({
        product_id: input.productId,
        grant_type: input.grantType,
        portal_skin_id: input.portalSkinId ?? null,
        cosmetic_item_id: input.cosmeticItemId ?? null,
        music_track_id: input.musicTrackId ?? null,
        feature_key: input.featureKey ?? null,
      });

    if (error) {
      throw new Error(
        `Unable to create Store grant: ${error.message}`,
      );
    }
  }

  for (const skin of skinsResult.data ?? []) {
    if (skin.is_default === true) {
      continue;
    }

    const productId = await upsertProduct({
      slug: catalogueProductSlug(
        "skin",
        String(skin.slug),
      ),
      name: String(skin.name),
      description: skin.description ?? "",
      imageUrl: skin.preview_image_url ?? null,
      category: "skin",
      isActive: skin.is_active === true,
      sortOrder: 1000 + Number(skin.sort_order ?? 0),
    });

    await ensureGrant({
      productId,
      grantType: "portal_skin",
      portalSkinId: String(skin.id),
    });
  }

  for (const cosmetic of cosmeticsResult.data ?? []) {
    const productId = await upsertProduct({
      slug: catalogueProductSlug(
        "cosmetic",
        String(cosmetic.slug),
      ),
      name: String(cosmetic.name),
      description: cosmetic.description ?? "",
      imageUrl:
        cosmetic.preview_image_url ??
        cosmetic.asset_url ??
        null,
      category: "cosmetic",
      isActive: cosmetic.is_active === true,
      sortOrder:
        2000 + Number(cosmetic.sort_order ?? 0),
    });

    await ensureGrant({
      productId,
      grantType: "cosmetic",
      cosmeticItemId: String(cosmetic.id),
    });
  }

  for (const track of musicResult.data ?? []) {
    const productId = await upsertProduct({
      slug: catalogueProductSlug(
        "music",
        String(track.track_key),
      ),
      name: String(track.name),
      description: track.description ?? "",
      imageUrl: null,
      category: "music",
      isActive:
        track.is_active === true &&
        track.is_personal_selectable === true,
      sortOrder:
        3000 + Number(track.sort_order ?? 0),
    });

    await ensureGrant({
      productId,
      grantType: "music",
      musicTrackId: String(track.id),
    });
  }

  const friendListProductId =
    await upsertProduct({
      slug: "friend-list",
      name: "Friend List",
      description:
        "Unlock your character's Friend List and relationship features.",
      imageUrl: "/icons/friends.png",
      category: "friend_list",
      isActive: true,
      sortOrder: 4000,
    });

  await ensureGrant({
    productId: friendListProductId,
    grantType: "feature",
    featureKey: "friend_list",
  });

  const privateLocationProductId =
    await upsertProduct({
      slug: "private-location",
      name: "Private Location",
      description:
        "Unlock the ability to create and manage an invitation-only Private Location.",
      imageUrl: "/icons/private.png",
      category: "private_location",
      isActive: true,
      sortOrder: 4010,
    });

  await ensureGrant({
    productId: privateLocationProductId,
    grantType: "feature",
    featureKey: "private_chat",
  });

  refresh();
}

'''

    actions.write_text(
        text.replace(marker, sync_action + marker, 1),
        encoding="utf-8",
    )
    print("Catalogue sync action: added")
else:
    print("Catalogue sync action: already present")

# ------------------------------------------------------------
# Add sync action import + panel to Admin Store page
# ------------------------------------------------------------
text = page.read_text(encoding="utf-8")

if "syncExistingPremiumCatalogueToStore" not in text:
    candidate = '  saveStorePrice,\n'
    if candidate not in text:
        candidate = '  createStoreProduct,\n'
    if candidate not in text:
        raise SystemExit(
            "Could not add sync action import to Admin Store page."
        )
    text = text.replace(
        candidate,
        candidate + "  syncExistingPremiumCatalogueToStore,\n",
        1,
    )

if 'id="store-catalogue-sync"' not in text:
    anchor = '<section id="store-create-product"'
    idx = text.find(anchor)
    if idx == -1:
        raise SystemExit(
            "Could not find Create product section in Admin Store page."
        )

    panel = r'''<section
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

            <form action={syncExistingPremiumCatalogueToStore}>
              <button className={button}>
                Sync catalogue to Store
              </button>
            </form>
          </div>
        </section>

        '''

    text = text[:idx] + panel + text[idx:]

page.write_text(text, encoding="utf-8")
print("Admin Store sync panel: added")

print(
    "DONE. Open /admin/store and click 'Sync catalogue to Store'. "
    "The sync is idempotent and does not touch prices."
)
