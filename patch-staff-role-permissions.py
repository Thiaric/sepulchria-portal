
from pathlib import Path
import re

ROOT = Path.cwd()
AUTH = ROOT / "lib/auth/require-staff.ts"
ADMIN_LAYOUT = ROOT / "app/(portal)/admin/layout.tsx"

if not AUTH.exists() or not ADMIN_LAYOUT.exists():
    raise SystemExit("ERROR: run this from the Sepulchria repository root.")

SECTION_BY_SEGMENT = {
    "races": "races",
    "areas": "areas",
    "associations": "associations",
    "characters": "characters",
    "events": "events",
    "expertise": "expertise",
    "gifts": "gifts",
    "items": "items",
    "jobs": "jobs",
    "market": "market",
    "forum": "forum",
    "communication-logs": "communication_logs",
    "safety": "safety",
    "rooms": "rooms",
    "orders": "orders",
    "rules": "rules",
    "shapes": "shapes",
    "tidings": "tidings",
    "tickets": "tickets",
    "sanctions": "sanctions",
    "media": "media",
    "users": "users",
    "new-register": "new_register",
    "world": "world",
}

def write_guarded(path: Path, new: str, markers: list[str], label: str):
    if not path.exists():
        raise SystemExit(f"ERROR [{label}]: missing {path}")
    old = path.read_text(encoding="utf-8")
    if old == new:
        print(f"Already applied [{label}]")
        return
    for marker in markers:
        if marker not in old:
            raise SystemExit(
                f"ERROR [{label}]: baseline mismatch in {path}; missing marker {marker!r}"
            )
    path.write_text(new, encoding="utf-8")
    print(f"Applied [{label}]")

def ensure_auth_import(text: str, names: list[str]) -> str:
    pattern = re.compile(
        r'import\s*\{(?P<body>.*?)\}\s*from\s*"@/lib/auth/require-staff";',
        re.DOTALL,
    )
    match = pattern.search(text)
    if not match:
        raise ValueError("auth import not found")

    existing = [
        x.strip()
        for x in match.group("body").replace("\n", " ").split(",")
        if x.strip()
    ]

    for name in names:
        if name not in existing:
            existing.append(name)

    body = "\n  " + ",\n  ".join(existing) + ",\n"
    repl = f'import {{{body}}} from "@/lib/auth/require-staff";'
    return text[:match.start()] + repl + text[match.end():]

def remove_unused_auth_names(text: str) -> str:
    pattern = re.compile(
        r'import\s*\{(?P<body>.*?)\}\s*from\s*"@/lib/auth/require-staff";',
        re.DOTALL,
    )
    match = pattern.search(text)
    if not match:
        return text

    existing = [
        x.strip()
        for x in match.group("body").replace("\n", " ").split(",")
        if x.strip()
    ]

    outside = text[:match.start()] + text[match.end():]
    kept = [
        name for name in existing
        if re.search(rf"\b{re.escape(name)}\b", outside)
    ]

    if not kept:
        return outside

    body = "\n  " + ",\n  ".join(kept) + ",\n"
    repl = f'import {{{body}}} from "@/lib/auth/require-staff";'
    return text[:match.start()] + repl + text[match.end():]

auth_new = '''import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type StaffRole =
  | "owner"
  | "admin"
  | "moderator"
  | "master";

export type StaffSession = {
  userId: string;
  email: string | null;
  role: StaffRole;
};

export type AdminSection =
  | "overview"
  | "races"
  | "areas"
  | "associations"
  | "characters"
  | "events"
  | "expertise"
  | "gifts"
  | "items"
  | "jobs"
  | "market"
  | "forum"
  | "communication_logs"
  | "safety"
  | "rooms"
  | "orders"
  | "rules"
  | "shapes"
  | "tidings"
  | "tickets"
  | "sanctions"
  | "media"
  | "users"
  | "new_register"
  | "world";

export type StaffCapability =
  | "character_edit"
  | "character_delete"
  | "character_economy"
  | "character_warping"
  | "character_age_admin";

const STAFF_ROLES: StaffRole[] = [
  "owner",
  "admin",
  "moderator",
  "master",
];

const ADMIN_ROLES: StaffRole[] = [
  "owner",
  "admin",
];

const SECTION_ROLES: Record<
  AdminSection,
  readonly StaffRole[]
> = {
  overview: ["owner"],
  races: ["owner"],
  areas: ["owner"],
  associations: ["owner"],
  characters: ["owner", "admin", "moderator", "master"],
  events: ["owner", "admin", "master"],
  expertise: ["owner", "admin", "master"],
  gifts: ["owner"],
  items: ["owner"],
  jobs: ["owner"],
  market: ["owner", "admin"],
  forum: ["owner", "admin", "moderator"],
  communication_logs: ["owner", "admin", "moderator"],
  safety: ["owner"],
  rooms: ["owner"],
  orders: ["owner"],
  rules: ["owner"],
  shapes: ["owner"],
  tidings: ["owner", "admin", "moderator", "master"],
  tickets: ["owner", "admin", "moderator", "master"],
  sanctions: ["owner", "admin", "moderator"],
  media: ["owner"],
  users: ["owner"],
  new_register: ["owner"],
  world: ["owner", "admin", "master"],
};

const CAPABILITY_ROLES: Record<
  StaffCapability,
  readonly StaffRole[]
> = {
  character_edit: ["owner", "admin", "master"],
  character_delete: ["owner", "admin"],
  character_economy: ["owner", "admin"],
  character_warping: ["owner", "admin", "master"],
  character_age_admin: ["owner", "admin"],
};

function isStaffRole(
  value: unknown,
): value is StaffRole {
  return (
    typeof value === "string" &&
    STAFF_ROLES.includes(
      value as StaffRole,
    )
  );
}

export function canAccessAdminSection(
  role: StaffRole,
  section: AdminSection,
): boolean {
  return SECTION_ROLES[
    section
  ].includes(role);
}

export function hasStaffCapability(
  role: StaffRole,
  capability: StaffCapability,
): boolean {
  return CAPABILITY_ROLES[
    capability
  ].includes(role);
}

export function canHandleTicketCategory(
  role: StaffRole,
  category: string | null,
): boolean {
  if (role === "master") {
    return category !== "report";
  }

  return true;
}

export function defaultAdminPath(
  role: StaffRole,
): string {
  if (role === "owner") {
    return "/admin";
  }

  return "/admin/characters";
}

export async function getStaffSession(): Promise<
  StaffSession | null
> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const {
    data: staffMember,
    error: staffError,
  } = await supabase
    .from("staff_members")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    staffError ||
    !staffMember ||
    !isStaffRole(staffMember.role)
  ) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    role: staffMember.role,
  };
}

export async function requireStaff(): Promise<StaffSession> {
  const session =
    await getStaffSession();

  if (!session) {
    redirect("/");
  }

  return session;
}

export async function requireAdmin(): Promise<StaffSession> {
  const session =
    await requireStaff();

  if (
    !ADMIN_ROLES.includes(
      session.role,
    )
  ) {
    redirect(
      defaultAdminPath(
        session.role,
      ),
    );
  }

  return session;
}

export async function requireAdminSection(
  section: AdminSection,
): Promise<StaffSession> {
  const session =
    await requireStaff();

  if (
    !canAccessAdminSection(
      session.role,
      section,
    )
  ) {
    redirect(
      defaultAdminPath(
        session.role,
      ),
    );
  }

  return session;
}

export async function requireStaffCapability(
  capability: StaffCapability,
): Promise<StaffSession> {
  const session =
    await requireStaff();

  if (
    !hasStaffCapability(
      session.role,
      capability,
    )
  ) {
    redirect(
      defaultAdminPath(
        session.role,
      ),
    );
  }

  return session;
}
'''

write_guarded(
    AUTH,
    auth_new,
    [
        'export type StaffRole =',
        'export async function requireStaff',
        'export async function requireAdmin',
    ],
    "central staff permission policy",
)

layout_new = '''import Link from "next/link";
import type { ReactNode } from "react";

import { AdminInteractionKeeper } from "@/components/admin/admin-interaction-keeper";
import { SubmittedCharacterBadge } from "@/components/admin/submitted-character-badge";
import { TicketNotificationBadge } from "@/components/support/ticket-notification-badge";
import { SanctionNotificationBadge } from "@/components/sanctions/sanction-notification-badge";
import {
  canAccessAdminSection,
  requireStaff,
  type AdminSection,
} from "@/lib/auth/require-staff";

import "./admin-compact.css";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({
  children,
}: AdminLayoutProps) {
  const staff = await requireStaff();

  const can = (
    section: AdminSection,
  ) =>
    canAccessAdminSection(
      staff.role,
      section,
    );

  return (
    <div className="min-h-[calc(100vh-5rem)]">
      <AdminInteractionKeeper />

      <div className="border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-5 py-4 sm:px-7 lg:px-9">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8b704e))]">
              Sepulchria staff
            </p>

            <h1 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-e2cda4))]">
              Administration
            </h1>
          </div>

          <nav
            aria-label="Administration"
            className="flex flex-wrap items-center gap-2"
          >
            {can("overview") ? <AdminNavigationLink href="/admin">Overview</AdminNavigationLink> : null}
            {can("races") ? <AdminNavigationLink href="/admin/races">Ancestries</AdminNavigationLink> : null}
            {can("areas") ? <AdminNavigationLink href="/admin/areas">Areas</AdminNavigationLink> : null}
            {can("associations") ? <AdminNavigationLink href="/admin/associations">Associations</AdminNavigationLink> : null}

            {can("characters") ? (
              <AdminNavigationLink href="/admin/characters">
                <span className="flex items-center gap-2">
                  <span>Characters</span>
                  <SubmittedCharacterBadge variant="admin-nav" />
                </span>
              </AdminNavigationLink>
            ) : null}

            {can("events") ? <AdminNavigationLink href="/admin/events">Events</AdminNavigationLink> : null}
            {can("expertise") ? <AdminNavigationLink href="/admin/expertise">Expertise</AdminNavigationLink> : null}
            {can("gifts") ? <AdminNavigationLink href="/admin/gifts">Feats</AdminNavigationLink> : null}

            {can("items") ? (
              <>
                <AdminNavigationLink href="/admin/items">Items</AdminNavigationLink>
                <AdminNavigationLink href="/admin/items/vault">Item Vault</AdminNavigationLink>
              </>
            ) : null}

            {can("jobs") ? <AdminNavigationLink href="/admin/jobs">Jobs</AdminNavigationLink> : null}
            {can("market") ? <AdminNavigationLink href="/admin/market">Market</AdminNavigationLink> : null}
            {can("forum") ? <AdminNavigationLink href="/admin/forum">Forum</AdminNavigationLink> : null}
            {can("communication_logs") ? <AdminNavigationLink href="/admin/communication-logs">Logs</AdminNavigationLink> : null}
            {can("safety") ? <AdminNavigationLink href="/admin/safety">Safety</AdminNavigationLink> : null}
            {can("rooms") ? <AdminNavigationLink href="/admin/rooms">Locations</AdminNavigationLink> : null}
            {can("orders") ? <AdminNavigationLink href="/admin/orders">Orders</AdminNavigationLink> : null}
            {can("rules") ? <AdminNavigationLink href="/admin/rules">Rules</AdminNavigationLink> : null}
            {can("shapes") ? <AdminNavigationLink href="/admin/shapes">Shapes</AdminNavigationLink> : null}
            {can("tidings") ? <AdminNavigationLink href="/admin/tidings">Tidings</AdminNavigationLink> : null}

            {can("tickets") ? (
              <AdminNavigationLink href="/admin/tickets">
                <span className="flex items-center gap-2">
                  <span>Tickets</span>
                  <TicketNotificationBadge audience="staff" variant="admin-nav" />
                </span>
              </AdminNavigationLink>
            ) : null}

            {can("sanctions") ? (
              <AdminNavigationLink href="/admin/sanctions">
                <span className="flex items-center gap-2">
                  <span>Sanctions</span>
                  <SanctionNotificationBadge audience="staff" />
                </span>
              </AdminNavigationLink>
            ) : null}

            {can("media") ? <AdminNavigationLink href="/admin/media">Media</AdminNavigationLink> : null}
            {can("users") ? <AdminNavigationLink href="/admin/users">Users</AdminNavigationLink> : null}
            {can("new_register") ? <AdminNavigationLink href="/admin/new-register">Registrations</AdminNavigationLink> : null}
            {can("world") ? <AdminNavigationLink href="/admin/world">World</AdminNavigationLink> : null}
          </nav>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-3">
          <span className="border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-21170f))] px-2.5 py-1 text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-c1a477))]">
            {staff.role}
          </span>

          <span className="text-[10px] text-[rgb(var(--sep-colour-8f806c))]">
            {staff.email ?? "Authenticated staff member"}
          </span>
        </div>
      </div>

      <div className="admin-compact">
        {children}
      </div>
    </div>
  );
}

function AdminNavigationLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-18110d))] px-3 py-2 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-bca27b))] transition hover:border-[rgb(var(--sep-colour-9b7446))] hover:bg-[rgb(var(--sep-colour-2b1d12))] hover:text-[rgb(var(--sep-colour-ecd2a3))]"
    >
      {children}
    </Link>
  );
}
'''

write_guarded(
    ADMIN_LAYOUT,
    layout_new,
    [
        'Sepulchria staff',
        'AdminNavigationLink href="/admin/characters"',
        'AdminNavigationLink href="/admin/world"',
    ],
    "role-aware admin navigation",
)

admin_root = ROOT / "app/(portal)/admin"
gated_files = []

for path in admin_root.rglob("*"):
    if path.suffix not in {".ts", ".tsx"}:
        continue

    rel_parts = path.relative_to(admin_root).parts

    if path.name == "layout.tsx":
        continue

    if len(rel_parts) == 1:
        if path.name != "page.tsx":
            continue
        section = "overview"
    else:
        segment = rel_parts[0]
        if segment == "characters":
            continue
        section = SECTION_BY_SEGMENT.get(segment)
        if not section:
            continue

    text = path.read_text(encoding="utf-8")

    if (
        "requireStaff()" not in text
        and "requireAdmin()" not in text
    ):
        continue

    text = ensure_auth_import(
        text,
        ["requireAdminSection"],
    )

    text = text.replace(
        "requireStaff()",
        f'requireAdminSection("{section}")',
    ).replace(
        "requireAdmin()",
        f'requireAdminSection("{section}")',
    )

    text = remove_unused_auth_names(text)
    path.write_text(text, encoding="utf-8")
    gated_files.append(path.relative_to(ROOT).as_posix())

print(f"Applied [section gates] to {len(gated_files)} admin files")

char_list = ROOT / "app/(portal)/admin/characters/page.tsx"
text = char_list.read_text(encoding="utf-8")
text = ensure_auth_import(text, ["requireAdminSection"])
text = text.replace(
    "await requireStaff();",
    'await requireAdminSection("characters");',
    1,
)
text = remove_unused_auth_names(text)
char_list.write_text(text, encoding="utf-8")
print("Applied [characters list gate]")

char_detail = ROOT / "app/(portal)/admin/characters/[id]/page.tsx"
text = char_detail.read_text(encoding="utf-8")

text = ensure_auth_import(
    text,
    [
        "hasStaffCapability",
        "requireAdminSection",
    ],
)

old_auth = '''  await requireStaff();

  const { id } = await params;'''
new_auth = '''  const staff =
    await requireAdminSection(
      "characters",
    );

  const canEditCharacter =
    hasStaffCapability(
      staff.role,
      "character_edit",
    );

  const canDeleteCharacter =
    hasStaffCapability(
      staff.role,
      "character_delete",
    );

  const canManageEconomy =
    hasStaffCapability(
      staff.role,
      "character_economy",
    );

  const canManageWarping =
    hasStaffCapability(
      staff.role,
      "character_warping",
    );

  const { id } = await params;'''

if old_auth not in text:
    raise SystemExit("ERROR: character detail auth marker not found")
text = text.replace(old_auth, new_auth, 1)

def wrap_exact_link(text: str, block: str, condition: str, label: str):
    if block not in text:
        raise SystemExit(f"ERROR: {label} link block not found")
    inner = block.replace("            ", "              ")
    return text.replace(
        block,
        f'''            {{{condition} ? (
{inner}            ) : null}}
''',
        1,
    )

inventory_block = '''            <Link
              href={`/admin/characters/${character.id}/inventory`}
              className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))]"
            >
              Manage inventory
            </Link>
'''
text = wrap_exact_link(text, inventory_block, "canManageEconomy", "inventory")

warping_block = '''            <Link
              href={`/admin/characters/${character.id}/warping`}
              className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))]"
            >
              Manage Warping
            </Link>
'''
text = wrap_exact_link(text, warping_block, "canManageWarping", "warping")

premium_block = '''            <Link
              href={`/admin/characters/${character.id}/premium-features`}
              className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))]"
            >
              Premium Features
            </Link>
'''
text = wrap_exact_link(text, premium_block, "canManageEconomy", "premium")

ledger_block = '''            <Link
              href={`/admin/characters/${character.id}/ledger`}
              className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))]"
            >
              Ledger
            </Link>
'''
text = wrap_exact_link(text, ledger_block, "canManageEconomy", "ledger")

form_start = '''            <AdminCharacterEditForm
              action={
                updateCharacterAdministration
              }
              className="mt-6"
            >'''
if form_start not in text:
    raise SystemExit("ERROR: character edit form start marker not found")
text = text.replace(
    form_start,
    '''            {canEditCharacter ? (
              <AdminCharacterEditForm
                action={
                  updateCharacterAdministration
                }
                className="mt-6"
              >''',
    1,
)

form_end = '''            </AdminCharacterEditForm>

            <div className="mt-8 border-t border-[rgb(var(--sep-colour-6f302b))]/45 pt-6">'''
if form_end not in text:
    raise SystemExit("ERROR: character edit form end marker not found")
text = text.replace(
    form_end,
    '''              </AdminCharacterEditForm>
            ) : (
              <div className="mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] p-4 text-xs leading-6 text-[rgb(var(--sep-colour-9f917c))]">
                Moderator access is read-only on character records.
                You can review the sheet and moderation-relevant information,
                but gameplay and account data cannot be changed from this role.
              </div>
            )}

            {canDeleteCharacter ? (
            <div className="mt-8 border-t border-[rgb(var(--sep-colour-6f302b))]/45 pt-6">''',
    1,
)

danger_close = '''            </div>
          </section>
        </div>
      </div>
    </main>'''
if danger_close not in text:
    raise SystemExit("ERROR: character danger-zone close marker not found")
text = text.replace(
    danger_close,
    '''            </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>''',
    1,
)

text = remove_unused_auth_names(text)
char_detail.write_text(text, encoding="utf-8")
print("Applied [role-specific character detail UI]")

char_actions = ROOT / "app/(portal)/admin/characters/actions.ts"
text = char_actions.read_text(encoding="utf-8")
text = ensure_auth_import(
    text,
    ["requireStaffCapability"],
)

old_update_auth = '''  const staff =
    await requireStaff();'''
if old_update_auth not in text:
    raise SystemExit("ERROR: character update auth marker not found")
text = text.replace(
    old_update_auth,
    '''  const staff =
    await requireStaffCapability(
      "character_edit",
    );''',
    1,
)

if "  await requireAdmin();" not in text:
    raise SystemExit("ERROR: character delete auth marker not found")
text = text.replace(
    "  await requireAdmin();",
    '''  await requireStaffCapability(
    "character_delete",
  );''',
    1,
)

text = remove_unused_auth_names(text)
char_actions.write_text(text, encoding="utf-8")
print("Applied [character action capabilities]")

SPECIAL_CHARACTER_FILES = {
    "app/(portal)/admin/characters/[id]/inventory/page.tsx": "character_economy",
    "app/(portal)/admin/characters/[id]/ledger/page.tsx": "character_economy",
    "app/(portal)/admin/characters/[id]/premium-features/page.tsx": "character_economy",
    "app/(portal)/admin/characters/[id]/warping/page.tsx": "character_warping",
    "app/(portal)/admin/characters/[id]/warping/actions.ts": "character_warping",
    "app/(portal)/admin/characters/[id]/warping-actions.ts": "character_warping",
    "app/(portal)/admin/characters/age-actions.ts": "character_age_admin",
    "app/(portal)/admin/characters/remnants-actions.ts": "character_economy",
}

for rel_path, capability in SPECIAL_CHARACTER_FILES.items():
    path = ROOT / rel_path
    if not path.exists():
        continue

    text = path.read_text(encoding="utf-8")
    if "requireStaff()" not in text and "requireAdmin()" not in text:
        continue

    text = ensure_auth_import(
        text,
        ["requireStaffCapability"],
    )

    text = text.replace(
        "requireStaff()",
        f'requireStaffCapability("{capability}")',
    ).replace(
        "requireAdmin()",
        f'requireStaffCapability("{capability}")',
    )

    text = remove_unused_auth_names(text)
    path.write_text(text, encoding="utf-8")
    print(f"Applied [{capability}] {rel_path}")

inventory_actions = ROOT / "lib/items/admin-inventory-actions.ts"
if inventory_actions.exists():
    text = inventory_actions.read_text(encoding="utf-8")
    text = ensure_auth_import(
        text,
        ["requireStaffCapability"],
    )
    text = text.replace(
        "requireStaff()",
        'requireStaffCapability("character_economy")',
    )
    text = remove_unused_auth_names(text)
    inventory_actions.write_text(text, encoding="utf-8")
    print("Applied [character economy] lib/items/admin-inventory-actions.ts")

ticket_list = ROOT / "app/(portal)/admin/tickets/page.tsx"
text = ticket_list.read_text(encoding="utf-8")
text = ensure_auth_import(
    text,
    ["requireAdminSection"],
)
text = text.replace(
    "const staff=await requireStaff();",
    'const staff=await requireAdminSection("tickets");',
    1,
)
old_ticket_query = ' let q=admin.from("tickets").select("id,public_reference,category,status,priority,subject,assigned_staff_user_id,updated_at").order("updated_at",{ascending:false}).limit(250);'
if old_ticket_query not in text:
    raise SystemExit("ERROR: ticket queue query marker not found")
text = text.replace(
    old_ticket_query,
    old_ticket_query + '\n if(staff.role==="master")q=q.neq("category","report");',
    1,
)
text = remove_unused_auth_names(text)
ticket_list.write_text(text, encoding="utf-8")
print("Applied [master ticket filtering] ticket queue")

ticket_detail = ROOT / "app/(portal)/admin/tickets/[reference]/page.tsx"
text = ticket_detail.read_text(encoding="utf-8")
text = ensure_auth_import(
    text,
    [
        "canHandleTicketCategory",
        "requireAdminSection",
    ],
)
text = text.replace(
    "  const staff = await requireStaff();",
    '''  const staff =
    await requireAdminSection(
      "tickets",
    );''',
    1,
)

ticket_found_marker = '''  if (error) throw new Error(error.message);
  if (!ticket) notFound();
'''
if ticket_found_marker not in text:
    raise SystemExit("ERROR: ticket detail marker not found")

text = text.replace(
    ticket_found_marker,
    '''  if (error) throw new Error(error.message);
  if (!ticket) notFound();

  if (
    !canHandleTicketCategory(
      staff.role,
      ticket.category,
    )
  ) {
    redirect("/admin/tickets");
  }
''',
    1,
)

if 'import { notFound } from "next/navigation";' in text:
    text = text.replace(
        'import { notFound } from "next/navigation";',
        'import { notFound, redirect } from "next/navigation";',
        1,
    )

text = remove_unused_auth_names(text)
ticket_detail.write_text(text, encoding="utf-8")
print("Applied [master report-ticket protection] ticket detail")

ticket_actions = ROOT / "app/(portal)/admin/tickets/actions.ts"
text = ticket_actions.read_text(encoding="utf-8")
text = ensure_auth_import(
    text,
    [
        "canHandleTicketCategory",
        "requireAdminSection",
    ],
)
text = text.replace(
    'select("id,public_reference,status")',
    'select("id,public_reference,status,category")',
    1,
)
text = text.replace(
    "requireStaff()",
    'requireAdminSection("tickets")',
)

text = text.replace(
    'const t=await getTicket(read(fd,"ticketId",80));',
    'const t=await getTicket(read(fd,"ticketId",80));if(!canHandleTicketCategory(staff.role,t.category))throw new Error("This staff role cannot manage moderation report tickets.");',
)
text = text.replace(
    'const t=await getTicket(id);',
    'const t=await getTicket(id);if(!canHandleTicketCategory(staff.role,t.category))throw new Error("This staff role cannot manage moderation report tickets.");',
)
text = remove_unused_auth_names(text)
ticket_actions.write_text(text, encoding="utf-8")
print("Applied [master report-ticket protection] ticket actions")

print("")
print("STAFF PERMISSION PATCH COMPLETE")
print("")
print("Role summary:")
print("  OWNER      -> every admin section")
print("  ADMIN      -> Characters, Events, Expertise, Market, Forum, Logs,")
print("                Tidings, Tickets, Sanctions, World")
print("  MODERATOR  -> Characters (read-only), Forum, Logs, Tidings,")
print("                Tickets, Sanctions")
print("  MASTER     -> Characters (edit/review + Warping), Events, Expertise,")
print("                Tidings, ordinary Tickets, World")
print("")
print("Character sub-controls:")
print("  Inventory / Ledger / Premium / Remnants -> Owner + Admin")
print("  Warping                                  -> Owner + Admin + Master")
print("  Main character edit/review               -> Owner + Admin + Master")
print("  Delete / age-sensitive administration    -> Owner + Admin")
print("  Moderator character access               -> Read-only")
print("")
print("Tickets:")
print("  Master cannot see/open/manage category='report' tickets.")
print("  Owner/Admin/Moderator retain moderation-report access.")
print("")
print("Next: npm run build")
