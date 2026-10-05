from pathlib import Path

ROOT = Path(".")
PORTAL = ROOT / "app" / "(portal)"

if not PORTAL.exists():
    raise SystemExit(
        "ERROR: app/(portal) was not found. Run this patch from the Sepulchria repo root."
    )

AUTH_IMPORT = 'import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";'

def add_import(text: str, import_line: str) -> str:
    if import_line in text:
        return text

    lines = text.splitlines()
    in_import = False
    last_import_end = -1

    for i, line in enumerate(lines):
        stripped = line.strip()

        if stripped.startswith("import "):
            in_import = True

        if in_import:
            if stripped.endswith(";"):
                last_import_end = i
                in_import = False
            continue

        if last_import_end >= 0 and stripped and not stripped.startswith("//"):
            break

    if last_import_end < 0:
        raise RuntimeError("Unable to find import section.")

    lines.insert(last_import_end + 1, import_line)
    return "\n".join(lines) + ("\n" if text.endswith("\n") else "")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(
            f"{label}: expected exactly 1 match, found {count}."
        )
    return text.replace(old, new, 1)


updates: dict[Path, str] = {}
notes: list[str] = []

# -------------------------------------------------------------------
# 1) Reuse the request-cached authenticated-user lookup on portal pages.
#
# This deliberately touches page.tsx files only.
# Server actions, API routes, realtime clients, logout cleanup, mechanics,
# mutations, etc. keep their own authentication boundaries unchanged.
# -------------------------------------------------------------------
auth_page_count = 0
auth_call_count = 0

for path in sorted(PORTAL.rglob("page.tsx")):
    text = path.read_text(encoding="utf-8")

    needle = "supabase.auth.getUser()"
    count = text.count(needle)

    if not count:
        continue

    text = text.replace(
        needle,
        "getAuthenticatedUser()",
    )

    text = add_import(
        text,
        AUTH_IMPORT,
    )

    updates[path] = text
    auth_page_count += 1
    auth_call_count += count

notes.append(
    f"Portal page auth: {auth_call_count} direct getUser call(s) across "
    f"{auth_page_count} page file(s) now reuse getAuthenticatedUser()."
)

# -------------------------------------------------------------------
# 2) Forum viewer context:
#    - reuse cached auth
#    - load staff row + character row concurrently
# -------------------------------------------------------------------
forum_access = ROOT / "lib/forum/order-forum-access.ts"
forum_text = forum_access.read_text(encoding="utf-8")
forum_text = add_import(forum_text, AUTH_IMPORT)

forum_text = replace_once(
    forum_text,
'''  const {
    data: { user },
  } = await supabase.auth.getUser();
''',
'''  const {
    data: { user },
  } = await getAuthenticatedUser();
''',
    "forum viewer cached auth",
)

forum_text = replace_once(
    forum_text,
'''  const { data: staffMember } =
    await supabase
      .from("staff_members")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle<{ role: StaffRole }>();

  const staffRole =
    staffMember?.role === "owner" ||
    staffMember?.role === "admin" ||
    staffMember?.role === "moderator" ||
    staffMember?.role === "master"
      ? staffMember.role
      : null;

  const isStaff = staffRole !== null;

  const { data: characterData } = await supabase
    .from("characters")
    .select("id, status, life_state")
    .eq("user_id", user.id)
    .maybeSingle<CharacterRow>();
''',
'''  const [
    { data: staffMember },
    { data: characterData },
  ] = await Promise.all([
    supabase
      .from("staff_members")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle<{ role: StaffRole }>(),
    supabase
      .from("characters")
      .select("id, status, life_state")
      .eq("user_id", user.id)
      .maybeSingle<CharacterRow>(),
  ]);

  const staffRole =
    staffMember?.role === "owner" ||
    staffMember?.role === "admin" ||
    staffMember?.role === "moderator" ||
    staffMember?.role === "master"
      ? staffMember.role
      : null;

  const isStaff = staffRole !== null;
''',
    "forum parallel staff/character lookup",
)

updates[forum_access] = forum_text
notes.append("Forum viewer: cached auth + parallel staff/character lookup.")

# -------------------------------------------------------------------
# 3) Messages:
#    Start staff-session lookup immediately and let it run while inbox data
#    is being loaded and processed.
# -------------------------------------------------------------------
messages_page = PORTAL / "messages/page.tsx"
messages_text = updates.get(
    messages_page,
    messages_page.read_text(encoding="utf-8"),
)

messages_text = replace_once(
    messages_text,
'''  const supabase =
    await createClient();

  const {
''',
'''  const supabase =
    await createClient();

  const staffSessionPromise =
    getStaffSession();

  const {
''',
    "messages start staff lookup",
)

messages_text = replace_once(
    messages_text,
'''  const staffSession =
    await getStaffSession();
''',
'''  const staffSession =
    await staffSessionPromise;
''',
    "messages await existing staff lookup",
)

updates[messages_page] = messages_text
notes.append("Messages: staff session now loads concurrently with inbox data.")

# -------------------------------------------------------------------
# 4) Portal layout:
#    Start the main shell queries together, await context only as soon as
#    needed to start cosmetics, then let cosmetics overlap with the remaining
#    shell queries.
# -------------------------------------------------------------------
layout_path = PORTAL / "layout.tsx"
layout_text = layout_path.read_text(encoding="utf-8")

layout_text = replace_once(
    layout_text,
'''  const [
    context,
    worldState,
    initialTidings,
    unreadForumCount,
    staffSession,
  ] = await Promise.all([
    getPortalContext(),
    getWorldState(),
    getActiveTidings(),
    getUnreadForumCount(),
    getStaffSession(),
  ]);

  const presenceEnabled =
    context.character?.status ===
    "approved";

  const portalCosmetics =
    context.character
      ? await getEquippedCosmetics(
          context.character.id,
          [
            "header_control_frame",
            "left_panel_frame",
            "right_panel_frame",
            "centre_panel_frame",
            "location_frame",
            "location_atmosphere",
          ],
        )
      : {};
''',
'''  const contextPromise =
    getPortalContext();

  const worldStatePromise =
    getWorldState();

  const initialTidingsPromise =
    getActiveTidings();

  const unreadForumCountPromise =
    getUnreadForumCount();

  const staffSessionPromise =
    getStaffSession();

  /*
   * Cosmetics need the character id, so context is the only dependency.
   * Start every other shell request first, then begin cosmetics as soon as
   * context resolves instead of waiting for the whole first batch.
   */
  const context =
    await contextPromise;

  const portalCosmeticsPromise =
    context.character
      ? getEquippedCosmetics(
          context.character.id,
          [
            "header_control_frame",
            "left_panel_frame",
            "right_panel_frame",
            "centre_panel_frame",
            "location_frame",
            "location_atmosphere",
          ],
        )
      : Promise.resolve(
          {} as Awaited<
            ReturnType<
              typeof getEquippedCosmetics
            >
          >,
        );

  const [
    worldState,
    initialTidings,
    unreadForumCount,
    staffSession,
    portalCosmetics,
  ] = await Promise.all([
    worldStatePromise,
    initialTidingsPromise,
    unreadForumCountPromise,
    staffSessionPromise,
    portalCosmeticsPromise,
  ]);

  const presenceEnabled =
    context.character?.status ===
    "approved";
''',
    "portal shell overlap cosmetics",
)

updates[layout_path] = layout_text
notes.append("Portal shell: cosmetics now overlap world/tidings/forum/staff loading.")

# -------------------------------------------------------------------
# 5) /game:
#    Start Odd Job image lookup without awaiting it. Once Breeze room ids
#    are known, run the Breeze image lookup and await both together.
# -------------------------------------------------------------------
game_page = PORTAL / "game/page.tsx"
game_text = updates.get(
    game_page,
    game_page.read_text(encoding="utf-8"),
)

game_text = replace_once(
    game_text,
'''  const oddJobImagesResult =
    oddJobIds.length > 0
      ? await supabase
          .from("odd_jobs")
          .select("id, image_url")
          .in("id", oddJobIds)
      : { data: [], error: null };

  if (oddJobImagesResult.error) {
    throw new Error(
      `Unable to load Odd Job images: ${oddJobImagesResult.error.message}`,
    );
  }

  const oddJobImageById =
    new Map<string, string | null>(
      (oddJobImagesResult.data ?? []).map(
        (job) => [
          String(job.id),
          job.image_url ? String(job.image_url) : null,
        ],
      ),
    );

  const oddJobs: OddJobStateRow[] =
    oddJobsBase.map((job) => ({
      ...job,
      image_url:
        oddJobImageById.get(job.job_id) ?? null,
    }));
''',
'''  const oddJobImagesPromise =
    oddJobIds.length > 0
      ? supabase
          .from("odd_jobs")
          .select("id, image_url")
          .in("id", oddJobIds)
      : Promise.resolve({
          data: [],
          error: null,
        });
''',
    "game defer odd-job images",
)

game_text = replace_once(
    game_text,
'''  const breezeRoomImageResult =
    breezeRoomIds.length > 0
      ? await supabase
          .from("rooms")
          .select("id, image_url, is_outdoors")
          .in("id", breezeRoomIds)
      : {
          data: [],
          error: null,
        };

  if (breezeRoomImageResult.error) {
''',
'''  const breezeRoomImagePromise =
    breezeRoomIds.length > 0
      ? supabase
          .from("rooms")
          .select("id, image_url, is_outdoors")
          .in("id", breezeRoomIds)
      : Promise.resolve({
          data: [],
          error: null,
        });

  const [
    oddJobImagesResult,
    breezeRoomImageResult,
  ] = await Promise.all([
    oddJobImagesPromise,
    breezeRoomImagePromise,
  ]);

  if (oddJobImagesResult.error) {
    throw new Error(
      `Unable to load Odd Job images: ${oddJobImagesResult.error.message}`,
    );
  }

  const oddJobImageById =
    new Map<string, string | null>(
      (oddJobImagesResult.data ?? []).map(
        (job) => [
          String(job.id),
          job.image_url
            ? String(job.image_url)
            : null,
        ],
      ),
    );

  const oddJobs: OddJobStateRow[] =
    oddJobsBase.map((job) => ({
      ...job,
      image_url:
        oddJobImageById.get(job.job_id) ?? null,
    }));

  if (breezeRoomImageResult.error) {
''',
    "game parallel secondary image lookups",
)

updates[game_page] = game_text
notes.append("Game: Odd Job + Breeze secondary image lookups now overlap.")

# -------------------------------------------------------------------
# 6) Sanity checks before writing anything.
# -------------------------------------------------------------------
for path, new_text in updates.items():
    if not path.exists():
        raise SystemExit(f"ERROR: {path} disappeared during patch preparation.")

    if not new_text.strip():
        raise SystemExit(f"ERROR: Refusing to write empty content to {path}.")

# Check all portal page.tsx files, including files not otherwise modified.
remaining_page_auth = []
for path in sorted(PORTAL.rglob("page.tsx")):
    candidate = updates.get(path, path.read_text(encoding="utf-8"))
    if "supabase.auth.getUser()" in candidate:
        remaining_page_auth.append(str(path))

if remaining_page_auth:
    raise SystemExit(
        "ERROR: Direct page-level supabase.auth.getUser() still remains in:\n"
        + "\n".join(remaining_page_auth)
        + "\nNo files were written."
    )

# -------------------------------------------------------------------
# 7) Write only after every preflight/replacement succeeded.
# -------------------------------------------------------------------
for path, new_text in updates.items():
    path.write_text(new_text, encoding="utf-8")

print("SUCCESS: portal speed patch applied.")
print()
for note in notes:
    print(" -", note)

print()
print(f"Files changed: {len(updates)}")
print()
print("Security/functionality preserved:")
print(" - Server actions were NOT mass-edited.")
print(" - API routes were NOT mass-edited.")
print(" - Realtime client auth was NOT removed.")
print(" - Permission/staff checks remain.")
print(" - No Supabase schema/RPC changes were made.")
print(" - No Git operations were performed.")
print()
print("Next run:")
print("  npm run build")
