from pathlib import Path
import re

path = Path("components/homepage/sepulchria-homepage.tsx")

if not path.exists():
    raise SystemExit("\nERROR: components/homepage/sepulchria-homepage.tsx not found\n")

text = path.read_text(encoding="utf-8")

pattern = re.compile(
    r'''<a\s+
                href="mailto:sepulchriarpg@gmail\.com"
                (?P<attrs>[^>]*)>
                Contact
              </a>''',
    re.VERBOSE,
)

matches = list(pattern.finditer(text))

if len(matches) != 1:
    raise SystemExit(
        f"\nERROR: Expected exactly 1 Contact mailto link, found {len(matches)}.\n"
    )

replacement = '''<a
                href="mailto:sepulchriarpg@gmail.com"
                onClick={(event) => {
                  event.preventDefault();
                  window.open(
                    "mailto:sepulchriarpg@gmail.com",
                    "_blank",
                  );
                }}
              >
                Contact
              </a>'''

text = pattern.sub(replacement, text, count=1)
path.write_text(text, encoding="utf-8", newline="\n")

print("updated: components/homepage/sepulchria-homepage.tsx")
print("Contact now explicitly opens the configured mail handler.")
