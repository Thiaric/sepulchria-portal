from pathlib import Path
import subprocess

ROOT = Path.cwd()
EXPECTED = "84e3971595a1f9aa4f3ae005f2cc78a5742afbb8"


def fail(message: str) -> None:
    raise SystemExit(
        f"ERROR: {message}\nNo changes were applied."
    )


def read(path: str) -> str:
    p = ROOT / path
    if not p.exists():
        fail(f"Missing expected file: {path}")
    return p.read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    p = ROOT / path
    p.write_text(
        content,
        encoding="utf-8",
        newline="\n",
    )
    print(f"WROTE  {path}")


def replace_once(
    path: str,
    content: str,
    old: str,
    new: str,
) -> str:
    count = content.count(old)
    if count != 1:
        fail(
            f"{path}: expected exactly one match, "
            f"found {count}"
        )
    return content.replace(old, new, 1)


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

forum_actions_path = (
    "app/(portal)/admin/forum/sections/actions.ts"
)
homepage_path = (
    "components/homepage/sepulchria-homepage.tsx"
)
modal_path = (
    "components/homepage/homepage-public-modal.tsx"
)

forum_actions = read(forum_actions_path)
homepage = read(homepage_path)
modal = read(modal_path)

current_select_old = '''  const {
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
'''

current_select_new = '''  const {
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
'''

forum_after = replace_once(
    forum_actions_path,
    forum_actions,
    current_select_old,
    current_select_new,
)

marker = "export async function updateForumSectionAction("
before_update, sep, update_and_after = forum_after.partition(marker)

if not sep:
    fail(
        f"{forum_actions_path}: updateForumSectionAction marker not found"
    )

assignment_old = '''  sectionData.association_id =
    orderAssociationId;

  if (sectionData.order_id) {
    sectionData.section_type =
      "organisation";
    sectionData.visibility = "members";
  }

  await verifyAssociation(
'''

update_assignment_new = '''  sectionData.association_id =
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

  await verifyAssociation(
'''

update_and_after = replace_once(
    forum_actions_path,
    update_and_after,
    assignment_old,
    update_assignment_new,
)

create_assignment_new = '''  sectionData.association_id =
    orderAssociationId;

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
    redirectToCreateError(
      "Organisation sections must be connected to an Order.",
    );
  }

  await verifyAssociation(
'''

before_update = replace_once(
    forum_actions_path,
    before_update,
    assignment_old,
    create_assignment_new,
)

forum_after = (
    before_update +
    sep +
    update_and_after
)

modal_src_old = '''  const iframeSrc =
    `${modal.href}${separator}embedded=homepage`;
'''

modal_src_new = '''  const iframeSrc =
    `${modal.href}${separator}embedded=1`;
'''

modal_after = replace_once(
    modal_path,
    modal,
    modal_src_old,
    modal_src_new,
)

iframe_old = '''        <iframe
          key={iframeSrc}
          src={iframeSrc}
          title={modal.title}
          className="min-h-0 flex-1 border-0 bg-[rgb(var(--sep-colour-090706))]"
        />
'''

iframe_new = '''        <iframe
          key={iframeSrc}
          src={iframeSrc}
          title={modal.title}
          onLoad={(event) => {
            try {
              const frameDocument =
                event.currentTarget
                  .contentDocument;

              frameDocument
                ?.querySelectorAll(
                  'a[href="/homepage"], a[href^="/homepage?"]',
                )
                .forEach((link) => {
                  link.remove();
                });
            } catch (error) {
              console.warn(
                "Unable to remove homepage links from embedded public page:",
                error,
              );
            }
          }}
          className="min-h-0 flex-1 border-0 bg-[rgb(var(--sep-colour-090706))]"
        />
'''

modal_after = replace_once(
    modal_path,
    modal_after,
    iframe_old,
    iframe_new,
)

footer_nav_old = '''              className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-796d5f))] sm:justify-end"
'''

footer_nav_new = '''              className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-796d5f))] sm:justify-end [&_a]:uppercase [&_button]:uppercase"
'''

homepage_after = replace_once(
    homepage_path,
    homepage,
    footer_nav_old,
    footer_nav_new,
)

write(
    forum_actions_path,
    forum_after,
)
write(
    modal_path,
    modal_after,
)
write(
    homepage_path,
    homepage_after,
)

print()
print("PATCH APPLIED SUCCESSFULLY")
print()
print("Fixed:")
print("- Existing Organisation forum sections keep their Association when edited without an Order.")
print("- Unticking Active section in the full edit form should now save normally.")
print("- New Organisation sections without an Order show a clear validation error.")
print("- Homepage modal iframe now uses embedded=1.")
print("- Any /homepage link still present inside modal content is removed on iframe load.")
print("- All homepage footer links/buttons are forced to uppercase.")
print()
print("Next:")
print("1. npm run build")
print("2. Edit the same forum section and untick Active section.")
print("3. Verify it saves and becomes Hidden.")
print("4. Open Codex, Rules and each footer policy modal.")
print("5. Verify no Back/Homepage link appears inside any modal.")
print("6. Verify every footer navigation item is uppercase.")
