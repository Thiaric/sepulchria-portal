from pathlib import Path
import json

ROOT = Path.cwd()
HERE = Path(__file__).resolve().parent

if not (ROOT / "package.json").exists():
    raise SystemExit("ERROR: Run from the sepulchria-portal repository root.")

page = ROOT / "app/(portal)/market/[slug]/page.tsx"
actions = ROOT / "app/(portal)/market/actions.ts"
client = ROOT / "components/market/market-catalogue.tsx"

for target in (page, actions, client):
    if not target.exists():
        raise SystemExit(f"ERROR: Missing {target.relative_to(ROOT)}")

text = page.read_text(encoding="utf-8")

inventory_block = r'''  const { data: inventoryRows } = character
    ? await supabase.rpc(
        "get_public_character_inventory",
        {
          p_character_id: character.id,
        },
      )
    : { data: [] };

  const sellableByItem = new Map<string, number>();

  for (
    const row of
      (inventoryRows ?? []) as Array<{
        record_kind: string;
        item_id: string;
        quantity: number;
        parent_container_id: string | null;
        is_equipped: boolean;
        transfer_policy: string;
        is_quest_item: boolean;
        item_active: boolean;
      }>
  ) {
    if (
      row.record_kind !== "standard" ||
      row.parent_container_id ||
      row.is_equipped ||
      row.transfer_policy !== "free" ||
      row.is_quest_item ||
      !row.item_active
    ) {
      continue;
    }

    sellableByItem.set(
      row.item_id,
      (sellableByItem.get(row.item_id) ?? 0) +
        Number(row.quantity ?? 0),
    );
  }

'''

if "const sellableByItem = new Map<string, number>();" not in text:
    marker = '''  const { data, error } = await supabase
    .from("market_listings")
'''
    if marker not in text:
        raise SystemExit("ERROR: Could not find catalogue query in market/[slug]/page.tsx.")
    text = text.replace(marker, inventory_block + marker, 1)

if "owned_sellable_quantity:" not in text:
    marker = '''        stock_quantity: listing.stock_quantity === null ? null : Number(listing.stock_quantity),
        item: {
'''
    replacement = '''        stock_quantity: listing.stock_quantity === null ? null : Number(listing.stock_quantity),
        owned_sellable_quantity: sellableByItem.get(item.id) ?? 0,
        item: {
'''
    if marker not in text:
        raise SystemExit("ERROR: Could not find current catalogue mapping in market/[slug]/page.tsx.")
    text = text.replace(marker, replacement, 1)

page.write_text(text, encoding="utf-8")

text = actions.read_text(encoding="utf-8")
append = (HERE / "actions-append.txt").read_text(encoding="utf-8")
if "export async function sellMarketListing(" not in text:
    actions.write_text(text.rstrip() + "\n" + append, encoding="utf-8")

text = client.read_text(encoding="utf-8")
patches = json.loads((HERE / "patches-client.json").read_text(encoding="utf-8"))

for patch in patches:
    if patch["new"] in text:
        continue
    if patch["old"] not in text:
        raise SystemExit(f"ERROR: Could not find current block: {patch['label']}")
    text = text.replace(patch["old"], patch["new"], 1)

ui = json.loads((HERE / "sell-ui.json").read_text(encoding="utf-8"))
if ui["new"] not in text:
    if ui["old"] not in text:
        raise SystemExit("ERROR: Could not find current Buy action block for Sell UI.")
    text = text.replace(ui["old"], ui["new"], 1)

client.write_text(text, encoding="utf-8")

print("SUCCESS")
print("Economy 3B Market Sell installed against the exact current shop page.")
print("If 01_MARKET_SELL.sql was already run successfully, DO NOT run it again.")
print("Now run: npm run build")
