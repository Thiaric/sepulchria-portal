from pathlib import Path
import re

PATH = Path("components/portal/portal-sidebar.tsx")

def die(msg: str) -> None:
    raise SystemExit(f"ERROR: {msg}\nNo changes were made.")

if not PATH.exists():
    die(f"{PATH} not found. Run this from the repository root.")

text = PATH.read_text(encoding="utf-8")

# Target ONLY the PublicPageModal Play Tutorial button beside the window controls.
needle = """                onClick={() => {
                  iframeRef.current
                    ?.contentWindow
                    ?.dispatchEvent(
                      new Event(
                        "sepulchria:play-tutorial",
                      ),
                    );
                }}"""

if text.count(needle) != 1:
    die(f"Could not uniquely find modal Play Tutorial click handler (matches: {text.count(needle)}).")

if 'data-modal-play-tutorial="true"' in text:
    die("This direct hover patch appears to already be applied.")

replacement = needle + """
                data-modal-play-tutorial="true"
                onMouseEnter={(event) => {
                  const el = event.currentTarget;
                  el.style.setProperty(
                    "border-color",
                    "rgb(var(--sep-skin-c1))",
                    "important",
                  );
                  el.style.setProperty(
                    "background-color",
                    "rgb(var(--sep-skin-c1) / 0.22)",
                    "important",
                  );
                  el.style.setProperty(
                    "color",
                    "rgb(var(--sep-skin-c2))",
                    "important",
                  );
                  el.style.setProperty(
                    "-webkit-text-fill-color",
                    "rgb(var(--sep-skin-c2))",
                    "important",
                  );
                }}
                onMouseLeave={(event) => {
                  const el = event.currentTarget;
                  el.style.removeProperty("border-color");
                  el.style.removeProperty("background-color");
                  el.style.removeProperty("color");
                  el.style.removeProperty("-webkit-text-fill-color");
                }}"""

new_text = text.replace(needle, replacement, 1)
PATH.write_text(new_text, encoding="utf-8")

print("SUCCESS")
print(f"Updated: {PATH}")
print("Added direct !important hover styles to the modal Play Tutorial button.")
print("No CSS file changes.")
print("Next: npm run build")
