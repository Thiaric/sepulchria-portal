from pathlib import Path
import base64
import subprocess

BASE = "937d886751b040dbf8b832261e5a566626e6e53b"
root = Path.cwd()

def dec(value):
    return base64.b64decode(
        value.encode("ascii")
    ).decode("utf-8")

def fail(message):
    print(f"ERROR: {message}")
    raise SystemExit(1)

head = subprocess.check_output(
    ["git", "rev-parse", "HEAD"],
    cwd=root,
    text=True,
).strip()

if head != BASE:
    fail(
        f"This patch was built on pushed master {BASE}, "
        f"but local HEAD is {head}. No files were changed."
    )

paths = {
    "access": root / "lib/breeze-lodgings/access.ts",
    "context": root / "lib/portal/get-portal-context.ts",
    "types": root / "types/portal.ts",
    "header": root / "components/portal/portal-header.tsx",
    "counter": root / "components/portal/active-city-counter.tsx",
    "chronicle": root / "components/portal/live-dashboard-chronicle.tsx",
}

for path in paths.values():
    if not path.exists():
        fail(
            f"Missing required file: {path.relative_to(root)}. "
            "No files were changed."
        )

texts = {
    key: path.read_text(encoding="utf-8")
    for key, path in paths.items()
}

if "getBreezeLodgingVisibility" in texts["access"]:
    fail(
        "Breeze visibility helper already exists. "
        "No files were changed."
    )

replacements = {
    "context": [
        (dec("aW1wb3J0IHsKICBnZXRPcmRlckhlYWRxdWFydGVyc1Zpc2liaWxpdHksCn0gZnJvbSAiQC9saWIvb3JkZXItaGVhZHF1YXJ0ZXJzL2FjY2VzcyI7"), dec("aW1wb3J0IHsKICBnZXRPcmRlckhlYWRxdWFydGVyc1Zpc2liaWxpdHksCn0gZnJvbSAiQC9saWIvb3JkZXItaGVhZHF1YXJ0ZXJzL2FjY2VzcyI7CmltcG9ydCB7CiAgZ2V0QnJlZXplTG9kZ2luZ1Zpc2liaWxpdHksCn0gZnJvbSAiQC9saWIvYnJlZXplLWxvZGdpbmdzL2FjY2VzcyI7")),
        (dec("ICAgIGxldCB2aXNpYmxlT3JkZXJIZWFkcXVhcnRlcnNSb29tSWRzOgogICAgICBzdHJpbmdbXSA9IFtdOw=="), dec("ICAgIGxldCB2aXNpYmxlT3JkZXJIZWFkcXVhcnRlcnNSb29tSWRzOgogICAgICBzdHJpbmdbXSA9IFtdOwoKICAgIGxldCB2aXNpYmxlQnJlZXplTG9kZ2luZ1Jvb21JZHM6CiAgICAgIHN0cmluZ1tdID0gW107")),
        (dec("ICAgICAgY29uc3QgWwogICAgICAgIHZpc2libGVQcml2YXRlUmVzdWx0LAogICAgICAgIGhlYWRxdWFydGVyc1Zpc2liaWxpdHksCiAgICAgICAgcm9vbUFjY2VzcywKICAgICAgICB7CiAgICAgICAgICBkYXRhOiBwcmVzZW5jZURhdGEsCiAgICAgICAgICBlcnJvcjogcHJlc2VuY2VFcnJvciwKICAgICAgICB9LA=="), dec("ICAgICAgY29uc3QgWwogICAgICAgIHZpc2libGVQcml2YXRlUmVzdWx0LAogICAgICAgIGhlYWRxdWFydGVyc1Zpc2liaWxpdHksCiAgICAgICAgYnJlZXplTG9kZ2luZ1Zpc2liaWxpdHksCiAgICAgICAgcm9vbUFjY2VzcywKICAgICAgICB7CiAgICAgICAgICBkYXRhOiBwcmVzZW5jZURhdGEsCiAgICAgICAgICBlcnJvcjogcHJlc2VuY2VFcnJvciwKICAgICAgICB9LA==")),
        (dec("ICAgICAgICBnZXRPcmRlckhlYWRxdWFydGVyc1Zpc2liaWxpdHkoCiAgICAgICAgICBjaGFyYWN0ZXJJZCwKICAgICAgICApLAogICAgICAgIHJvb21BY2Nlc3NQcm9taXNlLAogICAgICAgIHN1cGFiYXNl"), dec("ICAgICAgICBnZXRPcmRlckhlYWRxdWFydGVyc1Zpc2liaWxpdHkoCiAgICAgICAgICBjaGFyYWN0ZXJJZCwKICAgICAgICApLAogICAgICAgIGdldEJyZWV6ZUxvZGdpbmdWaXNpYmlsaXR5KAogICAgICAgICAgY2hhcmFjdGVySWQsCiAgICAgICAgKSwKICAgICAgICByb29tQWNjZXNzUHJvbWlzZSwKICAgICAgICBzdXBhYmFzZQ==")),
        (dec("ICAgICAgdmlzaWJsZU9yZGVySGVhZHF1YXJ0ZXJzUm9vbUlkcyA9CiAgICAgICAgaGVhZHF1YXJ0ZXJzVmlzaWJpbGl0eS52aXNpYmxlUm9vbUlkczsKCiAgICAgIGlmIChyb29tQWNjZXNzKSB7"), dec("ICAgICAgdmlzaWJsZU9yZGVySGVhZHF1YXJ0ZXJzUm9vbUlkcyA9CiAgICAgICAgaGVhZHF1YXJ0ZXJzVmlzaWJpbGl0eS52aXNpYmxlUm9vbUlkczsKCiAgICAgIHZpc2libGVCcmVlemVMb2RnaW5nUm9vbUlkcyA9CiAgICAgICAgYnJlZXplTG9kZ2luZ1Zpc2liaWxpdHkudmlzaWJsZVJvb21JZHM7CgogICAgICBpZiAocm9vbUFjY2Vzcykgew==")),
        (dec("ICAgICAgICBhbGxPcmRlckhlYWRxdWFydGVyc1Jvb21JZHMsCiAgICAgICAgdmlzaWJsZU9yZGVySGVhZHF1YXJ0ZXJzUm9vbUlkcywKICAgICAgfTs="), dec("ICAgICAgICBhbGxPcmRlckhlYWRxdWFydGVyc1Jvb21JZHMsCiAgICAgICAgdmlzaWJsZU9yZGVySGVhZHF1YXJ0ZXJzUm9vbUlkcywKICAgICAgICB2aXNpYmxlQnJlZXplTG9kZ2luZ1Jvb21JZHMsCiAgICAgIH07")),
        (dec("ICAgICAgYWxsT3JkZXJIZWFkcXVhcnRlcnNSb29tSWRzLAogICAgICB2aXNpYmxlT3JkZXJIZWFkcXVhcnRlcnNSb29tSWRzLAogICAgfTs="), dec("ICAgICAgYWxsT3JkZXJIZWFkcXVhcnRlcnNSb29tSWRzLAogICAgICB2aXNpYmxlT3JkZXJIZWFkcXVhcnRlcnNSb29tSWRzLAogICAgICB2aXNpYmxlQnJlZXplTG9kZ2luZ1Jvb21JZHMsCiAgICB9Ow==")),
    ],
    "types": [
        (dec("ICBhbGxPcmRlckhlYWRxdWFydGVyc1Jvb21JZHM6IHN0cmluZ1tdOwogIHZpc2libGVPcmRlckhlYWRxdWFydGVyc1Jvb21JZHM6IHN0cmluZ1tdOwp9Ow=="), dec("ICBhbGxPcmRlckhlYWRxdWFydGVyc1Jvb21JZHM6IHN0cmluZ1tdOwogIHZpc2libGVPcmRlckhlYWRxdWFydGVyc1Jvb21JZHM6IHN0cmluZ1tdOwogIHZpc2libGVCcmVlemVMb2RnaW5nUm9vbUlkczogc3RyaW5nW107Cn07")),
    ],
    "header": [
        (dec("ICAgICAgICAgICAgICB2aXNpYmxlT3JkZXJIZWFkcXVhcnRlcnNSb29tSWRzPXsKICAgICAgICAgICAgICAgIGNvbnRleHQudmlzaWJsZU9yZGVySGVhZHF1YXJ0ZXJzUm9vbUlkcwogICAgICAgICAgICAgIH0KICAgICAgICAgICAgLz4="), dec("ICAgICAgICAgICAgICB2aXNpYmxlT3JkZXJIZWFkcXVhcnRlcnNSb29tSWRzPXsKICAgICAgICAgICAgICAgIGNvbnRleHQudmlzaWJsZU9yZGVySGVhZHF1YXJ0ZXJzUm9vbUlkcwogICAgICAgICAgICAgIH0KICAgICAgICAgICAgICB2aXNpYmxlQnJlZXplTG9kZ2luZ1Jvb21JZHM9ewogICAgICAgICAgICAgICAgY29udGV4dC52aXNpYmxlQnJlZXplTG9kZ2luZ1Jvb21JZHMKICAgICAgICAgICAgICB9CiAgICAgICAgICAgIC8+")),
    ],
    "counter": [
        (dec("ICBhbGxPcmRlckhlYWRxdWFydGVyc1Jvb21JZHM6IHN0cmluZ1tdOwogIHZpc2libGVPcmRlckhlYWRxdWFydGVyc1Jvb21JZHM6IHN0cmluZ1tdOwp9Ow=="), dec("ICBhbGxPcmRlckhlYWRxdWFydGVyc1Jvb21JZHM6IHN0cmluZ1tdOwogIHZpc2libGVPcmRlckhlYWRxdWFydGVyc1Jvb21JZHM6IHN0cmluZ1tdOwogIHZpc2libGVCcmVlemVMb2RnaW5nUm9vbUlkczogc3RyaW5nW107Cn07")),
        (dec("ICB2aXNpYmxlUHJpdmF0ZVJvb21JZHMsCiAgYWxsT3JkZXJIZWFkcXVhcnRlcnNSb29tSWRzLAogIHZpc2libGVPcmRlckhlYWRxdWFydGVyc1Jvb21JZHMsCn06IEFjdGl2ZUNpdHlDb3VudGVyUHJvcHMpIHs="), dec("ICB2aXNpYmxlUHJpdmF0ZVJvb21JZHMsCiAgYWxsT3JkZXJIZWFkcXVhcnRlcnNSb29tSWRzLAogIHZpc2libGVPcmRlckhlYWRxdWFydGVyc1Jvb21JZHMsCiAgdmlzaWJsZUJyZWV6ZUxvZGdpbmdSb29tSWRzLAp9OiBBY3RpdmVDaXR5Q291bnRlclByb3BzKSB7")),
        (dec("ICBjb25zdCB2aXNpYmxlT3JkZXJIZWFkcXVhcnRlcnNSb29tSWRTZXQgPQogICAgdXNlTWVtbygKICAgICAgKCkgPT4KICAgICAgICBuZXcgU2V0KAogICAgICAgICAgdmlzaWJsZU9yZGVySGVhZHF1YXJ0ZXJzUm9vbUlkcywKICAgICAgICApLAogICAgICBbdmlzaWJsZU9yZGVySGVhZHF1YXJ0ZXJzUm9vbUlkc10sCiAgICApOwoKICBjb25zdCByZWZyZXNoUHJlc2VuY2UgPQ=="), dec("ICBjb25zdCB2aXNpYmxlT3JkZXJIZWFkcXVhcnRlcnNSb29tSWRTZXQgPQogICAgdXNlTWVtbygKICAgICAgKCkgPT4KICAgICAgICBuZXcgU2V0KAogICAgICAgICAgdmlzaWJsZU9yZGVySGVhZHF1YXJ0ZXJzUm9vbUlkcywKICAgICAgICApLAogICAgICBbdmlzaWJsZU9yZGVySGVhZHF1YXJ0ZXJzUm9vbUlkc10sCiAgICApOwoKICBjb25zdCB2aXNpYmxlQnJlZXplTG9kZ2luZ1Jvb21JZFNldCA9CiAgICB1c2VNZW1vKAogICAgICAoKSA9PgogICAgICAgIG5ldyBTZXQoCiAgICAgICAgICB2aXNpYmxlQnJlZXplTG9kZ2luZ1Jvb21JZHMsCiAgICAgICAgKSwKICAgICAgW3Zpc2libGVCcmVlemVMb2RnaW5nUm9vbUlkc10sCiAgICApOwoKICBjb25zdCByZWZyZXNoUHJlc2VuY2UgPQ==")),
        (dec("ICAgICAgICAgICAgICAgIHZpc2libGVPcmRlckhlYWRxdWFydGVyc1Jvb21JZFNldC5oYXMoCiAgICAgICAgICAgICAgICAgIHJvb20uaWQsCiAgICAgICAgICAgICAgICApCiAgICAgICAgICAgICAgKQogICAgICAgICAgICApOw=="), dec("ICAgICAgICAgICAgICAgIHZpc2libGVPcmRlckhlYWRxdWFydGVyc1Jvb21JZFNldC5oYXMoCiAgICAgICAgICAgICAgICAgIHJvb20uaWQsCiAgICAgICAgICAgICAgICApIHx8CiAgICAgICAgICAgICAgICB2aXNpYmxlQnJlZXplTG9kZ2luZ1Jvb21JZFNldC5oYXMoCiAgICAgICAgICAgICAgICAgIHJvb20uaWQsCiAgICAgICAgICAgICAgICApCiAgICAgICAgICAgICAgKQogICAgICAgICAgICApOw==")),
        (dec("ICAgICAgdmlzaWJsZVByaXZhdGVSb29tSWRTZXQsCiAgICAgIGFsbE9yZGVySGVhZHF1YXJ0ZXJzUm9vbUlkU2V0LAogICAgICB2aXNpYmxlT3JkZXJIZWFkcXVhcnRlcnNSb29tSWRTZXQsCiAgICBdKTs="), dec("ICAgICAgdmlzaWJsZVByaXZhdGVSb29tSWRTZXQsCiAgICAgIGFsbE9yZGVySGVhZHF1YXJ0ZXJzUm9vbUlkU2V0LAogICAgICB2aXNpYmxlT3JkZXJIZWFkcXVhcnRlcnNSb29tSWRTZXQsCiAgICAgIHZpc2libGVCcmVlemVMb2RnaW5nUm9vbUlkU2V0LAogICAgXSk7")),
    ],
    "chronicle": [
        (dec("ICAgICAgICBpZiAoCiAgICAgICAgICBhcmVhPy5zbHVnID09PQogICAgICAgICAgICAicHJpdmF0ZS1sb2NhdGlvbnMiICYmCiAgICAgICAgICAhY29udGV4dC5wcml2YXRlTG9jYXRpb25zLnNvbWUoCiAgICAgICAgICAgIChsb2NhdGlvbikgPT4KICAgICAgICAgICAgICBsb2NhdGlvbi5yb29tSWQgPT09CiAgICAgICAgICAgICAgcm9vbS5pZCwKICAgICAgICAgICkKICAgICAgICApIHsKICAgICAgICAgIGNvbnRpbnVlOwogICAgICAgIH0="), dec("ICAgICAgICBpZiAoCiAgICAgICAgICBhcmVhPy5zbHVnID09PQogICAgICAgICAgICAicHJpdmF0ZS1sb2NhdGlvbnMiICYmCiAgICAgICAgICAhY29udGV4dC5pc1N0YWZmICYmCiAgICAgICAgICAhY29udGV4dC5wcml2YXRlTG9jYXRpb25zLnNvbWUoCiAgICAgICAgICAgIChsb2NhdGlvbikgPT4KICAgICAgICAgICAgICBsb2NhdGlvbi5yb29tSWQgPT09CiAgICAgICAgICAgICAgcm9vbS5pZCwKICAgICAgICAgICkgJiYKICAgICAgICAgICFjb250ZXh0LnZpc2libGVCcmVlemVMb2RnaW5nUm9vbUlkcy5pbmNsdWRlcygKICAgICAgICAgICAgcm9vbS5pZCwKICAgICAgICAgICkKICAgICAgICApIHsKICAgICAgICAgIGNvbnRpbnVlOwogICAgICAgIH0=")),
        (dec("ICAgICAgY29udGV4dC5wcml2YXRlTG9jYXRpb25zLAogICAgICBjb250ZXh0LmFsbE9yZGVySGVhZHF1YXJ0ZXJzUm9vbUlkcywKICAgICAgY29udGV4dC52aXNpYmxlT3JkZXJIZWFkcXVhcnRlcnNSb29tSWRzLAogICAgICBjb250ZXh0LmlzU3RhZmYsCiAgICBdKTs="), dec("ICAgICAgY29udGV4dC5wcml2YXRlTG9jYXRpb25zLAogICAgICBjb250ZXh0LmFsbE9yZGVySGVhZHF1YXJ0ZXJzUm9vbUlkcywKICAgICAgY29udGV4dC52aXNpYmxlT3JkZXJIZWFkcXVhcnRlcnNSb29tSWRzLAogICAgICBjb250ZXh0LnZpc2libGVCcmVlemVMb2RnaW5nUm9vbUlkcywKICAgICAgY29udGV4dC5pc1N0YWZmLAogICAgXSk7")),
    ],
}

# Some ActiveCityCounter visibility blocks occur twice
# (search filtering and rendered cards). Both must gain Breeze access.
counter_visibility_old_text = dec("ICAgICAgICAgICAgICAgIHZpc2libGVPcmRlckhlYWRxdWFydGVyc1Jvb21JZFNldC5oYXMoCiAgICAgICAgICAgICAgICAgIHJvb20uaWQsCiAgICAgICAgICAgICAgICApCiAgICAgICAgICAgICAgKQogICAgICAgICAgICApOw==")
if texts["counter"].count(counter_visibility_old_text) != 2:
    fail(
        "Expected exactly two ActiveCityCounter private-room visibility anchors. "
        "No files were changed."
    )

for key, pairs in replacements.items():
    for old, new in pairs:
        if key == "counter" and old == counter_visibility_old_text:
            continue
        count = texts[key].count(old)
        if count != 1:
            fail(
                f"Expected exactly one anchor in {paths[key].relative_to(root)}, "
                f"found {count}. No files were changed."
            )

new_texts = dict(texts)

# Append server-side Breeze visibility helper.
new_texts["access"] = (
    new_texts["access"].rstrip()
    + "\n"
    + dec("CmV4cG9ydCB0eXBlIEJyZWV6ZUxvZGdpbmdWaXNpYmlsaXR5ID0gewogIGFsbFJvb21JZHM6IHN0cmluZ1tdOwogIHZpc2libGVSb29tSWRzOiBzdHJpbmdbXTsKfTsKCmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRCcmVlemVMb2RnaW5nVmlzaWJpbGl0eSgKICBjaGFyYWN0ZXJJZDogc3RyaW5nLAopOiBQcm9taXNlPEJyZWV6ZUxvZGdpbmdWaXNpYmlsaXR5PiB7CiAgY29uc3QgYWRtaW4gPQogICAgY3JlYXRlUHJpdmlsZWdlZENsaWVudCgpOwoKICBhd2FpdCBhZG1pbi5ycGMoCiAgICAiZXhwaXJlX2JyZWV6ZV9sb2RnaW5nX3JlbnRhbHMiLAogICk7CgogIGNvbnN0IHsKICAgIGRhdGE6IGxvZGdpbmdSb29tcywKICAgIGVycm9yOiBsb2RnaW5nUm9vbXNFcnJvciwKICB9ID0gYXdhaXQgYWRtaW4KICAgIC5mcm9tKCJicmVlemVfbG9kZ2luZ19yb29tcyIpCiAgICAuc2VsZWN0KCJyb29tX2lkIik7CgogIGlmIChsb2RnaW5nUm9vbXNFcnJvcikgewogICAgdGhyb3cgbmV3IEVycm9yKAogICAgICBgVW5hYmxlIHRvIGxvYWQgQnJlZXplIExvZGdpbmdzIHJvb21zOiAke2xvZGdpbmdSb29tc0Vycm9yLm1lc3NhZ2V9YCwKICAgICk7CiAgfQoKICBjb25zdCBhbGxSb29tSWRzID0gWwogICAgLi4ubmV3IFNldCgKICAgICAgKGxvZGdpbmdSb29tcyA/PyBbXSkubWFwKAogICAgICAgIChyb3cpID0+IFN0cmluZyhyb3cucm9vbV9pZCksCiAgICAgICksCiAgICApLAogIF07CgogIGNvbnN0IHN0YWZmID0KICAgIGF3YWl0IGdldFN0YWZmU2Vzc2lvbigpOwoKICBpZiAoc3RhZmYpIHsKICAgIHJldHVybiB7CiAgICAgIGFsbFJvb21JZHMsCiAgICAgIHZpc2libGVSb29tSWRzOiBhbGxSb29tSWRzLAogICAgfTsKICB9CgogIGNvbnN0IG5vdyA9CiAgICBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7CgogIGNvbnN0IHsKICAgIGRhdGE6IG93bmVkUmVudGFscywKICAgIGVycm9yOiBvd25lZFJlbnRhbHNFcnJvciwKICB9ID0gYXdhaXQgYWRtaW4KICAgIC5mcm9tKCJicmVlemVfbG9kZ2luZ19yZW50YWxzIikKICAgIC5zZWxlY3QoImlkLCByb29tX2lkIikKICAgIC5lcSgKICAgICAgIm93bmVyX2NoYXJhY3Rlcl9pZCIsCiAgICAgIGNoYXJhY3RlcklkLAogICAgKQogICAgLmVxKCJzdGF0dXMiLCAiYWN0aXZlIikKICAgIC5ndCgiZW5kc19hdCIsIG5vdyk7CgogIGlmIChvd25lZFJlbnRhbHNFcnJvcikgewogICAgdGhyb3cgbmV3IEVycm9yKAogICAgICBgVW5hYmxlIHRvIGxvYWQgb3duZWQgQnJlZXplIExvZGdpbmdzIHJvb21zOiAke293bmVkUmVudGFsc0Vycm9yLm1lc3NhZ2V9YCwKICAgICk7CiAgfQoKICBjb25zdCB7CiAgICBkYXRhOiBndWVzdFJvd3MsCiAgICBlcnJvcjogZ3Vlc3RSb3dzRXJyb3IsCiAgfSA9IGF3YWl0IGFkbWluCiAgICAuZnJvbSgiYnJlZXplX2xvZGdpbmdfZ3Vlc3RzIikKICAgIC5zZWxlY3QoCiAgICAgICJyZW50YWxfaWQsIHJlbnRhbDpicmVlemVfbG9kZ2luZ19yZW50YWxzIWJyZWV6ZV9sb2RnaW5nX2d1ZXN0c19yZW50YWxfaWRfZmtleShyb29tX2lkLCBzdGF0dXMsIGVuZHNfYXQpIiwKICAgICkKICAgIC5lcSgKICAgICAgImNoYXJhY3Rlcl9pZCIsCiAgICAgIGNoYXJhY3RlcklkLAogICAgKQogICAgLmVxKCJzdGF0dXMiLCAiYWN0aXZlIik7CgogIGlmIChndWVzdFJvd3NFcnJvcikgewogICAgdGhyb3cgbmV3IEVycm9yKAogICAgICBgVW5hYmxlIHRvIGxvYWQgQnJlZXplIExvZGdpbmdzIGd1ZXN0IHZpc2liaWxpdHk6ICR7Z3Vlc3RSb3dzRXJyb3IubWVzc2FnZX1gLAogICAgKTsKICB9CgogIGNvbnN0IHZpc2libGUgPSBuZXcgU2V0PHN0cmluZz4oCiAgICAob3duZWRSZW50YWxzID8/IFtdKS5tYXAoCiAgICAgIChyZW50YWwpID0+CiAgICAgICAgU3RyaW5nKHJlbnRhbC5yb29tX2lkKSwKICAgICksCiAgKTsKCiAgZm9yIChjb25zdCByb3cgb2YgZ3Vlc3RSb3dzID8/IFtdKSB7CiAgICBjb25zdCByZWxhdGlvbiA9CiAgICAgIEFycmF5LmlzQXJyYXkocm93LnJlbnRhbCkKICAgICAgICA/IHJvdy5yZW50YWxbMF0gPz8gbnVsbAogICAgICAgIDogcm93LnJlbnRhbDsKCiAgICBpZiAoCiAgICAgIHJlbGF0aW9uICYmCiAgICAgIHJlbGF0aW9uLnN0YXR1cyA9PT0gImFjdGl2ZSIgJiYKICAgICAgcmVsYXRpb24uZW5kc19hdCAmJgogICAgICByZWxhdGlvbi5lbmRzX2F0ID4gbm93CiAgICApIHsKICAgICAgdmlzaWJsZS5hZGQoCiAgICAgICAgU3RyaW5nKHJlbGF0aW9uLnJvb21faWQpLAogICAgICApOwogICAgfQogIH0KCiAgcmV0dXJuIHsKICAgIGFsbFJvb21JZHMsCiAgICB2aXNpYmxlUm9vbUlkczogWwogICAgICAuLi52aXNpYmxlLAogICAgXSwKICB9Owp9Cg==")
    + "\n"
)

for key, pairs in replacements.items():
    for old, new in pairs:
        if key == "counter" and old == counter_visibility_old_text:
            continue
        new_texts[key] = new_texts[key].replace(
            old,
            new,
            1,
        )

new_texts["counter"] = new_texts["counter"].replace(
    counter_visibility_old_text,
    dec("ICAgICAgICAgICAgICAgIHZpc2libGVPcmRlckhlYWRxdWFydGVyc1Jvb21JZFNldC5oYXMoCiAgICAgICAgICAgICAgICAgIHJvb20uaWQsCiAgICAgICAgICAgICAgICApIHx8CiAgICAgICAgICAgICAgICB2aXNpYmxlQnJlZXplTG9kZ2luZ1Jvb21JZFNldC5oYXMoCiAgICAgICAgICAgICAgICAgIHJvb20uaWQsCiAgICAgICAgICAgICAgICApCiAgICAgICAgICAgICAgKQogICAgICAgICAgICApOw=="),
)

# Sanity checks before writing.
for needle, key in [
    ("visibleBreezeLodgingRoomIds", "context"),
    ("visibleBreezeLodgingRoomIds", "types"),
    ("visibleBreezeLodgingRoomIds", "header"),
    ("visibleBreezeLodgingRoomIdSet", "counter"),
    ("visibleBreezeLodgingRoomIds", "chronicle"),
]:
    if needle not in new_texts[key]:
        fail(
            f"Internal validation failed for {paths[key].relative_to(root)}. "
            "No files were changed."
        )

# Write only after every anchor has validated.
for key, path in paths.items():
    path.write_text(
        new_texts[key],
        encoding="utf-8",
    )

print("Breeze Lodgings presence visibility patch applied successfully.")
print("Changed files:")
for key in [
    "access",
    "context",
    "types",
    "header",
    "counter",
    "chronicle",
]:
    print(" -", paths[key].relative_to(root))
print()
print("No SQL is required.")
print("Next: npm run build")
