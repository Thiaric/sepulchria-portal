from pathlib import Path
from PIL import Image, ImageChops

FRAME_DIR = Path("public/icons/rarity/frames")
FRAME_NAMES = [
    "poor.png",
    "average.png",
    "fine.png",
    "superior.png",
    "flawless.png",
    "peerless.png",
]

ALPHA_THRESHOLD = 24
SAFETY_PX = 2

def visible_bbox(img: Image.Image):
    rgba = img.convert("RGBA")
    alpha = rgba.getchannel("A")

    # Ignore extremely faint antialias/glow pixels when finding the real frame edge.
    mask = alpha.point(lambda a: 255 if a >= ALPHA_THRESHOLD else 0)
    return mask.getbbox()

def square_crop_box(bbox, width, height):
    left, top, right, bottom = bbox

    left = max(0, left - SAFETY_PX)
    top = max(0, top - SAFETY_PX)
    right = min(width, right + SAFETY_PX)
    bottom = min(height, bottom + SAFETY_PX)

    box_w = right - left
    box_h = bottom - top
    side = max(box_w, box_h)

    cx = (left + right) / 2
    cy = (top + bottom) / 2

    crop_left = round(cx - side / 2)
    crop_top = round(cy - side / 2)
    crop_right = crop_left + side
    crop_bottom = crop_top + side

    # Keep square crop inside the source image.
    if crop_left < 0:
        crop_right -= crop_left
        crop_left = 0
    if crop_top < 0:
        crop_bottom -= crop_top
        crop_top = 0
    if crop_right > width:
        shift = crop_right - width
        crop_left -= shift
        crop_right = width
    if crop_bottom > height:
        shift = crop_bottom - height
        crop_top -= shift
        crop_bottom = height

    return (
        max(0, crop_left),
        max(0, crop_top),
        min(width, crop_right),
        min(height, crop_bottom),
    )

def main():
    if not FRAME_DIR.exists():
        raise SystemExit(f"Could not find {FRAME_DIR}")

    changed = 0

    for name in FRAME_NAMES:
        path = FRAME_DIR / name

        if not path.exists():
            print(f"SKIP: {path} does not exist")
            continue

        with Image.open(path) as opened:
            img = opened.convert("RGBA")

        width, height = img.size
        bbox = visible_bbox(img)

        if not bbox:
            print(f"SKIP: {name} has no visible pixels")
            continue

        crop_box = square_crop_box(bbox, width, height)

        # If the visible artwork already effectively reaches the canvas edge,
        # leave it alone.
        if crop_box == (0, 0, width, height):
            print(f"OK:   {name} already reaches the outer canvas")
            continue

        cropped = img.crop(crop_box)
        resized = cropped.resize(
            (width, height),
            Image.Resampling.LANCZOS,
        )

        resized.save(path, "PNG", optimize=True)

        new_bbox = visible_bbox(resized)

        print(
            f"FIX:  {name}\n"
            f"      canvas: {width}x{height}\n"
            f"      visible before: {bbox}\n"
            f"      crop used:      {crop_box}\n"
            f"      visible after:  {new_bbox}"
        )
        changed += 1

    print()
    print(f"Finished. Updated {changed} frame file(s).")
    print(
        "The visible frame artwork now fills the PNG canvas itself, "
        "so ItemImageFrame can use the same rendering rules everywhere."
    )

if __name__ == "__main__":
    main()
