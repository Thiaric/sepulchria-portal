from pathlib import Path
import subprocess

ROOT = Path.cwd()
EXPECTED = "4ccd21f"

def read(path: str) -> str:
    p = ROOT / path
    if not p.exists():
        raise SystemExit(f"ERROR: Missing expected file: {path}")
    return p.read_text(encoding="utf-8")

def write(path: str, content: str) -> None:
    p = ROOT / path
    p.write_text(content, encoding="utf-8", newline="\n")
    print(f"UPDATED {path}")

def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"ERROR: Expected exactly one match in {path}, found {count}."
        )
    write(path, text.replace(old, new, 1))

try:
    head = subprocess.check_output(
        ["git", "rev-parse", "--short", "HEAD"],
        cwd=ROOT,
        text=True,
    ).strip()
except Exception as exc:
    raise SystemExit(f"ERROR: Could not read git HEAD: {exc}")

if not head.startswith(EXPECTED):
    raise SystemExit(
        f"ERROR: This patch was built for {EXPECTED} (Codex in admin), "
        f"but your current HEAD is {head}. No files were changed."
    )

# 1. INSTANT CHAT fallback refresh
instant_path = "components/instant-chat/instant-chat-dock.tsx"

instant_marker = '''  useEffect(() => {
    if (
      !openChat ||
      chatMinimised
    ) {
      return;
    }

    window.requestAnimationFrame(
'''

instant_fallback = '''  useEffect(() => {
    if (
      !openChat ||
      chatMinimised
    ) {
      return;
    }

    const conversationId =
      openChat.conversationId;

    const refreshOpenConversation =
      () => {
        if (
          document.visibilityState !==
          "visible"
        ) {
          return;
        }

        void loadMessages(
          conversationId,
        );
        void markRead(
          conversationId,
        );
      };

    /*
     * Realtime remains the primary path.
     * This recovery loop catches the occasional missed
     * postgres_changes INSERT while a conversation is open.
     */
    const timer =
      window.setInterval(
        refreshOpenConversation,
        5_000,
      );

    const handleFocus =
      () =>
        refreshOpenConversation();

    const handleVisibility =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          refreshOpenConversation();
        }
      };

    window.addEventListener(
      "focus",
      handleFocus,
    );
    document.addEventListener(
      "visibilitychange",
      handleVisibility,
    );

    return () => {
      window.clearInterval(timer);
      window.removeEventListener(
        "focus",
        handleFocus,
      );
      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );
    };
  }, [
    openChat,
    chatMinimised,
    loadMessages,
    markRead,
  ]);

'''

text = read(instant_path)
if "Realtime remains the primary path." in text:
    raise SystemExit("ERROR: Instant Chat fallback already appears to be applied.")
if text.count(instant_marker) != 1:
    raise SystemExit(
        f"ERROR: Could not find the expected Instant Chat insertion point in {instant_path}."
    )
write(
    instant_path,
    text.replace(
        instant_marker,
        instant_fallback + instant_marker,
        1,
    ),
)

# 2. FORUM top action bar
forum_path = "components/forum/topic-post.tsx"
text = read(forum_path)

body_marker = '''          <div className="min-h-48 px-5 py-6 sm:px-7 sm:py-7">'''

if text.count(body_marker) != 1:
    raise SystemExit("ERROR: Could not find forum post body insertion point.")

footer_start_marker = '''          {showFooter ? (
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t'''

footer_start = text.find(footer_start_marker)
if footer_start == -1:
    raise SystemExit("ERROR: Could not find the existing forum footer action bar.")

footer_end_marker = '''            </footer>
          ) : null}'''

footer_end = text.find(
    footer_end_marker,
    footer_start,
)
if footer_end == -1:
    raise SystemExit("ERROR: Could not find the end of the forum footer action bar.")

footer_end += len(footer_end_marker)
footer_block = text[footer_start:footer_end]

top_block = footer_block.replace(
    '<footer className="flex flex-wrap items-center justify-between gap-3 border-t',
    '<div className="flex flex-wrap items-center justify-between gap-3 border-b',
    1,
).replace(
    "</footer>",
    "</div>",
    1,
)

if "Forum actions duplicated at top" in text:
    raise SystemExit("ERROR: Forum top actions already appear to be applied.")

top_block = (
    "          {/* Forum actions duplicated at top for long posts. */}\n"
    + top_block.lstrip()
    + "\n\n"
)

text = text.replace(
    body_marker,
    top_block + body_marker,
    1,
)
write(forum_path, text)

# 3. SKIN FONT sample in each actual card
skin_path = "components/portal/portal-skin-gallery.tsx"

skin_old = '''                    <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
                      {entry.description}
                    </p>
                  </div>
'''

skin_new = '''                    <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
                      {entry.description}
                    </p>

                    <div
                      data-portal-skin={entry.slug}
                      className="portal-skin-scope mt-4 border-t border-[rgb(var(--sep-colour-60482e))]/25 pt-3"
                    >
                      <p className="text-[7px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-756958))]">
                        Skin font
                      </p>
                      <p
                        className="mt-1 text-lg text-[rgb(var(--sep-colour-c9b58f))]"
                        style={{
                          fontFamily:
                            "var(--portal-font-body)",
                        }}
                      >
                        The Current remembers.
                      </p>
                    </div>
                  </div>
'''

replace_once(
    skin_path,
    skin_old,
    skin_new,
)

print()
print("Cumulative patch complete:")
print("1. Instant Chat open conversations now recover from missed realtime inserts.")
print("2. Forum post controls appear at both top and bottom.")
print("3. Each Appearance skin card shows its own font sample.")
print()
print("Run: npm run build")
