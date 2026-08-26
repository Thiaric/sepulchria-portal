#!/usr/bin/env python3
from __future__ import annotations

import shutil
import sys
from pathlib import Path

ROOT = Path.cwd()
BACKUP_SUFFIX = ".bak-registration-invitation-history"

PAGE = ROOT / "app/(portal)/admin/registrations/page.tsx"
ACTIONS = ROOT / "app/(portal)/admin/registrations/actions.ts"
SQL = ROOT / "registration_invitation_history.sql"

def fail(message: str) -> None:
    raise RuntimeError(message)

def backup(path: Path) -> None:
    target = path.with_name(path.name + BACKUP_SUFFIX)
    if not target.exists():
        shutil.copy2(path, target)

def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail(f"{label}: expected exactly 1 match, found {count}")
    return text.replace(old, new, 1)

SQL_CONTENT = r'''-- Preserve generated registration invitation links for staff history.
-- Run once in Supabase SQL Editor.

alter table public.registration_invitations
  add column if not exists invitation_url text null;

comment on column public.registration_invitations.invitation_url is
  'Full generated registration URL retained for staff-only invitation history.';
'''

def patch_actions() -> None:
    backup(ACTIONS)
    text = ACTIONS.read_text(encoding="utf-8")

    old = '''  const { error: insertError } = await admin
    .from("registration_invitations")
    .insert({
      application_id: application.id,
      email: application.email.toLowerCase(),
      token_hash: hash,
      expires_at: expiresAt,
      created_by: staff.userId,
    });

  if (insertError) {
    throw new Error(insertError.message);
  }

  const origin = await getSiteOrigin();
  const invitationUrl =
    `${origin}/auth/sign-up?invite=${encodeURIComponent(token)}`;'''

    new = '''  const origin = await getSiteOrigin();
  const invitationUrl =
    `${origin}/auth/sign-up?invite=${encodeURIComponent(token)}`;

  const { error: insertError } = await admin
    .from("registration_invitations")
    .insert({
      application_id: application.id,
      email: application.email.toLowerCase(),
      token_hash: hash,
      invitation_url: invitationUrl,
      expires_at: expiresAt,
      created_by: staff.userId,
    });

  if (insertError) {
    throw new Error(insertError.message);
  }'''

    text = replace_once(
        text,
        old,
        new,
        "store invitation URL",
    )

    old = '''  const { error } = await admin
    .from("registration_applications")
    .update({
      status: "declined",
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", applicationId);

  if (error) {
    throw new Error(error.message);
  }'''

    new = '''  const {
    data: application,
    error: applicationError,
  } = await admin
    .from("registration_applications")
    .select("id,status")
    .eq("id", applicationId)
    .maybeSingle();

  if (applicationError || !application) {
    throw new Error(
      applicationError?.message ??
        "Registration application not found.",
    );
  }

  if (application.status !== "pending") {
    throw new Error(
      "Only pending applications can be declined.",
    );
  }

  const { error } = await admin
    .from("registration_applications")
    .update({
      status: "declined",
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", applicationId)
    .eq("status", "pending");

  if (error) {
    throw new Error(error.message);
  }'''

    text = replace_once(
        text,
        old,
        new,
        "decline pending guard",
    )

    ACTIONS.write_text(
        text,
        encoding="utf-8",
        newline="\n",
    )

def patch_page() -> None:
    backup(PAGE)
    text = PAGE.read_text(encoding="utf-8")

    old = '''  const [
    { data: settings, error: settingsError },
    { data: applications, error: applicationsError },
  ] = await Promise.all([
    supabase
      .from("registration_settings")
      .select("registrations_open,updated_at")
      .eq("id", 1)
      .maybeSingle(),
    admin
      .from("registration_applications")
      .select(
        "id,name,email,heard_about,roleplay_enjoyment,rpg_experience,status,created_at,invited_at,registered_at",
      )
      .order("created_at", { ascending: false }),
  ]);'''

    new = '''  const [
    { data: settings, error: settingsError },
    { data: applications, error: applicationsError },
    { data: invitations, error: invitationsError },
  ] = await Promise.all([
    supabase
      .from("registration_settings")
      .select("registrations_open,updated_at")
      .eq("id", 1)
      .maybeSingle(),
    admin
      .from("registration_applications")
      .select(
        "id,name,email,heard_about,roleplay_enjoyment,rpg_experience,status,created_at,invited_at,registered_at",
      )
      .order("created_at", { ascending: false }),
    admin
      .from("registration_invitations")
      .select(
        "id,application_id,invitation_url,created_at,expires_at,used_at,sent_at",
      )
      .order("created_at", { ascending: false }),
  ]);'''

    text = replace_once(
        text,
        old,
        new,
        "load invitation history",
    )

    old = '''  if (settingsError) throw new Error(settingsError.message);
  if (applicationsError) throw new Error(applicationsError.message);

  const registrationsOpen =
    settings?.registrations_open === true;'''

    new = '''  if (settingsError) throw new Error(settingsError.message);
  if (applicationsError) throw new Error(applicationsError.message);
  if (invitationsError) throw new Error(invitationsError.message);

  const registrationsOpen =
    settings?.registrations_open === true;

  const allApplications = applications ?? [];
  const totalCount = allApplications.length;
  const invitedCount = allApplications.filter(
    (application) =>
      application.status === "invited" ||
      application.status === "registered",
  ).length;
  const declinedCount = allApplications.filter(
    (application) =>
      application.status === "declined",
  ).length;

  const invitationsByApplication = new Map<
    string,
    NonNullable<typeof invitations>
  >();

  for (const invitation of invitations ?? []) {
    const existing =
      invitationsByApplication.get(
        invitation.application_id,
      ) ?? [];

    existing.push(invitation);

    invitationsByApplication.set(
      invitation.application_id,
      existing,
    );
  }'''

    text = replace_once(
        text,
        old,
        new,
        "application counters and invitation map",
    )

    old = '''            <span className="text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806a4d))]">
              {applications?.length ?? 0} total
            </span>'''

    new = '''            <span className="text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806a4d))]">
              {totalCount} Total
              {" · "}
              {invitedCount} Invited
              {" · "}
              {declinedCount} Declined
            </span>'''

    text = replace_once(
        text,
        old,
        new,
        "summary counters",
    )

    text = text.replace(
        '{(applications ?? []).map((application) => (',
        '{allApplications.map((application) => (',
        1,
    )

    old = '''                  <div className="mt-5 flex flex-wrap gap-2">
                    {application.status !== "registered" &&
                    application.status !== "declined" ? (
                      <form action={sendRegistrationInvitationAction}>
                        <input
                          type="hidden"
                          name="application_id"
                          value={application.id}
                        />
                        <button
                          type="submit"
                          className="border border-emerald-800/60 bg-emerald-950/20 px-4 py-2 text-[8px] uppercase tracking-[0.16em] text-emerald-400"
                        >
                          {application.status === "invited"
                            ? "Send new invitation"
                            : "Send invitation"}
                        </button>
                      </form>
                    ) : null}

                    {application.status !== "registered" &&
                    application.status !== "declined" ? (
                      <form action={declineRegistrationApplicationAction}>
                        <input
                          type="hidden"
                          name="application_id"
                          value={application.id}
                        />
                        <button
                          type="submit"
                          className="border border-red-900/60 bg-red-950/20 px-4 py-2 text-[8px] uppercase tracking-[0.16em] text-red-400"
                        >
                          Decline
                        </button>
                      </form>
                    ) : null}
                  </div>'''

    new = '''                  {(
                    invitationsByApplication.get(
                      application.id,
                    ) ?? []
                  ).length > 0 ? (
                    <div className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/30 bg-[rgb(var(--sep-colour-100c09))] p-4">
                      <p className="text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-806a4d))]">
                        Invitation history
                      </p>

                      <div className="mt-3 space-y-3">
                        {(
                          invitationsByApplication.get(
                            application.id,
                          ) ?? []
                        ).map((invitation, index) => (
                          <div
                            key={invitation.id}
                            className="border border-[rgb(var(--sep-colour-60482e))]/25 bg-[rgb(var(--sep-colour-0d0a08))] p-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-b99765))]">
                                {index === 0
                                  ? "Latest invitation"
                                  : "Previous invitation"}
                              </span>

                              <span className="text-[8px] text-[rgb(var(--sep-colour-756957))]">
                                {new Date(
                                  invitation.created_at,
                                ).toLocaleString("en-GB")}
                              </span>
                            </div>

                            {invitation.invitation_url ? (
                              <input
                                readOnly
                                value={invitation.invitation_url}
                                className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-090706))] px-3 py-2 text-xs text-[rgb(var(--sep-colour-cdbb9c))]"
                              />
                            ) : (
                              <p className="mt-2 text-xs leading-5 text-[rgb(var(--sep-colour-7f7464))]">
                                This invitation was created before invitation-link history was enabled, so its original URL cannot be reconstructed from the stored token hash.
                              </p>
                            )}

                            <p className="mt-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756957))]">
                              {invitation.used_at
                                ? "Used"
                                : new Date(
                                      invitation.expires_at,
                                    ).getTime() <= Date.now()
                                  ? "Expired"
                                  : invitation.sent_at
                                    ? "Sent"
                                    : "Created"}
                              {" · "}
                              Expires{" "}
                              {new Date(
                                invitation.expires_at,
                              ).toLocaleString("en-GB")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-5 flex flex-wrap gap-2">
                    {application.status !== "registered" &&
                    application.status !== "declined" ? (
                      <form action={sendRegistrationInvitationAction}>
                        <input
                          type="hidden"
                          name="application_id"
                          value={application.id}
                        />
                        <button
                          type="submit"
                          className="border border-emerald-800/60 bg-emerald-950/20 px-4 py-2 text-[8px] uppercase tracking-[0.16em] text-emerald-400"
                        >
                          {application.status === "invited"
                            ? "Send new invitation"
                            : "Send invitation"}
                        </button>
                      </form>
                    ) : null}

                    {application.status === "pending" ? (
                      <form action={declineRegistrationApplicationAction}>
                        <input
                          type="hidden"
                          name="application_id"
                          value={application.id}
                        />
                        <button
                          type="submit"
                          className="border border-red-900/60 bg-red-950/20 px-4 py-2 text-[8px] uppercase tracking-[0.16em] text-red-400"
                        >
                          Decline
                        </button>
                      </form>
                    ) : null}
                  </div>'''

    text = replace_once(
        text,
        old,
        new,
        "decline visibility and invitation history",
    )

    old = '''            {!applications?.length ? ('''

    new = '''            {!allApplications.length ? ('''

    text = replace_once(
        text,
        old,
        new,
        "empty applications condition",
    )

    PAGE.write_text(
        text,
        encoding="utf-8",
        newline="\n",
    )

def main() -> None:
    required = [PAGE, ACTIONS]

    missing = [
        str(path.relative_to(ROOT))
        for path in required
        if not path.exists()
    ]

    if missing:
        fail(
            "Run this from the sepulchria-portal repository root. Missing: "
            + ", ".join(missing)
        )

    if SQL.exists():
        fail(
            "registration_invitation_history.sql already exists; refusing to overwrite."
        )

    patch_actions()
    patch_page()
    SQL.write_text(
        SQL_CONTENT,
        encoding="utf-8",
        newline="\n",
    )

    print()
    print("Registration invitation history patch applied.")
    print()
    print("Changes:")
    print("- Decline is now shown ONLY while an application is pending.")
    print("- The server action also refuses to decline a non-pending application.")
    print("- Every newly generated invitation URL is stored in registration_invitations.invitation_url.")
    print("- Expanded applications show latest and previous invitation links with sent/used/expired state.")
    print("- Top summary now shows: X Total · Y Invited · Z Declined.")
    print("- Registered applications are included in Invited, because they necessarily received an invitation first.")
    print()
    print("IMPORTANT:")
    print("1. Run registration_invitation_history.sql in Supabase SQL Editor.")
    print("2. Then run npm run build.")
    print()
    print("Existing invitations created before this patch only have a token hash, so their raw URL cannot be reconstructed after the fact.")
    print()
    print(f"Backups use suffix: {BACKUP_SUFFIX}")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"PATCH FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
