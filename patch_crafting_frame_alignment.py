from pathlib import Path
import re

frame_path = Path("components/items/item-image-frame.tsx")
workbench_path = Path("app/(portal)/crafting/crafting-workbench.tsx")

for path in (frame_path, workbench_path):
    if not path.exists():
        raise SystemExit(f"Could not find {path}")

frame = frame_path.read_text(encoding="utf-8")
workbench = workbench_path.read_text(encoding="utf-8")

# 1) Shared ItemImageFrame: add a frameClassName prop so callers can
# scale ONLY the decorative PNG frame without changing the item image.
if 'frameClassName = ""' not in frame:
    old = '''  fallback = "◇",
  muted = false,
}: {'''
    new = '''  fallback = "◇",
  muted = false,
  frameClassName = "",
}: {'''
    if old not in frame:
        raise SystemExit("Could not find ItemImageFrame prop defaults.")
    frame = frame.replace(old, new, 1)

if "frameClassName?: string;" not in frame:
    old = '''  fallback?: string;
  muted?: boolean;
}) {'''
    new = '''  fallback?: string;
  muted?: boolean;
  frameClassName?: string;
}) {'''
    if old not in frame:
        raise SystemExit("Could not find ItemImageFrame prop types.")
    frame = frame.replace(old, new, 1)

old_frame_class = 'className="pointer-events-none absolute inset-0 z-[2] h-full w-full object-fill"'
new_frame_class = '''className={[
          "pointer-events-none absolute inset-0 z-[2] h-full w-full origin-center object-fill",
          frameClassName,
        ]
          .filter(Boolean)
          .join(" ")}'''

if old_frame_class in frame:
    frame = frame.replace(old_frame_class, new_frame_class, 1)
elif "frameClassName," not in frame:
    raise SystemExit("Could not find the rarity-frame image class.")

# 2) Crafting helper: allow explicit frame scale + badge size.
helper_header = workbench.split("function ingredientPosition", 1)[0]
if 'frameClassName = ""' not in helper_header:
    old = '''function ItemImage({
  src,
  quality,
  fallback = "◇",
  size = "md",
}: {
  src: string | null;
  quality: string;
  fallback?: string;
  size?: "sm" | "md" | "lg";
}) {'''
    new = '''function ItemImage({
  src,
  quality,
  fallback = "◇",
  size = "md",
  badgeSize,
  frameClassName = "",
}: {
  src: string | null;
  quality: string;
  fallback?: string;
  size?: "sm" | "md" | "lg";
  badgeSize?: "xs" | "sm" | "md" | "lg";
  frameClassName?: string;
}) {'''
    if old not in workbench:
        raise SystemExit("Could not find ItemImage helper signature.")
    workbench = workbench.replace(old, new, 1)

old = '''    badgeSize={
      size === "lg"
        ? "lg"
        : size === "sm"
          ? "xs"
          : "sm"
    }'''
new = '''    badgeSize={
      badgeSize ??
      (size === "lg"
        ? "lg"
        : size === "sm"
          ? "xs"
          : "sm")
    }
    frameClassName={frameClassName}'''
if old in workbench:
    workbench = workbench.replace(old, new, 1)
elif "frameClassName={frameClassName}" not in workbench:
    raise SystemExit("Could not update ItemImage badge/frame props.")

# 3) Centre result mobile: smaller badge + visible frame reaches image edge.
mobile_re = re.compile(
    r'(className="h-14 w-14"\s+badgeSize=")(?:sm|xs|md|lg)("\s*)',
    re.MULTILINE,
)
match = mobile_re.search(workbench)
if match:
    replacement = match.group(1) + 'xs' + match.group(2)
    # add frameClassName only if absent in this component
    block_end = workbench.find("/>", match.end())
    block = workbench[match.start():block_end]
    workbench = workbench[:match.start()] + replacement + workbench[match.end():]
    # locate again after replacement
    m2 = workbench.find('className="h-14 w-14"', max(0, match.start()-50))
    b2 = workbench.find("/>", m2)
    block2 = workbench[m2:b2]
    if 'frameClassName=' not in block2:
        badge_pos = workbench.find('badgeSize="xs"', m2, b2)
        if badge_pos == -1:
            raise SystemExit("Could not locate centre mobile badge after update.")
        line_end = workbench.find("\n", badge_pos)
        workbench = workbench[:line_end] + '\n    frameClassName="scale-[1.10]"' + workbench[line_end:]
elif 'className="h-14 w-14"' in workbench and 'frameClassName="scale-[1.10]"' not in workbench:
    raise SystemExit("Could not update mobile centre result.")

# 4) Centre result desktop: keep image size, but use a smaller badge and scaled frame.
centre_anchor = '<div className="hidden sm:block">'
idx = workbench.find(centre_anchor)
if idx == -1:
    raise SystemExit("Could not find desktop centre result block.")
end = workbench.find("</div>", idx)
centre_block = workbench[idx:end]

if 'frameClassName="scale-[1.10]"' not in centre_block:
    old = '''    size="lg"
    fallback="✦"
  />'''
    new = '''    size="lg"
    badgeSize="sm"
    frameClassName="scale-[1.10]"
    fallback="✦"
  />'''
    if old not in centre_block:
        raise SystemExit("Could not find desktop centre ItemImage.")
    centre_block = centre_block.replace(old, new, 1)
    workbench = workbench[:idx] + centre_block + workbench[end:]

# 5) Popup mobile + desktop: scale only the decorative frame.
popup_start = workbench.find('{craftedReveal ? (')
if popup_start == -1:
    raise SystemExit("Could not find crafted reveal popup.")

search_from = popup_start
updated = 0
while True:
    src_idx = workbench.find('src={craftedReveal.item.image_url}', search_from)
    if src_idx == -1:
        break
    close_idx = workbench.find("/>", src_idx)
    if close_idx == -1:
        break
    block = workbench[src_idx:close_idx]
    if 'frameClassName=' not in block:
        quality_text = 'quality={craftedReveal.item.quality}'
        q_idx = workbench.find(quality_text, src_idx, close_idx)
        if q_idx == -1:
            search_from = close_idx + 2
            continue
        q_end = q_idx + len(quality_text)
        workbench = (
            workbench[:q_end]
            + '\n                          frameClassName="scale-[1.10]"'
            + workbench[q_end:]
        )
        updated += 1
        search_from = q_end + 60
    else:
        search_from = close_idx + 2

popup_section = workbench[popup_start:]
if popup_section.count('frameClassName="scale-[1.10]"') < 2:
    raise SystemExit("Could not patch both popup ItemImageFrame instances.")

frame_path.write_text(frame, encoding="utf-8")
workbench_path.write_text(workbench, encoding="utf-8")

print("Updated:")
print(f" - {frame_path}")
print(f" - {workbench_path}")
print()
print("Applied real crafting-specific frame fixes:")
print(" - decorative frame itself scales 10% larger inside crafting result images")
print(" - parent ItemImageFrame clips it to the exact image box edge")
print(" - centre workbench badge is xs on mobile and sm on desktop")
print(" - popup preview/success frames scale to the image edge")
print(" - inventory remains unchanged")
