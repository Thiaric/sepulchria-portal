from pathlib import Path
import subprocess, base64

BASE = "dd02903"
PATH = Path("components/portal/mobile-portal-navigation.tsx")

head = subprocess.check_output(
    ["git", "rev-parse", "--short", "HEAD"],
    text=True,
).strip()

if head != BASE:
    raise SystemExit(
        f"Wrong baseline: HEAD is {head}, expected {BASE}."
    )

if not PATH.exists():
    raise SystemExit(
        "Missing components/portal/mobile-portal-navigation.tsx"
    )

text = PATH.read_text(encoding="utf-8")
pairs = [('ICBjb25zdCBwYXRobmFtZSA9IHVzZVBhdGhuYW1lKCk7CiAgY29uc3Qgc2VhcmNoUGFyYW1zID0gdXNlU2VhcmNoUGFyYW1zKCk7CiAgY29uc3Qgbm90aWZpY2F0aW9uQ291bnRzID0KICAgIHVzZVBvcnRhbE5vdGlmaWNhdGlvbkNvdW50cygpOwoKICBjb25zdCBbbW9yZU9wZW4sIHNldE1vcmVPcGVuXSA9CiAgICB1c2VTdGF0ZShmYWxzZSk7', 'ICBjb25zdCBwYXRobmFtZSA9IHVzZVBhdGhuYW1lKCk7CiAgY29uc3Qgc2VhcmNoUGFyYW1zID0gdXNlU2VhcmNoUGFyYW1zKCk7CiAgY29uc3Qgbm90aWZpY2F0aW9uQ291bnRzID0KICAgIHVzZVBvcnRhbE5vdGlmaWNhdGlvbkNvdW50cygpOwoKICBjb25zdCBbCiAgICByZW5kZXJNb2JpbGVOYXZpZ2F0aW9uLAogICAgc2V0UmVuZGVyTW9iaWxlTmF2aWdhdGlvbiwKICBdID0gdXNlU3RhdGUoZmFsc2UpOwoKICBjb25zdCBbbW9yZU9wZW4sIHNldE1vcmVPcGVuXSA9CiAgICB1c2VTdGF0ZShmYWxzZSk7', 'Add top-level render state'), ('ICBjb25zdCBtYXBPcGVuID0KICAgIHNlYXJjaFBhcmFtcy5nZXQoIm1hcCIpID09PQogICAgInNlcHVsY2hyaWEiOwoKICB1c2VFZmZlY3QoKCkgPT4gewogICAgc2V0TW9yZU9wZW4oZmFsc2UpOwogIH0sIFtwYXRobmFtZSwgc2VhcmNoUGFyYW1zXSk7', 'ICBjb25zdCBtYXBPcGVuID0KICAgIHNlYXJjaFBhcmFtcy5nZXQoIm1hcCIpID09PQogICAgInNlcHVsY2hyaWEiOwoKICB1c2VFZmZlY3QoKCkgPT4gewogICAgLyoKICAgICAqIFBvcnRhbCBtb2RhbHMgcmVuZGVyIHBvcnRhbCByb3V0ZXMgaW5zaWRlIGFuIGlmcmFtZS4KICAgICAqIFRoZSBtb2JpbGUgYm90dG9tIG5hdmlnYXRpb24gYmVsb25ncyBvbmx5IHRvIHRoZQogICAgICogdG9wLWxldmVsIHBvcnRhbCwgbmV2ZXIgdG8gbW9kYWwgaWZyYW1lIGNvbnRlbnQuCiAgICAgKi8KICAgIHNldFJlbmRlck1vYmlsZU5hdmlnYXRpb24oCiAgICAgIHdpbmRvdy5zZWxmID09PSB3aW5kb3cudG9wLAogICAgKTsKICB9LCBbXSk7CgogIHVzZUVmZmVjdCgoKSA9PiB7CiAgICBzZXRNb3JlT3BlbihmYWxzZSk7CiAgfSwgW3BhdGhuYW1lLCBzZWFyY2hQYXJhbXNdKTs=', 'Detect modal iframe context'), ('ICBjb25zdCBjbG9zZU1vcmUgPSAoKSA9PiB7CiAgICBzZXRNb3JlT3BlbihmYWxzZSk7CiAgfTsKCiAgcmV0dXJuICgKICAgIDw+', 'ICBjb25zdCBjbG9zZU1vcmUgPSAoKSA9PiB7CiAgICBzZXRNb3JlT3BlbihmYWxzZSk7CiAgfTsKCiAgaWYgKCFyZW5kZXJNb2JpbGVOYXZpZ2F0aW9uKSB7CiAgICByZXR1cm4gbnVsbDsKICB9CgogIHJldHVybiAoCiAgICA8Pg==', 'Suppress mobile navigation in modal iframe')]

for old_b64, new_b64, label in pairs:
    old = base64.b64decode(old_b64).decode("utf-8")
    new = base64.b64decode(new_b64).decode("utf-8")
    count = text.count(old)

    if count != 1:
        raise SystemExit(
            f"{label}: expected 1 match, found {count}. "
            f"Expected baseline {BASE}."
        )

    text = text.replace(old, new, 1)

PATH.write_text(text, encoding="utf-8")

print("✓ Baseline verified:", BASE)
print("✓ Mobile bottom bar renders only in the top-level portal")
print("✓ Modal iframe content renders no mobile bottom bar")
print("✓ Applies automatically to every portal modal")
print("")
print("Run: npm run build")
