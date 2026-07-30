import Link from "next/link";

import { requireAdmin } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

import { updateUserStaffRole } from "./actions";

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

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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

export default async function AdminUsersPage() {
  const session = await requireAdmin();
  const supabase = await createClient();

  const [
    usersResult,
    charactersResult,
  ] = await Promise.all([
    supabase.rpc("list_admin_users"),

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
  ]);

  if (usersResult.error) {
    throw new Error(
      `Unable to load users: ${usersResult.error.message}`,
    );
  }

  if (charactersResult.error) {
    throw new Error(
      `Unable to load user characters: ${charactersResult.error.message}`,
    );
  }

  const users =
    (usersResult.data ??
      []) as AdminUserRow[];

  const characters =
    (charactersResult.data ??
      []) as UserCharacterRow[];

  const charactersByUser = new Map<
    string,
    UserCharacterRow[]
  >();

  for (const character of characters) {
    const existing =
      charactersByUser.get(
        character.user_id,
      ) ?? [];

    existing.push(character);

    charactersByUser.set(
      character.user_id,
      existing,
    );
  }

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[9px] uppercase tracking-[0.28em] text-[#8c704b]">
              Administration
            </p>

            <h2 className="mt-2 font-serif text-4xl text-[#ead5ac]">
              User Management
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#a99b89]">
              Review registered accounts, inspect
              their characters and manage staff
              permissions.
            </p>
          </div>

          <span className="border border-[#60482e]/45 bg-[#15100d] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#a99069]">
            {users.length} registered users
          </span>
        </div>

        <div className="mt-8 space-y-5">
          {users.map((user) => {
            const userCharacters =
              charactersByUser.get(
                user.user_id,
              ) ?? [];

            const isCurrentUser =
              user.user_id === session.userId;

            return (
              <section
                key={user.user_id}
                className="overflow-hidden border border-[#60482e]/45 bg-[#15100d]"
              >
                <div className="border-b border-[#60482e]/35 bg-[#110d0a] px-5 py-4 sm:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-serif text-xl text-[#dfc99f]">
                          {user.email ??
                            "Email unavailable"}
                        </h3>

                        {isCurrentUser ? (
                          <span className="border border-[#84633c]/55 bg-[#2a1d12] px-2 py-1 text-[7px] uppercase tracking-[0.18em] text-[#c9aa7a]">
                            You
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-2 text-[9px] uppercase tracking-[0.16em] text-[#756957]">
                        Registered{" "}
                        {formatDate(
                          user.created_at,
                        )}
                      </p>
                    </div>

                    <RoleBadge
                      role={user.staff_role}
                    />
                  </div>
                </div>

                <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_300px]">
                  <div className="p-5 sm:p-6">
                    <div className="grid gap-4 sm:grid-cols-3">
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
                    </div>

                    <div className="mt-6 border-t border-[#60482e]/30 pt-5">
                      <p className="text-[8px] uppercase tracking-[0.22em] text-[#806b50]">
                        Characters
                      </p>

                      {userCharacters.length >
                      0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {userCharacters.map(
                            (character) => (
                              <Link
                                key={
                                  character.id
                                }
                                href={`/characters/${character.public_slug}`}
                                className="border border-[#60482e]/50 bg-[#100c09] px-3 py-2 text-[9px] text-[#baa78c] transition hover:border-[#987344] hover:text-[#ead2a5]"
                              >
                                {getCharacterName(
                                  character,
                                )}

                                <span className="ml-2 text-[7px] uppercase tracking-[0.14em] text-[#746653]">
                                  {
                                    character.status
                                  }
                                </span>
                              </Link>
                            ),
                          )}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-[#756957]">
                          This account has no
                          characters.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-[#60482e]/35 bg-[#100c09] p-5 lg:border-l lg:border-t-0">
                    <form
                      action={
                        updateUserStaffRole
                      }
                    >
                      <input
                        type="hidden"
                        name="userId"
                        value={user.user_id}
                      />

                      <label className="block">
                        <span className="mb-2 block text-[8px] uppercase tracking-[0.22em] text-[#806b50]">
                          Staff role
                        </span>

                        <select
                          name="role"
                          defaultValue={
                            user.staff_role ??
                            ""
                          }
                          className="w-full border border-[#60482e]/55 bg-[#0c0907] px-3 py-3 text-sm text-[#d7c4a5] outline-none transition focus:border-[#a17a49]"
                        >
                          <option value="">
                            Player — no staff access
                          </option>

                          <option value="master">
                            Master
                          </option>

                          <option value="moderator">
                            Moderator
                          </option>

                          <option value="admin">
                            Administrator
                          </option>

                          {session.role ===
                          "owner" ? (
                            <option value="owner">
                              Owner
                            </option>
                          ) : null}
                        </select>
                      </label>

                      <button
                        type="submit"
                        className="mt-4 w-full border border-[#987344] bg-[#3b2919] px-4 py-3 text-[9px] uppercase tracking-[0.2em] text-[#efd6a8] transition hover:border-[#b98c50] hover:bg-[#50371f]"
                      >
                        Save role
                      </button>
                    </form>

                    <p className="mt-4 text-[9px] leading-5 text-[#756957]">
                      Selecting Player removes
                      access to the administration
                      area.
                    </p>
                  </div>
                </div>
              </section>
            );
          })}

          {users.length === 0 ? (
            <section className="border border-[#60482e]/45 bg-[#15100d] p-8 text-center">
              <p className="font-serif text-xl text-[#b9a88f]">
                No registered users were found.
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
      <dt className="text-[8px] uppercase tracking-[0.22em] text-[#806b50]">
        {label}
      </dt>

      <dd className="mt-2 text-sm capitalize text-[#cdbc9f]">
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