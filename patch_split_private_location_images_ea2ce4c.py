from __future__ import annotations

from pathlib import Path
import subprocess
import sys

EXPECTED_BASE = "ea2ce4c"
ROOT = Path.cwd()

def fail(message: str) -> None:
    raise SystemExit(message)

def read(path: str) -> str:
    p = ROOT / path
    if not p.exists():
        fail(f"Missing expected file: {path}")
    return p.read_text(encoding="utf-8")

def write(path: str, text: str) -> None:
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8", newline="\n")

def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail(f"{label}: expected 1 match, found {count}. Expected base {EXPECTED_BASE}.")
    return text.replace(old, new, 1)

try:
    head = subprocess.check_output(
        ["git", "rev-parse", "--short", "HEAD"],
        cwd=ROOT,
        text=True,
    ).strip()
except Exception:
    head = ""

if head and not head.startswith(EXPECTED_BASE):
    print(
        f"WARNING: HEAD is {head}, while this patch was authored for {EXPECTED_BASE}.",
        file=sys.stderr,
    )
    print(
        "The patch will still continue, but every edit is guarded by exact-match checks.",
        file=sys.stderr,
    )

changed: list[str] = []

# 1) app/(portal)/game/page.tsx
path = "app/(portal)/game/page.tsx"
text = read(path)

text = replace_once(
    text,
    """  image_url: string | null;
  area_id: string;""",
    """  image_url: string | null;
  background_image_url: string | null;
  area_id: string;""",
    f"{path}: RoomRelation background image field",
)

text = replace_once(
    text,
    """  "id, name, slug, chat_enabled, description, image_url, area_id, music_track_id, is_outdoors, areas(id,name,slug,description)",""",
    """  "id, name, slug, chat_enabled, description, image_url, background_image_url, area_id, music_track_id, is_outdoors, areas(id,name,slug,description)",""",
    f"{path}: current-room select",
)

text = replace_once(
    text,
    """  const ownedLocationAtmosphereUrl =
    privateAccess.metadata
      ? room.image_url
      : null;""",
    """  const ownedLocationAtmosphereUrl =
    privateAccess.metadata
      ? room.background_image_url
      : null;""",
    f"{path}: in-room background source",
)

write(path, text)
changed.append(path)

# 2) app/(portal)/private-location/actions.ts
path = "app/(portal)/private-location/actions.ts"
text = read(path)

text = replace_once(
    text,
    """  const imageUrl =
    readText(
      formData.get("imageUrl"),
      2000,
    );

  const {
    error: roomError,
  } = await admin
    .from("rooms")
    .update({
      image_url:
        imageUrl || null,
      updated_at:
        new Date().toISOString(),
    })""",
    """  const imageUrl =
    readText(
      formData.get("imageUrl"),
      2000,
    );

  const backgroundImageUrl =
    readText(
      formData.get("backgroundImageUrl"),
      2000,
    );

  const {
    error: roomError,
  } = await admin
    .from("rooms")
    .update({
      image_url:
        imageUrl || null,
      background_image_url:
        backgroundImageUrl || null,
      updated_at:
        new Date().toISOString(),
    })""",
    f"{path}: split private location images",
)

write(path, text)
changed.append(path)

# 3) app/(portal)/private-locations/page.tsx
path = "app/(portal)/private-locations/page.tsx"
text = read(path)

text = replace_once(
    text,
    """        image_url: string | null;
      }""",
    """        image_url: string | null;
        background_image_url: string | null;
      }""",
    f"{path}: ownedRoom type",
)

text = replace_once(
    text,
    """          "id, name, description, image_url",""",
    """          "id, name, description, image_url, background_image_url",""",
    f"{path}: owned room select",
)

old_block = """              <label className="grid gap-1">
                <span className="text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-806b50))]">
                  Chat background / Location URL
                </span>
                <input
                  name="imageUrl"
                  maxLength={2000}
                  defaultValue={
                    ownedRoom.image_url ??
                    ""
                  }
                  placeholder="https://..."
                  className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
                />
              </label>

              <p className="text-[8px] leading-4 text-[rgb(var(--sep-colour-6f6252))]">
                This image becomes the location chat atmosphere for everyone inside and overrides each character&apos;s equipped Location Atmosphere cosmetic while they are here. All other chat styling follows the active Portal skin.
              </p>

              <button
                type="submit"
                className="border border-[rgb(var(--sep-colour-8d6d3e))] bg-[rgb(var(--sep-colour-332719))] px-4 py-2 text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd9aa))]"
              >
                Save chat background
              </button>"""

new_block = """              <label className="grid gap-1">
                <span className="text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-806b50))]">
                  Location Image URL
                </span>
                <input
                  name="imageUrl"
                  maxLength={2000}
                  defaultValue={
                    ownedRoom.image_url ??
                    ""
                  }
                  placeholder="https://..."
                  className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
                />
              </label>

              <p className="text-[8px] leading-4 text-[rgb(var(--sep-colour-6f6252))]">
                Shown on the Private Locations page as this location&apos;s image.
              </p>

              <label className="grid gap-1">
                <span className="text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-806b50))]">
                  Background Image URL
                </span>
                <input
                  name="backgroundImageUrl"
                  maxLength={2000}
                  defaultValue={
                    ownedRoom.background_image_url ??
                    ""
                  }
                  placeholder="https://..."
                  className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
                />
              </label>

              <p className="text-[8px] leading-4 text-[rgb(var(--sep-colour-6f6252))]">
                Used only as the chat background while characters are inside this Private Location. It overrides each character&apos;s equipped Location Atmosphere cosmetic while they are here.
              </p>

              <button
                type="submit"
                className="border border-[rgb(var(--sep-colour-8d6d3e))] bg-[rgb(var(--sep-colour-332719))] px-4 py-2 text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd9aa))]"
              >
                Save location images
              </button>"""

text = replace_once(
    text,
    old_block,
    new_block,
    f"{path}: owner image management UI",
)

write(path, text)
changed.append(path)

# 4) app/(portal)/orders/headquarters/actions.ts
path = "app/(portal)/orders/headquarters/actions.ts"
text = read(path)

text = replace_once(
    text,
    """  const imageUrl =
    text(
      formData.get("imageUrl"),
      2000,
    );

  const { error } = await admin
    .from("rooms")
    .update({
      image_url:
        imageUrl || null,
      updated_at:
        new Date().toISOString(),
    })""",
    """  const imageUrl =
    text(
      formData.get("imageUrl"),
      2000,
    );

  const backgroundImageUrl =
    text(
      formData.get("backgroundImageUrl"),
      2000,
    );

  const { error } = await admin
    .from("rooms")
    .update({
      image_url:
        imageUrl || null,
      background_image_url:
        backgroundImageUrl || null,
      updated_at:
        new Date().toISOString(),
    })""",
    f"{path}: split Order HQ images",
)

write(path, text)
changed.append(path)

# 5) lib/order-headquarters/access.ts
path = "lib/order-headquarters/access.ts"
text = read(path)

text = replace_once(
    text,
    """      room:rooms!order_headquarters_room_id_fkey(name,description,image_url),""",
    """      room:rooms!order_headquarters_room_id_fkey(name,description,image_url,background_image_url),""",
    f"{path}: HQ room relation fields",
)

text = replace_once(
    text,
    """    imageUrl: room?.image_url ?? null,
    canInvite: access.canInvite,""",
    """    imageUrl: room?.image_url ?? null,
    backgroundImageUrl: room?.background_image_url ?? null,
    canInvite: access.canInvite,""",
    f"{path}: HQ management payload",
)

write(path, text)
changed.append(path)

# 6) components/orders/order-headquarters-manage-menu.tsx
path = "components/orders/order-headquarters-manage-menu.tsx"
text = read(path)

text = replace_once(
    text,
    """            <summary className="cursor-pointer text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-8c704b))]">
              Chat background
            </summary>""",
    """            <summary className="cursor-pointer text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-8c704b))]">
              Location images
            </summary>""",
    f"{path}: HQ details title",
)

old_inputs = """              <input
                name="imageUrl"
                maxLength={2000}
                defaultValue={data.imageUrl ?? ""}
                placeholder="Chat background / Location URL"
                className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-xs text-[rgb(var(--sep-colour-d7c4a5))]"
              />

              <p className="text-[7px] leading-4 text-[rgb(var(--sep-colour-6f6252))]">
                This overrides each visitor&apos;s equipped Location Atmosphere while they are inside. All other chat colours and surfaces follow their active Portal skin.
              </p>

              <button
                type="submit"
                className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-efd6a8))]"
              >
                Save chat background
              </button>"""

new_inputs = """              <label className="grid gap-1">
                <span className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))]">
                  Location Image URL
                </span>
                <input
                  name="imageUrl"
                  maxLength={2000}
                  defaultValue={data.imageUrl ?? ""}
                  placeholder="https://..."
                  className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-xs text-[rgb(var(--sep-colour-d7c4a5))]"
                />
              </label>

              <p className="text-[7px] leading-4 text-[rgb(var(--sep-colour-6f6252))]">
                Shown as the Headquarters location image outside the room.
              </p>

              <label className="grid gap-1">
                <span className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))]">
                  Background Image URL
                </span>
                <input
                  name="backgroundImageUrl"
                  maxLength={2000}
                  defaultValue={data.backgroundImageUrl ?? ""}
                  placeholder="https://..."
                  className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-xs text-[rgb(var(--sep-colour-d7c4a5))]"
                />
              </label>

              <p className="text-[7px] leading-4 text-[rgb(var(--sep-colour-6f6252))]">
                Used only as the in-room chat background. It overrides each visitor&apos;s equipped Location Atmosphere while they are inside.
              </p>

              <button
                type="submit"
                className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-efd6a8))]"
              >
                Save location images
              </button>"""

text = replace_once(
    text,
    old_inputs,
    new_inputs,
    f"{path}: HQ image management UI",
)

write(path, text)
changed.append(path)

# 7) SQL migration
sql_path = "supabase/migrations/20260903_split_private_location_images.sql"
sql = """-- Split Private Location / Order Headquarters listing image from chat background.
-- Existing rooms.image_url remains the Location Image.
-- background_image_url starts NULL so the two concepts are genuinely separate.

alter table public.rooms
add column if not exists background_image_url text;
"""
write(sql_path, sql)
changed.append(sql_path)

print("")
print("Patch applied successfully.")
print("")
print("Changed:")
for item in changed:
    print(f"  - {item}")
print("")
print("IMPORTANT:")
print("Run the generated Supabase migration before testing:")
print(f"  {sql_path}")
print("")
print("Behaviour after migration:")
print("  rooms.image_url            = Location Image / listing image")
print("  rooms.background_image_url = in-room chat background")
print("  Private-owned locations    = split")
print("  Order Headquarters         = split")
print("  Breeze                     = untouched")
