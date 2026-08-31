from pathlib import Path
import base64, subprocess

BASE = "e6e88d7"
PATH = Path("app/(portal)/game/components/RoomRealtime.tsx")

head = subprocess.check_output(
    ["git", "rev-parse", "--short", "HEAD"],
    text=True,
).strip()

if head != BASE:
    raise SystemExit(
        f"Wrong baseline: HEAD is {head}, expected {BASE}."
    )

if not PATH.exists():
    raise SystemExit(f"Missing {PATH}")

text = PATH.read_text(encoding="utf-8")

pairs = [('aW1wb3J0IHsKICB1c2VFZmZlY3QsCiAgdXNlUmVmLAp9IGZyb20gInJlYWN0IjsKaW1wb3J0IHsgdXNlUm91dGVyIH0gZnJvbSAibmV4dC9uYXZpZ2F0aW9uIjs=', 'aW1wb3J0IHsKICB1c2VFZmZlY3QsCiAgdXNlUmVmLAp9IGZyb20gInJlYWN0Ijs=', 'Remove unused router import'), ('ICBjb25zdCByb3V0ZXIgPSB1c2VSb3V0ZXIoKTsKCiAgY29uc3QgcmVmcmVzaFRpbWVyID0KICAgIHVzZVJlZjxSZXR1cm5UeXBlPAogICAgICB0eXBlb2Ygc2V0VGltZW91dAogICAgPiB8IG51bGw+KG51bGwpOwoKICBjb25zdCBoYXJkUmVsb2FkaW5nUmVmID0=', 'ICBjb25zdCBoYXJkUmVsb2FkaW5nUmVmID0=', 'Remove presence refresh timer'), ('ICAgIGZ1bmN0aW9uIHNvZnRSZWZyZXNoKAogICAgICBkZWxheSA9IDAsCiAgICApIHsKICAgICAgaWYgKAogICAgICAgIGhhcmRSZWxvYWRpbmdSZWYuY3VycmVudAogICAgICApIHsKICAgICAgICByZXR1cm47CiAgICAgIH0KCiAgICAgIGlmIChyZWZyZXNoVGltZXIuY3VycmVudCkgewogICAgICAgIGNsZWFyVGltZW91dCgKICAgICAgICAgIHJlZnJlc2hUaW1lci5jdXJyZW50LAogICAgICAgICk7CiAgICAgIH0KCiAgICAgIHJlZnJlc2hUaW1lci5jdXJyZW50ID0KICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHsKICAgICAgICAgIHJvdXRlci5yZWZyZXNoKCk7CiAgICAgICAgfSwgZGVsYXkpOwogICAgfQoK', '', 'Remove softRefresh'), ('ICAgICAgICAgICAgLyoKICAgICAgICAgICAgICogU3RhdHVzIC8gaGVhcnRiZWF0IC8gb3RoZXIgcHJlc2VuY2UgdXBkYXRlcyBpbiB0aGUKICAgICAgICAgICAgICogc2FtZSByb29tIG9ubHkgbmVlZCBhIG5vcm1hbCBTZXJ2ZXIgQ29tcG9uZW50IHJlZnJlc2guCiAgICAgICAgICAgICAqLwogICAgICAgICAgICBzb2Z0UmVmcmVzaCgxMDApOw==', 'ICAgICAgICAgICAgLyoKICAgICAgICAgICAgICogU3RhdHVzIC8gaGVhcnRiZWF0IHVwZGF0ZXMgaW4gdGhlIHNhbWUgcm9vbSBkbyBub3QKICAgICAgICAgICAgICogcmVxdWlyZSBhIFNlcnZlciBDb21wb25lbnQgcmVmcmVzaC4gUmUtcmVuZGVyaW5nIHRoZQogICAgICAgICAgICAgKiB3aG9sZSAvZ2FtZSB0cmVlIG9uIGV2ZXJ5IHByZXNlbmNlIGhlYXJ0YmVhdCBjYW4gZGlzdHVyYgogICAgICAgICAgICAgKiBwZXJzaXN0ZW50IG1vYmlsZSBzaGVsbCBVSSBzdWNoIGFzIHRoZSBib3R0b20gbmF2aWdhdGlvbi4KICAgICAgICAgICAgICovCiAgICAgICAgICAgIHJldHVybjs=', 'Ignore same-room presence heartbeat'), ('ICAgICAgaWYgKHJlZnJlc2hUaW1lci5jdXJyZW50KSB7CiAgICAgICAgY2xlYXJUaW1lb3V0KAogICAgICAgICAgcmVmcmVzaFRpbWVyLmN1cnJlbnQsCiAgICAgICAgKTsKICAgICAgfQoK', '', 'Remove timer cleanup'), ('ICB9LCBbcm9vbUlkLCByb3V0ZXJdKTs=', 'ICB9LCBbcm9vbUlkXSk7', 'Remove router dependency')]

for old_b64, new_b64, label in pairs:
    old = base64.b64decode(old_b64).decode("utf-8")
    new = base64.b64decode(new_b64).decode("utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"{label}: expected 1 match, found {count}."
        )
    text = text.replace(old, new, 1)

PATH.write_text(text, encoding="utf-8")

print("✓ Removed /game heartbeat router.refresh()")
print("✓ Real room changes still force /game reload")
print("✓ Same-room presence/status updates no longer disturb the app shell")
print("")
print("Run: npm run build")
