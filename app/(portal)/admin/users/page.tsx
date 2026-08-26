

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
    <main>
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8c704b))]">
              Administration
            </p>

            <h2 className="mt-1 font-serif text-3xl text-[rgb(var(--sep-colour-ead5ac))]">
              User Management
            </h2>

            <p className="mt-1 max-w-3xl text-xs leading-5 text-[rgb(var(--sep-colour-928674))]">
              Accounts, characters
              and staff permissions.
            </p>
          </div>

          <span className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-a99069))]">
            {users.length} users
          </span>
        </div>

        {pageParams.error ? (
          <div
            role="alert"
            className="mt-3 border border-[rgb(var(--sep-colour-873e35))]/65 bg-[rgb(var(--sep-colour-351613))]/70 px-3 py-2 text-xs text-[rgb(var(--sep-colour-e0a39a))]"
          >
            {pageParams.error}
          </div>
        ) : null}

        {pageParams.deleted ? (
          <div
            role="status"
            className="mt-3 border border-[rgb(var(--sep-colour-4f704e))]/65 bg-[rgb(var(--sep-colour-172619))]/70 px-3 py-2 text-xs text-[rgb(var(--sep-colour-b7d2ae))]"
          >
            The account{" "}
            <strong>
              {pageParams.deleted}
            </strong>{" "}
            was permanently
            deleted.
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
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
                  className="overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-110d0a))] px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-serif text-lg text-[rgb(var(--sep-colour-dfc99f))]">
                          {user.email ??
                            "Email unavailable"}
                        </h3>

                        {isCurrentUser ? (
                          <span className="border border-[rgb(var(--sep-colour-84633c))]/55 bg-[rgb(var(--sep-colour-2a1d12))] px-2 py-0.5 text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-c9aa7a))]">
                            You
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756957))]">
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

                  <div className="grid lg:grid-cols-[minmax(0,1fr)_270px]">
                    <div className="p-4">
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

                      <div className="mt-3 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-3">
                        <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))]">
                          Characters
                        </p>

                        {userCharacters.length >
                        0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
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

                                  <span className="ml-2 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-746653))]">
                                    {
                                      character.status
                                    }
                                  </span>
                                </Link>
                              ),
                            )}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-[rgb(var(--sep-colour-756957))]">
                            No characters.
                          </p>
                        )}
                      </div>
                    </div>

                    

                    <aside className="border-t border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] p-4 lg:border-l lg:border-t-0">
                      {canManageStaffRole ? (
                        <form
                          action={
                            updateUserStaffRole
                          }
                          className="grid gap-2"
                        >
                          <input
                            type="hidden"
                            name="userId"
                            value={
                              user.user_id
                            }
                          />

                          <label className="block">
                            <span className="mb-1 block text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))]">
                              Staff role
                            </span>

                            <select
                              name="role"
                              defaultValue={
                                user.staff_role ??
                                ""
                              }
                              className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0c0907))] px-3 py-2 text-xs text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
                            >
                              <option value="">
                                Player
                              </option>
                              <option value="master">
                                Master
                              </option>
                              <option value="moderator">
                                Moderator
                              </option>

                              {session.role ===
                              "owner" ? (
                                <>
                                  <option value="admin">
                                    Administrator
                                  </option>
                                  <option value="owner">
                                    Owner
                                  </option>
                                </>
                              ) : null}
                            </select>
                          </label>

                          <button
                            type="submit"
                            className="w-full border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-3 py-2 text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))]"
                          >
                            Save role
                          </button>
                        </form>
                      ) : (
                        <div className="border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-0c0907))] px-3 py-2">
                          <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
                            Staff role
                          </p>
                          <p className="mt-1 text-xs text-[rgb(var(--sep-colour-b9a78a))]">
                            {user.staff_role === "owner"
                              ? "Owner"
                              : "Administrator"}
                          </p>
                          <p className="mt-1 text-[8px] leading-4 text-[rgb(var(--sep-colour-756957))]">
                            Only an Owner can change this role.
                          </p>
                        </div>
                      )}

                      <details className="mt-3 border-t border-[rgb(var(--sep-colour-71352f))]/45 pt-3">
                        <summary className="cursor-pointer list-none text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-c06d62))]">
                          Danger zone ▾
                        </summary>

                        <div className="pt-3">
                          <h4 className="font-serif text-base text-[rgb(var(--sep-colour-e1aaa2))]">
                            Permanently
                            delete account
                          </h4>

                          {canDeleteAccount &&
                          user.email ? (
                            <>
                              <p className="mt-2 text-[9px] leading-4 text-[rgb(var(--sep-colour-a98782))]">
                                Type the
                                account email
                                to confirm.
                              </p>

                              <form
                                action={
                                  deleteUserAccount
                                }
                                className="mt-2"
                              >
                                <input
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
                                  className="w-full border border-[rgb(var(--sep-colour-71352f))] bg-[rgb(var(--sep-colour-0c0706))] px-3 py-2 text-xs text-[rgb(var(--sep-colour-dfbbb5))] outline-none placeholder:text-[rgb(var(--sep-colour-684b47))] focus:border-[rgb(var(--sep-colour-bd6458))]"
                                />

                                <button
                                  type="submit"
                                  className="mt-2 w-full border border-[rgb(var(--sep-colour-a44c42))] bg-[rgb(var(--sep-colour-481d19))] px-3 py-2 text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-f1beb6))] transition hover:border-[rgb(var(--sep-colour-d66b5f))] hover:bg-[rgb(var(--sep-colour-622720))]"
                                >
                                  Delete
                                  permanently
                                </button>
                              </form>
                            </>
                          ) : (
                            <p className="mt-2 text-[9px] leading-4 text-[rgb(var(--sep-colour-8c6d68))]">
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
            <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-6 text-center">
              <p className="font-serif text-lg text-[rgb(var(--sep-colour-b9a88f))]">
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
    <div>
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
      className={`border bg-black/20 px-2.5 py-1 text-[8px] uppercase tracking-[0.18em] ${classes[resolvedRole]}`}
    >
      {resolvedRole}
    </span>
  );
}
