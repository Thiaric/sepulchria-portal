from pathlib import Path
import subprocess

ROOT = Path.cwd()
EXPECTED = "5022e38"

head = subprocess.check_output(
    ["git", "rev-parse", "--short", "HEAD"],
    text=True,
).strip()

if head != EXPECTED:
    raise SystemExit(
        f"Expected HEAD {EXPECTED}, found {head}. "
        "Refusing to patch a different baseline."
    )

dock = ROOT / "components/instant-chat/instant-chat-dock.tsx"
runtime = ROOT / "components/cosmetics/cosmetic-runtime.tsx"

for path in (dock, runtime):
    if not path.exists():
        raise SystemExit(f"Missing required file: {path}")

dock_text = dock.read_text(encoding="utf-8")
runtime_text = runtime.read_text(encoding="utf-8")

old_dock = """                        <div
                          data-cosmetic-character-id={message.sender_character_id}
                          data-cosmetic-surface="instant"
                          className={`max-w-[82%] border px-2 py-1.5 text-[10px] leading-4 ${
                            own
                              ? "border-[rgb(var(--sep-colour-80613c))] bg-[rgb(var(--sep-colour-2c2117))] text-[rgb(var(--sep-colour-dcc8a8))]"
                              : "border-[rgb(var(--sep-colour-514233))] bg-[rgb(var(--sep-colour-17120f))] text-[rgb(var(--sep-colour-c5b59c))]"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {
                              message.body
                            }
                          </p>

                          <time className="mt-0.5 block text-right text-[6px] leading-none text-[rgb(var(--sep-colour-746858))]">
                            {new Date(
                              message.created_at,
                            ).toLocaleTimeString(
                              "en-GB",
                              {
                                hour: "2-digit",
                                minute:
                                  "2-digit",
                              },
                            )}
                          </time>
                        </div>
"""

new_dock = """                        <div
                          data-cosmetic-character-id={message.sender_character_id}
                          data-cosmetic-surface="instant"
                          className="relative max-w-[82%] overflow-visible"
                        >
                          <div
                            className={`border px-2 py-1.5 text-[10px] leading-4 ${
                              own
                                ? "border-[rgb(var(--sep-colour-80613c))] bg-[rgb(var(--sep-colour-2c2117))] text-[rgb(var(--sep-colour-dcc8a8))]"
                                : "border-[rgb(var(--sep-colour-514233))] bg-[rgb(var(--sep-colour-17120f))] text-[rgb(var(--sep-colour-c5b59c))]"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">
                              {
                                message.body
                              }
                            </p>

                            <time className="mt-0.5 block text-right text-[6px] leading-none text-[rgb(var(--sep-colour-746858))]">
                              {new Date(
                                message.created_at,
                              ).toLocaleTimeString(
                                "en-GB",
                                {
                                  hour: "2-digit",
                                  minute:
                                    "2-digit",
                                },
                              )}
                            </time>
                          </div>
                        </div>
"""

old_runtime = """      [data-cosmetic-surface="instant"][data-has-instant-chat-frame="true"] {
        padding: 7px 10px !important;
      }

      [data-cosmetic-surface="instant"][data-has-instant-chat-frame="true"]::after {
        inset: -2px;
        border: 10px solid transparent;
        border-image-source: var(--sep-cosmetic-instant-chat-frame);
        border-image-slice: 15% 10%;
        border-image-width: 1;
        border-image-repeat: stretch;
      }
"""

new_runtime = """      [data-cosmetic-surface="instant"][data-has-instant-chat-frame="true"] {
        position: relative !important;
        isolation: isolate;
        overflow: visible !important;
      }

      [data-cosmetic-surface="instant"][data-has-instant-chat-frame="true"]::after {
        inset: -10px -8px;
        border: 10px solid transparent;
        border-image-source: var(--sep-cosmetic-instant-chat-frame);
        border-image-slice: 15% 10%;
        border-image-width: 1;
        border-image-repeat: stretch;
      }
"""

dock_count = dock_text.count(old_dock)
runtime_count = runtime_text.count(old_runtime)

if dock_count != 1 or runtime_count != 1:
    raise SystemExit(
        "Validation failed; nothing changed. "
        f"Instant Chat JSX matches: {dock_count}; "
        f"Instant Chat CSS matches: {runtime_count}."
    )

# All validation passed. Write both files only now.
dock.write_text(
    dock_text.replace(old_dock, new_dock, 1),
    encoding="utf-8",
)
runtime.write_text(
    runtime_text.replace(old_runtime, new_runtime, 1),
    encoding="utf-8",
)

print("✓ Instant Chat frame rebuilt from exact 5022e38 baseline")
print("  - cosmetic moved to dedicated wrapper")
print("  - original bubble padding restored")
print("  - no forum code touched")
print("  - no regex/anchor insertion used")
print("  - adaptive 9-slice retained")
print("  - starting inset: -10px -8px")
