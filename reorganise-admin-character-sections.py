
from pathlib import Path
import re

ROOT = Path.cwd()

def read(rel):
    p = ROOT / rel
    if not p.exists():
        raise SystemExit(f"Missing expected file: {rel}")
    return p.read_text(encoding="utf-8")

def write(rel, text):
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")
    print("Updated", rel)

# 1) Make Premium Features skin-aware.
feature_rel = "components/admin/admin-character-feature-access.tsx"
feature = read(feature_rel)

warm_tokens = [
    "60482e", "15100d", "100c09", "8c704b", "e1c89f",
    "8f8271", "4f3b28", "17110d", "dfc79c", "806b50",
    "0d0907", "d7c4a5", "5d452d", "8d6d3e", "332719",
    "efd9aa",
]

for colour in warm_tokens:
    feature = feature.replace(
        f"[#{colour}]",
        f"[rgb(var(--sep-colour-{colour}))]",
    )

write(feature_rel, feature)

# 2) Premium Features subpage.
premium_page = '''import Link from "next/link";
import { notFound } from "next/navigation";

import {
  AdminCharacterFeatureAccess,
  type CharacterFeatureEntitlementRow,
  type CharacterPortalSkinEntitlementRow,
  type CharacterPortalSkinRow,
} from "@/components/admin/admin-character-feature-access";
import { requireStaff } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

type Character = {
  id: string;
  user_id: string;
  display_name: string | null;
  first_name: string;
  surname: string;
};

function characterName(
  character: Character,
) {
  return (
    character.display_name?.trim() ||
    `${character.first_name} ${character.surname}`.trim() ||
    "Unnamed character"
  );
}

const buttonClass =
  "border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))]";

export default async function AdminCharacterPremiumFeaturesPage({
  params,
}: Props) {
  await requireStaff();

  const { id } = await params;
  const supabase =
    await createClient();

  const {
    data: character,
    error: characterError,
  } = await supabase
    .from("characters")
    .select(`
      id,
      user_id,
      display_name,
      first_name,
      surname
    `)
    .eq("id", id)
    .maybeSingle();

  if (
    characterError ||
    !character
  ) {
    notFound();
  }

  const privileged =
    createAdminClient();

  const [
    featureEntitlementsResult,
    portalSkinsResult,
    portalSkinEntitlementsResult,
  ] = await Promise.all([
    privileged
      .from(
        "character_feature_entitlements",
      )
      .select(
        "feature_key, enabled, source, note, granted_at, updated_at",
      )
      .eq(
        "character_id",
        id,
      ),

    privileged
      .from("portal_skins")
      .select(`
        id,
        slug,
        name,
        description,
        is_default
      `)
      .eq(
        "is_active",
        true,
      )
      .order(
        "sort_order",
        {
          ascending: true,
        },
      )
      .order(
        "name",
        {
          ascending: true,
        },
      ),

    privileged
      .from(
        "user_portal_skin_entitlements",
      )
      .select(`
        skin_id,
        enabled,
        source,
        note
      `)
      .eq(
        "user_id",
        character.user_id,
      ),
  ]);

  const firstError =
    featureEntitlementsResult.error ??
    portalSkinsResult.error ??
    portalSkinEntitlementsResult.error;

  if (firstError) {
    throw new Error(
      `Unable to load Premium Features administration: ${firstError.message}`,
    );
  }

  const entitlements =
    (featureEntitlementsResult.data ??
      []) as CharacterFeatureEntitlementRow[];

  const portalSkins =
    (portalSkinsResult.data ??
      []) as CharacterPortalSkinRow[];

  const portalSkinEntitlements =
    (portalSkinEntitlementsResult.data ??
      []) as CharacterPortalSkinEntitlementRow[];

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[rgb(var(--sep-colour-60482e))]/35 pb-5">
          <div>
            <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))]">
              Character Administration
            </p>

            <h1 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))]">
              Premium Features
            </h1>

            <p className="mt-1 text-[11px] text-[rgb(var(--sep-colour-8f8271))]">
              {characterName(
                character as Character,
              )}
            </p>
          </div>

          <Link
            href={`/admin/characters/${id}`}
            className={buttonClass}
          >
            Back to Character
          </Link>
        </div>

        <AdminCharacterFeatureAccess
          characterId={id}
          entitlements={entitlements}
          portalSkins={portalSkins}
          portalSkinEntitlements={
            portalSkinEntitlements
          }
        />
      </div>
    </main>
  );
}
'''

write(
    "app/(portal)/admin/characters/[id]/premium-features/page.tsx",
    premium_page,
)

# 3) Ledger subpage.
ledger_page = '''import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminCharacterRemnants } from "@/components/admin/admin-character-remnants";
import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

type Character = {
  id: string;
  display_name: string | null;
  first_name: string;
  surname: string;
};

function characterName(
  character: Character,
) {
  return (
    character.display_name?.trim() ||
    `${character.first_name} ${character.surname}`.trim() ||
    "Unnamed character"
  );
}

const buttonClass =
  "border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))]";

export default async function AdminCharacterLedgerPage({
  params,
}: Props) {
  await requireStaff();

  const { id } = await params;
  const supabase =
    await createClient();

  const {
    data: character,
    error,
  } = await supabase
    .from("characters")
    .select(`
      id,
      display_name,
      first_name,
      surname
    `)
    .eq("id", id)
    .maybeSingle();

  if (
    error ||
    !character
  ) {
    notFound();
  }

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[rgb(var(--sep-colour-60482e))]/35 pb-5">
          <div>
            <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))]">
              Character Administration
            </p>

            <h1 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))]">
              Ledger
            </h1>

            <p className="mt-1 text-[11px] text-[rgb(var(--sep-colour-8f8271))]">
              {characterName(
                character as Character,
              )}
            </p>
          </div>

          <Link
            href={`/admin/characters/${id}`}
            className={buttonClass}
          >
            Back to Character
          </Link>
        </div>

        <AdminCharacterRemnants
          characterId={id}
        />
      </div>
    </main>
  );
}
'''

write(
    "app/(portal)/admin/characters/[id]/ledger/page.tsx",
    ledger_page,
)

# 4) Main page cleanup + buttons.
page_rel = "app/(portal)/admin/characters/[id]/page.tsx"
page = read(page_rel)

page = page.replace(
    'import { AdminCharacterRemnants } from "@/components/admin/admin-character-remnants";\n',
    "",
    1,
)

page = re.sub(
    r'import \{\s*AdminCharacterFeatureAccess,\s*type CharacterFeatureEntitlementRow,\s*type CharacterPortalSkinEntitlementRow,\s*type CharacterPortalSkinRow,\s*\} from "@/components/admin/admin-character-feature-access";\n',
    "",
    page,
    count=1,
)

page = page.replace(
    'import { createAdminClient } from "@/lib/supabase/admin";\n',
    "",
    1,
)

page = page.replace(
    '''    orderMembershipResult,
    featureEntitlementsResult,
''',
    '''    orderMembershipResult,
''',
    1,
)

page = re.sub(
    r'''\n\s*supabase
\s*\.from\("character_feature_entitlements"\)
\s*\.select\(
\s*"feature_key, enabled, source, note, granted_at, updated_at",
\s*\)
\s*\.eq\("character_id", id\),''',
    "",
    page,
    count=1,
)

page = page.replace(
    '''    orderMembershipResult.error ??
    featureEntitlementsResult.error;''',
    '''    orderMembershipResult.error;''',
    1,
)

page = re.sub(
    r'''\n\s*const privileged =
\s*createAdminClient\(\);
[\s\S]*?
\s*const portalSkinEntitlements =
\s*\(portalSkinEntitlementsResult\.data \?\?
\s*\[\]\) as CharacterPortalSkinEntitlementRow\[\];
''',
    "\n",
    page,
    count=1,
)

page = re.sub(
    r'''\n\s*const featureEntitlements =
\s*\(featureEntitlementsResult\.data \?\?
\s*\[\]\) as CharacterFeatureEntitlementRow\[\];
''',
    "\n",
    page,
    count=1,
)

page = re.sub(
    r'\s*<AdminCharacterFeatureAccess[\s\S]*?/>',
    "",
    page,
    count=1,
)

page = re.sub(
    r'\s*<AdminCharacterRemnants[\s\S]*?/>',
    "",
    page,
    count=1,
)

if "/premium-features" not in page:
    warping_block = re.search(
        r'''<Link
\s*href=\{`/admin/characters/\$\{character\.id\}/warping`\}
[\s\S]*?
</Link>''',
        page,
    )

    if not warping_block:
        raise SystemExit(
            "Could not locate the existing Manage Warping button."
        )

    extra_buttons = '''

            <Link
              href={`/admin/characters/${character.id}/premium-features`}
              className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))]"
            >
              Premium Features
            </Link>

            <Link
              href={`/admin/characters/${character.id}/ledger`}
              className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))]"
            >
              Ledger
            </Link>'''

    page = (
        page[:warping_block.end()]
        + extra_buttons
        + page[warping_block.end():]
    )

for forbidden in [
    "AdminCharacterFeatureAccess",
    "AdminCharacterRemnants",
    "featureEntitlementsResult",
    "portalSkinsResult",
    "portalSkinEntitlementsResult",
]:
    if forbidden in page:
        raise SystemExit(
            f"Main page cleanup incomplete: {forbidden} still remains."
        )

write(page_rel, page)

print()
print("Character administration reorganisation complete.")
print("No SQL changes are required.")
print("Existing Premium Feature and Remnant Ledger actions are reused unchanged.")
print("Run: npm run build")
