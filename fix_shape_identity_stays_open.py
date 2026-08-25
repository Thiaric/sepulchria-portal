from pathlib import Path

ROOT = Path.cwd()
PATH = ROOT / "app/(portal)/admin/shapes/ShapeProgression.tsx"

def fail(message: str) -> None:
    raise SystemExit(
        f"ERROR: {message}\nNo changes were applied."
    )

if not PATH.exists():
    fail(
        "Missing app/(portal)/admin/shapes/ShapeProgression.tsx"
    )

text = PATH.read_text(encoding="utf-8")

old_open = '''    const openStep = (
      index: number,
    ) => {
      steps.forEach(
        (
          step,
          stepIndex,
        ) => {
          step.hidden =
            stepIndex !==
            index;
        },
      );

      headers.forEach(
'''

new_open = '''    const setStepVisible = (
      step: HTMLElement,
      visible: boolean,
    ) => {
      step.hidden = !visible;
      step.style.display =
        visible ? "" : "none";
    };

    const openStep = (
      index: number,
    ) => {
      steps.forEach(
        (
          step,
          stepIndex,
        ) => {
          setStepVisible(
            step,
            stepIndex === index,
          );
        },
      );

      headers.forEach(
'''

if old_open not in text:
    fail(
        "Could not find the current openStep visibility block."
    )

text = text.replace(
    old_open,
    new_open,
    1,
)

old_header_toggle = '''            if (
              step.hidden
            ) {
              openStep(
                index,
              );
            } else {
              step.hidden =
                true;
            }
'''

new_header_toggle = '''            const isOpen =
              !step.hidden &&
              step.style.display !==
                "none";

            if (!isOpen) {
              openStep(
                index,
              );
            } else {
              setStepVisible(
                step,
                false,
              );

              header.dataset.open =
                "false";

              header.classList.remove(
                "bg-[rgb(var(--sep-colour-1c140e))]",
              );
            }
'''

if old_header_toggle not in text:
    fail(
        "Could not find the current accordion header toggle block."
    )

text = text.replace(
    old_header_toggle,
    new_header_toggle,
    1,
)

old_edit_init = '''    if (edit) {
      steps.forEach(
        (step) => {
          step.hidden =
            true;
        },
      );
    } else {
      openStep(0);
    }
'''

new_edit_init = '''    if (edit) {
      steps.forEach(
        (step) => {
          setStepVisible(
            step,
            false,
          );
        },
      );
    } else {
      openStep(0);
    }
'''

if old_edit_init not in text:
    fail(
        "Could not find the current initial accordion visibility block."
    )

text = text.replace(
    old_edit_init,
    new_edit_init,
    1,
)

for marker in [
    "const setStepVisible =",
    'step.style.display =',
    "const isOpen =",
]:
    if marker not in text:
        fail(
            f"Validation failed: missing {marker!r}"
        )

PATH.write_text(
    text,
    encoding="utf-8",
    newline="\n",
)

print(
    "WROTE  app/(portal)/admin/shapes/ShapeProgression.tsx"
)
print()
print(
    "SHAPE ACCORDION VISIBILITY FIX APPLIED"
)
print(
    "- Identity content now closes when Continue opens Step 2."
)
print(
    "- Only one section's content can be visible at a time."
)
print(
    "- Clicking the open section header collapses it."
)
print(
    "- Edit forms still start with all section contents collapsed."
)
print(
    "- Section headers remain visible so completed sections can be reopened."
)
print()
print(
    "Refresh /admin/shapes, then run: npm run build"
)
