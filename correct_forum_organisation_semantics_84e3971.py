from pathlib import Path
import subprocess

ROOT = Path.cwd()
EXPECTED = "84e3971595a1f9aa4f3ae005f2cc78a5742afbb8"

ACTIONS = ROOT / "app/(portal)/admin/forum/sections/actions.ts"
SQL = ROOT / "supabase_forum_sections_organisation_optional_links.sql"


def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}\nNo changes were applied.")


def read(path: Path) -> str:
    if not path.exists():
        fail(f"Missing expected file: {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")


head = subprocess.check_output(
    ["git", "rev-parse", "HEAD"],
    cwd=ROOT,
    text=True,
).strip()

if head != EXPECTED:
    fail(
        f"Patch expects HEAD {EXPECTED}, "
        f"but current HEAD is {head}"
    )

if SQL.exists():
    fail(f"{SQL.name} already exists")

actions = read(ACTIONS)

select_old = """  const {
    data: currentSection,
    error: currentSectionError,
  } = await supabase
    .from("forum_sections")
    .select(
      `
        id,
        slug,
        parent_id,
        association_id,
        order_id
      `,
    )
    .eq("id", sectionId)
    .maybeSingle<{
      id: string;
      slug: string;
      parent_id: string | null;
      association_id: string | null;
      order_id: string | null;
    }>();
"""

select_new = """  const {
    data: currentSection,
    error: currentSectionError,
  } = await supabase
    .from("forum_sections")
    .select(
      `
        id,
        slug,
        parent_id
      `,
    )
    .eq("id", sectionId)
    .maybeSingle<ForumSectionRecord>();
"""

if actions.count(select_old) != 1:
    fail(
        "Could not find the locally-patched currentSection select. "
        "This corrective patch expects the previous forum/homepage patch "
        "to have already been applied."
    )

actions = actions.replace(select_old, select_new, 1)

create_bad = """  if (
    sectionData.section_type ===
      "organisation" &&
    !sectionData.association_id
  ) {
    redirectToCreateError(
      "Organisation sections must be connected to an Order.",
    );
  }

"""

if actions.count(create_bad) != 1:
    fail("Could not find the incorrect create Organisation validation")

actions = actions.replace(create_bad, "", 1)

update_bad = """  sectionData.association_id =
    orderAssociationId ??
    (
      sectionData.section_type ===
        "organisation"
        ? currentSection.association_id
        : null
    );

  if (sectionData.order_id) {
    sectionData.section_type =
      "organisation";
    sectionData.visibility = "members";
  }

  if (
    sectionData.section_type ===
      "organisation" &&
    !sectionData.association_id
  ) {
    onError(
      "Organisation sections must be connected to an Order or retain an existing Association.",
    );
  }

"""

update_good = """  sectionData.association_id =
    orderAssociationId;

  if (sectionData.order_id) {
    sectionData.section_type =
      "organisation";
    sectionData.visibility = "members";
  }

"""

if actions.count(update_bad) != 1:
    fail("Could not find the incorrect update Organisation validation")

actions = actions.replace(update_bad, update_good, 1)

sql = """-- Forum section classification fix
--
-- "organisation" is a forum classification only:
-- anything organisational that is neither Ongame nor Offgame.
--
-- An Organisation section does NOT need an Association or Order.
-- association_id and order_id remain optional relationships.
--
-- The old check constraint incorrectly coupled section_type='organisation'
-- to association_id and blocks otherwise valid forum sections.

alter table public.forum_sections
  drop constraint if exists forum_sections_association_check;

-- Keep the existing foreign keys on association_id/order_id.
-- No replacement CHECK is required: NULL is valid for both optional links.
"""

ACTIONS.write_text(actions, encoding="utf-8", newline="\n")
SQL.write_text(sql, encoding="utf-8", newline="\n")

print("WROTE  app/(portal)/admin/forum/sections/actions.ts")
print(f"WROTE  {SQL.name}")
print()
print("PATCH APPLIED SUCCESSFULLY")
print()
print("Correct semantics restored:")
print("- Ongame = Ongame")
print("- Offgame = Offgame")
print("- Organisation = organisational forum content")
print("- Association = optional")
print("- Order = optional")
print()
print("IMPORTANT: run the generated SQL in Supabase SQL Editor:")
print(f"  {SQL.name}")
print()
print("Then run:")
print("  npm run build")
