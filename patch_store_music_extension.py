from pathlib import Path

ROOT = Path.cwd()


def read(path):
    return path.read_text(encoding="utf-8")


def write(path, text):
    path.write_text(text, encoding="utf-8")


def replace_once(path, old, new, label):
    text = read(path)
    if new in text:
        print(f"{label}: already applied")
        return
    if old not in text:
        raise SystemExit(f"{label}: expected block not found in {path}")
    write(path, text.replace(old, new, 1))
    print(f"{label}: patched")


# ------------------------------------------------------------
# Admin Store actions
# ------------------------------------------------------------
actions = ROOT / "app/(portal)/admin/store/actions.ts"

replace_once(
    actions,
    '''  const row = {
    product_id: str(formData, "product_id"),
    grant_type: grantType,
    portal_skin_id: grantType === "portal_skin" ? target : null,
    cosmetic_item_id: grantType === "cosmetic" ? target : null,
    feature_key: grantType === "feature" ? target : null,
  };''',
    '''  const row = {
    product_id: str(formData, "product_id"),
    grant_type: grantType,
    portal_skin_id: grantType === "portal_skin" ? target : null,
    cosmetic_item_id: grantType === "cosmetic" ? target : null,
    music_track_id: grantType === "music" ? target : null,
    feature_key: grantType === "feature" ? target : null,
  };''',
    "Music grant target",
)

text = read(actions)
if "export async function createMusicTrack" not in text:
    marker = 'export async function createStoreDiscount(formData: FormData) {'
    if marker not in text:
        raise SystemExit("Music actions marker not found")

    music_actions = '''export async function createMusicTrack(formData: FormData) {
  await requireAdminSection("store");
  const admin = createAdminClient();

  const slug = storeSlug(str(formData, "slug"));
  if (!slug) throw new Error("Enter a valid music track slug.");

  const { error } = await admin.from("music_tracks").insert({
    slug,
    name: str(formData, "name"),
    artist: str(formData, "artist"),
    description: str(formData, "description"),
    audio_url: str(formData, "audio_url"),
    preview_url: nullableStr(formData, "preview_url"),
    artwork_url: nullableStr(formData, "artwork_url"),
    is_active: bool(formData, "is_active"),
    sort_order: intOrNull(formData, "sort_order") ?? 0,
  });

  if (error) throw new Error(`Unable to create music track: ${error.message}`);
  refresh();
}

export async function deleteMusicTrack(formData: FormData) {
  await requireAdminSection("store");
  const admin = createAdminClient();

  const { error } = await admin
    .from("music_tracks")
    .delete()
    .eq("id", str(formData, "id"));

  if (error) throw new Error(`Unable to delete music track: ${error.message}`);
  refresh();
}

'''
    write(actions, text.replace(marker, music_actions + marker, 1))
    print("Music catalogue actions: added")


# ------------------------------------------------------------
# Admin Store page
# ------------------------------------------------------------
page = ROOT / "app/(portal)/admin/store/page.tsx"
text = read(page)

text = text.replace(
    "  addStoreGrant,\n  createStoreDiscount,",
    "  addStoreGrant,\n  createMusicTrack,\n  createStoreDiscount,",
    1,
)
text = text.replace(
    "  deleteStoreGrant,\n  deleteStorePrice,",
    "  deleteMusicTrack,\n  deleteStoreGrant,\n  deleteStorePrice,",
    1,
)

text = text.replace(
    "    cosmeticsResult,\n    discountsResult,",
    "    cosmeticsResult,\n    musicResult,\n    discountsResult,",
    1,
)
text = text.replace(
    '    admin.from("cosmetic_items").select("id, slug, name, category, is_active").order("category").order("name"),\n    admin.from("store_discount_codes")',
    '    admin.from("cosmetic_items").select("id, slug, name, category, is_active").order("category").order("name"),\n    admin.from("music_tracks").select("id, slug, name, artist, audio_url, is_active, sort_order").order("sort_order").order("name"),\n    admin.from("store_discount_codes")',
    1,
)
text = text.replace(
    "    cosmeticsResult,\n    discountsResult,\n  ]) {",
    "    cosmeticsResult,\n    musicResult,\n    discountsResult,\n  ]) {",
    1,
)
text = text.replace(
    "  const cosmetics = cosmeticsResult.data ?? [];\n  const discounts = discountsResult.data ?? [];",
    "  const cosmetics = cosmeticsResult.data ?? [];\n  const musicTracks = musicResult.data ?? [];\n  const discounts = discountsResult.data ?? [];",
    1,
)
text = text.replace(
    "  const cosmeticById = new Map(cosmetics.map((x) => [x.id, x.name]));",
    "  const cosmeticById = new Map(cosmetics.map((x) => [x.id, x.name]));\n  const musicById = new Map(musicTracks.map((x) => [x.id, x.name]));",
    1,
)

text = text.replace(
    '<option value="cosmetic">Cosmetic</option>\n                <option value="friend_list">Friend List</option>',
    '<option value="cosmetic">Cosmetic</option>\n                <option value="music">Music</option>\n                <option value="friend_list">Friend List</option>',
)
text = text.replace(
    '<option value="cosmetic">Cosmetic</option>\n                          <option value="friend_list">Friend List</option>',
    '<option value="cosmetic">Cosmetic</option>\n                          <option value="music">Music</option>\n                          <option value="friend_list">Friend List</option>',
)

text = text.replace(
    '''                                : grant.grant_type === "cosmetic"
                                  ? `Cosmetic · ${cosmeticById.get(grant.cosmetic_item_id) ?? grant.cosmetic_item_id}`
                                  : `Feature · ${grant.feature_key === "private_chat" ? "Private Location" : "Friend List"}`;''',
    '''                                : grant.grant_type === "cosmetic"
                                  ? `Cosmetic · ${cosmeticById.get(grant.cosmetic_item_id) ?? grant.cosmetic_item_id}`
                                  : grant.grant_type === "music"
                                    ? `Music · ${musicById.get(grant.music_track_id) ?? grant.music_track_id}`
                                    : `Feature · ${grant.feature_key === "private_chat" ? "Private Location" : "Friend List"}`;''',
    1,
)

feature_marker = '''                          <form action={addStoreGrant} className="grid gap-2 sm:grid-cols-[1fr_auto]">
                            <input type="hidden" name="product_id" value={product.id} />
                            <input type="hidden" name="grant_type" value="feature" />'''

if 'name="grant_type" value="music"' not in text:
    if feature_marker not in text:
        raise SystemExit("Music grant form marker not found")
    music_form = '''                          <form action={addStoreGrant} className="grid gap-2 sm:grid-cols-[1fr_auto]">
                            <input type="hidden" name="product_id" value={product.id} />
                            <input type="hidden" name="grant_type" value="music" />
                            <select name="target" className={field}>
                              {musicTracks.filter((x) => x.is_active).map((track) => (
                                <option key={track.id} value={track.id}>
                                  {track.name}{track.artist ? ` · ${track.artist}` : ""}
                                </option>
                              ))}
                            </select>
                            <button className={button}>Add music</button>
                          </form>

'''
    text = text.replace(feature_marker, music_form + feature_marker, 1)

if 'id="store-music"' not in text:
    marker = '        <section id="store-discounts"'
    if marker not in text:
        raise SystemExit("Music catalogue section marker not found")

    music_section = '''        <section id="store-music" className="mt-6 scroll-mt-6 border border-[rgb(var(--sep-skin-c1,169_138_96))]/30 bg-[rgb(var(--sep-colour-15100d))] p-4 sm:p-5">
          <h3 className="font-serif text-2xl text-[rgb(var(--sep-skin-c1,169_138_96))]">
            Music catalogue
          </h3>

          <p className="mt-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))]">
            Create tracks here, then attach them to Store products or bundles.
          </p>

          <form action={createMusicTrack} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label>
              <span className={label}>Name</span>
              <input name="name" required className={field} />
            </label>
            <label>
              <span className={label}>Slug</span>
              <input name="slug" required placeholder="echoes-of-aureth" className={field} />
            </label>
            <label>
              <span className={label}>Artist</span>
              <input name="artist" className={field} />
            </label>
            <label>
              <span className={label}>Sort</span>
              <input name="sort_order" type="number" defaultValue="0" className={field} />
            </label>

            <label className="md:col-span-2">
              <span className={label}>Audio URL</span>
              <input name="audio_url" required placeholder="/music/track.mp3 or https://..." className={field} />
            </label>
            <label>
              <span className={label}>Preview URL</span>
              <input name="preview_url" className={field} />
            </label>
            <label>
              <span className={label}>Artwork URL</span>
              <input name="artwork_url" className={field} />
            </label>

            <label className="md:col-span-2 xl:col-span-4">
              <span className={label}>Description</span>
              <textarea name="description" rows={2} className={field} />
            </label>

            <label className="flex items-center gap-2 text-xs text-[rgb(var(--sep-skin-c2,211_194_170))]">
              <input name="is_active" type="checkbox" defaultChecked />
              Active
            </label>

            <div className="md:col-span-2 xl:col-span-4">
              <button className={button}>Create music track</button>
            </div>
          </form>

          <div className="mt-5 space-y-2">
            {musicTracks.map((track) => (
              <div key={track.id} className="flex flex-wrap items-center justify-between gap-3 border border-[rgb(var(--sep-skin-c1,169_138_96))]/20 bg-[rgb(var(--sep-colour-120e0b))] p-3">
                <div>
                  <p className="font-serif text-base text-[rgb(var(--sep-skin-c1,169_138_96))]">
                    {track.name}{track.artist ? ` · ${track.artist}` : ""}
                  </p>
                  <p className="mt-1 text-[8px] text-[rgb(var(--sep-skin-c2,211_194_170))]">
                    {track.audio_url}
                  </p>
                </div>
                <form action={deleteMusicTrack}>
                  <input type="hidden" name="id" value={track.id} />
                  <button className={dangerButton}>Delete</button>
                </form>
              </div>
            ))}
          </div>
        </section>

'''
    text = text.replace(marker, music_section + marker, 1)

write(page, text)
print("Admin Store music support: patched")


# ------------------------------------------------------------
# Player Store page (Phase 3 must already be installed)
# ------------------------------------------------------------
player = ROOT / "app/(portal)/store/page.tsx"
if not player.exists():
    raise SystemExit("Player Store page not found. Run the Phase 3 Store patch first.")

text = read(player)

text = text.replace(
    '    | "cosmetic"\n    | "friend_list"',
    '    | "cosmetic"\n    | "music"\n    | "friend_list"',
    1,
)
text = text.replace(
    '  grant_type: "portal_skin" | "cosmetic" | "feature";',
    '  grant_type: "portal_skin" | "cosmetic" | "music" | "feature";',
    1,
)
text = text.replace(
    '  cosmetic_item_id: string | null;\n  feature_key:',
    '  cosmetic_item_id: string | null;\n  music_track_id: string | null;\n  feature_key:',
    1,
)
text = text.replace(
    '  cosmetic: "Cosmetics",\n  friend_list: "Friend List",',
    '  cosmetic: "Cosmetics",\n  music: "Music",\n  friend_list: "Friend List",',
    1,
)

text = text.replace(
    '''type Cosmetic = {
  id: string;
  name: string;
  category: string;
};''',
    '''type Cosmetic = {
  id: string;
  name: string;
  category: string;
};

type MusicTrack = {
  id: string;
  name: string;
  artist: string;
};''',
    1,
)

text = text.replace(
    '    cosmeticsResult,\n    skinEntitlementsResult,',
    '    cosmeticsResult,\n    musicResult,\n    skinEntitlementsResult,',
    1,
)
text = text.replace(
    '    cosmeticEntitlementsResult,\n    featureEntitlementsResult,',
    '    cosmeticEntitlementsResult,\n    musicEntitlementsResult,\n    featureEntitlementsResult,',
    1,
)
text = text.replace(
    '"id, product_id, grant_type, portal_skin_id, cosmetic_item_id, feature_key"',
    '"id, product_id, grant_type, portal_skin_id, cosmetic_item_id, music_track_id, feature_key"',
    1,
)
text = text.replace(
    '''    supabase
      .from("cosmetic_items")
      .select("id, name, category"),

    supabase
      .from("user_portal_skin_entitlements")''',
    '''    supabase
      .from("cosmetic_items")
      .select("id, name, category"),

    supabase
      .from("music_tracks")
      .select("id, name, artist")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),

    supabase
      .from("user_portal_skin_entitlements")''',
    1,
)
text = text.replace(
    '''    character
      ? supabase
          .from("character_feature_entitlements")''',
    '''    character
      ? supabase
          .from("character_music_entitlements")
          .select("music_track_id")
          .eq("character_id", character.id)
          .eq("enabled", true)
      : Promise.resolve({ data: [], error: null }),

    character
      ? supabase
          .from("character_feature_entitlements")''',
    1,
)
text = text.replace(
    '    cosmeticsResult,\n    skinEntitlementsResult,\n    cosmeticEntitlementsResult,\n    featureEntitlementsResult,',
    '    cosmeticsResult,\n    musicResult,\n    skinEntitlementsResult,\n    cosmeticEntitlementsResult,\n    musicEntitlementsResult,\n    featureEntitlementsResult,',
    1,
)

text = text.replace(
    '''  const cosmetics =
    (cosmeticsResult.data ?? []) as Cosmetic[];

  const ownedSkinIds''',
    '''  const cosmetics =
    (cosmeticsResult.data ?? []) as Cosmetic[];

  const musicTracks =
    (musicResult.data ?? []) as MusicTrack[];

  const ownedSkinIds''',
    1,
)
text = text.replace(
    '  const ownedFeatures = new Set(',
    '''  const ownedMusicIds = new Set(
    (musicEntitlementsResult.data ?? []).map(
      (entry) => entry.music_track_id,
    ),
  );

  const ownedFeatures = new Set(''',
    1,
)
text = text.replace(
    '''  const cosmeticNames = new Map(
    cosmetics.map((item) => [item.id, item.name]),
  );''',
    '''  const cosmeticNames = new Map(
    cosmetics.map((item) => [item.id, item.name]),
  );

  const musicNames = new Map(
    musicTracks.map((track) => [
      track.id,
      track.artist ? `${track.name} · ${track.artist}` : track.name,
    ]),
  );''',
    1,
)
text = text.replace(
    '''      if (
        grant.grant_type === "feature" &&''',
    '''      if (
        grant.grant_type === "music" &&
        grant.music_track_id
      ) {
        return ownedMusicIds.has(grant.music_track_id);
      }

      if (
        grant.grant_type === "feature" &&''',
    1,
)

text = text.replace(
    '                    cosmeticNames={cosmeticNames}\n                    featured',
    '                    cosmeticNames={cosmeticNames}\n                    musicNames={musicNames}\n                    featured',
    1,
)
text = text.replace(
    '                    cosmeticNames={cosmeticNames}\n                  />',
    '                    cosmeticNames={cosmeticNames}\n                    musicNames={musicNames}\n                  />',
    1,
)
text = text.replace(
    '  cosmeticNames,\n  featured = false,',
    '  cosmeticNames,\n  musicNames,\n  featured = false,',
    1,
)
text = text.replace(
    '  cosmeticNames: Map<string, string>;\n  featured?: boolean;',
    '  cosmeticNames: Map<string, string>;\n  musicNames: Map<string, string>;\n  featured?: boolean;',
    1,
)
text = text.replace(
    '''    if (
      grant.grant_type === "feature"
    ) {''',
    '''    if (
      grant.grant_type === "music" &&
      grant.music_track_id
    ) {
      return musicNames.get(grant.music_track_id) ?? "Music";
    }

    if (
      grant.grant_type === "feature"
    ) {''',
    1,
)

write(player, text)
print("Player Store music support: patched")

print("DONE. Now run sepulchria_store_music_migration.sql in Supabase SQL Editor.")
