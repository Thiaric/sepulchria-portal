from pathlib import Path
import re

path = Path("components/homepage/sepulchria-homepage.tsx")

if not path.exists():
    raise SystemExit("\nERROR: components/homepage/sepulchria-homepage.tsx not found\n")

text = path.read_text(encoding="utf-8")

# Any existing mailto link to the Sepulchria address should display only "Contact".
pattern = re.compile(
    r'(<a\b[^>]*href="mailto:sepulchriarpg@gmail\.com"[^>]*>)(.*?)(</a>)',
    re.DOTALL,
)

matches = list(pattern.finditer(text))

if len(matches) == 0:
    raise SystemExit(
        '\nERROR: Could not find an existing mailto:sepulchriarpg@gmail.com link '
        'in the homepage footer.\n'
    )

if len(matches) > 1:
    raise SystemExit(
        f"\nERROR: Expected 1 Sepulchria contact mailto link, found {len(matches)}.\n"
    )

new_text = pattern.sub(
    lambda m: m.group(1) + "\n                Contact\n              " + m.group(3),
    text,
    count=1,
)

path.write_text(new_text, encoding="utf-8", newline="\n")

print("updated: components/homepage/sepulchria-homepage.tsx")
print("Contact now displays as: Contact")
print("Contact href remains: mailto:sepulchriarpg@gmail.com")
