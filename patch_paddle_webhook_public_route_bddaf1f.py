from pathlib import Path

TARGET = Path("lib/supabase/proxy.ts")
text = TARGET.read_text(encoding="utf-8")

needle = '  "/api/registration-invitations",\n'
insert = '  "/api/registration-invitations",\n  "/api/store/paddle/webhook",\n'

if insert in text:
    print("Paddle webhook route is already public. No change needed.")
elif needle not in text:
    raise SystemExit("Could not find expected PUBLIC_ROUTES insertion point.")
else:
    text = text.replace(needle, insert, 1)
    TARGET.write_text(text, encoding="utf-8")
    print("Added /api/store/paddle/webhook to PUBLIC_ROUTES in lib/supabase/proxy.ts.")
