from pathlib import Path

BASE = "adae04c"

def read(path):
    p = Path(path)
    if not p.exists():
        raise SystemExit(f"Missing {path}. Run from repo root. Expected {BASE}.")
    return p.read_text(encoding="utf-8")

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"{label}: expected 1 match, found {count}. Expected working tree from {BASE}."
        )
    return text.replace(old, new, 1)

files = {}

# 1) Experience becomes an explicit owner/admin section.
path = "lib/auth/admin-section-access.ts"
text = read(path)
text = replace_once(
    text,
    '  | "events"\n  | "expertise"',
    '  | "events"\n  | "experience"\n  | "expertise"',
    "AdminSection experience type",
)
text = replace_once(
    text,
    '  events: ["owner", "admin", "master"],\n  expertise:',
    '  events: ["owner", "admin", "master"],\n  experience: ["owner", "admin"],\n  expertise:',
    "Experience section roles",
)
files[path] = text

# 2) Add Experience to top admin navigation.
path = "app/(portal)/admin/layout.tsx"
text = read(path)
text = replace_once(
    text,
    '''            {can("events") ? (
              <AdminNavigationLink href="/admin/events">
                Events
              </AdminNavigationLink>
            ) : null}

            {can("expertise") ? (''',
    '''            {can("events") ? (
              <AdminNavigationLink href="/admin/events">
                Events
              </AdminNavigationLink>
            ) : null}

            {can("experience") ? (
              <AdminNavigationLink href="/admin/experience">
                Experience
              </AdminNavigationLink>
            ) : null}

            {can("expertise") ? (''',
    "Admin top navigation Experience link",
)
files[path] = text

# 3) Add Experience to the admin right-side context navigation and page context.
path = "components/portal/admin-context-panel.tsx"
text = read(path)
text = replace_once(
    text,
    '  | "notifications"\n  | "trophies"',
    '  | "notifications"\n  | "experience"\n  | "trophies"',
    "Admin context Experience mode type",
)
text = replace_once(
    text,
    '''  if (pathname === "/admin/notifications") {
    return "notifications";
  }

  if (pathname === "/admin/trophies") {''',
    '''  if (pathname === "/admin/notifications") {
    return "notifications";
  }

  if (pathname === "/admin/experience") {
    return "experience";
  }

  if (pathname === "/admin/trophies") {''',
    "Admin context Experience path",
)
text = replace_once(
    text,
    '''  { section: "events", label: "Events", href: "/admin/events" },
  { section: "expertise", label: "Expertise", href: "/admin/expertise" },''',
    '''  { section: "events", label: "Events", href: "/admin/events" },
  { section: "experience", label: "Experience", href: "/admin/experience", aliases: ["feedback", "satisfaction"] },
  { section: "expertise", label: "Expertise", href: "/admin/expertise" },''',
    "Admin right-side navigation Experience entry",
)
text = replace_once(
    text,
    '''  if (mode === "notifications") {
    return (
      <AdminNotificationsNavigatorContext />
    );
  }

  if (mode === "trophies") {''',
    '''  if (mode === "notifications") {
    return (
      <AdminNotificationsNavigatorContext />
    );
  }

  if (mode === "experience") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <p className="text-[9px] tracking-[0.08em] text-[rgb(var(--sep-colour-806b50))]">
          Player experience
        </p>

        <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
          Satisfaction overview
        </h2>

        <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
          Review response rate, satisfaction distribution, individual player history and optional comments.
        </p>

        <div className="mt-4 space-y-2 text-[11px] text-[rgb(var(--sep-colour-b8aa96))]">
          <p>Use the filters to isolate a date range or rating.</p>
          <p>Staff accounts are excluded from voting and reporting.</p>
          <p>Skipped prompts still count toward prompt tracking.</p>
        </div>
      </div>
    );
  }

  if (mode === "trophies") {''',
    "Experience context panel",
)
files[path] = text

# 4) Staff can never be prompted.
path = "app/api/experience-feedback/status/route.ts"
text = read(path)
text = replace_once(
    text,
    '''  const admin = createAdminClient();
  const result = await admin''',
    '''  const admin = createAdminClient();

  const staffResult = await admin
    .from("staff_members")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (staffResult.error) {
    return NextResponse.json(
      { error: staffResult.error.message },
      { status: 500 },
    );
  }

  if (staffResult.data) {
    return NextResponse.json({ due: false }, { status: 200 });
  }

  const result = await admin''',
    "Staff exclusion in status route",
)
files[path] = text

path = "app/api/experience-feedback/prompt/route.ts"
text = read(path)
text = replace_once(
    text,
    '''  const admin = createAdminClient();
  const latest = await admin''',
    '''  const admin = createAdminClient();

  const staffResult = await admin
    .from("staff_members")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (staffResult.error) {
    return NextResponse.json(
      { error: staffResult.error.message },
      { status: 500 },
    );
  }

  if (staffResult.data) {
    return NextResponse.json(
      { due: false, promptId: null },
      { status: 200 },
    );
  }

  const latest = await admin''',
    "Staff exclusion in prompt route",
)
files[path] = text

# 5) Protect Experience admin page, exclude historical staff test rows, clean copy.
path = "app/(portal)/admin/experience/page.tsx"
text = read(path)
text = replace_once(
    text,
    'import { createAdminClient } from "@/lib/supabase/admin";',
    'import { createAdminClient } from "@/lib/supabase/admin";\nimport { requireAdminSection } from "@/lib/auth/require-staff";',
    "Experience admin auth import",
)
text = replace_once(
    text,
    '''}) {
  const params = searchParams ? await searchParams : {};
''',
    '''}) {
  await requireAdminSection("experience");

  const params = searchParams ? await searchParams : {};
''',
    "Experience admin auth",
)
text = replace_once(
    text,
    '''  const [feedbackResult, charactersResult] = await Promise.all([
    admin
      .from("experience_feedback")
      .select(
        "id, user_id, rating, comment, prompted_at, responded_at, skipped, created_at",
      )
      .order("prompted_at", { ascending: false }),
    admin
      .from("characters")
      .select("user_id, display_name, public_slug")
      .order("display_name", { ascending: true }),
  ]);''',
    '''  const [feedbackResult, charactersResult, staffResult] = await Promise.all([
    admin
      .from("experience_feedback")
      .select(
        "id, user_id, rating, comment, prompted_at, responded_at, skipped, created_at",
      )
      .order("prompted_at", { ascending: false }),
    admin
      .from("characters")
      .select("user_id, display_name, public_slug")
      .order("display_name", { ascending: true }),
    admin
      .from("staff_members")
      .select("user_id"),
  ]);''',
    "Experience admin staff query",
)
text = replace_once(
    text,
    '''  if (charactersResult.error) {
    throw new Error(
      `Unable to load characters: ${charactersResult.error.message}`,
    );
  }

  const feedbackRows = (feedbackResult.data ?? []) as FeedbackRow[];
  const characters = (charactersResult.data ?? []) as CharacterRow[];
''',
    '''  if (charactersResult.error) {
    throw new Error(
      `Unable to load characters: ${charactersResult.error.message}`,
    );
  }

  if (staffResult.error) {
    throw new Error(
      `Unable to load staff: ${staffResult.error.message}`,
    );
  }

  const staffUserIds = new Set(
    (staffResult.data ?? []).map((row) => row.user_id),
  );

  const feedbackRows = ((feedbackResult.data ?? []) as FeedbackRow[]).filter(
    (row) => !staffUserIds.has(row.user_id),
  );
  const characters = (charactersResult.data ?? []) as CharacterRow[];
''',
    "Experience admin exclude staff rows",
)
text = replace_once(
    text,
    '''            <p className="mt-2 max-w-3xl text-sm text-[rgb(var(--sep-colour-c7b493))]">
              Satisfaction prompts shown when players leave Sepulchria, at most once every 7 days. Replace the placeholder face files in <span className="font-mono text-[rgb(var(--sep-colour-dec69a))]">public/experience-faces/</span> with your own art whenever you are ready.
            </p>''',
    '''            <p className="mt-2 max-w-3xl text-sm text-[rgb(var(--sep-colour-c7b493))]">
              Satisfaction prompts shown to players when they leave Sepulchria, at most once every 7 days. Staff accounts are excluded.
            </p>''',
    "Remove admin developer art copy",
)
files[path] = text

# 6) Compact/restyle player modal and remove dev-facing path copy.
path = "components/experience/experience-logout-guard.tsx"
text = read(path)
text = replace_once(
    text,
    '''    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-2xl border border-[rgb(var(--sep-colour-6c5434))] bg-[rgb(var(--sep-colour-120d0a))] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.45)] sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8d775b))]">
              Session feedback
            </p>
            <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-efd6a3))]">
              How was your experience?
            </h2>
            <p className="mt-2 max-w-xl text-sm text-[rgb(var(--sep-colour-c7b493))]">
              Once every 7 days, when leaving Sepulchria, players can leave a quick feeling check so staff can understand how the world is landing.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">''',
    '''    <div
      data-sep-interaction-ignore="true"
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm"
    >
      <div className="w-full max-w-xl border border-[rgb(var(--sep-colour-6c5434))] bg-[rgb(var(--sep-colour-120d0a))] p-4 shadow-[0_16px_46px_rgba(0,0,0,0.42)] [transform:none!important] sm:p-5">
        <div className="mb-4">
          <p className="text-[10px] tracking-[0.08em] text-[rgb(var(--sep-colour-8d775b))]">
            Session feedback
          </p>
          <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-efd6a3))] sm:text-2xl">
            How was your experience?
          </h2>
          <p className="mt-1.5 max-w-lg text-[12px] leading-5 text-[rgb(var(--sep-colour-c7b493))]">
            A quick check-in helps us understand how your time in Sepulchria felt.
          </p>
        </div>

        <div className="grid grid-cols-5 gap-2">''',
    "Experience modal compact shell",
)
text = replace_once(
    text,
    '''                  "group flex flex-col items-center justify-center gap-2 border px-3 py-4 transition",
                  active
                    ? "border-[rgb(var(--sep-colour-d2aa63))] bg-[rgb(var(--sep-colour-201710))]"
                    : "border-[rgb(var(--sep-colour-5a4630))] bg-[rgb(var(--sep-colour-17110d))] hover:border-[rgb(var(--sep-colour-977242))] hover:bg-[rgb(var(--sep-colour-221912))]",
                  busy ? "cursor-wait opacity-60" : "cursor-pointer",''',
    '''                  "group flex flex-col items-center justify-center gap-1.5 border px-2 py-2.5 transition duration-150",
                  active
                    ? "border-[rgb(var(--sep-colour-d2aa63))] bg-[rgb(var(--sep-colour-201710))] shadow-[0_0_16px_rgba(var(--sep-rgb-177-132-75),0.16)]"
                    : "border-[rgb(var(--sep-colour-5a4630))] bg-[rgb(var(--sep-colour-17110d))] hover:-translate-y-[1px] hover:border-[rgb(var(--sep-colour-977242))] hover:bg-[rgb(var(--sep-colour-221912))] hover:shadow-[0_0_14px_rgba(var(--sep-rgb-177-132-75),0.12)]",
                  busy ? "cursor-wait opacity-60" : "cursor-pointer",''',
    "Experience face tile interaction",
)
text = replace_once(
    text,
    'className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-[rgb(var(--sep-colour-6a5437))] bg-[rgb(var(--sep-colour-0e0a08))] p-2"',
    'className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-[rgb(var(--sep-colour-6a5437))] bg-[rgb(var(--sep-colour-0e0a08))] p-1.5 sm:h-16 sm:w-16"',
    "Experience face image size",
)
text = replace_once(
    text,
    '''                  <p className="text-sm text-[rgb(var(--sep-colour-efd6a3))]">{rating.label}</p>
                  <p className="mt-1 text-[11px] text-[rgb(var(--sep-colour-8d775b))]">
                    {rating.description}
                  </p>''',
    '''                  <p className="text-[11px] text-[rgb(var(--sep-colour-efd6a3))] sm:text-xs">
                    {rating.label}
                  </p>''',
    "Experience compact face labels",
)
text = replace_once(
    text,
    '          <div className="mt-5 border border-[rgb(var(--sep-colour-5a4630))] bg-[rgb(var(--sep-colour-17110d))] p-4">',
    '          <div className="mt-4 border border-[rgb(var(--sep-colour-5a4630))] bg-[rgb(var(--sep-colour-17110d))] p-3 [transform:none!important]">',
    "Experience comment panel compact",
)
text = replace_once(
    text,
    '                className="border border-[rgb(var(--sep-colour-6a5437))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-cfb486))]"',
    '                className="border border-[rgb(var(--sep-colour-6a5437))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-cfb486))] [transform:none!important]"',
    "Skip comment no motion",
)
text = replace_once(
    text,
    '                className="border border-[rgb(var(--sep-colour-d2aa63))] bg-[rgb(var(--sep-colour-2a1e14))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-f1ddb4))]"',
    '                className="border border-[rgb(var(--sep-colour-d2aa63))] bg-[rgb(var(--sep-colour-2a1e14))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-f1ddb4))] [transform:none!important]"',
    "Send feedback no motion",
)
text = replace_once(
    text,
    '''        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-[rgb(var(--sep-colour-8d775b))]">
            Your custom face images live in <span className="font-mono text-[rgb(var(--sep-colour-bd9c68))]">/public/experience-faces/</span>. Replace them whenever you are ready.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => completePrompt({ skipped: true })}
            className="border border-[rgb(var(--sep-colour-6a5437))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-cfb486))]"
          >
            Skip
          </button>
        </div>''',
    '''        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={() => completePrompt({ skipped: true })}
            className="border border-[rgb(var(--sep-colour-6a5437))] px-3 py-1.5 text-xs text-[rgb(var(--sep-colour-cfb486))] [transform:none!important]"
          >
            Skip
          </button>
        </div>''',
    "Remove user-facing developer image text",
)
files[path] = text

# Write only after every matcher succeeds.
for path, text in files.items():
    Path(path).write_text(text, encoding="utf-8")
    print("✓", path)

print("\nadae04c Experience refinements installed.")
print("No SQL changes required.")
print("Run: npm run build")
