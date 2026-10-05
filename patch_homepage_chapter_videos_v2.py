from pathlib import Path
import re

PATH = Path("components/homepage/sepulchria-homepage.tsx")

if not PATH.exists():
    raise SystemExit(f"ERROR: {PATH} not found. Run this from the repo root.")

text = PATH.read_text(encoding="utf-8")
original = text

chapters_pattern = re.compile(
    r'const CHAPTERS = \[\s*'
    r'\{\s*number: "I",.*?'
    r'\{\s*number: "III",.*?'
    r'\]\s*as const;',
    re.S,
)

new_chapters = '''const CHAPTERS = [
  {
    number: "I",
    title: "Discover the World",
    text: "Explore a city raised from divine remains, where every district carries the legacy of a fallen god.",
    videoTitle: "Discover the World",
    videoHref:
      "https://drive.google.com/file/d/1iMhPhgTQ7KzLiywkJWPux3uyTiupzKi7/preview",
    videoLabel: "Watch the introduction video →",
  },
  {
    number: "II",
    title: "Forge Your Character",
    text: "Choose your Ancestry, Order and place within the living world of Sepulchria.",
    videoTitle: "Forge Your Character",
    videoHref: null,
    videoLabel: "Watch the character creation video →",
  },
  {
    number: "III",
    title: "Shape the Story",
    text: "Enter a persistent world where choices, loyalties and consequences become part of its history.",
    videoTitle: "Shape the Story",
    videoHref: null,
    videoLabel: "Watch the gameplay video →",
  },
] as const;'''

text, chapter_count = chapters_pattern.subn(new_chapters, text, count=1)

article_pattern = re.compile(
    r'(<div className="relative mt-4 divide-y[^"]*components_homepage_sepulchria_homepage_div_container_19">\s*'
    r'\{CHAPTERS\.map\(\s*'
    r'\(chapter\) => \(\s*)'
    r'<article\s+'
    r'key=\{chapter\.number\}.*?'
    r'className=\{`group py-4 transition-transform duration-300 ease-out hover:translate-x-1\.5 first:pt-1 last:pb-1 components_homepage_sepulchria_homepage_article_article \$\{.*?\}`\}\s*>',
    re.S,
)

new_article = r'''\1<article
  key={chapter.number}
  onClick={
    chapter.videoHref
      ? () =>
          setPublicModal({
            title: chapter.videoTitle,
            href: chapter.videoHref,
          })
      : undefined
  }
  onKeyDown={
    chapter.videoHref
      ? (event) => {
          if (
            event.key === "Enter" ||
            event.key === " "
          ) {
            event.preventDefault();

            setPublicModal({
              title: chapter.videoTitle,
              href: chapter.videoHref,
            });
          }
        }
      : undefined
  }
  role={
    chapter.videoHref
      ? "button"
      : undefined
  }
  tabIndex={
    chapter.videoHref
      ? 0
      : undefined
  }
  className={`group py-4 transition-transform duration-300 ease-out hover:translate-x-1.5 first:pt-1 last:pb-1 components_homepage_sepulchria_homepage_article_article ${
    chapter.videoHref
      ? "cursor-pointer"
      : ""
  }`}
>'''

text, article_count = article_pattern.subn(new_article, text, count=1)

label_pattern = re.compile(
    r'\{chapter\.number\s*===\s*"I"\s*\?\s*\(\s*'
    r'<>\s*'
    r'\{" "\}\s*'
    r'<span\s+className="homepage-intro-video-link inline font-serif italic">\s*'
    r'Watch the introduction video\s*→\s*'
    r'</span>\s*'
    r'</>\s*'
    r'\)\s*:\s*null\}',
    re.S,
)

new_label = '''{chapter.videoHref ? (
    <>
      {" "}
      <span className="homepage-intro-video-link inline font-serif italic">
        {chapter.videoLabel}
      </span>
    </>
  ) : null}'''

text, label_count = label_pattern.subn(new_label, text, count=1)

problems = []
if chapter_count != 1:
    problems.append(f"CHAPTERS block matches: {chapter_count}")
if article_count != 1:
    problems.append(f"chapter article block matches: {article_count}")
if label_count != 1:
    problems.append(f"chapter video label block matches: {label_count}")

if problems:
    raise SystemExit(
        "ERROR: Could not safely identify every target block.\n"
        + "\n".join(f" - {p}" for p in problems)
        + "\nNo changes were made."
    )

if text == original:
    raise SystemExit("ERROR: Patch made no changes. No files were written.")

PATH.write_text(text, encoding="utf-8")

print("SUCCESS:", PATH)
print("Chapter I keeps its existing Google Drive video.")
print("Chapter II and III are wired identically but remain inactive until videoHref is set.")
print()
print("When ready, replace each:")
print("  videoHref: null,")
print("with its Google Drive /preview URL.")
