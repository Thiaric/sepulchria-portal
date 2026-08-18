SEPULCHRIA — ECONOMY 3A: MARKET BUY + CURRENCY SYMBOL

This phase does two things.

1. CENTRAL CURRENCY DISPLAY
Creates:
  lib/economy/currency.ts

The canonical currency symbol is now:
  🝈

Current economy UI is migrated to the shared formatter:
- Market prices
- Market filters
- Market buyback display
- Character Remnants wallet
- Character ledger
- Admin character Remnants
- Admin ledger
- Odd Jobs current pay
- Odd Jobs starting pay
- Odd Jobs wallet / claimed pay

Future economy UI should import formatRemnants() instead of hard-coding a symbol.

2. ATOMIC MARKET BUYING
Adds a real Buy control to each Market Item:
- Quantity 1–99
- Live total
- Insufficient-Remnants check
- Finite-stock check
- Buying... pending state
- Inline success/error
- Refreshes wallet and stock after success

DATABASE GUARANTEES
market_buy_listing() performs one PostgreSQL transaction:
  lock listing
  validate approved character
  validate shop/listing/item
  verify stock
  debit wallet
  immutable Remnant ledger entry
  create/stack Inventory Item
  decrement finite stock
  immutable Market transaction record

If ANY step fails, everything rolls back.

Containers are handled correctly by creating owned Item instances instead of
ordinary character_items records, because containers need individual identity.

INSTALL ORDER

1. Supabase SQL Editor:
   Run ALL of:
     01_MARKET_PURCHASES.sql

2. Extract this folder into repository root.

3. Run:
   py .\economy-3a-market-buy\install.py
   npm run build

TEST
- Character starts with enough Remnants.
- Buy 1 unlimited-stock Item.
- Verify wallet decreases exactly by price.
- Verify Item appears in Inventory.
- Verify ledger contains Market purchase.
- Buy quantity >1 of a stackable Item.
- Verify normal max-stack rules are respected.
- Test finite stock and confirm it decreases.
- Try buying more stock than remains: nothing changes.
- Try buying something unaffordable: nothing changes.
- Rapid/double purchase requests should serialize safely via DB locks.
- If you have a Container listed, buying it should create an individual owned
  container instance.

NEXT
Economy 3B — atomic selling / shop buyback, using the same Market transaction
ledger and existing Inventory safety rules.
