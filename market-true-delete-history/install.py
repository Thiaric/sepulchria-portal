from pathlib import Path

ROOT = Path.cwd()
if not (ROOT / "package.json").exists():
    raise SystemExit("ERROR: Run from repository root.")

actions = ROOT / "app/(portal)/admin/market/actions.ts"
page = ROOT / "app/(portal)/admin/market/page.tsx"

text = actions.read_text(encoding="utf-8")
old = '''export async function deactivateMarketListing(formData: FormData) {
  await requireStaff();

  const listingId = text(formData, "listingId");
  if (!listingId) throw new Error("Listing is required.");

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("market_listings")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", listingId);

  if (error) throw new Error(error.message);

  refreshMarket();
}
'''
new = '''export async function removeMarketListing(formData: FormData) {
  await requireStaff();

  const listingId = text(formData, "listingId");
  if (!listingId) throw new Error("Listing is required.");

  const supabase = createAdminClient();

  const { data: listing, error: listingError } = await supabase
    .from("market_listings")
    .select("id, shop:market_shops(slug)")
    .eq("id", listingId)
    .maybeSingle();

  if (listingError) throw new Error(listingError.message);
  if (!listing) throw new Error("Market listing not found.");

  const shop = Array.isArray(listing.shop)
    ? listing.shop[0] ?? null
    : listing.shop;

  const { error } = await supabase
    .from("market_listings")
    .delete()
    .eq("id", listingId);

  if (error) throw new Error(error.message);

  refreshMarket();

  if (shop?.slug) {
    revalidatePath(`/market/${shop.slug}`);
  }
}
'''

if new not in text:
    if old not in text:
        raise SystemExit("ERROR: deactivateMarketListing block not found.")
    text = text.replace(old, new, 1)

actions.write_text(text, encoding="utf-8")

text = page.read_text(encoding="utf-8")
text = text.replace("  deactivateMarketListing,\n", "  removeMarketListing,\n", 1)
text = text.replace("formAction={deactivateMarketListing}", "formAction={removeMarketListing}", 1)
page.write_text(text, encoding="utf-8")

print("SUCCESS")
print("Admin Market Remove now truly deletes listings.")
print("Run SQL first, then npm run build.")
