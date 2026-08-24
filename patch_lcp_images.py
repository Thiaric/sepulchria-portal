from pathlib import Path
import subprocess
import sys

EXPECTED_HEAD = "053dd40"

def fail(message: str):
    print(f"\nERROR: {message}")
    sys.exit(1)

def replace_once(path: Path, old: str, new: str):
    if not path.exists():
        fail(f"Missing file: {path}")
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        fail(f"{path}: expected exact block once, found {count} times.")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")
    print(f"Patched: {path}")

root = Path.cwd()

try:
    head = subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], cwd=root, text=True).strip()
except Exception as exc:
    fail(f"Could not read Git HEAD: {exc}")

if not head.startswith(EXPECTED_HEAD):
    fail(f"This patch was prepared for commit {EXPECTED_HEAD}, but your current HEAD is {head}. Pull/reset to the latest repo first.")

sidebar = root / "components/portal/portal-responsive-right-sidebar.tsx"
old_sidebar = """                  <LocationAtmosphericImage
                    src={
                      character.currentRoom.image_url
                    }
                    alt={
                      character.currentRoom.name
                    }
                    sizes="300px"
                    objectFit="cover"
                    isOutdoors={
                      character.currentRoom.is_outdoors
                    }
                  />"""
new_sidebar = """                  <LocationAtmosphericImage
                    src={
                      character.currentRoom.image_url
                    }
                    alt={
                      character.currentRoom.name
                    }
                    priority
                    sizes="300px"
                    objectFit="cover"
                    isOutdoors={
                      character.currentRoom.is_outdoors
                    }
                  />"""
replace_once(sidebar, old_sidebar, new_sidebar)

area_page = root / "app/(portal)/areas/[slug]/page.tsx"
old_area = """            <LocationAtmosphericImage
              src={safeArea.image_url}
              alt={safeArea.name}
              sizes="(max-width: 1024px) 100vw, 70vw"
              objectFit="cover"
            />"""
new_area = """            <LocationAtmosphericImage
              src={safeArea.image_url}
              alt={safeArea.name}
              priority
              sizes="(max-width: 1024px) 100vw, 70vw"
              objectFit="cover"
            />"""
replace_once(area_page, old_area, new_area)

print("\nDone.")
print("The shared current-location image is now high-priority everywhere it appears.")
print("Area hero images are also high-priority.")
print("Card/list images remain lazy-loaded intentionally.")
print("\nNext run:")
print("  npm run build")