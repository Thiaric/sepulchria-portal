
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
    p.write_text(text, encoding="utf-8")
    print("Updated", rel)

# 1) Add character-admin skin entitlement action.
actions_rel = "app/(portal)/admin/characters/actions.ts"
actions = read(actions_rel)

if "setCharacterPortalSkinEntitlement" not in actions:
    anchor = "export async function setCharacterFeatureEntitlement("
    pos = actions.find(anchor)
    if pos == -1:
        raise SystemExit("Could not locate setCharacterFeatureEntitlement.")

    code = '''
export async function setCharacterPortalSkinEntitlement(
  formData: FormData,
) {
  const staff = await requireStaff();

  const characterId =
    readRequiredUuid(
      formData.get("characterId"),
    );

  const skinId =
    readRequiredUuid(
      formData.get("skinId"),
    );

  const enabledRaw =
    formData.get("enabled");

  const enabled =
    enabledRaw === "true"
      ? true
      : enabledRaw === "false"
        ? false
        : null;

  if (enabled === null) {
    throw new Error(
      "The selected portal skin access value is invalid.",
    );
  }

  const sourceRaw =
    formData.get("source");

  const source =
    sourceRaw === "paid" ||
    sourceRaw === "staff"
      ? sourceRaw
      : null;

  if (!source) {
    throw new Error(
      "The selected portal skin unlock source is invalid.",
    );
  }

  const note =
    readOptionalText(
      formData.get("note"),
      1000,
    );

  const admin =
    createPrivilegedClient();

  const {
    data: character,
    error: characterError,
  } = await admin
    .from("characters")
    .select("id, user_id")
    .eq("id", characterId)
    .maybeSingle();

  if (
    characterError ||
    !character
  ) {
    throw new Error(
      `Unable to load the selected character account: ${
        characterError?.message ??
        "Character not found."
      }`,
    );
  }

  const {
    data: skin,
    error: skinError,
  } = await admin
    .from("portal_skins")
    .select(
      "id, slug, name, is_default",
    )
    .eq("id", skinId)
    .maybeSingle();

  if (
    skinError ||
    !skin
  ) {
    throw new Error(
      `Unable to load the selected portal skin: ${
        skinError?.message ??
        "Skin not found."
      }`,
    );
  }

  if (skin.is_default === true) {
    throw new Error(
      "The default Sepulchria skin does not require premium access.",
    );
  }

  const now =
    new Date().toISOString();

  const {
    error: entitlementError,
  } = await admin
    .from(
      "user_portal_skin_entitlements",
    )
    .upsert(
      {
        user_id:
          character.user_id,
        skin_id:
          skinId,
        enabled,
        source,
        note,
        granted_by:
          staff.userId,
        granted_at:
          now,
        updated_at:
          now,
      },
      {
        onConflict:
          "user_id,skin_id",
      },
    );

  if (entitlementError) {
    throw new Error(
      `Unable to update portal skin access: ${entitlementError.message}`,
    );
  }

  if (!enabled) {
    const {
      data: preference,
      error: preferenceError,
    } = await admin
      .from(
        "user_portal_preferences",
      )
      .select(
        "selected_skin_id",
      )
      .eq(
        "user_id",
        character.user_id,
      )
      .maybeSingle();

    if (preferenceError) {
      throw new Error(
        `Portal skin access was updated, but the account preference could not be checked: ${preferenceError.message}`,
      );
    }

    if (
      preference?.selected_skin_id ===
      skinId
    ) {
      const {
        data: defaultSkin,
        error: defaultSkinError,
      } = await admin
        .from("portal_skins")
        .select("id")
        .eq("is_default", true)
        .eq("is_active", true)
        .maybeSingle();

      if (
        defaultSkinError ||
        !defaultSkin
      ) {
        throw new Error(
          `Portal skin access was revoked, but the account could not be returned to Sepulchria: ${
            defaultSkinError?.message ??
            "Default skin not found."
          }`,
        );
      }

      const {
        error: resetError,
      } = await admin
        .from(
          "user_portal_preferences",
        )
        .upsert(
          {
            user_id:
              character.user_id,
            selected_skin_id:
              defaultSkin.id,
            updated_at:
              now,
          },
          {
            onConflict:
              "user_id",
          },
        );

      if (resetError) {
        throw new Error(
          `Portal skin access was revoked, but the account could not be returned to Sepulchria: ${resetError.message}`,
        );
      }
    }
  }

  revalidatePath(
    `/admin/characters/${characterId}`,
  );
  revalidatePath("/appearance");
}


'''
    actions = actions[:pos] + code + actions[pos:]
    write(actions_rel, actions)
else:
    print("Character skin action already present.")

# 2) Rebuild same Premium & reward features component.
component_rel = "components/admin/admin-character-feature-access.tsx"

component = '''import {
  setCharacterFeatureEntitlement,
  setCharacterPortalSkinEntitlement,
} from "@/app/(portal)/admin/characters/actions";

export type CharacterFeatureEntitlementRow = {
  feature_key:
    | "private_chat"
    | "friend_list";
  enabled: boolean;
  source:
    | "paid"
    | "expertise"
    | "staff";
  note: string | null;
  granted_at: string;
  updated_at: string;
};

export type CharacterPortalSkinRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  is_default: boolean;
};

export type CharacterPortalSkinEntitlementRow = {
  skin_id: string;
  enabled: boolean;
  source:
    | "paid"
    | "staff";
  note: string | null;
};

const FEATURES = [
  {
    key: "private_chat",
    name: "Private Chats",
    description:
      "Allows this character to use staff-created invitation-only Private Chats.",
  },
  {
    key: "friend_list",
    name: "Friend List",
    description:
      "Allows this character to use friend requests and character relationships.",
  },
] as const;

export function AdminCharacterFeatureAccess({
  characterId,
  entitlements,
  portalSkins,
  portalSkinEntitlements,
}: {
  characterId: string;
  entitlements:
    CharacterFeatureEntitlementRow[];
  portalSkins:
    CharacterPortalSkinRow[];
  portalSkinEntitlements:
    CharacterPortalSkinEntitlementRow[];
}) {
  const byFeature = new Map(
    entitlements.map(
      (entry) => [
        entry.feature_key,
        entry,
      ],
    ),
  );

  const bySkin = new Map(
    portalSkinEntitlements.map(
      (entry) => [
        entry.skin_id,
        entry,
      ],
    ),
  );

  const premiumSkins =
    portalSkins.filter(
      (skin) =>
        !skin.is_default,
    );

  return (
    <section className="mt-6 overflow-hidden border border-[#60482e]/45 bg-[#15100d]">
      <div className="border-b border-[#60482e]/35 bg-[#100c09] px-5 py-4">
        <p className="text-[9px] uppercase tracking-[0.24em] text-[#8c704b]">
          Feature access
        </p>

        <h2 className="mt-2 font-serif text-2xl text-[#e1c89f]">
          Premium & reward features
        </h2>

        <p className="mt-2 max-w-3xl text-[11px] leading-5 text-[#8f8271]">
          Staff controls optional character and account features.
          Paid records a real-money purchase already confirmed by staff.
        </p>
      </div>

      <div className="grid gap-px bg-[#4f3b28]/35 lg:grid-cols-2">
        {FEATURES.map((feature) => {
          const entitlement =
            byFeature.get(
              feature.key,
            );
          const enabled =
            entitlement?.enabled ===
            true;

          return (
            <form
              key={feature.key}
              action={
                setCharacterFeatureEntitlement
              }
              className="bg-[#17110d] p-5"
            >
              <input
                type="hidden"
                name="characterId"
                value={characterId}
              />
              <input
                type="hidden"
                name="featureKey"
                value={feature.key}
              />

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-serif text-lg text-[#dfc79c]">
                    {feature.name}
                  </h3>
                  <p className="mt-2 text-[11px] leading-5 text-[#8f8271]">
                    {
                      feature.description
                    }
                  </p>
                </div>

                <span
                  className={
                    enabled
                      ? "shrink-0 border border-[#668657] bg-[#172313] px-2 py-1 text-[8px] uppercase tracking-[0.16em] text-[#a8cf92]"
                      : "shrink-0 border border-[#65483e] bg-[#221512] px-2 py-1 text-[8px] uppercase tracking-[0.16em] text-[#b78378]"
                  }
                >
                  {enabled
                    ? "Enabled"
                    : "Disabled"}
                </span>
              </div>

              <div className="mt-5 grid gap-4">
                <label>
                  <span className="text-[8px] uppercase tracking-[0.18em] text-[#806b50]">
                    Access
                  </span>

                  <select
                    name="enabled"
                    defaultValue={
                      enabled
                        ? "true"
                        : "false"
                    }
                    className="mt-2 w-full border border-[#60482e]/55 bg-[#0d0907] px-3 py-2.5 text-sm text-[#d7c4a5]"
                  >
                    <option value="false">
                      Disabled
                    </option>
                    <option value="true">
                      Enabled
                    </option>
                  </select>
                </label>

                <label>
                  <span className="text-[8px] uppercase tracking-[0.18em] text-[#806b50]">
                    Unlock source
                  </span>

                  <select
                    name="source"
                    defaultValue={
                      entitlement?.source ??
                      "staff"
                    }
                    className="mt-2 w-full border border-[#60482e]/55 bg-[#0d0907] px-3 py-2.5 text-sm text-[#d7c4a5]"
                  >
                    <option value="paid">
                      Real-money purchase
                    </option>
                    <option value="expertise">
                      Expertise reward
                    </option>
                    <option value="staff">
                      Staff grant
                    </option>
                  </select>
                </label>

                <label>
                  <span className="text-[8px] uppercase tracking-[0.18em] text-[#806b50]">
                    Staff note
                  </span>

                  <textarea
                    name="note"
                    rows={3}
                    maxLength={1000}
                    defaultValue={
                      entitlement?.note ??
                      ""
                    }
                    placeholder="Optional: payment reference, reward reason, event prize..."
                    className="mt-2 w-full resize-y border border-[#60482e]/55 bg-[#0d0907] px-3 py-2.5 text-sm leading-6 text-[#d7c4a5]"
                  />
                </label>
              </div>

              <div className="mt-5 flex justify-end border-t border-[#5d452d]/35 pt-4">
                <button
                  type="submit"
                  className="border border-[#8d6d3e] bg-[#332719] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[#efd9aa]"
                >
                  Save access
                </button>
              </div>
            </form>
          );
        })}

        {premiumSkins.map(
          (skin) => {
            const entitlement =
              bySkin.get(
                skin.id,
              );
            const enabled =
              entitlement?.enabled ===
              true;

            return (
              <form
                key={
                  `skin-${skin.id}`
                }
                action={
                  setCharacterPortalSkinEntitlement
                }
                className="bg-[#17110d] p-5"
              >
                <input
                  type="hidden"
                  name="characterId"
                  value={characterId}
                />
                <input
                  type="hidden"
                  name="skinId"
                  value={skin.id}
                />

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="mb-1 text-[7px] uppercase tracking-[0.18em] text-[#806b50]">
                      Portal skin
                    </p>

                    <h3 className="font-serif text-lg text-[#dfc79c]">
                      {skin.name}
                    </h3>

                    <p className="mt-2 text-[11px] leading-5 text-[#8f8271]">
                      {skin.description ||
                        "Unlocks this premium portal appearance for the account that owns this character."}
                    </p>
                  </div>

                  <span
                    className={
                      enabled
                        ? "shrink-0 border border-[#668657] bg-[#172313] px-2 py-1 text-[8px] uppercase tracking-[0.16em] text-[#a8cf92]"
                        : "shrink-0 border border-[#65483e] bg-[#221512] px-2 py-1 text-[8px] uppercase tracking-[0.16em] text-[#b78378]"
                    }
                  >
                    {enabled
                      ? "Enabled"
                      : "Disabled"}
                  </span>
                </div>

                <div className="mt-5 grid gap-4">
                  <label>
                    <span className="text-[8px] uppercase tracking-[0.18em] text-[#806b50]">
                      Access
                    </span>

                    <select
                      name="enabled"
                      defaultValue={
                        enabled
                          ? "true"
                          : "false"
                      }
                      className="mt-2 w-full border border-[#60482e]/55 bg-[#0d0907] px-3 py-2.5 text-sm text-[#d7c4a5]"
                    >
                      <option value="false">
                        Disabled
                      </option>
                      <option value="true">
                        Enabled
                      </option>
                    </select>
                  </label>

                  <label>
                    <span className="text-[8px] uppercase tracking-[0.18em] text-[#806b50]">
                      Unlock source
                    </span>

                    <select
                      name="source"
                      defaultValue={
                        entitlement?.source ??
                        "staff"
                      }
                      className="mt-2 w-full border border-[#60482e]/55 bg-[#0d0907] px-3 py-2.5 text-sm text-[#d7c4a5]"
                    >
                      <option value="paid">
                        Real-money purchase
                      </option>
                      <option value="staff">
                        Staff grant
                      </option>
                    </select>
                  </label>

                  <label>
                    <span className="text-[8px] uppercase tracking-[0.18em] text-[#806b50]">
                      Staff note
                    </span>

                    <textarea
                      name="note"
                      rows={3}
                      maxLength={1000}
                      defaultValue={
                        entitlement?.note ??
                        ""
                      }
                      placeholder="Optional: payment reference or staff grant reason..."
                      className="mt-2 w-full resize-y border border-[#60482e]/55 bg-[#0d0907] px-3 py-2.5 text-sm leading-6 text-[#d7c4a5]"
                    />
                  </label>
                </div>

                <div className="mt-5 flex justify-end border-t border-[#5d452d]/35 pt-4">
                  <button
                    type="submit"
                    className="border border-[#8d6d3e] bg-[#332719] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[#efd9aa]"
                  >
                    Save access
                  </button>
                </div>
              </form>
            );
          },
        )}
      </div>
    </section>
  );
}
'''

write(component_rel, component)

# 3) Patch admin character page data + props.
page_rel = "app/(portal)/admin/characters/[id]/page.tsx"
page = read(page_rel)

old_import = '''import {
  AdminCharacterFeatureAccess,
  type CharacterFeatureEntitlementRow,
} from "@/components/admin/admin-character-feature-access";'''

new_import = '''import {
  AdminCharacterFeatureAccess,
  type CharacterFeatureEntitlementRow,
  type CharacterPortalSkinEntitlementRow,
  type CharacterPortalSkinRow,
} from "@/components/admin/admin-character-feature-access";'''

if old_import in page:
    page = page.replace(old_import, new_import, 1)

if 'from "@/lib/supabase/admin"' not in page:
    anchor = 'import { createClient } from "@/lib/supabase/server";'
    if anchor not in page:
        raise SystemExit("Could not find createClient import.")
    page = page.replace(
        anchor,
        anchor + '\nimport { createAdminClient } from "@/lib/supabase/admin";',
        1,
    )

if "portalSkinEntitlementsResult" not in page:
    anchor = '''  const character =
    characterResult.data as unknown as
      CharacterRow;

'''
    if anchor not in page:
        raise SystemExit("Could not find resolved character block.")

    addition = anchor + '''  const privileged =
    createAdminClient();

  const [
    portalSkinsResult,
    portalSkinEntitlementsResult,
  ] = await Promise.all([
    privileged
      .from("portal_skins")
      .select(`
        id,
        slug,
        name,
        description,
        is_default
      `)
      .eq("is_active", true)
      .order("sort_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      }),

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

  if (
    portalSkinsResult.error ||
    portalSkinEntitlementsResult.error
  ) {
    throw new Error(
      `Unable to load portal skin access: ${
        portalSkinsResult.error?.message ??
        portalSkinEntitlementsResult.error?.message
      }`,
    );
  }

  const portalSkins =
    (portalSkinsResult.data ??
      []) as CharacterPortalSkinRow[];

  const portalSkinEntitlements =
    (portalSkinEntitlementsResult.data ??
      []) as CharacterPortalSkinEntitlementRow[];

'''
    page = page.replace(anchor, addition, 1)

if "portalSkinEntitlements={" not in page:
    m = re.search(
        r'<AdminCharacterFeatureAccess[\s\S]*?/>',
        page,
    )
    if not m:
        raise SystemExit(
            "Could not find AdminCharacterFeatureAccess usage."
        )

    block = m.group(0)
    replacement = block[:-2] + '''  portalSkins={
    portalSkins
  }
  portalSkinEntitlements={
    portalSkinEntitlements
  }
/>'''

    page = page[:m.start()] + replacement + page[m.end():]

write(page_rel, page)

# 4) Remove visible skin manager from Admin -> Users if the previous patch added it.
users_rel = "app/(portal)/admin/users/page.tsx"
users_path = ROOT / users_rel

if users_path.exists():
    users = users_path.read_text(encoding="utf-8")
    before = users

    users = re.sub(
        r'<AdminUserPortalSkins[\s\S]*?/>',
        '',
        users,
        count=1,
    )

    if users != before:
        users_path.write_text(users, encoding="utf-8")
        print("Removed Portal Skins UI from", users_rel)
    else:
        print("No Portal Skins UI was present in Admin Users.")

print()
print("Done.")
print("Portal skin controls now live in the existing Premium & reward features section on /admin/characters/[id].")
print("The entitlement still belongs to the account internally.")
print("No SQL is required.")
print("Run: npm run build")
