from pathlib import Path

PATH = Path("app/layout.tsx")

if not PATH.exists():
    raise SystemExit(f"Missing {PATH}. Run from repo root.")

text = PATH.read_text(encoding="utf-8")

old = 'import { CookieStorageControls } from "@/components/privacy/cookie-storage-controls";\\nimport { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";'
new = '''import { CookieStorageControls } from "@/components/privacy/cookie-storage-controls";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";'''

count = text.count(old)

if count != 1:
    raise SystemExit(
        f"Literal newline import fix: expected 1 match, found {count}."
    )

text = text.replace(old, new, 1)

PATH.write_text(text, encoding="utf-8")

print("✓ app/layout.tsx")
print("Fixed literal \\n in PWA import.")
print("Run: npm run build")
