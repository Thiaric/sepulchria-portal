from pathlib import Path
import subprocess

ROOT = Path.cwd()
EXPECTED = "bd75928"

targets = {
    ROOT / "app/(portal)/character/page.tsx": None,
    ROOT / "lib/characters/get-public-character.ts": None,
    ROOT / "app/(portal)/characters/[slug]/page.tsx": None,
}

head = subprocess.check_output(
    ["git", "rev-parse", "--short", "HEAD"],
    text=True,
).strip()

if head != EXPECTED:
    raise SystemExit(
        f"Expected HEAD {EXPECTED}, found {head}. "
        "Refusing to patch a different baseline."
    )

for path in targets:
    if not path.exists():
        raise SystemExit(f"Missing required file: {path}")
    targets[path] = path.read_text(encoding="utf-8")

own_path = ROOT / "app/(portal)/character/page.tsx"
public_loader_path = ROOT / "lib/characters/get-public-character.ts"
public_page_path = ROOT / "app/(portal)/characters/[slug]/page.tsx"

own_old = '''  const equippedSheetFrame =
    await getEquippedCosmetic(
      character.id,
      "sheet_frame",
    );

  const effectiveAttributes =
    await getEffectiveCharacterAttributes(
      character.id,
      {
        muscles: character.muscles,
        reflexes: character.reflexes,
        vigor: character.vigor,
        brains: character.brains,
        shrewd: character.shrewd,
        presence_score:
          character.presence_score,
      },
    );
'''

own_new = '''  const [
    equippedSheetFrame,
    effectiveAttributes,
  ] = await Promise.all([
    getEquippedCosmetic(
      character.id,
      "sheet_frame",
    ),
    getEffectiveCharacterAttributes(
      character.id,
      {
        muscles: character.muscles,
        reflexes: character.reflexes,
        vigor: character.vigor,
        brains: character.brains,
        shrewd: character.shrewd,
        presence_score:
          character.presence_score,
      },
    ),
  ]);
'''

public_loader_old = '''    const orderMembership =
      await getPublicOrderMembership(
        row.id,
      );

    const effectiveAttributes =
      await getEffectiveCharacterAttributes(
        row.id,
        {
          muscles: row.muscles,
          reflexes: row.reflexes,
          vigor: row.vigor,
          brains: row.brains,
          shrewd: row.shrewd,
          presence_score:
            row.presence_score,
        },
      );
'''

public_loader_new = '''    const [
      orderMembership,
      effectiveAttributes,
    ] = await Promise.all([
      getPublicOrderMembership(
        row.id,
      ),
      getEffectiveCharacterAttributes(
        row.id,
        {
          muscles: row.muscles,
          reflexes: row.reflexes,
          vigor: row.vigor,
          brains: row.brains,
          shrewd: row.shrewd,
          presence_score:
            row.presence_score,
        },
      ),
    ]);
'''

public_page_old = '''  const supabase = await createClient();

  const equippedSheetFrame =
    await getEquippedCosmetic(
      character.id,
      "sheet_frame",
    );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [
    activeCharacterResult,
    staffSession,
  ] = await Promise.all([
    supabase
      .from("characters")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle(),
    getStaffSession(),
  ]);
'''

public_page_new = '''  const supabase = await createClient();

  const [
    equippedSheetFrame,
    userResult,
  ] = await Promise.all([
    getEquippedCosmetic(
      character.id,
      "sheet_frame",
    ),
    supabase.auth.getUser(),
  ]);

  const {
    data: { user },
  } = userResult;

  if (!user) {
    redirect("/auth/login");
  }

  const [
    activeCharacterResult,
    staffSession,
    targetIsStaff,
  ] = await Promise.all([
    supabase
      .from("characters")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle(),
    getStaffSession(),
    isCharacterStaff(
      character.id,
    ),
  ]);
'''

public_page_target_old = '''  const targetIsStaff =
    await isCharacterStaff(
      character.id,
    );

'''

checks = [
    (own_path, own_old, "own character frame + attributes block"),
    (public_loader_path, public_loader_old, "public character order + attributes block"),
    (public_page_path, public_page_old, "public page frame + auth/staff block"),
    (public_page_path, public_page_target_old, "old public targetIsStaff block"),
]

for path, old, label in checks:
    count = targets[path].count(old)
    if count != 1:
        raise SystemExit(
            f"{label}: expected exactly 1 match in {path}, found {count}. "
            "Nothing changed."
        )

new_contents = dict(targets)
new_contents[own_path] = new_contents[own_path].replace(own_old, own_new, 1)
new_contents[public_loader_path] = new_contents[public_loader_path].replace(
    public_loader_old, public_loader_new, 1
)
new_contents[public_page_path] = new_contents[public_page_path].replace(
    public_page_old, public_page_new, 1
)
new_contents[public_page_path] = new_contents[public_page_path].replace(
    public_page_target_old, "", 1
)

for path, content in new_contents.items():
    path.write_text(content, encoding="utf-8")

print("✓ Character-sheet loading waits reduced for bd75928")
print("  - own sheet: cosmetic frame + effective attributes now load together")
print("  - public loader: Order membership + effective attributes now load together")
print("  - public sheet: cosmetic frame + auth now load together")
print("  - public sheet: target staff check now joins the existing parallel batch")
print("  - no caching of live character/mechanics data was added")
print("  - no UI/layout/cosmetic behaviour changed")
