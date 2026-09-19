from pathlib import Path


FILE = Path("components/codex/public-codex.tsx")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(
            f"\nPATCH FAILED: {label}\n"
            f"Expected code was not found in {FILE}.\n"
            f"No file has been written."
        )

    print(f"✓ {label}")
    return text.replace(old, new, 1)


text = FILE.read_text(encoding="utf-8")


# ============================================================
# 1. LOCK THE ENTIRE CODEX TO THE VIEWPORT HEIGHT
# ============================================================

text = replace_once(
    text,
    '''        embedded
          ? "flex h-full min-h-0 flex-col overflow-hidden bg-[rgb(var(--sep-colour-090705))] text-[rgb(var(--sep-colour-d6c3a3))]"
          : "min-h-screen bg-[rgb(var(--sep-colour-090705))] text-[rgb(var(--sep-colour-d6c3a3))]",''',
    '''        "flex h-full max-h-dvh min-h-0 flex-col overflow-hidden bg-[rgb(var(--sep-colour-090705))] text-[rgb(var(--sep-colour-d6c3a3))]",''',
    "Codex constrained to viewport height",
)


# ============================================================
# 2. MAKE HEADER PERMANENT / NON-SCROLLING
# ============================================================

text = replace_once(
    text,
    '''            embedded
              ? "shrink-0"
              : "",''',
    '''            "shrink-0",''',
    "Codex header fixed inside viewport",
)


# ============================================================
# 3. REPLACE HORIZONTAL CHAPTER NAVIGATION WITH LEFT SIDEBAR
# ============================================================

old_navigation_start = '''      {/* CHAPTER NAVIGATION */}
      <div
        id="codex-chapter-navigation"
        className={[
          [
            "scroll-mt-4 border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))]",
            embedded
              ? "shrink-0"
              : "",
          ].join(" "),
          "components_codex_public_codex_div_codex_chapter_navigation",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <nav
  aria-label="Codex chapters"
  className="mx-auto flex max-w-7xl justify-center px-2 sm:px-5 components_codex_public_codex_nav_codex_chapters"
>'''

new_navigation_start = '''      {/* HANDBOOK BODY */}
      <div
        id="codex-chapter-navigation"
        className="flex min-h-0 flex-1 overflow-hidden components_codex_public_codex_div_codex_chapter_navigation"
      >
        {/* CHAPTER SIDEBAR */}
        <aside
          aria-label="Codex chapter navigation"
          className="hidden h-full w-[220px] shrink-0 overflow-hidden border-r border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] md:flex md:flex-col lg:w-[250px]"
        >
          <div className="shrink-0 border-b border-[rgb(var(--sep-colour-60482e))]/35 px-4 py-4">
            <p className="text-[7px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-80684b))]">
              Contents
            </p>

            <p className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-d8bf91))]">
              Chapters
            </p>
          </div>

          <nav
            aria-label="Codex chapters"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 components_codex_public_codex_nav_codex_chapters"
          >'''

text = replace_once(
    text,
    old_navigation_start,
    new_navigation_start,
    "Horizontal chapter navigation converted to left sidebar",
)


# ============================================================
# 4. CHANGE EACH CHAPTER BUTTON FROM TAB TO HANDBOOK ENTRY
# ============================================================

old_button_class = '''                    `h-8 flex-1 border-x border-[rgb(var(--sep-colour-4c3926))]/25 px-0.5 font-serif text-[11px] transition sm:h-10 sm:px-1 sm:text-sm ${
                      active
                        ? "bg-[rgb(var(--sep-colour-2b1f14))] text-[rgb(var(--sep-colour-e6c68f))]"
                        : "text-[rgb(var(--sep-colour-796342))] hover:bg-[rgb(var(--sep-colour-19120d))] hover:text-[rgb(var(--sep-colour-c9ad7c))]"
                    }`,'''

new_button_class = '''                    `mb-1 flex w-full items-start gap-3 border px-3 py-2.5 text-left transition ${
                      active
                        ? "border-[rgb(var(--sep-colour-8e6b3e))]/70 bg-[rgb(var(--sep-colour-2b1f14))] text-[rgb(var(--sep-colour-e6c68f))]"
                        : "border-transparent text-[rgb(var(--sep-colour-8c7758))] hover:border-[rgb(var(--sep-colour-60482e))]/45 hover:bg-[rgb(var(--sep-colour-19120d))] hover:text-[rgb(var(--sep-colour-c9ad7c))]"
                    }`,'''

text = replace_once(
    text,
    old_button_class,
    new_button_class,
    "Chapter buttons restyled as handbook contents entries",
)


old_button_content = '''                  {
                    ROMAN_NUMERALS[
                      chapter.chapter_number -
                        1
                    ]
                  }
                </button>'''

new_button_content = '''                  <span className="w-7 shrink-0 pt-0.5 text-center font-serif text-[10px] text-[rgb(var(--sep-colour-997446))]">
                    {
                      ROMAN_NUMERALS[
                        chapter.chapter_number -
                          1
                      ]
                    }
                  </span>

                  <span className="min-w-0">
                    <span className="block text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-756550))]">
                      Chapter {chapter.chapter_number}
                    </span>

                    <span className="mt-0.5 block font-serif text-[12px] leading-4">
                      {chapter.title}
                    </span>
                  </span>
                </button>'''

text = replace_once(
    text,
    old_button_content,
    new_button_content,
    "Chapter number and title shown in sidebar",
)


# ============================================================
# 5. CLOSE SIDEBAR AND OPEN RIGHT-HAND READING PANE
# ============================================================

old_nav_end = '''        </nav>
      </div>

      {selectedChapter ? ('''

new_nav_end = '''          </nav>
        </aside>

        {/* MOBILE CHAPTER STRIP */}
        <nav
          aria-label="Codex chapters"
          className="flex shrink-0 overflow-x-auto border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] md:hidden"
        >
          {orderedChapters.map((chapter) => {
            const active =
              selectedChapter?.id ===
              chapter.id;

            return (
              <button
                key={chapter.id}
                type="button"
                onClick={() =>
                  selectChapter(
                    chapter,
                    false,
                  )
                }
                title={`Chapter ${chapter.chapter_number}: ${chapter.title}`}
                className={`h-9 min-w-10 shrink-0 border-r border-[rgb(var(--sep-colour-4c3926))]/30 px-3 font-serif text-[10px] ${
                  active
                    ? "bg-[rgb(var(--sep-colour-2b1f14))] text-[rgb(var(--sep-colour-e6c68f))]"
                    : "text-[rgb(var(--sep-colour-796342))]"
                }`}
              >
                {
                  ROMAN_NUMERALS[
                    chapter.chapter_number -
                      1
                  ]
                }
              </button>
            );
          })}
        </nav>

        {/* READING PANE */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">

      {selectedChapter ? ('''

text = replace_once(
    text,
    old_nav_end,
    new_nav_end,
    "Right-hand reading pane created",
)


# ============================================================
# 6. FORCE ARTICLE TO FILL AVAILABLE HEIGHT
# ============================================================

old_article_class = '''            embedded
              ? "flex min-h-0 flex-1 flex-col overflow-hidden"
              : undefined,'''

new_article_class = '''            "flex min-h-0 flex-1 flex-col overflow-hidden",'''

text = replace_once(
    text,
    old_article_class,
    new_article_class,
    "Chapter article fills reading pane",
)


# ============================================================
# 7. KEEP CHAPTER TITLE FIXED
# ============================================================

text = replace_once(
    text,
    '''                embedded
                  ? "shrink-0"
                  : "",''',
    '''                "shrink-0",''',
    "Chapter heading fixed above reading scroll",
)


# ============================================================
# 8. MAKE CHAPTER CONTENT ALWAYS ITS OWN SCROLL AREA
# ============================================================

old_content_id = '''            id={
              embedded
                ? "codex-chapter-scroll"
                : undefined
            }'''

new_content_id = '''            id="codex-chapter-scroll"'''

text = replace_once(
    text,
    old_content_id,
    new_content_id,
    "Chapter scroll container enabled everywhere",
)


old_content_class = '''              embedded
                ? "mx-auto min-h-0 w-full max-w-7xl flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-8"
                : "mx-auto max-w-7xl px-5 py-5 sm:px-8",'''

new_content_class = '''              "mx-auto min-h-0 w-full max-w-7xl flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-8",'''

text = replace_once(
    text,
    old_content_class,
    new_content_class,
    "Chapter content given independent scrollbar",
)


# ============================================================
# 9. CLOSE READING PANE + HANDBOOK BODY
# ============================================================

old_return_end = '''      ) : null}
    </main>
  );
}'''

new_return_end = '''      ) : null}

        </div>
      </div>
    </main>
  );
}'''

text = replace_once(
    text,
    old_return_end,
    new_return_end,
    "Handbook layout containers closed",
)


# ============================================================
# WRITE ONLY AFTER EVERY REPLACEMENT SUCCEEDED
# ============================================================

FILE.write_text(text, encoding="utf-8")

print()
print("========================================")
print("CODEX HANDBOOK PATCH COMPLETE")
print("========================================")
print()
print("Result:")
print("  • Codex limited to viewport height")
print("  • Header stays fixed")
print("  • Chapters displayed on left")
print("  • Chapter list scrolls independently")
print("  • Reading pane scrolls independently")
print("  • Chapter title remains fixed")
print("  • Mobile keeps compact horizontal chapter navigation")
print("  • Previous / Next navigation remains intact")
print("  • No GitHub changes performed")
print()
print("Review with:")
print("  git diff")