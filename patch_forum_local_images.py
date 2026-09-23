from pathlib import Path

FILES = {
    "edit_page": Path("app/(portal)/admin/forum/sections/[sectionId]/page.tsx"),
    "new_page": Path("app/(portal)/admin/forum/sections/new/page.tsx"),
    "actions": Path("app/(portal)/admin/forum/sections/actions.ts"),
}

for path in FILES.values():
    if not path.exists():
        raise SystemExit(f"Missing expected file: {path}")

def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        print(f"WARNING: could not find {label}")
        return text
    return text.replace(old, new, 1)

# EDIT PAGE
path = FILES["edit_page"]
text = path.read_text(encoding="utf-8")
original = text

text = replace_once(
    text,
    '                label="Icon URL"\n'
    '                htmlFor="forum-section-icon"\n'
    '                description="Optional HTTP or HTTPS address for the section icon."\n',
    '                label="Icon path or URL"\n'
    '                htmlFor="forum-section-icon"\n'
    '                description="Use a local public path such as /icons/forum/example.png or a full HTTP/HTTPS URL."\n',
    "edit icon label",
)

text = replace_once(
    text,
    '                  name="icon_url"\n'
    '                  type="url"\n'
    '                  inputMode="url"\n'
    '                  placeholder="https://..."\n',
    '                  name="icon_url"\n'
    '                  type="text"\n'
    '                  placeholder="/icons/forum/example.png"\n',
    "edit icon input",
)

text = replace_once(
    text,
    '                label="Banner URL"\n'
    '                htmlFor="forum-section-banner"\n'
    '                description="Optional background image displayed behind the section."\n',
    '                label="Banner path or URL"\n'
    '                htmlFor="forum-section-banner"\n'
    '                description="Use a local public path such as /banners/forum/example.png or a full HTTP/HTTPS URL."\n',
    "edit banner label",
)

text = replace_once(
    text,
    '                  name="banner_url"\n'
    '                  type="url"\n'
    '                  inputMode="url"\n'
    '                  placeholder="https://..."\n',
    '                  name="banner_url"\n'
    '                  type="text"\n'
    '                  placeholder="/banners/forum/example.png"\n',
    "edit banner input",
)

if text != original:
    path.write_text(text, encoding="utf-8")
    print(f"Patched: {path}")
else:
    print(f"No edit-page changes made: {path}")

# NEW PAGE
path = FILES["new_page"]
text = path.read_text(encoding="utf-8")
original = text

text = replace_once(
    text,
    '                label="Icon URL"\n'
    '                htmlFor="forum-section-icon"\n'
    '                description="Optional HTTP or HTTPS address for the section icon."\n',
    '                label="Icon path or URL"\n'
    '                htmlFor="forum-section-icon"\n'
    '                description="Use a local public path such as /icons/forum/example.png or a full HTTP/HTTPS URL."\n',
    "new icon label",
)

text = replace_once(
    text,
    '                  name="icon_url"\n'
    '                  type="url"\n'
    '                  inputMode="url"\n'
    '                  placeholder="https://..."\n',
    '                  name="icon_url"\n'
    '                  type="text"\n'
    '                  placeholder="/icons/forum/example.png"\n',
    "new icon input",
)

text = replace_once(
    text,
    '                label="Banner URL"\n'
    '                htmlFor="forum-section-banner"\n'
    '                description="Optional background image displayed behind the section."\n',
    '                label="Banner path or URL"\n'
    '                htmlFor="forum-section-banner"\n'
    '                description="Use a local public path such as /banners/forum/example.png or a full HTTP/HTTPS URL."\n',
    "new banner label",
)

text = replace_once(
    text,
    '                  name="banner_url"\n'
    '                  type="url"\n'
    '                  inputMode="url"\n'
    '                  placeholder="https://..."\n',
    '                  name="banner_url"\n'
    '                  type="text"\n'
    '                  placeholder="/banners/forum/example.png"\n',
    "new banner input",
)

if text != original:
    path.write_text(text, encoding="utf-8")
    print(f"Patched: {path}")
else:
    print(f"No new-page changes made: {path}")

# SERVER VALIDATION
path = FILES["actions"]
text = path.read_text(encoding="utf-8")
original = text

old_validator = '''function isValidOptionalUrl(
  value: string,
): boolean {
  if (!value) {
    return true;
  }

  try {
    const parsedUrl = new URL(value);

    return (
      parsedUrl.protocol === "http:" ||
      parsedUrl.protocol === "https:"
    );
  } catch {
    return false;
  }
}
'''

new_validator = '''function isValidOptionalImagePath(
  value: string,
): boolean {
  if (!value) {
    return true;
  }

  // Local files from Next.js public/ are referenced from the site root.
  // Example: public/icons/forum/market.png -> /icons/forum/market.png
  if (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\\\")
  ) {
    return true;
  }

  try {
    const parsedUrl = new URL(value);

    return (
      parsedUrl.protocol === "http:" ||
      parsedUrl.protocol === "https:"
    );
  } catch {
    return false;
  }
}
'''

text = replace_once(
    text,
    old_validator,
    new_validator,
    "shared image-path validator",
)

old_validation_calls = '''  if (!isValidOptionalUrl(iconUrl)) {
    onError(
      "The icon URL must be a valid HTTP or HTTPS address.",
    );
  }

  if (!isValidOptionalUrl(bannerUrl)) {
    onError(
      "The banner URL must be a valid HTTP or HTTPS address.",
    );
  }
'''

new_validation_calls = '''  if (!isValidOptionalImagePath(iconUrl)) {
    onError(
      "The icon must be a local path beginning with / or a valid HTTP/HTTPS URL.",
    );
  }

  if (!isValidOptionalImagePath(bannerUrl)) {
    onError(
      "The banner must be a local path beginning with / or a valid HTTP/HTTPS URL.",
    );
  }
'''

text = replace_once(
    text,
    old_validation_calls,
    new_validation_calls,
    "server validation calls",
)

if text != original:
    path.write_text(text, encoding="utf-8")
    print(f"Patched: {path}")
else:
    print(f"No actions changes made: {path}")

print()
print("Done.")
print("Examples now accepted:")
print("  /icons/forum/market.png")
print("  /banners/forum/market.png")
print("  https://example.com/icon.png")
print()
print("Local files should physically live at:")
print("  public/icons/forum/market.png")
print("  public/banners/forum/market.png")
