from pathlib import Path
import subprocess
import sys

EXPECTED_HEAD = "ad139b1"

def fail(message):
    print(f"PATCH FAILED: {message}")
    sys.exit(1)

def git(*args):
    result = subprocess.run(["git", *args], capture_output=True, text=True)
    if result.returncode != 0:
        fail(result.stderr.strip() or "Git command failed.")
    return result.stdout.strip()

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        fail(f"{label}: expected 1 match, found {count}.")
    return text.replace(old, new, 1)

head = git("rev-parse", "--short=7", "HEAD")
if head != EXPECTED_HEAD:
    fail(f"Expected baseline {EXPECTED_HEAD}, current HEAD is {head}.")

root = Path.cwd()

# ============================================================
# FRIEND LIST FILTERS
# ============================================================
friends_path = root / "app/(portal)/friends/page.tsx"
friends = friends_path.read_text(encoding="utf-8")

friends = replace_once(
    friends,
    '''type CharacterRow = {
  id: string;
  first_name: string;
  surname: string;
  display_name: string | null;
  public_slug: string;
  portrait_url: string | null;
};
''',
    '''type CodexSummary = {
  id: string;
  name: string;
};

type CharacterRow = {
  id: string;
  first_name: string;
  surname: string;
  display_name: string | null;
  public_slug: string;
  portrait_url: string | null;
  race:
    | CodexSummary
    | CodexSummary[]
    | null;
  association:
    | CodexSummary
    | CodexSummary[]
    | null;
  order_memberships:
    | {
        order:
          | CodexSummary
          | CodexSummary[]
          | null;
      }[]
    | null;
};

type FriendsSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

function firstParam(
  value: string | string[] | undefined,
) {
  return Array.isArray(value)
    ? value[0] ?? ""
    : value ?? "";
}

function normaliseRelation<T>(
  value: T | T[] | null,
): T | null {
  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}
''',
    "friend types",
)

friends = replace_once(
    friends,
    '''export default async function FriendsPage() {
  const supabase = await createClient();
''',
    '''export default async function FriendsPage({
  searchParams,
}: {
  searchParams: FriendsSearchParams;
}) {
  const params = await searchParams;

  const friendSearch =
    firstParam(params.friendSearch)
      .trim()
      .toLocaleLowerCase();

  const friendAncestry =
    firstParam(params.friendAncestry);

  const friendAssociation =
    firstParam(params.friendAssociation);

  const friendOrder =
    firstParam(params.friendOrder);

  const friendRelationship =
    firstParam(params.friendRelationship);

  const friendScope =
    firstParam(params.friendScope);

  const embedded =
    firstParam(params.embedded) === "1";

  const supabase = await createClient();
''',
    "friend page signature",
)

friends = replace_once(
    friends,
    '''  const availableCharacters =
    ((availableCharacterData ?? []) as CharacterRow[])
      .filter(
''',
    '''  const availableCharacters =
    (availableCharacterData ?? [])
      .map(
        (row) =>
          ({
            ...row,
            race: null,
            association: null,
            order_memberships: null,
          }) as CharacterRow,
      )
      .filter(
''',
    "available character cast",
)

friends = replace_once(
    friends,
    '''      .select(
        "id, first_name, surname, display_name, public_slug, portrait_url",
      )
      .in("id", targetIds)
''',
    '''      .select(`
        id,
        first_name,
        surname,
        display_name,
        public_slug,
        portrait_url,
        race:races!characters_race_id_fkey(
          id,
          name
        ),
        association:associations!characters_association_id_fkey(
          id,
          name
        ),
        order_memberships(
          order:orders!order_memberships_order_id_fkey(
            id,
            name
          )
        )
      `)
      .in("id", targetIds)
''',
    "target identity query",
)

friends = replace_once(
    friends,
    '''  const targetById = new Map(
    targets.map((target) => [target.id, target]),
  );

  const ingame = entries.filter(
    (entry) => entry.list_scope === "ingame",
  );
  const offgame = entries.filter(
    (entry) => entry.list_scope === "offgame",
  );
''',
    '''  const targetById = new Map(
    targets.map((target) => [target.id, target]),
  );

  const ancestryOptions =
    new Map<string, string>();

  const associationOptions =
    new Map<string, string>();

  const orderOptions =
    new Map<string, string>();

  for (const target of targets) {
    const race =
      normaliseRelation(target.race);

    const association =
      normaliseRelation(
        target.association,
      );

    if (race) {
      ancestryOptions.set(
        race.id,
        race.name,
      );
    }

    if (association) {
      associationOptions.set(
        association.id,
        association.name,
      );
    }

    for (
      const membership
      of target.order_memberships ?? []
    ) {
      const order =
        normaliseRelation(
          membership.order,
        );

      if (order) {
        orderOptions.set(
          order.id,
          order.name,
        );
      }
    }
  }

  const filteredEntries =
    entries.filter((entry) => {
      const target =
        targetById.get(
          entry.target_character_id,
        );

      if (!target) {
        return false;
      }

      const race =
        normaliseRelation(target.race);

      const association =
        normaliseRelation(
          target.association,
        );

      const orders =
        (target.order_memberships ?? [])
          .map((membership) =>
            normaliseRelation(
              membership.order,
            ),
          )
          .filter(
            (
              order,
            ): order is CodexSummary =>
              order !== null,
          );

      const searchable =
        [
          displayName(target),
          target.first_name,
          target.surname,
          race?.name,
          association?.name,
          ...orders.map(
            (order) => order.name,
          ),
          relationshipLabel(
            entry.relationship_type,
          ),
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase();

      return (
        (!friendSearch ||
          searchable.includes(
            friendSearch,
          )) &&
        (!friendAncestry ||
          race?.id ===
            friendAncestry) &&
        (!friendAssociation ||
          association?.id ===
            friendAssociation) &&
        (!friendOrder ||
          orders.some(
            (order) =>
              order.id ===
              friendOrder,
          )) &&
        (!friendRelationship ||
          entry.relationship_type ===
            friendRelationship) &&
        (!friendScope ||
          entry.list_scope ===
            friendScope)
      );
    });

  const ingame =
    filteredEntries.filter(
      (entry) =>
        entry.list_scope ===
        "ingame",
    );

  const offgame =
    filteredEntries.filter(
      (entry) =>
        entry.list_scope ===
        "offgame",
    );

  const sortedOptions = (
    values: Map<string, string>,
  ) =>
    Array.from(
      values,
      ([id, name]) => ({
        id,
        name,
      }),
    ).sort((a, b) =>
      a.name.localeCompare(
        b.name,
        "en",
        {
          sensitivity: "base",
        },
      ),
    );

  const ancestries =
    sortedOptions(
      ancestryOptions,
    );

  const associations =
    sortedOptions(
      associationOptions,
    );

  const orders =
    sortedOptions(orderOptions);

  const clearFiltersHref =
    embedded
      ? "/friends?embedded=1"
      : "/friends";
''',
    "friend filtering logic",
)

friends = replace_once(
    friends,
    '''      </header>

      <FriendSection
''',
    '''      </header>

      <form
        method="get"
        className="mt-4 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-4 py-4 sm:px-5"
      >
        {embedded ? (
          <input
            type="hidden"
            name="embedded"
            value="1"
          />
        ) : null}

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_150px_165px_150px_160px_150px_auto_auto] xl:items-end">
          <label>
            <span className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-8c704b))]">
              Search
            </span>
            <input
              type="search"
              name="friendSearch"
              defaultValue={
                firstParam(
                  params.friendSearch,
                )
              }
              placeholder="Name, Ancestry, Association, Order..."
              className="mt-1.5 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-[10px] text-[rgb(var(--sep-colour-c8b18d))] outline-none placeholder:text-[rgb(var(--sep-colour-665a4c))] focus:border-[rgb(var(--sep-colour-9a7543))]"
            />
          </label>

          <FriendFilterSelect
            label="Ancestry"
            name="friendAncestry"
            value={friendAncestry}
          >
            <option value="">
              All Ancestries
            </option>
            {ancestries.map(
              (option) => (
                <option
                  key={option.id}
                  value={option.id}
                >
                  {option.name}
                </option>
              ),
            )}
          </FriendFilterSelect>

          <FriendFilterSelect
            label="Association"
            name="friendAssociation"
            value={
              friendAssociation
            }
          >
            <option value="">
              All Associations
            </option>
            {associations.map(
              (option) => (
                <option
                  key={option.id}
                  value={option.id}
                >
                  {option.name}
                </option>
              ),
            )}
          </FriendFilterSelect>

          <FriendFilterSelect
            label="Order"
            name="friendOrder"
            value={friendOrder}
          >
            <option value="">
              All Orders
            </option>
            {orders.map(
              (option) => (
                <option
                  key={option.id}
                  value={option.id}
                >
                  {option.name}
                </option>
              ),
            )}
          </FriendFilterSelect>

          <FriendFilterSelect
            label="Relationship"
            name="friendRelationship"
            value={
              friendRelationship
            }
          >
            <option value="">
              All Relationships
            </option>
            <option value="friend">
              Friend
            </option>
            <option value="close_friend">
              Close Friend
            </option>
            <option value="family">
              Family
            </option>
            <option value="romance">
              Romance
            </option>
            <option value="lover">
              Lover
            </option>
            <option value="partner">
              Partner
            </option>
            <option value="spouse">
              Spouse
            </option>
          </FriendFilterSelect>

          <FriendFilterSelect
            label="Section"
            name="friendScope"
            value={friendScope}
          >
            <option value="">
              In-Game & Off-Game
            </option>
            <option value="ingame">
              In-Game
            </option>
            <option value="offgame">
              Off-Game
            </option>
          </FriendFilterSelect>

          <button
            type="submit"
            className="h-[38px] border border-[rgb(var(--sep-colour-765937))]/70 bg-[rgb(var(--sep-colour-271c12))] px-4 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-cfb487))] transition hover:border-[rgb(var(--sep-colour-a17a49))] hover:bg-[rgb(var(--sep-colour-3b2919))]"
          >
            Filter
          </button>

          <Link
            href={clearFiltersHref}
            className="flex h-[38px] items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-4 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-9f8b70))] transition hover:border-[rgb(var(--sep-colour-765937))] hover:text-[rgb(var(--sep-colour-d8bf91))]"
          >
            Clear
          </Link>
        </div>

        <p className="mt-3 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-746450))]">
          Showing {filteredEntries.length} of {entries.length} Friend List entr{entries.length === 1 ? "y" : "ies"}
        </p>
      </form>

      <FriendSection
''',
    "friend filters UI",
)

friends = friends.rstrip() + '''

function FriendFilterSelect({
  label,
  name,
  value,
  children,
}: {
  label: string;
  name: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-8c704b))]">
        {label}
      </span>

      <select
        name={name}
        defaultValue={value}
        className="mt-1.5 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-[10px] text-[rgb(var(--sep-colour-c8b18d))] outline-none focus:border-[rgb(var(--sep-colour-9a7543))]"
      >
        {children}
      </select>
    </label>
  );
}
'''

friends_path.write_text(
    friends,
    encoding="utf-8",
)

# ============================================================
# PEOPLE IN SEPULCHRIA — SHOW FRIENDS ONLY
# ============================================================
city_path = root / "components/portal/active-city-counter.tsx"
city = city_path.read_text(encoding="utf-8")

city = replace_once(
    city,
    '''  const [
    currentCharacterId,
    setCurrentCharacterId,
  ] = useState<string | null>(null);

  const [
    blockedCharacterIds,
''',
    '''  const [
    currentCharacterId,
    setCurrentCharacterId,
  ] = useState<string | null>(null);

  const [
    hasFriendListFeature,
    setHasFriendListFeature,
  ] = useState(false);

  const [
    friendCharacterIds,
    setFriendCharacterIds,
  ] = useState<Set<string>>(
    () => new Set(),
  );

  const [
    friendsOnly,
    setFriendsOnly,
  ] = useState(false);

  const [
    blockedCharacterIds,
''',
    "city state",
)

city_anchor = '''  useEffect(() => {
    if (!currentCharacterId) {
      setBlockedCharacterIds(
        new Set(),
      );
      return;
    }
'''

friend_effect = '''  useEffect(() => {
    if (!currentCharacterId) {
      setHasFriendListFeature(
        false,
      );
      setFriendCharacterIds(
        new Set(),
      );
      setFriendsOnly(false);
      return;
    }

    const supabase =
      createClient();

    let cancelled = false;

    async function refreshFriendList() {
      const [
        entitlementResult,
        entriesResult,
      ] = await Promise.all([
        supabase
          .from(
            "character_feature_entitlements",
          )
          .select("enabled")
          .eq(
            "character_id",
            currentCharacterId,
          )
          .eq(
            "feature_key",
            "friend_list",
          )
          .maybeSingle(),
        supabase
          .from(
            "character_friend_entries",
          )
          .select(
            "target_character_id",
          )
          .eq(
            "owner_character_id",
            currentCharacterId,
          ),
      ]);

      if (cancelled) {
        return;
      }

      if (
        entitlementResult.error
      ) {
        console.error(
          "Unable to check Friend List access for city presence:",
          entitlementResult.error.message,
        );
        setHasFriendListFeature(
          false,
        );
        setFriendCharacterIds(
          new Set(),
        );
        setFriendsOnly(false);
        return;
      }

      const enabled =
        entitlementResult.data
          ?.enabled === true;

      setHasFriendListFeature(
        enabled,
      );

      if (!enabled) {
        setFriendCharacterIds(
          new Set(),
        );
        setFriendsOnly(false);
        return;
      }

      if (entriesResult.error) {
        console.error(
          "Unable to load Friend List for city presence:",
          entriesResult.error.message,
        );
        setFriendCharacterIds(
          new Set(),
        );
        return;
      }

      setFriendCharacterIds(
        new Set(
          (entriesResult.data ?? [])
            .map((row) =>
              String(
                row.target_character_id,
              ),
            )
            .filter(
              (id) =>
                id !==
                currentCharacterId,
            ),
        ),
      );
    }

    void refreshFriendList();

    const channel = supabase
      .channel(
        `active-city-friend-list:${currentCharacterId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "character_friend_entries",
          filter:
            `owner_character_id=eq.${currentCharacterId}`,
        },
        () => {
          void refreshFriendList();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "character_feature_entitlements",
          filter:
            `character_id=eq.${currentCharacterId}`,
        },
        () => {
          void refreshFriendList();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(
        channel,
      );
    };
  }, [currentCharacterId]);

'''

if city.count(city_anchor) != 1:
    fail(
        f"city friend effect anchor: expected 1 match, found {city.count(city_anchor)}."
    )
city = city.replace(
    city_anchor,
    friend_effect + city_anchor,
    1,
)

filter_start = city.index(
    '''  const filteredCharacters =
    useMemo(() => {
'''
)
filter_end_marker = '''    ]);

  return (
'''
filter_end = city.index(
    filter_end_marker,
    filter_start,
)

old_filter = city[
    filter_start:
    filter_end + len("    ]);\n")
]

new_filter = '''  const filteredCharacters =
    useMemo(() => {
      const query =
        searchQuery
          .trim()
          .toLocaleLowerCase();

      return presentCharacters.filter(
        (presence) => {
          const person =
            normaliseRelation(
              presence.character,
            );

          if (!person) {
            return false;
          }

          if (
            friendsOnly &&
            !friendCharacterIds.has(
              person.id,
            )
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const race =
            normaliseRelation(
              person.race,
            );

          const association =
            normaliseRelation(
              person.association,
            );

          const orderNames =
            (person.order_memberships ?? [])
              .map((membership) =>
                normaliseRelation(
                  membership.order,
                )?.name,
              )
              .filter(Boolean);

          const room =
            normaliseRelation(
              presence.room,
            );

          const roomArea =
            room
              ? normaliseRelation(
                  room.area,
                )
              : null;

          const privateRoom =
            roomArea?.slug ===
              "private-locations" ||
            (
              room !== null &&
              allOrderHeadquartersRoomIdSet.has(
                room.id,
              )
            );

          const maySeePrivateRoom =
            !privateRoom ||
            isStaff ||
            (
              room !== null &&
              (
                visiblePrivateRoomIdSet.has(
                  room.id,
                ) ||
                visibleOrderHeadquartersRoomIdSet.has(
                  room.id,
                ) ||
                visibleBreezeLodgingRoomIdSet.has(
                  room.id,
                )
              )
            );

          const searchableText = [
            person.display_name,
            person.title,
            person.occupation,
            race?.name,
            association?.name,
            ...orderNames,
            maySeePrivateRoom
              ? room?.name
              : null,
            presence.status,
          ]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase();

          return searchableText.includes(
            query,
          );
        },
      );
    }, [
      presentCharacters,
      searchQuery,
      friendsOnly,
      friendCharacterIds,
      isStaff,
      visiblePrivateRoomIdSet,
      allOrderHeadquartersRoomIdSet,
      visibleOrderHeadquartersRoomIdSet,
      visibleBreezeLodgingRoomIdSet,
    ]);
'''

city = city.replace(
    old_filter,
    new_filter,
    1,
)

city = replace_once(
    city,
    '''                </label>

                <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end components_portal_active_city_counter_div_people_sepulchria_9">
''',
    '''                </label>

                {hasFriendListFeature ? (
                  <label className="flex h-[38px] shrink-0 cursor-pointer items-center gap-2 border border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-a9916d))] transition hover:border-[rgb(var(--sep-colour-8f6d42))]">
                    <input
                      type="checkbox"
                      checked={
                        friendsOnly
                      }
                      onChange={(
                        event,
                      ) =>
                        setFriendsOnly(
                          event.target
                            .checked,
                        )
                      }
                      className="h-3.5 w-3.5 accent-[rgb(var(--sep-colour-b28149))]"
                    />

                    <span>
                      Show friends only
                    </span>
                  </label>
                ) : null}

                <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end components_portal_active_city_counter_div_people_sepulchria_9">
''',
    "city toggle UI",
)

city = replace_once(
    city,
    '''                    {searchQuery
                      ? `${filteredCharacters.length} matching`
                      : `${count} present`}
''',
    '''                    {searchQuery ||
                    friendsOnly
                      ? `${filteredCharacters.length} matching`
                      : `${count} present`}
''',
    "city count label",
)

city = replace_once(
    city,
    '''                  No active characters
                  match your search.
''',
    '''                  No active characters
                  match your current filters.
''',
    "city empty state",
)

city_path.write_text(
    city,
    encoding="utf-8",
)

# ============================================================
# VERIFY
# ============================================================
friends_check = friends_path.read_text(
    encoding="utf-8",
)
city_check = city_path.read_text(
    encoding="utf-8",
)

required = {
    "friend ancestry filter":
        'name="friendAncestry"' in friends_check,
    "friend order identity query":
        "order_memberships(" in friends_check,
    "friend relationship filter":
        'name="friendRelationship"' in friends_check,
    "city friends-only toggle":
        "Show friends only" in city_check,
    "city friend entitlement":
        "hasFriendListFeature" in city_check,
    "city friend ids":
        "friendCharacterIds" in city_check,
}

bad = [
    name
    for name, ok in required.items()
    if not ok
]

if bad:
    fail(
        "Verification failed: "
        + ", ".join(bad)
    )

print("PATCH APPLIED SUCCESSFULLY")
print("Changed:")
print("  app/(portal)/friends/page.tsx")
print("  components/portal/active-city-counter.tsx")
print()
print("No Supabase schema change required.")
print("Run: npm run build")
