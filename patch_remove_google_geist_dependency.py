from pathlib import Path
import sys

path = Path.cwd() / "app" / "layout.tsx"

if not path.exists():
    print("ERROR: Run this from the sepulchria-portal repository root.", file=sys.stderr)
    sys.exit(1)

text = path.read_text(encoding="utf-8")

replacements = [
    (
        'import { Geist } from "next/font/google";\n',
        '',
        "remove Google Geist import",
    ),
    (
        '''const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

''',
        '',
        "remove runtime Google font configuration",
    ),
    (
        'className={`${geistSans.className} antialiased portal-skin-scope`}',
        'className="antialiased portal-skin-scope"',
        "remove Geist class from body",
    ),
]

original = text

for old, new, label in replacements:
    count = text.count(old)
    if count != 1:
        print(f"ERROR: {label}: expected 1 match, found {count}.", file=sys.stderr)
        print("No file was changed.", file=sys.stderr)
        sys.exit(1)
    text = text.replace(old, new, 1)

path.write_text(text, encoding="utf-8")

print("OK: removed Google-hosted Geist dependency from app/layout.tsx")
print("The app will now use its existing CSS/system font stack.")
print("Next run: npm run build")
