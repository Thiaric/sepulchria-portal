from __future__ import annotations

from pathlib import Path
import subprocess
import sys

EXPECTED_HEAD = "733842aa3331f6df12b5dc2e0857bcef6725086f"
ROOT = Path.cwd()
TARGET = ROOT / "components/portal/portal-sidebar.tsx"

def fail(message: str) -> None:
    print(f"\nERROR: {message}\n")
    sys.exit(1)

try:
    head = subprocess.check_output(
        ["git", "rev-parse", "HEAD"],
        cwd=ROOT,
        text=True,
    ).strip()
except Exception as exc:
    fail(f"Could not read git HEAD: {exc}")

if head != EXPECTED_HEAD:
    fail(
        "This patch was built specifically for commit 733842a.\n"
        f"Expected HEAD: {EXPECTED_HEAD}\n"
        f"Actual HEAD:   {head}\n"
        "Do not apply it to a different revision."
    )

if not TARGET.exists():
    fail("Missing components/portal/portal-sidebar.tsx")

text = TARGET.read_text(encoding="utf-8")

old_scroll_block = '''              /*
               * Hash-aware modal scrolling.
               *
               * Native iframe anchor scrolling is usually enough once
               * the URL is constructed correctly, but some portal pages
               * finish rendering or rearranging content after load.
               *
               * Retry briefly so links such as:
               *   /missions#mission-...
               *   /polls#poll-...
               *   /character?...#...
               *   /ranking#...
               * and any future modal hash target land on the intended
               * element rather than at the top of the modal.
               */
              const rawHash =
                iframe.contentWindow
                  ?.location.hash
                  .slice(1) ?? "";

              if (rawHash) {
                let targetId = rawHash;

                try {
                  targetId =
                    decodeURIComponent(
                      rawHash,
                    );
                } catch {
                  // Keep the raw hash if decoding fails.
                }

                let scrollAttempt = 0;
                const maxScrollAttempts = 12;

                const scrollToHashTarget =
                  () => {
                    const target =
                      doc.getElementById(
                        targetId,
                      );

                    if (target) {
                      target.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                        inline: "nearest",
                      });

                      return;
                    }

                    scrollAttempt += 1;

                    if (
                      scrollAttempt <
                      maxScrollAttempts
                    ) {
                      window.setTimeout(
                        scrollToHashTarget,
                        100,
                      );
                    }
                  };

                /*
                 * Let the iframe finish the current load/layout pass
                 * before forcing the first scroll.
                 */
                window.setTimeout(
                  scrollToHashTarget,
                  0,
                );
              }

'''

if old_scroll_block not in text:
    fail("Could not find the previous hash scroll block.")

text = text.replace(old_scroll_block, "", 1)

anchor = '''                }
              `;
            }}
            className="min-h-0 w-full flex-1 border-0 bg-[rgb(var(--sep-colour-090705))]"
'''

new_after_styles = '''                }
              `;

              /*
               * IMPORTANT:
               * Scroll only AFTER the modal stylesheet above has changed
               * the iframe layout and established the real scroll container.
               *
               * This is intentionally generic: any modal href using #target
               * gets the same behaviour (missions, polls, trophy/ranking
               * targets, forum anchors, and future anchored modal links).
               */
              const rawHash =
                iframe.contentWindow
                  ?.location.hash
                  .slice(1) ?? "";

              if (rawHash) {
                let targetId = rawHash;

                try {
                  targetId =
                    decodeURIComponent(
                      rawHash,
                    );
                } catch {
                  // Keep the raw hash if decoding fails.
                }

                let scrollAttempt = 0;
                const maxScrollAttempts = 20;

                const scrollToHashTarget =
                  () => {
                    const target =
                      doc.getElementById(
                        targetId,
                      );

                    const scrollContainer =
                      doc.querySelector(
                        "[data-portal-centre-host] > [data-portal-column]",
                      ) as HTMLElement | null;

                    if (
                      target &&
                      scrollContainer
                    ) {
                      const targetRect =
                        target.getBoundingClientRect();

                      const containerRect =
                        scrollContainer.getBoundingClientRect();

                      const targetTop =
                        scrollContainer.scrollTop +
                        targetRect.top -
                        containerRect.top;

                      const centredTop =
                        Math.max(
                          0,
                          targetTop -
                            Math.max(
                              0,
                              (
                                scrollContainer.clientHeight -
                                targetRect.height
                              ) / 2,
                            ),
                        );

                      scrollContainer.scrollTo({
                        top: centredTop,
                        behavior: "smooth",
                      });

                      return;
                    }

                    if (target) {
                      target.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                        inline: "nearest",
                      });

                      return;
                    }

                    scrollAttempt += 1;

                    if (
                      scrollAttempt <
                      maxScrollAttempts
                    ) {
                      window.setTimeout(
                        scrollToHashTarget,
                        100,
                      );
                    }
                  };

                /*
                 * Two animation frames let the injected CSS take effect
                 * before the first measurement. The retry loop also covers
                 * client-rendered/delayed targets.
                 */
                window.requestAnimationFrame(
                  () => {
                    window.requestAnimationFrame(
                      () => {
                        scrollToHashTarget();
                      },
                    );
                  },
                );
              }
            }}
            className="min-h-0 w-full flex-1 border-0 bg-[rgb(var(--sep-colour-090705))]"
'''

if anchor not in text:
    fail("Could not find the end of the injected modal stylesheet.")

text = text.replace(anchor, new_after_styles, 1)

TARGET.write_text(text, encoding="utf-8")

print("Updated components/portal/portal-sidebar.tsx")
print()
print("The modal now scrolls AFTER its embedded layout CSS is applied,")
print("and directly controls the portal centre scroll container.")
print()
print("Next:")
print("  npm run build")
