from pathlib import Path

PATH = Path("components/homepage/sepulchria-homepage.tsx")

if not PATH.exists():
    raise SystemExit(f"ERROR: {PATH} not found. Run this from the repo root.")

text = PATH.read_text(encoding="utf-8")

old_chapters = '''const CHAPTERS = [
  {
    number: "I",
    title: "Discover the World",
    text: "Explore a city raised from divine remains, where every district carries the legacy of a fallen god.",
  },
  {
    number: "II",
    title: "Forge Your Character",
    text: "Choose your Ancestry, Order and place within the living world of Sepulchria.",
  },
  {
    number: "III",
    title: "Shape the Story",
    text: "Enter a persistent world where choices, loyalties and consequences become part of its history.",
  },
] as const;'''

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

old_article = '''<article
  key={chapter.number}
  onClick={
    chapter.number === "I"
      ? () =>
          setPublicModal({
            title: "Discover the World",
            href: "https://drive.google.com/file/d/1iMhPhgTQ7KzLiywkJWPux3uyTiupzKi7/preview",
          })
      : undefined
  }
  onKeyDown={
    chapter.number === "I"
      ? (event) => {
          if (
            event.key === "Enter" ||
            event.key === " "
          ) {
            event.preventDefault();

            setPublicModal({
              title: "Discover the World",
              href: "https://drive.google.com/file/d/1iMhPhgTQ7KzLiywkJWPux3uyTiupzKi7/preview",
            });
          }
        }
      : undefined
  }
  role={
    chapter.number === "I"
      ? "button"
      : undefined
  }
  tabIndex={
    chapter.number === "I"
      ? 0
      : undefined
  }
  className={`group py-4 transition-transform duration-300 ease-out hover:translate-x-1.5 first:pt-1 last:pb-1 components_homepage_sepulchria_homepage_article_article ${
    chapter.number === "I"
      ? "cursor-pointer"
      : ""
  }`}
>'''

new_article = '''<article
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

old_link = '''  {chapter.number === "I" ? (
    <>
      {" "}
      <span className="homepage-intro-video-link inline font-serif italic">
        Watch the introduction video →
      </span>
    </>
  ) : null}'''

new_link = '''  {chapter.videoHref ? (
    <>
      {" "}
      <span className="homepage-intro-video-link inline font-serif italic">
        {chapter.videoLabel}
      </span>
    </>
  ) : null}'''

checks = [
    ("CHAPTERS block", old_chapters),
    ("chapter article block", old_article),
    ("chapter video label block", old_link),
]

for label, old in checks:
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"ERROR: {label} expected exactly once, found {count}. No changes were made."
        )

updated = text.replace(old_chapters, new_chapters, 1)
updated = updated.replace(old_article, new_article, 1)
updated = updated.replace(old_link, new_link, 1)

PATH.write_text(updated, encoding="utf-8")

print("SUCCESS:", PATH)
print("Chapter I keeps its current video.")
print("Chapter II and III are ready for future video URLs.")
print("Replace videoHref: null with each Google Drive /preview URL when ready.")
