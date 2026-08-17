SEPULCHRIA — D4.2 PLAYER CONTAINER MOVEMENT

INSTALL
1. Run D4_2_RUN_IN_SUPABASE.sql in Supabase SQL Editor.
2. From repository root:
   py .\d4-2-container-moves\install.py
3. Run:
   npm run build

ADDS
- Player can move their own Item from Loose Inventory into an owned Container.
- Player can move an Item from a Container back to Loose Inventory.
- Player can move an Item directly between owned Containers.
- Standard and Unique Items both work.
- Container capacity is enforced.
- Containers themselves cannot be nested.
- Moving an equipped Item into a Container automatically unequips it through D4.
- Public character sheets remain read-only.


UPDATED EQUIP BEHAVIOUR
- If every configured requirement is met, the owner sees Equip.
- If one or more requirements are not met, Equip is not rendered at all.
- Instead the Item card shows:
    "<CharacterName> does not meet the requirements to equip this Item."
- This prevents the persistent server-action error banner caused by clicking
  Equip on an ineligible Item.
- Already-equipped Items still show Unequip.
