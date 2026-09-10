

import {
  AdminUserPortalSkins,
  type AdminPortalSkin,
  type AdminPortalSkinEntitlement,
} from "@/components/admin/admin-user-portal-skins";
import Link from "next/link";

import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import {
  deleteUserAccount,
  updateUserStaffRole,
} from "./actions";

type AdminUserRow = {
  user_id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  staff_role:
    | "owner"
    | "admin"
    | "moderator"
    | "master"
    | null;
  character_count: number;
};

type UserCharacterRow = {
  id: string;
  user_id: string;
  public_slug: string;
  first_name: string;
  surname: string;
  display_name: string | null;
  status:
    | "draft"
    | "submitted"
    | "approved"
    | "rejected";
};

type AdminUsersPageProps = {
  searchParams: Promise<{
    deleted?: string;
    error?: string;
  }>;
};

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

function getCharacterName(
  character: UserCharacterRow,
): string {
  return (
    character.display_name?.trim() ||
    `${character.first_name} ${character.surname}`.trim() ||
    "Unnamed character"
  );
}

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  const pageParams =
    await searchParams;

  const session =
    await requireAdminSection("users");

  const supabase =
    await createClient();

  const [
    usersResult,
    charactersResult,
    portalSkinsResult,
  ] = await Promise.all([

    supabase.rpc(
      "list_admin_users",
    ),

    supabase
      .from("characters")
      .select(`
        id,
        user_id,
        public_slug,
        first_name,
        surname,
        display_name,
        status
      `)
      .order("created_at", {
        ascending: true,
      }),

    supabase
      .from("portal_skins")
      .select(`
        id,
        slug,
        name,
        is_default
      `)
      .eq("is_active", true)
      .order("sort_order", {
        ascending: true,
      }),
  ]);

  if (usersResult.error) {
    throw new Error(
      `Unable to load users: ${usersResult.error.message}`,
    );
  }

  if (
    charactersResult.error
  ) {
    throw new Error(
      `Unable to load user characters: ${charactersResult.error.message}`,
    );
  }


  if (portalSkinsResult.error) {
    throw new Error(
      `Unable to load portal skins: ${portalSkinsResult.error.message}`,
    );
  }

  const admin =
    createAdminClient();

  const {
    data:
      portalSkinEntitlementsData,
    error:
      portalSkinEntitlementsError,
  } = await admin
    .from(
      "user_portal_skin_entitlements",
    )
    .select(`
      user_id,
      skin_id,
      enabled,
      source,
      note
    `);

  if (portalSkinEntitlementsError) {
    throw new Error(
      `Unable to load portal skin entitlements: ${portalSkinEntitlementsError.message}`,
    );
  }


  const users =
    (usersResult.data ??
      []) as AdminUserRow[];

  const characters =
    (charactersResult.data ??
      []) as UserCharacterRow[];

  const portalSkins =
    (portalSkinsResult.data ??
      []) as AdminPortalSkin[];

  const skinEntitlementsByUser =
    new Map<
      string,
      AdminPortalSkinEntitlement[]
    >();

  for (
    const entry of
      portalSkinEntitlementsData ??
      []
  ) {
    const userId =
      String(
        entry.user_id,
      );

    const existing =
      skinEntitlementsByUser.get(
        userId,
      ) ?? [];

    existing.push({
      skin_id:
        String(
          entry.skin_id,
        ),
      enabled:
        entry.enabled ===
        true,
      source:
        entry.source ===
          "paid"
          ? "paid"
          : "staff",
      note:
        entry.note ?? null,
    });

    skinEntitlementsByUser.set(
      userId,
      existing,
    );
  }


  const charactersByUser =
    new Map<
      string,
      UserCharacterRow[]
    >();

  for (
    const character of
      characters
  ) {
    const existing =
      charactersByUser.get(
        character.user_id,
      ) ?? [];

    existing.push(
      character,
    );

    charactersByUser.set(
      character.user_id,
      existing,
    );
  }

  return (
    <main className="admin_users_page_main_main">
      <div className="mx-auto max-w-6xl admin_users_page_div_container">
        <div className="flex flex-wrap items-end justify-between gap-3 admin_users_page_div_container_2">
          <div className="admin_users_page_div_user_management">
            <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8c704b))] admin_users_page_p_user_management">
              Administration
            </p>

            <h2 className="mt-1 font-serif text-3xl text-[rgb(var(--sep-colour-ead5ac))] admin_users_page_h2_user_management">
              User Management
            </h2>

            <p className="mt-1 max-w-3xl text-xs leading-5 text-[rgb(var(--sep-colour-928674))] admin_users_page_p_user_management_2">
              Accounts, characters
              and staff permissions.
            </p>
          </div>

          <span className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-a99069))] admin_users_page_span_text">
            {users.length} users
          </span>
        </div>

        {pageParams.error ? (
          <div
            role="alert"
            className="mt-3 border border-[rgb(var(--sep-colour-873e35))]/65 bg-[rgb(var(--sep-colour-351613))]/70 px-3 py-2 text-xs text-[rgb(var(--sep-colour-e0a39a))] admin_users_page_div_alert"
          >
            {pageParams.error}
          </div>
        ) : null}

        {pageParams.deleted ? (
          <div
            role="status"
            className="mt-3 border border-[rgb(var(--sep-colour-4f704e))]/65 bg-[rgb(var(--sep-colour-172619))]/70 px-3 py-2 text-xs text-[rgb(var(--sep-colour-b7d2ae))] admin_users_page_div_status"
          >
            The account{" "}
            <strong className="admin_users_page_strong_emphasis">
              {pageParams.deleted}
            </strong>{" "}
            was permanently
            deleted.
          </div>
        ) : null}

        <div className="mt-4 space-y-3 admin_users_page_div_container_3">
          {users.map(
            (user) => {
              const userCharacters =
                charactersByUser.get(
                  user.user_id,
                ) ?? [];

              const isCurrentUser =
                user.user_id ===
                session.userId;

              const protectedAccount =
                user.staff_role ===
                  "owner" ||
                user.staff_role ===
                  "admin";

              const canDeleteAccount =
                !isCurrentUser &&
                (session.role ===
                  "owner" ||
                  !protectedAccount);

              const canManageStaffRole =
                session.role === "owner" ||
                !protectedAccount;

              return (
                <section
                  key={
                    user.user_id
                  }
                  className="overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] admin_users_page_section_section"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-110d0a))] px-4 py-3 admin_users_page_div_container_4">
                    <div className="min-w-0 admin_users_page_div_container_5">
                      <div className="flex flex-wrap items-center gap-2 admin_users_page_div_container_6">
                        <h3 className="truncate font-serif text-lg text-[rgb(var(--sep-colour-dfc99f))] admin_users_page_h3_heading">
                          {user.email ??
                            "Email unavailable"}
                        </h3>

                        {isCurrentUser ? (
                          <span className="border border-[rgb(var(--sep-colour-84633c))]/55 bg-[rgb(var(--sep-colour-2a1d12))] px-2 py-0.5 text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-c9aa7a))] admin_users_page_span_text_2">
                            You
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756957))] admin_users_page_p_text">
                        Registered{" "}
                        {formatDate(
                          user.created_at,
                        )}
                      </p>
                    </div>

                    <RoleBadge
                      role={
                        user.staff_role
                      }
                    />
                  </div>

                  <div className="grid lg:grid-cols-[minmax(0,1fr)_270px] admin_users_page_div_container_7">
                    <div className="p-4 admin_users_page_div_container_8">
                      <dl className="grid gap-3 sm:grid-cols-3">
                        <UserDetail
                          label="Last sign-in"
                          value={formatDate(
                            user.last_sign_in_at,
                          )}
                        />

                        <UserDetail
                          label="Characters"
                          value={String(
                            user.character_count,
                          )}
                        />

                        <UserDetail
                          label="Staff role"
                          value={
                            user.staff_role ??
                            "Player"
                          }
                        />
                      </dl>

                      <div className="mt-3 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-3 admin_users_page_div_container_9">
                        <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))] admin_users_page_p_text_2">
                          Characters
                        </p>

                        {userCharacters.length >
                        0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5 admin_users_page_div_container_10">
                            {userCharacters.map(
                              (
                                character,
                              ) => (
                                <Link
                                  key={
                                    character.id
                                  }
                                  href={`/characters/${character.public_slug}`}
                                  className="border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-100c09))] px-2.5 py-1.5 text-[9px] text-[rgb(var(--sep-colour-baa78c))] transition hover:border-[rgb(var(--sep-colour-987344))] hover:text-[rgb(var(--sep-colour-ead2a5))]"
                                >
                                  {getCharacterName(
                                    character,
                                  )}

                                  <span className="ml-2 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-746653))] admin_users_page_span_text_3">
                                    {
                                      character.status
                                    }
                                  </span>
                                </Link>
                              ),
                            )}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-[rgb(var(--sep-colour-756957))] admin_users_page_p_text_3">
                            No characters.
                          </p>
                        )}
                      </div>
                    </div>

                    

                    <aside className="border-t border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] p-4 lg:border-l lg:border-t-0 admin_users_page_aside_sidebar">
                      {canManageStaffRole ? (
                        <form
                          action={
                            updateUserStaffRole
                          }
                          className="grid gap-2 admin_users_page_form_update_user_staff_role"
                        >
                          <input className="admin_users_page_input_user_id"
                            type="hidden"
                            name="userId"
                            value={
                              user.user_id
                            }
                          />

                          <label className="block admin_users_page_label_label">
                            <span className="mb-1 block text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))] admin_users_page_span_text_4">
                              Staff role
                            </span>

                            <select
                              name="role"
                              defaultValue={
                                user.staff_role ??
                                ""
                              }
                              className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0c0907))] px-3 py-2 text-xs text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] admin_users_page_select_role"
                            >
                              <option className="admin_users_page_option_role" value="">
                                Player
                              </option>
                              <option className="admin_users_page_option_master" value="master">
                                Master
                              </option>
                              <option className="admin_users_page_option_moderator" value="moderator">
                                Moderator
                              </option>

                              {session.role ===
                              "owner" ? (
                                <>
                                  <option className="admin_users_page_option_admin" value="admin">
                                    Administrator
                                  </option>
                                  <option className="admin_users_page_option_owner" value="owner">
                                    Owner
                                  </option>
                                </>
                              ) : null}
                            </select>
                          </label>

                          <button
                            type="submit"
                            className="w-full border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-3 py-2 text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))] admin_users_page_button_save_role"
                          >
                            Save role
                          </button>
                        </form>
                      ) : (
                        <div className="border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-0c0907))] px-3 py-2 admin_users_page_div_container_11">
                          <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] admin_users_page_p_text_4">
                            Staff role
                          </p>
                          <p className="mt-1 text-xs text-[rgb(var(--sep-colour-b9a78a))] admin_users_page_p_text_5">
                            {user.staff_role === "owner"
                              ? "Owner"
                              : "Administrator"}
                          </p>
                          <p className="mt-1 text-[8px] leading-4 text-[rgb(var(--sep-colour-756957))] admin_users_page_p_text_6">
                            Only an Owner can change this role.
                          </p>
                        </div>
                      )}

                      <details className="mt-3 border-t border-[rgb(var(--sep-colour-71352f))]/45 pt-3 admin_users_page_details_danger_zone">
                        <summary className="cursor-pointer list-none text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-c06d62))] admin_users_page_summary_danger_zone">
                          Danger zone ▾
                        </summary>

                        <div className="pt-3 admin_users_page_div_permanently_delete_account">
                          <h4 className="font-serif text-base text-[rgb(var(--sep-colour-e1aaa2))] admin_users_page_h4_permanently_delete_account">
                            Permanently
                            delete account
                          </h4>

                          {canDeleteAccount &&
                          user.email ? (
                            <>
                              <p className="mt-2 text-[9px] leading-4 text-[rgb(var(--sep-colour-a98782))] admin_users_page_p_text_7">
                                Type the
                                account email
                                to confirm.
                              </p>

                              <form
                                action={
                                  deleteUserAccount
                                }
                                className="mt-2 admin_users_page_form_delete_user_account"
                              >
                                <input className="admin_users_page_input_user_id_2"
                                  type="hidden"
                                  name="userId"
                                  value={
                                    user.user_id
                                  }
                                />

                                <input
                                  type="email"
                                  name="confirmationEmail"
                                  autoComplete="off"
                                  required
                                  placeholder={
                                    user.email
                                  }
                                  className="w-full border border-[rgb(var(--sep-colour-71352f))] bg-[rgb(var(--sep-colour-0c0706))] px-3 py-2 text-xs text-[rgb(var(--sep-colour-dfbbb5))] outline-none placeholder:text-[rgb(var(--sep-colour-684b47))] focus:border-[rgb(var(--sep-colour-bd6458))] admin_users_page_input_confirmation_email"
                                />

                                <button
                                  type="submit"
                                  className="mt-2 w-full border border-[rgb(var(--sep-colour-a44c42))] bg-[rgb(var(--sep-colour-481d19))] px-3 py-2 text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-f1beb6))] transition hover:border-[rgb(var(--sep-colour-d66b5f))] hover:bg-[rgb(var(--sep-colour-622720))] admin_users_page_button_delete_permanently"
                                >
                                  Delete
                                  permanently
                                </button>
                              </form>
                            </>
                          ) : (
                            <p className="mt-2 text-[9px] leading-4 text-[rgb(var(--sep-colour-8c6d68))] admin_users_page_p_permanently_delete_account">
                              {isCurrentUser
                                ? "You cannot delete the account currently in use."
                                : "Only the owner may delete an owner or administrator account."}
                            </p>
                          )}
                        </div>
                      </details>
                    </aside>
                  </div>
                </section>
              );
            },
          )}

          {users.length === 0 ? (
            <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-6 text-center admin_users_page_section_section_2">
              <p className="font-serif text-lg text-[rgb(var(--sep-colour-b9a88f))] admin_users_page_p_text_8">
                No registered users
                were found.
              </p>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function UserDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="admin_users_page_div_container_12">
      <dt className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
        {label}
      </dt>

      <dd className="mt-1 text-xs capitalize text-[rgb(var(--sep-colour-cdbc9f))]">
        {value}
      </dd>
    </div>
  );
}

function RoleBadge({
  role,
}: {
  role:
    | "owner"
    | "admin"
    | "moderator"
    | "master"
    | null;
}) {
  const classes = {
    owner:
      "border-amber-600/60 text-amber-400",
    admin:
      "border-red-800/60 text-red-400",
    moderator:
      "border-blue-800/60 text-blue-400",
    master:
      "border-purple-800/60 text-purple-400",
    player:
      "border-stone-600/60 text-stone-400",
  };

  const resolvedRole =
    role ?? "player";

  return (
    <span
      className={[((`border bg-black/20 px-2.5 py-1 text-[8px] uppercase tracking-[0.18em] ${classes[resolvedRole]}`)), "admin_users_page_span_text_5"].filter(Boolean).join(" ")}
    >
      {resolvedRole}
    </span>
  );
}
