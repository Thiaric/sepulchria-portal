from pathlib import Path

ROOT = Path.cwd()
REL = "app/(portal)/game/export/route.ts"
path = ROOT / REL

if not path.exists():
    raise SystemExit(
        f"ERROR: Missing {REL}. Run this from the sepulchria-portal root."
    )

text = path.read_text(encoding="utf-8")

old = '''  /*
   * DICE / CHECK
   */
  if (
    message.message_type ===
      "dice_roll" ||
    message.message_type ===
      "attribute_check"
  ) {
    const naturalTwenty ='''

new = '''  /*
   * DICE / CHECK / GIFT USE
   */
  const isGiftUse =
    message.message_type ===
      "action" &&
    message.message.startsWith(
      '◆ used "',
    );

  if (
    message.message_type ===
      "dice_roll" ||
    message.message_type ===
      "attribute_check" ||
    isGiftUse
  ) {
    const naturalTwenty ='''

if old not in text:
    if "const isGiftUse =" in text:
        print("INFO: Export Gift styling is already installed.")
    else:
        raise SystemExit(
            "ERROR: Could not find the export roll renderer. No changes were made."
        )
else:
    text = text.replace(old, new, 1)
    path.write_text(text, encoding="utf-8")
    print("SUCCESS: updated", REL)

print()
print("Gift-use actions will now export using the same compact roll-style row as live chat.")
print("No SQL required.")
print("Now run: npm run build")
