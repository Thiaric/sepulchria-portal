from pathlib import Path
import re
import subprocess

ROOT = Path.cwd()

EXPECTED = "70dc4bd"

head = subprocess.check_output(
    ["git", "rev-parse", "--short", "HEAD"],
    text=True,
).strip()

if head != EXPECTED:
    raise SystemExit(
        f"STOPPED: this patch targets {EXPECTED} exactly, "
        f"but your current HEAD is {head}."
    )

def strip_hover_from_opening_tag(
    rel: str,
    anchor: str,
    *,
    element_starts=("<button", "<Link", "<PortalModalButton"),
):
    path = ROOT / rel
    if not path.exists():
        raise SystemExit(f"Missing required file: {rel}")

    text = path.read_text(encoding="utf-8")

    anchor_pos = text.find(anchor)
    if anchor_pos == -1:
        raise SystemExit(
            f"{rel}: could not find anchor {anchor!r}. Nothing changed."
        )

    starts = []
    for marker in element_starts:
        pos = text.rfind(marker, 0, anchor_pos + 1)
        if pos != -1:
            starts.append((pos, marker))

    if not starts:
        raise SystemExit(
            f"{rel}: could not find the control opening tag before {anchor!r}."
        )

    start, marker = max(starts, key=lambda item: item[0])
    end = text.find(">", anchor_pos)
    if end == -1:
        raise SystemExit(
            f"{rel}: could not find the end of the control opening tag."
        )

    end += 1
    segment = text[start:end]

    # Remove only Tailwind hover:* utility tokens in THIS ONE opening tag.
    cleaned = re.sub(
        r'(?<![A-Za-z0-9_-])hover:[^\s"\'`}>]+',
        "",
        segment,
    )

    # Clean repeated spaces caused by removed utility tokens.
    cleaned = re.sub(r" {2,}", " ", cleaned)

    if cleaned == segment:
        raise SystemExit(
            f"{rel}: target control contained no hover utilities; "
            "refusing to continue because the baseline differs."
        )

    text = text[:start] + cleaned + text[end:]
    path.write_text(text, encoding="utf-8")
    print(f"✓ {rel} — removed hover illumination from {marker} control")

# ------------------------------------------------------------------
# Inline controls in PortalHeader.
# ------------------------------------------------------------------
strip_hover_from_opening_tag(
    "components/portal/portal-header.tsx",
    'aria-label={`${unreadMessageCount} unread messages`}',
)

strip_hover_from_opening_tag(
    "components/portal/portal-header.tsx",
    'aria-label="Open administration panel"',
)

# ------------------------------------------------------------------
# Individual top-row header control components.
# Only the actual header control opening tag is touched.
# ------------------------------------------------------------------
strip_hover_from_opening_tag(
    "components/audio/portal-sound-toggle.tsx",
    "aria-pressed={muted}",
)

strip_hover_from_opening_tag(
    "components/portal/portal-skin-switcher.tsx",
    'aria-label="Portal appearance"',
)

strip_hover_from_opening_tag(
    "components/notifications/notification-bell.tsx",
    "ref={buttonRef}",
)

strip_hover_from_opening_tag(
    "components/world/world-indicator.tsx",
    'aria-haspopup="dialog"',
)

strip_hover_from_opening_tag(
    "components/portal/active-city-counter.tsx",
    'title={`${count} active character',
)

strip_hover_from_opening_tag(
    "components/portal/staff-appear-offline-toggle.tsx",
    "aria-label={title}",
)

strip_hover_from_opening_tag(
    "components/portal/header-character-identity.tsx",
    'aria-label={`Presence: ${presence.label}`}',
)

strip_hover_from_opening_tag(
    "components/logout-button.tsx",
    'aria-label="Log out"',
)

print()
print("DONE.")
print("Only top-row header controls were changed.")
print("The cosmetic frame/wrapper code was not altered.")
print("Dropdowns, calendars, panels, lists and other hover styles were not altered.")
