#!/usr/bin/env python3
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

EXPECTED_COMMIT_PREFIX = "f14b3ea"

ROOT = Path.cwd()
ADMIN_PAGE = ROOT / "app/(portal)/admin/shapes/page.tsx"
ADMIN_ACTIONS = ROOT / "app/(portal)/admin/shapes/actions.ts"
CATALOGUE = ROOT / "components/warping/shapes-catalogue.tsx"
EXTENDED_COMPONENT = ROOT / "components/warping/shape-extended-description.tsx"
SQL_FILE = ROOT / "shape_extended_description.sql"

MODIFIED_FILES = [
    ADMIN_PAGE,
    ADMIN_ACTIONS,
    CATALOGUE,
]

BACKUP_SUFFIX = ".bak-shape-extended-description"

EXTENDED_COMPONENT_CONTENT = '"use client";\n\nimport {\n  useState,\n} from "react";\n\nimport {\n  RichTextContentClient,\n} from "@/components/editor/rich-text-content-client";\n\nexport function ShapeExtendedDescription({\n  body,\n}: {\n  body: string;\n}) {\n  const [\n    expanded,\n    setExpanded,\n  ] = useState(false);\n\n  if (!body?.trim()) {\n    return null;\n  }\n\n  return (\n    <div className="mt-2">\n      <button\n        type="button"\n        aria-expanded={expanded}\n        onClick={() =>\n          setExpanded(\n            (current) =>\n              !current,\n          )\n        }\n        className="inline-flex items-center gap-1.5 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17110d))] px-2.5 py-1.5 text-[7px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-a88d67))] transition hover:border-[rgb(var(--sep-colour-8d6d3e))]/65 hover:text-[rgb(var(--sep-colour-d3b278))]"\n      >\n        <span>\n          {expanded\n            ? "Hide Extended Description"\n            : "Show Extended Description"}\n        </span>\n\n        <span\n          aria-hidden="true"\n          className={`inline-block transition-transform ${\n            expanded\n              ? "rotate-180"\n              : ""\n          }`}\n        >\n          ▼\n        </span>\n      </button>\n\n      {expanded ? (\n        <div className="mt-2 border-l-2 border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-120e0b))]/55 px-3 py-2.5">\n          <RichTextContentClient\n            body={body}\n            className="\n              text-[10px]\n              leading-5\n              text-[rgb(var(--sep-colour-b9aa94))]\n              [&_p]:my-1.5\n              [&_div]:my-1.5\n              [&_h1]:my-2\n              [&_h1]:text-lg\n              [&_h2]:my-2\n              [&_h2]:text-base\n              [&_h3]:my-2\n              [&_h3]:text-sm\n              [&_h4]:my-2\n              [&_h4]:text-xs\n              [&_blockquote]:my-2\n              [&_blockquote]:pl-3\n              [&_ul]:my-2\n              [&_ul]:pl-5\n              [&_ol]:my-2\n              [&_ol]:pl-5\n              [&_img]:my-2\n              [&_img]:max-h-[360px]\n              [&_table]:text-[9px]\n            "\n          />\n        </div>\n      ) : null}\n    </div>\n  );\n}\n'
SQL_CONTENT = "-- Sepulchria: optional rich-text Extended Description for Shapes\n-- Run this once in Supabase SQL Editor.\n\nalter table public.shapes\n  add column if not exists extended_description text null;\n\ncomment on column public.shapes.extended_description is\n  'Optional sanitised rich-text lore/detail shown on Shape catalogue/profile panels. Not used in Warping chat output.';\n"


def current_commit():
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "HEAD"],
            cwd=ROOT,
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
    except Exception:
        return None


def require_files():
    missing = [
        str(path.relative_to(ROOT))
        for path in MODIFIED_FILES
        if not path.exists()
    ]
    if missing:
        raise RuntimeError(
            "Run this script from the sepulchria-portal repository root. Missing: "
            + ", ".join(missing)
        )


def backup(path):
    backup_path = path.with_name(path.name + BACKUP_SUFFIX)
    if not backup_path.exists():
        shutil.copy2(path, backup_path)


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(
            f"{label}: expected exactly 1 match, found {count}. "
            "The repository may differ from the analysed version."
        )
    return text.replace(old, new, 1)


def patch_admin_page():
    backup(ADMIN_PAGE)
    text = ADMIN_PAGE.read_text(encoding="utf-8")

    text = replace_once(
        text,
        'import {\n  shapeSchoolBorderClass,\n} from "@/lib/warping/shape-school-style";\n',
        'import {\n  shapeSchoolBorderClass,\n} from "@/lib/warping/shape-school-style";\n'
        'import {\n  RichTextEditor,\n} from "@/components/editor/rich-text-editor";\n',
        "RichTextEditor import",
    )

    text = replace_once(
        text,
        '      <label className="lg:col-span-4"><span className={lab}>Description / exact specification</span><textarea required rows={4} name="description" defaultValue={s?.description??""} className={cls}/></label>\n',
        '      <label className="lg:col-span-4"><span className={lab}>Description / exact specification</span><textarea required rows={4} name="description" defaultValue={s?.description??""} className={cls}/></label>\n\n'
        '      <div className="lg:col-span-4">\n'
        '        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">\n'
        '          <span className={lab}>Extended Description</span>\n'
        '          <span className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756957))]">Optional · not posted in chat</span>\n'
        '        </div>\n\n'
        '        <RichTextEditor\n'
        '          name="extended_description"\n'
        '          defaultValue={s?.extended_description??""}\n'
        '          minHeight={180}\n'
        '          maxTextLength={50000}\n'
        '          placeholder="Optional extended lore, explanation, examples, flavour text..."\n'
        '          variant="lore"\n'
        '        />\n'
        '      </div>\n',
        "Extended Description admin field",
    )

    ADMIN_PAGE.write_text(text, encoding="utf-8")


def patch_admin_actions():
    backup(ADMIN_ACTIONS)
    text = ADMIN_ACTIONS.read_text(encoding="utf-8")

    text = replace_once(
        text,
        'import { wordOfPower } from "@/lib/warping/constants";\n',
        'import { wordOfPower } from "@/lib/warping/constants";\n'
        'import {\n  sanitizeRichHtml,\n} from "@/lib/rich-text";\n',
        "sanitizeRichHtml import",
    )

    text = replace_once(
        text,
        '    name:txt(f,"name"),description:txt(f,"description"),\n',
        '    name:txt(f,"name"),description:txt(f,"description"),\n'
        '    extended_description:txt(f,"extended_description")\n'
        '      ?sanitizeRichHtml(txt(f,"extended_description"))\n'
        '      :null,\n',
        "extended_description payload",
    )

    ADMIN_ACTIONS.write_text(text, encoding="utf-8")


def patch_catalogue():
    backup(CATALOGUE)
    text = CATALOGUE.read_text(encoding="utf-8")

    text = replace_once(
        text,
        'import {\n  shapeSchoolBorderClass,\n} from "@/lib/warping/shape-school-style";\n',
        'import {\n  shapeSchoolBorderClass,\n} from "@/lib/warping/shape-school-style";\n'
        'import {\n  ShapeExtendedDescription,\n} from "@/components/warping/shape-extended-description";\n',
        "ShapeExtendedDescription import",
    )

    text = replace_once(
        text,
        '    description: string;\n    level: number;\n',
        '    description: string;\n    extended_description?: string | null;\n    level: number;\n',
        "ShapeCard extended_description type",
    )

    text = replace_once(
        text,
        '          {shape.description?.trim() ? (\n'
        '            <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[rgb(var(--sep-colour-9f927f))]">\n'
        '              {shape.description}\n'
        '            </p>\n'
        '          ) : null}\n',
        '          {shape.description?.trim() ? (\n'
        '            <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[rgb(var(--sep-colour-9f927f))]">\n'
        '              {shape.description}\n'
        '            </p>\n'
        '          ) : null}\n\n'
        '          {shape.extended_description?.trim() ? (\n'
        '            <ShapeExtendedDescription\n'
        '              body={shape.extended_description}\n'
        '            />\n'
        '          ) : null}\n',
        "catalogue Extended Description button",
    )

    CATALOGUE.write_text(text, encoding="utf-8")


def write_new_files():
    if EXTENDED_COMPONENT.exists():
        raise RuntimeError(
            f"{EXTENDED_COMPONENT.relative_to(ROOT)} already exists; refusing to overwrite it."
        )

    if SQL_FILE.exists():
        raise RuntimeError(
            f"{SQL_FILE.relative_to(ROOT)} already exists; refusing to overwrite it."
        )

    EXTENDED_COMPONENT.parent.mkdir(parents=True, exist_ok=True)
    EXTENDED_COMPONENT.write_text(
        EXTENDED_COMPONENT_CONTENT,
        encoding="utf-8",
    )

    SQL_FILE.write_text(
        SQL_CONTENT,
        encoding="utf-8",
    )


def main():
    require_files()

    commit = current_commit()
    if commit:
        if commit.startswith(EXPECTED_COMMIT_PREFIX):
            print(f'Confirmed base commit {commit[:7]} ("Chat styling changes").')
        else:
            print(
                f"NOTE: HEAD is {commit[:12]}, not {EXPECTED_COMMIT_PREFIX}. "
                "Continuing only if all analysed anchors match."
            )

    patch_admin_page()
    patch_admin_actions()
    patch_catalogue()
    write_new_files()

    print()
    print("Shape Extended Description patch applied successfully.")
    print()
    print("Modified:")
    for path in MODIFIED_FILES:
        print(f"  - {path.relative_to(ROOT)}")

    print()
    print("Created:")
    print(f"  - {EXTENDED_COMPONENT.relative_to(ROOT)}")
    print(f"  - {SQL_FILE.relative_to(ROOT)}")

    print()
    print("Behaviour:")
    print("  - Description remains plain text and REQUIRED.")
    print("  - Extended Description is OPTIONAL rich text.")
    print("  - Extended Description is fully collapsed initially.")
    print("  - A Show Extended Description button expands it.")
    print("  - /warping, /character Warping, and /characters/[slug] Warping all inherit it.")
    print("  - No chat/Warping action code is touched, so Extended Description is never posted in chat.")

    print()
    print("IMPORTANT:")
    print("  Run shape_extended_description.sql once in Supabase SQL Editor.")
    print()
    print("Then run:")
    print("  npm run build")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"PATCH FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
