SEPULCHRIA — CHAT UTILITY PANELS
Built specifically for Inventory Phase 9.

NO SQL REQUIRED.

The chat composer becomes much cleaner.

Normal view:
- textarea
- character count / status
- Send Action
- one compact utility-button row

Utility buttons:
- Whisper
- Roll Dice
- Use Attributes
- Use Feat
- Use Items

Each button replaces the normal textarea with its own dedicated panel.
Every panel has Back to Chat.

Whisper:
- target dropdown
- dedicated whisper textarea
- uses the existing whisper action/presence validation

Roll Dice:
- die selector
- Roll Dice

Use Attributes:
- check selector
- shows current effective score
- Use Attribute

Use Feat:
- Feat selector
- description/status/duration/cooldown
- Use or Activate Feat

Use Items:
- preserves the Inventory Phase 9 Item-use panel
- Item selector
- target selector
- effects
- charges/cooldown
- Use Item

INSTALL
1. Extract into the repository root.
2. Run:
   py .\chat-utility-panels-phase9\install.py
3. Run:
   npm run build
4. Restart dev if needed.
