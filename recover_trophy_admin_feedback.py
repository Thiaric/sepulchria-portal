from pathlib import Path
import re
import sys

ROOT = Path.cwd()
PAGE = ROOT / "app/(portal)/admin/trophies/page.tsx"
FEEDBACK = ROOT / "components/admin/trophy-save-feedback.tsx"


def fail(message):
    print(f"\nERROR: {message}")
    sys.exit(1)


def main():
    if not PAGE.exists():
        fail("Run this from the sepulchria-portal repository root.")

    if not FEEDBACK.exists():
        fail(
            "components/admin/trophy-save-feedback.tsx is missing. "
            "The previous polish patch should have created it."
        )

    text = PAGE.read_text(encoding="utf-8")

    if 'PendingSubmitButton' not in text:
        anchor = 'import Link from "next/link";'
        if anchor not in text:
            fail("Could not find Link import.")
        text = text.replace(
            anchor,
            anchor + '\nimport { PendingSubmitButton } from "@/components/forms/pending-submit-button";',
            1,
        )

    if 'TrophySaveFeedback' not in text:
        anchor = 'import { PendingSubmitButton } from "@/components/forms/pending-submit-button";'
        if anchor not in text:
            fail("Could not find PendingSubmitButton import.")
        text = text.replace(
            anchor,
            anchor + '\nimport { TrophySaveFeedback } from "@/components/admin/trophy-save-feedback";',
            1,
        )

    if 'pendingText="Saving..."' not in text:
        pattern = re.compile(
            r'<button\b(?P<attrs>[^>]*)>\s*Save Trophy\s*</button>',
            re.DOTALL,
        )
        match = pattern.search(text)
        if not match:
            fail('Could not find a plain <button> containing "Save Trophy".')

        attrs = match.group("attrs")
        if 'className={buttonClass}' in attrs:
            replacement = (
                '<PendingSubmitButton\n'
                '            idleText="Save Trophy"\n'
                '            pendingText="Saving..."\n'
                '            className={`${buttonClass} disabled:cursor-not-allowed disabled:opacity-60`}\n'
                '          />'
            )
        else:
            class_string = re.search(r'className="([^"]*)"', attrs, re.DOTALL)
            if class_string:
                classes = class_string.group(1)
                replacement = (
                    '<PendingSubmitButton\n'
                    '            idleText="Save Trophy"\n'
                    '            pendingText="Saving..."\n'
                    f'            className="{classes} disabled:cursor-not-allowed disabled:opacity-60"\n'
                    '          />'
                )
            else:
                replacement = (
                    '<PendingSubmitButton\n'
                    '            idleText="Save Trophy"\n'
                    '            pendingText="Saving..."\n'
                    '            className="disabled:cursor-not-allowed disabled:opacity-60"\n'
                    '          />'
                )

        text = text[:match.start()] + replacement + text[match.end():]

    if '<TrophySaveFeedback' not in text:
        pattern = re.compile(
            r'\{saveSuccess\s*\?\s*\(\s*'
            r'<p\b[^>]*>\s*Trophy saved successfully\.\s*</p>\s*'
            r'\)\s*:\s*saveError\s*\?\s*\(\s*'
            r'<p\b[^>]*>\s*\{saveError\}\s*</p>\s*'
            r'\)\s*:\s*null\}',
            re.DOTALL,
        )
        match = pattern.search(text)
        if not match:
            fail("Could not find the current inline success/error block.")

        replacement = (
            '{saveSuccess ? (\n'
            '                <TrophySaveFeedback\n'
            '                  type="success"\n'
            '                  message="Trophy saved successfully."\n'
            '                />\n'
            '              ) : saveError ? (\n'
            '                <TrophySaveFeedback\n'
            '                  type="error"\n'
            '                  message={saveError}\n'
            '                />\n'
            '              ) : null}'
        )

        text = text[:match.start()] + replacement + text[match.end():]

    PAGE.write_text(text, encoding="utf-8")

    print("UPDATED: app/(portal)/admin/trophies/page.tsx")
    print("\nSUCCESS.")
    print("Now run: npm run build")


if __name__ == "__main__":
    main()
