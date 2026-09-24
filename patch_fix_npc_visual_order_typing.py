from pathlib import Path
import sys

ROOT = Path.cwd()
TARGET = ROOT / "components/characters/character-order-identity.tsx"

def fail(message: str) -> None:
    print(f"\nERROR: {message}")
    sys.exit(1)

if not TARGET.exists():
    fail(f"Missing expected file: {TARGET}")

text = TARGET.read_text(encoding="utf-8")

old = '''        if (npcOrderError) {
          console.error(
            "Unable to load NPC visual Order:",
            npcOrderError.message,
          );
        } else if (npcOrderData) {
          relation = {
            id:
              String(
                npcOrderData.id,
              ),
            name:
              String(
                npcOrderData.name,
              ),
            slug:
              String(
                npcOrderData.slug,
              ),
            icon_url:
              npcOrderData.icon_url
                ? String(
                    npcOrderData.icon_url,
                  )
                : null,
            colour:
              npcOrderData.colour
                ? String(
                    npcOrderData.colour,
                  )
                : null,
          };
        }
'''

new = '''        if (npcOrderError) {
          console.error(
            "Unable to load NPC visual Order:",
            npcOrderError.message,
          );
        } else if (npcOrderData) {
          const npcOrder =
            npcOrderData as OrderIdentity;

          relation = {
            id:
              String(
                npcOrder.id,
              ),
            name:
              String(
                npcOrder.name,
              ),
            slug:
              String(
                npcOrder.slug,
              ),
            icon_url:
              npcOrder.icon_url
                ? String(
                    npcOrder.icon_url,
                  )
                : null,
            colour:
              npcOrder.colour
                ? String(
                    npcOrder.colour,
                  )
                : null,
          };
        }
'''

count = text.count(old)
if count != 1:
    fail(
        f"Expected exactly 1 NPC visual Order block, found {count}. "
        "No files changed."
    )

TARGET.write_text(
    text.replace(old, new, 1),
    encoding="utf-8",
    newline="\n",
)

print("Patched:")
print("  components/characters/character-order-identity.tsx")
print("\nNo SQL changes required.")
print("Nothing committed or pushed.")
print("Now run: npm run build")
