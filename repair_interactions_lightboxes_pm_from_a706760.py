from pathlib import Path
import subprocess

BASE = 'a706760'
REPLACEMENTS = [('components/characters/character-directory.tsx', '    <article\n      className={', '    <article\n      data-sep-interactive-surface="card"\n      className={', 'Character Directory card article'), ('components/characters/character-directory.tsx', '        aria-label={`Open ${character.display_name}\'s profile`}\n        className="absolute inset-0 z-10"', '        aria-label={`Open ${character.display_name}\'s profile`}\n        data-sep-interaction-pass-through="true"\n        className="absolute inset-0 z-10"', 'Character Directory overlay link'), ('components/portal/portal-interaction-layer.tsx', '  if (\n    control &&\n    portal.contains(control) &&\n    !control.closest(\n      \'[data-sep-interaction-ignore="true"]\',\n    )\n  ) {', '  if (\n    control &&\n    portal.contains(control) &&\n    !control.closest(\n      \'[data-sep-interaction-ignore="true"]\',\n    ) &&\n    control.dataset.sepInteractionPassThrough !== "true"\n  ) {', 'interaction control pass-through condition'), ('app/(portal)/characters/[slug]/page.tsx', '    <div\n      data-sep-public-character-sheet={\n        activeCharacter?.id !== character.id\n          ? "other"\n          : undefined\n      }\n      className="mx-auto w-full max-w-7xl p-6"\n    >', '    <div\n      data-sep-public-character-sheet="other"\n      className="mx-auto w-full max-w-7xl p-6"\n    >', 'public character sheet interaction boundary'), ('components/characters/character-sheet-tabs.tsx', '      <nav\n  aria-label="Character sheet sections"\n  role="tablist"', '      <nav\n  aria-label="Character sheet sections"\n  role="tablist"\n  data-sep-interaction-ignore="true"', 'character sheet tab navigation'), ('components/codex/codex-entry-image-lightbox.tsx', '      <button\n        type="button"\n        onClick={() =>\n          setOpen(true)\n        }\n        className="group/image absolute inset-0 z-10 cursor-zoom-in"', '      <button\n        type="button"\n        data-sep-interaction-pass-through="true"\n        onClick={() =>\n          setOpen(true)\n        }\n        className="group/image absolute inset-0 z-10 cursor-zoom-in"', 'Codex image lightbox trigger'), ('components/sepulchria/sep-ui-unified.css', 'body.portal-skin-scope\n  #sep-offgame-message-selector {\n  background-color:\n    color-mix(\n      in srgb,\n      rgb(var(--sep-colour-100c09)) 28%,\n      black\n    ) !important;\n}\n\nbody.portal-skin-scope\n  #sep-offgame-message-selector:hover:not(:disabled) {\n  background-color:\n    color-mix(\n      in srgb,\n      rgb(var(--sep-colour-100c09)) 38%,\n      black\n    ) !important;\n}', 'body.portal-skin-scope\n  #sep-offgame-message-selector {\n  background-color:\n    color-mix(\n      in srgb,\n      rgb(var(--sep-colour-100c09)) 58%,\n      black\n    ) !important;\n}\n\nbody.portal-skin-scope\n  #sep-offgame-message-selector:hover:not(:disabled) {\n  background-color:\n    color-mix(\n      in srgb,\n      rgb(var(--sep-colour-100c09)) 66%,\n      black\n    ) !important;\n}', 'OFF-GAME precise background override'), ('app/(portal)/messages/[id]/components/DeleteConversationForm.tsx', '        className="inline-flex h-10 items-center justify-center border border-red-800/80 bg-red-950/45 px-3 text-[10px] uppercase tracking-[0.18em] text-red-300 transition hover:border-red-600 hover:bg-red-950/70 hover:text-red-200"', '        className="border border-red-800/80 bg-red-950/45 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-red-300 transition hover:border-red-600 hover:bg-red-950/70 hover:text-red-200"', 'Delete Conversation sizing')]

head = subprocess.run(
    ["git", "rev-parse", "--short", "HEAD"],
    check=True,
    capture_output=True,
    text=True,
    encoding="utf-8",
).stdout.strip()

if not head.startswith(BASE):
    raise SystemExit(
        f"This patch requires HEAD {BASE}; current HEAD is {head}. "
        "No files were changed."
    )

texts = {}

# Validate every replacement before writing anything.
for path, old, new, label in REPLACEMENTS:
    file_path = Path(path)

    if not file_path.exists():
        raise SystemExit(
            f"Missing {path}. No files were changed."
        )

    if path not in texts:
        texts[path] = file_path.read_text(
            encoding="utf-8"
        )

    if old not in texts[path]:
        raise SystemExit(
            f"Could not find {label} in {path}. "
            "No files were changed."
        )

    texts[path] = texts[path].replace(
        old,
        new,
        1,
    )

# All validation succeeded.
for path, text in texts.items():
    Path(path).write_text(
        text,
        encoding="utf-8",
    )

print("SUCCESS")
print("")
print("Applied specifically to a706760:")
print("  - Character Directory cards open again.")
print("  - Directory card glow/movement stays on the card, not its overlay link.")
print("  - Public /characters/[slug] sheets only auto-interact with controls")
print("    and explicitly-marked Item / Shape / Feat cards.")
print("  - IN SHORT / PROFILE / INVENTORY / FEATS / WARPING tabs stay fixed.")
print("  - Original Ancestry / Association / Order magnifier + lightbox works again.")
print("  - OFF-GAME is lighter and uses the same darkening proportions as")
print("    favourited forum topic rows.")
print("  - Delete Conversation uses Archive's exact sizing geometry.")
print("")
print("Forum and crafting completion are untouched.")
print("")
print("Run: npm run build")
