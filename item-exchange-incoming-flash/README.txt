SEPULCHRIA — INCOMING ITEM EXCHANGE FLASH

Built as a small follow-up to the Phase 11 live Item Exchange UX.

BEHAVIOUR
- Character 1 opens Item Exchange and starts an exchange with Character 2.
- Character 1 remains normal.
- Character 2's Item Exchange button begins pulsing with a gold glow.
- The alert is driven by the existing open item_trades row and Supabase Realtime.
- It stops when the exchange is no longer open (completed or cancelled).
- While Character 2 has the Item Exchange panel open, the button uses the normal active style.
- If the panel is closed while the exchange is still pending, the button pulses again.

NO NEW SQL IS REQUIRED
This relies on item_trades already being enabled for Supabase Realtime by the
Phase 11 UX fix.

INSTALL
1. Extract this folder into the repository root.
2. From the repository root run:

   py .\item-exchange-incoming-flash\install.py

3. Run:

   npm run build

4. Restart dev if needed.
