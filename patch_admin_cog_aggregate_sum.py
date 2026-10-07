from pathlib import Path

HEADER = Path("components/portal/portal-header.tsx")
AGGREGATE = Path("components/admin/admin-aggregate-badge.tsx")

def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}\nNo changes were made.")

if not HEADER.exists():
    fail(f"Missing expected file: {HEADER}")

if AGGREGATE.exists():
    fail(f"{AGGREGATE} already exists; refusing to overwrite it.")

source = HEADER.read_text(encoding="utf-8")

def replace_once(old: str, new: str, label: str) -> None:
    global source
    count = source.count(old)
    if count != 1:
        fail(f"Could not uniquely locate {label}: expected 1, found {count}.")
    source = source.replace(old, new, 1)

# ------------------------------------------------------------
# Replace individual cog badge imports with one aggregate badge.
# ------------------------------------------------------------
replace_once(
    '''import { SubmittedCharacterBadge } from "@/components/admin/submitted-character-badge";
import { RegistrationApplicationBadge } from "@/components/admin/registration-application-badge";
import { OrderSubmissionBadge } from "@/components/admin/order-submission-badge";
import { TicketNotificationBadge } from "@/components/support/ticket-notification-badge";
''',
    '''import { AdminAggregateBadge } from "@/components/admin/admin-aggregate-badge";
''',
    "individual admin badge imports",
)

# canAccessAdminSection is no longer needed in this file.
replace_once(
    '''import {
  canAccessAdminSection,
  getStaffSession,
} from "@/lib/auth/require-staff";
''',
    '''import {
  getStaffSession,
} from "@/lib/auth/require-staff";
''',
    "staff auth import",
)

old_badges = '''                {canAccessAdminSection(
                  staffSession.role,
                  "new_register",
                ) ? (
                  <RegistrationApplicationBadge variant="floating" />
                ) : null}
                <SubmittedCharacterBadge variant="floating" />
                {canAccessAdminSection(
                  staffSession.role,
                  "orders",
                ) ? (
                  <OrderSubmissionBadge variant="floating" />
                ) : null}
                <TicketNotificationBadge audience="staff" variant="floating" />
'''

new_badges = '''                <AdminAggregateBadge />
'''

replace_once(
    old_badges,
    new_badges,
    "overlapping cog badges",
)

aggregate = '''"use client";

import {
  usePortalNotificationCounts,
} from "@/components/notifications/portal-notification-counts-provider";

export function AdminAggregateBadge() {
  const {
    isStaff,
    registrationApplications,
    orderSubmissions,
    submittedCharacters,
    tickets,
  } =
    usePortalNotificationCounts();

  if (!isStaff) {
    return null;
  }

  const count =
    registrationApplications +
    orderSubmissions +
    submittedCharacters +
    tickets.staff;

  if (count <= 0) {
    return null;
  }

  const label =
    count > 99
      ? "99+"
      : String(count);

  return (
    <span
      data-sep-counter-badge="true"
      data-admin-aggregate-badge="true"
      title={`${count} pending administration item${count === 1 ? "" : "s"}`}
      className="absolute -right-2 -top-2 z-[200] inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-[#d19a4c] bg-[#7a291f] px-1 text-[8px] font-bold leading-none text-[#ffe1ac] shadow-[0_0_10px_rgba(225,161,77,0.45)]"
    >
      {label}
    </span>
  );
}
'''

# All preflight passed: write now.
AGGREGATE.parent.mkdir(
    parents=True,
    exist_ok=True,
)

HEADER.write_text(
    source,
    encoding="utf-8",
)

AGGREGATE.write_text(
    aggregate,
    encoding="utf-8",
)

print("SUCCESS")
print("Updated:")
print(f"  {HEADER}")
print("Created:")
print(f"  {AGGREGATE}")
print()
print("Cog total now equals:")
print("  Registration applications")
print("  + Submitted characters")
print("  + Order submissions")
print("  + Staff tickets")
print()
print("Individual admin-page badges remain unchanged.")
print("Next: npm run build")
