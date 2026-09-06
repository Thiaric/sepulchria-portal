from pathlib import Path

TARGET = Path("next.config.ts")
text = TARGET.read_text(encoding="utf-8")

old_script = '  `script-src \'self\' \'unsafe-inline\'${isDev ? " \'unsafe-eval\'" : ""} https://challenges.cloudflare.com`,'
new_script = '  `script-src \'self\' \'unsafe-inline\'${isDev ? " \'unsafe-eval\'" : ""} https://challenges.cloudflare.com https://cdn.paddle.com`,'

old_connect = '  "connect-src \'self\' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com",'
new_connect = '  "connect-src \'self\' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com https://*.paddle.com",'

old_frame = '  "frame-src \'self\' https://challenges.cloudflare.com",'
new_frame = '  "frame-src \'self\' https://challenges.cloudflare.com https://*.paddle.com",'

for old, new, label in [
    (old_script, new_script, "script-src"),
    (old_connect, new_connect, "connect-src"),
    (old_frame, new_frame, "frame-src"),
]:
    if old not in text:
        raise SystemExit(f"Could not find expected {label} line. No files were changed.")
    text = text.replace(old, new, 1)

TARGET.write_text(text, encoding="utf-8")
print("Updated next.config.ts CSP for Paddle:")
print(" - script-src allows https://cdn.paddle.com")
print(" - connect-src allows https://*.paddle.com")
print(" - frame-src allows https://*.paddle.com")
