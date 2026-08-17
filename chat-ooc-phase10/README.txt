SEPULCHRIA — OOC CHAT + ROLE EXPORT
Built for Inventory Phase 10.

NO SQL REQUIRED.

Any room message whose text begins with // is recognised as an Out-of-Character
message when it is displayed.

LIVE CHAT
- keeps the literal // exactly as typed
- adds "OUT OF CHARACTER MESSAGE" above the message
- gives the row a blue/slate background and left border
- existing old // messages receive the styling automatically
- if a // message is also a whisper, both labels are shown

ROLE EXPORT
- keeps the literal //
- adds "OUT OF CHARACTER MESSAGE"
- uses matching blue/slate styling in the exported HTML
- OOC whispers retain both the OOC and Whisper labels

Nothing about storage or message submission changes.

INSTALL
1. Extract into the repository root.
2. Run:
   py .\chat-ooc-phase10\install.py
3. Run:
   npm run build
4. Restart dev if needed.
