from pathlib import Path

path = Path("components/portal/portal-responsive-right-sidebar.tsx")
if not path.exists():
    raise SystemExit("Missing components/portal/portal-responsive-right-sidebar.tsx")

text = path.read_text(encoding="utf-8")

old1 = '                <div className="pointer-events-none absolute inset-0 z-[6] bg-[rgb(var(--sep-colour-0b0806))]/48" />'
new1 = '                <div className="pointer-events-none absolute inset-0 z-[6] bg-black/48" />'

old2 = '                <div className="pointer-events-none absolute inset-0 z-[6] bg-gradient-to-r from-[rgb(var(--sep-colour-100b08))]/78 via-[rgb(var(--sep-colour-100b08))]/52 to-[rgb(var(--sep-colour-100b08))]/28" />'
new2 = '                <div className="pointer-events-none absolute inset-0 z-[6] bg-gradient-to-r from-black/78 via-black/52 to-black/28" />'

if old1 not in text:
    raise SystemExit("Could not find the current-location dark overlay. Repository differs from analysed version.")
if old2 not in text:
    raise SystemExit("Could not find the current-location gradient overlay. Repository differs from analysed version.")

text = text.replace(old1, new1, 1)
text = text.replace(old2, new2, 1)

path.write_text(text, encoding="utf-8")

print("Updated components/portal/portal-responsive-right-sidebar.tsx")
print("Changed only the two Current Location image overlays.")
print("No other sidebar, weather, location, skin, or image behaviour was modified.")
print("Run: npm run build")
