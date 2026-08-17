SEPULCHRIA — ITEM BONUS DISPLAY + MOBILE EQUIPMENT FIX

Built against the current pushed master.

WHY BONUSES WERE MISSING
The current Item admin system allows effect trigger types:
- owned
- equipped
- use

For non-use effects, effect_mode is passive.

The Inventory display helper was incorrectly looking for:
  trigger_type === "passive"

That trigger type does not exist, so equipment_bonuses was always empty.

THIS FIX
- Equipment bonus extraction now reads trigger_type = equipped
  together with effect_mode = passive.
- Regular Inventory Item cards now show Equipment bonuses.
- The Equipment slot candidate picker now receives and shows those bonuses too.
- The mobile human silhouette is removed completely.
- The desktop human silhouette remains unchanged.

NO SQL REQUIRED.

INSTALL
1. Extract into the repository root.
2. Run:
   py .\item-bonuses-mobile-equipment-fix\install.py
3. Run:
   npm run build
4. Restart dev if necessary.
