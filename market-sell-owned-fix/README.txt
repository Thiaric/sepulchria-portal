MARKET SELL — OWNED QUANTITY FIX

Cause:
get_public_character_inventory() does NOT return item_active.

The Market shop page treated item_active as if it came from that RPC and then
filtered on !row.item_active. Because the actual value was undefined, every
owned Item was rejected, so every listing appeared to have 0 sellable copies.

The SQL sell function made the same incorrect assumption.

Fix:
1. Run 01_FIX_MARKET_SELL.sql in Supabase SQL Editor.
2. Extract this folder into repository root.
3. Run:
   py .\market-sell-owned-fix\install.py
   npm run build

No data migration required.
