from pathlib import Path

COMPOSER = Path("app/(portal)/messages/components/MessageComposer.tsx")
UNIFIED = Path("components/sepulchria/sep-ui-unified.css")

for path in (COMPOSER, UNIFIED):
    if not path.exists():
        raise SystemExit(
            f"ERROR: {path} not found. Run this from the Sepulchria repo root."
        )

composer = COMPOSER.read_text(encoding="utf-8")
unified = UNIFIED.read_text(encoding="utf-8")

old_ongame = '''          <button
            type="button"
            disabled={isDead}
            title={'''

new_ongame = '''          <button
            type="button"
            data-sep-message-mode-selector="ongame"
            disabled={isDead}
            title={'''

old_offgame = '''          <button
            type="button"
            id="sep-offgame-message-selector"
            data-sep-offgame-selector="true"
            onClick={() =>'''

new_offgame = '''          <button
            type="button"
            id="sep-offgame-message-selector"
            data-sep-offgame-selector="true"
            data-sep-message-mode-selector="offgame"
            onClick={() =>'''

old_note = '''      <div
        className={[((`mt-2 border-l-2 px-3 py-1.5 text-[9px] leading-4 ${
          isOnGame
            ? "border-[rgb(var(--sep-colour-a77a42))] bg-[rgb(var(--sep-colour-24190f))] text-[rgb(var(--sep-colour-bfa37a))]"
            : "border-[rgb(var(--sep-colour-6d7488))] bg-[rgb(var(--sep-colour-191b21))] text-[rgb(var(--sep-colour-aeb4c2))]"
        }`)), "messages_components_messagecomposer_div_container_3"].filter(Boolean).join(" ")}
      >'''

new_note = '''      <div
        data-sep-message-mode-note={
          isOnGame ? "ongame" : "offgame"
        }
        className={[((`mt-2 border-l-2 px-3 py-1.5 text-[9px] leading-4 ${
          isOnGame
            ? "border-[rgb(var(--sep-colour-a77a42))] bg-[rgb(var(--sep-colour-24190f))] text-[rgb(var(--sep-colour-bfa37a))]"
            : "border-[rgb(var(--sep-colour-6d7488))] bg-[rgb(var(--sep-colour-191b21))] text-[rgb(var(--sep-colour-aeb4c2))]"
        }`)), "messages_components_messagecomposer_div_container_3"].filter(Boolean).join(" ")}
      >'''

checks = [
    ("On-game selector", old_ongame),
    ("Off-game selector", old_offgame),
    ("message-mode note", old_note),
]

for label, old in checks:
    count = composer.count(old)
    if count != 1:
        raise SystemExit(
            f"ERROR: {label} expected exactly once, found {count}. No changes were made."
        )

composer = composer.replace(old_ongame, new_ongame, 1)
composer = composer.replace(old_offgame, new_offgame, 1)
composer = composer.replace(old_note, new_note, 1)

marker = "/* PRIVATE MESSAGES — MESSAGE MODE C1/C2 SEMANTIC OVERRIDE */"

if marker in unified:
    raise SystemExit(
        "ERROR: The private-message C1/C2 override already appears to be installed. No changes were made."
    )

css = '''

/* PRIVATE MESSAGES — MESSAGE MODE C1/C2 SEMANTIC OVERRIDE */

/* ON-GAME selected — faint C1 background, C2 text. */
body.portal-skin-scope
  [data-portal-shell]
  button[data-sep-message-mode-selector="ongame"][aria-pressed="true"] {
  background-color:
    rgb(var(--sep-skin-c1) / 0.14) !important;
  color:
    rgb(var(--sep-skin-c2)) !important;
  -webkit-text-fill-color:
    rgb(var(--sep-skin-c2)) !important;
}

/* OFF-GAME selected — faint C2 background, C1 text. */
body.portal-skin-scope
  [data-portal-shell]
  #sep-offgame-message-selector[data-sep-message-mode-selector="offgame"][aria-pressed="true"] {
  background-color:
    rgb(var(--sep-skin-c2) / 0.14) !important;
  color:
    rgb(var(--sep-skin-c1)) !important;
  -webkit-text-fill-color:
    rgb(var(--sep-skin-c1)) !important;
}

/* Keep the explanatory strip on the normal PM surface. */
body.portal-skin-scope
  [data-portal-shell]
  [data-sep-message-mode-note] {
  background-color:
    rgb(var(--sep-colour-100c09)) !important;
}

/* ON-GAME note — C1 text + C1 vertical rule. */
body.portal-skin-scope
  [data-portal-shell]
  [data-sep-message-mode-note="ongame"] {
  border-left-color:
    rgb(var(--sep-skin-c1)) !important;
  color:
    rgb(var(--sep-skin-c1)) !important;
  -webkit-text-fill-color:
    rgb(var(--sep-skin-c1)) !important;
}

/* OFF-GAME note — C2 text + C2 vertical rule. */
body.portal-skin-scope
  [data-portal-shell]
  [data-sep-message-mode-note="offgame"] {
  border-left-color:
    rgb(var(--sep-skin-c2)) !important;
  color:
    rgb(var(--sep-skin-c2)) !important;
  -webkit-text-fill-color:
    rgb(var(--sep-skin-c2)) !important;
}
/* END PRIVATE MESSAGES — MESSAGE MODE C1/C2 SEMANTIC OVERRIDE */
'''

unified = unified.rstrip() + css + "\n"

COMPOSER.write_text(composer, encoding="utf-8")
UNIFIED.write_text(unified, encoding="utf-8")

print("SUCCESS: Private-message mode colours patched.")
print(" - On-game selected: faint C1 background / C2 text")
print(" - Off-game selected: faint C2 background / C1 text")
print(" - On-game notice: normal background / C1 text + left rule")
print(" - Off-game notice: normal background / C2 text + left rule")
print("No message behaviour or database logic changed.")
print("Next: npm run build")
