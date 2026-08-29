from pathlib import Path

page_path = Path("app/codex/page.tsx")
codex_path = Path("components/codex/public-codex.tsx")

if not page_path.exists():
    raise SystemExit("Missing app/codex/page.tsx")
if not codex_path.exists():
    raise SystemExit("Missing components/codex/public-codex.tsx")

page = page_path.read_text(encoding="utf-8")
codex = codex_path.read_text(encoding="utf-8")

def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"{label} anchor not found. No files were changed.")
    return text.replace(old, new, 1)

page = replace_once(
    page,
    '  return (\n    <div className="relative">\n      <EmbeddedPortalSkinBridge />',
    '''  return (
    <div
      className={
        isEmbedded
          ? "relative h-dvh min-h-0 overflow-hidden"
          : "relative"
      }
    >
      <EmbeddedPortalSkinBridge />''',
    "Codex page wrapper",
)

page = replace_once(
    page,
    '      <PublicCodex chapters={chapters} />',
    '''      <PublicCodex
        chapters={chapters}
        embedded={isEmbedded}
      />''',
    "PublicCodex render",
)

codex = replace_once(
    codex,
    '''type PublicCodexProps = {
  chapters: PublicCodexChapter[];
};''',
    '''type PublicCodexProps = {
  chapters: PublicCodexChapter[];
  embedded?: boolean;
};''',
    "PublicCodexProps",
)

codex = replace_once(
    codex,
    '''export function PublicCodex({
  chapters,
}: PublicCodexProps) {''',
    '''export function PublicCodex({
  chapters,
  embedded = false,
}: PublicCodexProps) {''',
    "PublicCodex signature",
)

codex = replace_once(
    codex,
    '      <main className="min-h-screen bg-[rgb(var(--sep-colour-090705))] px-5 py-8 text-[rgb(var(--sep-colour-d6c3a3))]">',
    '''      <main
        className={
          embedded
            ? "h-full min-h-0 overflow-y-auto bg-[rgb(var(--sep-colour-090705))] px-5 py-8 text-[rgb(var(--sep-colour-d6c3a3))]"
            : "min-h-screen bg-[rgb(var(--sep-colour-090705))] px-5 py-8 text-[rgb(var(--sep-colour-d6c3a3))]"
        }
      >''',
    "empty Codex main",
)

codex = replace_once(
    codex,
    '    <main className="min-h-screen bg-[rgb(var(--sep-colour-090705))] text-[rgb(var(--sep-colour-d6c3a3))]">',
    '''    <main
      className={
        embedded
          ? "flex h-full min-h-0 flex-col overflow-hidden bg-[rgb(var(--sep-colour-090705))] text-[rgb(var(--sep-colour-d6c3a3))]"
          : "min-h-screen bg-[rgb(var(--sep-colour-090705))] text-[rgb(var(--sep-colour-d6c3a3))]"
      }
    >''',
    "main Codex",
)

codex = replace_once(
    codex,
    '      <header className="border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-0d0a08))]">',
    '''      <header
        className={[
          "border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-0d0a08))]",
          embedded ? "shrink-0" : "",
        ].join(" ")}
      >''',
    "Codex header",
)

codex = replace_once(
    codex,
    '        className="scroll-mt-4 border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))]"',
    '''        className={[
          "scroll-mt-4 border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))]",
          embedded ? "shrink-0" : "",
        ].join(" ")}''',
    "Codex chapter nav",
)

codex = replace_once(
    codex,
    '        <article id="codex-chapter">',
    '''        <article
          id="codex-chapter"
          className={
            embedded
              ? "flex min-h-0 flex-1 flex-col overflow-hidden"
              : undefined
          }
        >''',
    "Codex article",
)

codex = replace_once(
    codex,
    '          <section className="border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))]">',
    '''          <section
            className={[
              "border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))]",
              embedded ? "shrink-0" : "",
            ].join(" ")}
          >''',
    "Codex title section",
)

codex = replace_once(
    codex,
    '          <section className="mx-auto max-w-7xl px-5 py-5 sm:px-8">',
    '''          <section
            id={
              embedded
                ? "codex-chapter-scroll"
                : undefined
            }
            className={
              embedded
                ? "mx-auto min-h-0 w-full max-w-7xl flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-8"
                : "mx-auto max-w-7xl px-5 py-5 sm:px-8"
            }
          >''',
    "Codex content section",
)

codex = replace_once(
    codex,
    '''    if (scrollToNavigation) {
      window.requestAnimationFrame(
        () => {
          document
            .getElementById(
              "codex-chapter-navigation",
            )
            ?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
        },
      );
    }''',
    '''    if (scrollToNavigation) {
      window.requestAnimationFrame(
        () => {
          if (embedded) {
            document
              .getElementById(
                "codex-chapter-scroll",
              )
              ?.scrollTo({
                top: 0,
                behavior: "smooth",
              });

            return;
          }

          document
            .getElementById(
              "codex-chapter-navigation",
            )
            ?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
        },
      );
    }''',
    "Codex Previous/Next scroll logic",
)

page_path.write_text(page, encoding="utf-8")
codex_path.write_text(codex, encoding="utf-8")

print("SUCCESS")
print("")
print("Embedded Codex now fits its modal height at the source.")
print("")
print("When /codex?embedded=1:")
print("  - page is constrained to 100dvh")
print("  - main Codex is a height-constrained flex column")
print("  - header stays fixed inside the modal")
print("  - chapter tabs stay fixed inside the modal")
print("  - chapter title stays fixed inside the modal")
print("  - chapter body/footer area is the vertical scroll container")
print("  - content cannot extend outside the modal/iframe")
print("  - Previous/Next scroll the internal content back to the top")
print("")
print("Normal /codex remains unchanged.")
print("")
print("Changed only:")
print("  app/codex/page.tsx")
print("  components/codex/public-codex.tsx")
print("")
print("Run: npm run build")
