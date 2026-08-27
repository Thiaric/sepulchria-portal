from pathlib import Path
import subprocess

BASE = '51f9e5c16aaca72559417a6e16eae7bc2ed71539'
root = Path.cwd()

def fail(message):
    print(f"ERROR: {message}")
    raise SystemExit(1)

head = subprocess.check_output(
    ["git", "rev-parse", "HEAD"],
    cwd=root,
    text=True,
).strip()

if head != BASE:
    fail(
        f"This patch was built on pushed master {BASE}, "
        f"but local HEAD is {head}. No files were changed."
    )

panel = root / 'app/(portal)/game/components/BreezeLodgingsPanel.tsx'
page = root / 'app/(portal)/game/page.tsx'

for path in [panel, page]:
    if not path.exists():
        fail(
            f"Missing required file: {path.relative_to(root)}. "
            "No files were changed."
        )

panel_text = panel.read_text(encoding="utf-8")
page_text = page.read_text(encoding="utf-8")

replacements = [
    ("panel", 'import { getAurethDate } from "@/lib/world/calendar";', 'import { getAurethDate } from "@/lib/world/calendar";\nimport { LocationAtmosphericImage } from "@/components/world/location-atmospheric-image";\nimport { LocationImageLightbox } from "@/components/world/location-image-lightbox";'),
    ("panel", '  viewer_is_staff: boolean;\n};', '  viewer_is_staff: boolean;\n  image_url: string | null;\n  is_outdoors: boolean;\n};'),
    ("panel", '                    <article\n                      key={room.room_id}\n                      className="flex min-h-[148px] flex-col border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-17110d))] p-3"\n                    >\n                      <h4 className="font-serif text-[12px] text-[rgb(var(--sep-colour-d9c29a))]">\n                        {room.room_name}\n                      </h4>\n\n                      <p className="mt-1 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))]">\n                        {room.rented_by_me\n                          ? "Your room"\n                          : occupied\n                            ? "Occupied"\n                            : "Available"}\n                      </p>\n\n                      <div className="mt-auto pt-3">', '                    <article\n                      key={room.room_id}\n                      className="relative flex min-h-[148px] flex-col overflow-hidden border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-17110d))]"\n                    >\n                      {room.image_url ? (\n                        <>\n                          <LocationAtmosphericImage\n                            src={room.image_url}\n                            alt={room.room_name}\n                            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 20vw"\n                            objectFit="cover"\n                            isOutdoors={room.is_outdoors}\n                          />\n\n                          <LocationImageLightbox\n                            src={room.image_url}\n                            name={room.room_name}\n                          />\n\n                          <div className="pointer-events-none absolute inset-0 z-[6] bg-[rgb(var(--sep-colour-0d0a08))]/58" />\n                          <div className="pointer-events-none absolute inset-0 z-[7] bg-gradient-to-t from-[rgb(var(--sep-colour-0d0a08))]/92 via-[rgb(var(--sep-colour-0d0a08))]/45 to-[rgb(var(--sep-colour-0d0a08))]/18" />\n                        </>\n                      ) : null}\n\n                      <div className="pointer-events-none relative z-20 flex min-h-[148px] flex-1 flex-col p-3">\n                        <h4 className="font-serif text-[12px] text-[rgb(var(--sep-colour-e8d3ad))] [text-shadow:0_2px_4px_rgba(var(--sep-rgb-0-0-0),0.95)]">\n                          {room.room_name}\n                        </h4>\n\n                        <p className="mt-1 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-b7a58c))] [text-shadow:0_2px_4px_rgba(var(--sep-rgb-0-0-0),0.95)]">\n                          {room.rented_by_me\n                            ? "Your room"\n                            : occupied\n                              ? "Occupied"\n                              : "Available"}\n                        </p>\n\n                        <div className="pointer-events-auto mt-auto pt-3">'),
    ("panel", '                      </div>\n                    </article>', '                        </div>\n                      </div>\n                    </article>'),
    ("page", '  const breezeLodgings =\n    (breezeLodgingsData ?? []) as BreezeLodgingStateRow[];\n\n  const hasLocationPanel =', '  const breezeLodgingsBase =\n    (breezeLodgingsData ?? []) as Omit<\n      BreezeLodgingStateRow,\n      "image_url" | "is_outdoors"\n    >[];\n\n  const breezeRoomIds =\n    breezeLodgingsBase.map(\n      (lodging) => lodging.room_id,\n    );\n\n  const breezeRoomImageResult =\n    breezeRoomIds.length > 0\n      ? await supabase\n          .from("rooms")\n          .select("id, image_url, is_outdoors")\n          .in("id", breezeRoomIds)\n      : {\n          data: [],\n          error: null,\n        };\n\n  if (breezeRoomImageResult.error) {\n    throw new Error(\n      `Unable to load Breeze Lodgings room images: ${breezeRoomImageResult.error.message}`,\n    );\n  }\n\n  const breezeRoomImages =\n    new Map(\n      (breezeRoomImageResult.data ?? []).map(\n        (roomImage) => [\n          roomImage.id,\n          roomImage,\n        ],\n      ),\n    );\n\n  const breezeLodgings:\n    BreezeLodgingStateRow[] =\n    breezeLodgingsBase.map(\n      (lodging) => {\n        const roomImage =\n          breezeRoomImages.get(\n            lodging.room_id,\n          );\n\n        return {\n          ...lodging,\n          image_url:\n            roomImage?.image_url ?? null,\n          is_outdoors:\n            roomImage?.is_outdoors ?? false,\n        };\n      },\n    );\n\n  const hasLocationPanel ='),
]

texts = {
    "panel": panel_text,
    "page": page_text,
}

for key, old, new in replacements:
    count = texts[key].count(old)
    if count != 1:
        fail(
            f"Expected exactly one anchor in "
            f"{panel.relative_to(root) if key == 'panel' else page.relative_to(root)}, "
            f"found {count}. No files were changed."
        )

for key, old, new in replacements:
    texts[key] = texts[key].replace(
        old,
        new,
        1,
    )

if "LocationImageLightbox" not in texts["panel"]:
    fail("Internal panel validation failed. No files were changed.")

if "breezeRoomImages" not in texts["page"]:
    fail("Internal page validation failed. No files were changed.")

panel.write_text(
    texts["panel"],
    encoding="utf-8",
)
page.write_text(
    texts["page"],
    encoding="utf-8",
)

print("Breeze Lodgings room-image patch applied successfully.")
print("Changed files:")
print(" - app/(portal)/game/components/BreezeLodgingsPanel.tsx")
print(" - app/(portal)/game/page.tsx")
print()
print("Each rental card now uses the room's existing location image as its background.")
print("Clicking the card background opens the same image lightbox used by /areas.")
print("Selects and rental/enter buttons remain interactive.")
print("No SQL is required.")
print("Next: npm run build")
