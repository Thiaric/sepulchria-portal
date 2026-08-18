SEPULCHRIA — PRE-3C FIXES

1. INSTANT CHAT
The dock was querying ASCENDING and then LIMIT 200. After 200 messages it kept
loading the oldest 200, so newly sent messages disappeared from view.
Now it loads the newest 200 and reverses them for chronological display.

2. ORDER LEVELS
Canonical hierarchy is 1..6.
The SQL migrates legacy 0..5 IN PLACE, preserving order_level IDs and therefore
all Role/membership references. It also replaces the legacy auto-generator and
prevents Level 0 from returning.

3. MARKET
The lower-right of the shop header now shows AVAILABLE REMNANTS and the current
character wallet balance.

INSTALL
1. Run 01_ORDER_LEVELS_1_TO_6.sql in Supabase.
2. Extract this folder into repository root.
3. Run:
   py .\pre-3c-chat-orders-market\install.py
   npm run build

3C = Give Remnants directly to another Character in the same Location, with
atomic debit/credit and immutable ledger records for both Characters.
