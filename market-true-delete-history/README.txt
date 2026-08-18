TRUE MARKET DELETE + IMMUTABLE HISTORY

1. Run 01_MARKET_TRUE_DELETE_HISTORY.sql in Supabase.
2. Extract this folder into repository root.
3. Run:
   py .\market-true-delete-history\install.py
   npm run build

The live market_listings row can now be deleted.
market_transactions keeps permanent Shop/Item snapshots and listing_id becomes
nullable with ON DELETE SET NULL, while the Remnant ledger remains untouched.
