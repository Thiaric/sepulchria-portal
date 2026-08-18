SEPULCHRIA — MARKET BACK BUTTON + LIVE EXCHANGE COMPLETION

1. MARKET
Changes "← Back to Market" from plain link text to the same button styling used
by the ancestry slug Back to ancestries control.

2. ITEM EXCHANGE
Fixes the first confirmer being left with:
  "Your side is confirmed. Waiting for the other character."

When the second character confirms and the database marks the exchange
completed, the first character's already-open panel now detects that live
through the existing realtime/polling refresh and changes the message to:
  "Exchange completed successfully."

It also reports live cancellation if the other character cancels.

No SQL required.

Install from repository root:
  py .\market-back-exchange-live-completion\install.py
  npm run build
