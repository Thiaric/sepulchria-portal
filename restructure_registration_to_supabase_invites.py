#!/usr/bin/env python3
from __future__ import annotations

import shutil
import sys
from pathlib import Path

ROOT = Path.cwd()
BACKUP_SUFFIX = ".bak-native-supabase-invites"

ACTIONS = ROOT / "app/(portal)/admin/registrations/actions.ts"
ADMIN_PAGE = ROOT / "app/(portal)/admin/registrations/page.tsx"
SIGNUP_PAGE = ROOT / "app/auth/sign-up/page.tsx"
SIGNUP_FORM = ROOT / "components/sign-up-form.tsx"
OLD_INVITE_LIB = ROOT / "lib/registration/invitations.ts"
OLD_CONSUME_ROUTE = ROOT / "app/api/registration-invitations/consume/route.ts"

COMPLETE_PAGE = ROOT / "app/auth/complete-invitation/page.tsx"
COMPLETE_FORM = ROOT / "components/complete-invitation-form.tsx"
COMPLETE_API = ROOT / "app/api/registration-invitations/complete/route.ts"
SQL = ROOT / "registration_native_invitation_history.sql"

def fail(message: str) -> None:
    raise RuntimeError(message)

def backup(path: Path) -> None:
    if not path.exists():
        return
    target = path.with_name(path.name + BACKUP_SUFFIX)
    if not target.exists():
        shutil.copy2(path, target)

def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)

ACTIONS_CONTENT = r'''\"use server\";

import { headers } from \"next/headers\";
import { redirect } from \"next/navigation\";
import { revalidatePath } from \"next/cache\";

import { requireAdminSection } from \"@/lib/auth/require-staff\";
import { createAdminClient } from \"@/lib/supabase/admin\";

async function getSiteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\\/$/, \"\");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  const h = await headers();
  const host = h.get(\"x-forwarded-host\") ?? h.get(\"host\");

  if (!host) {
    throw new Error(
      \"Unable to determine the site URL. Set NEXT_PUBLIC_SITE_URL.\",
    );
  }

  const proto =
    h.get(\"x-forwarded-proto\") ??
    (host.includes(\"localhost\") ? \"http\" : \"https\");

  return `${proto}://${host}`;
}

export async function sendRegistrationInvitationAction(
  formData: FormData,
) {
  const staff =
    await requireAdminSection(\"new_register\");

  const applicationId =
    String(formData.get(\"application_id\") ?? \"\").trim();

  if (!applicationId) {
    throw new Error(\"Missing application id.\");
  }

  const admin = createAdminClient();

  const { data: application, error } = await admin
    .from(\"registration_applications\")
    .select(\"id,name,email,status\")
    .eq(\"id\", applicationId)
    .maybeSingle();

  if (error || !application) {
    throw new Error(
      error?.message ??
        \"Registration application not found.\",
    );
  }

  if (
    application.status === \"registered\" ||
    application.status === \"declined\"
  ) {
    throw new Error(
      \"This application can no longer be invited.\",
    );
  }

  const origin = await getSiteOrigin();
  const redirectTo =
    `${origin}/auth/complete-invitation`;

  const {
    data: inviteData,
    error: inviteError,
  } = await admin.auth.admin.inviteUserByEmail(
    application.email,
    {
      redirectTo,
      data: {
        registration_application_id: application.id,
        registration_applicant_name: application.name,
        registration_source: \"closed_alpha\",
      },
    },
  );

  if (inviteError) {
    const params = new URLSearchParams();
    params.set(
      \"inviteError\",
      inviteError.message.slice(0, 500),
    );

    redirect(
      `/admin/registrations?${params.toString()}`,
    );
  }

  const now = new Date().toISOString();

  const { error: historyError } = await admin
    .from(\"registration_auth_invitations\")
    .insert({
      application_id: application.id,
      auth_user_id: inviteData.user?.id ?? null,
      email: application.email.toLowerCase(),
      created_by: staff.userId,
      sent_at: now,
    });

  if (historyError) {
    throw new Error(
      `Supabase sent the invitation, but invitation history could not be saved: ${historyError.message}`,
    );
  }

  const { error: updateError } = await admin
    .from(\"registration_applications\")
    .update({
      status: \"invited\",
      invited_at: now,
      updated_at: now,
    })
    .eq(\"id\", application.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath(\"/admin/registrations\");

  const params = new URLSearchParams();
  params.set(\"inviteSent\", \"1\");
  params.set(\"inviteEmail\", application.email);

  redirect(
    `/admin/registrations?${params.toString()}`,
  );
}

export async function declineRegistrationApplicationAction(
  formData: FormData,
) {
  await requireAdminSection(\"new_register\");

  const applicationId =
    String(formData.get(\"application_id\") ?? \"\").trim();

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const {
    data: application,
    error: applicationError,
  } = await admin
    .from(\"registration_applications\")
    .select(\"id,status\")
    .eq(\"id\", applicationId)
    .maybeSingle();

  if (applicationError || !application) {
    throw new Error(
      applicationError?.message ??
        \"Registration application not found.\",
    );
  }

  if (application.status !== \"pending\") {
    throw new Error(
      \"Only pending applications can be declined.\",
    );
  }

  const { error } = await admin
    .from(\"registration_applications\")
    .update({
      status: \"declined\",
      reviewed_at: now,
      updated_at: now,
    })
    .eq(\"id\", applicationId)
    .eq(\"status\", \"pending\");

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(\"/admin/registrations\");
}
'''

SIGNUP_PAGE_CONTENT = r'''import { AuthPageShell } from \"@/components/auth-page-shell\";
import { RegistrationClosedNotice } from \"@/components/registration-closed-notice\";
import { SignUpForm } from \"@/components/sign-up-form\";
import { getRegistrationsOpen } from \"@/lib/registration/get-registrations-open\";

export const dynamic = \"force-dynamic\";

export default async function SignUpPage() {
  const registrationsOpen =
    await getRegistrationsOpen();

  if (!registrationsOpen) {
    return (
      <AuthPageShell
        eyebrow=\"The City Gates\"
        title=\"Registrations are currently closed\"
        description=\"Sepulchria is accepting applications for its closed Alpha.\"
      >
        <RegistrationClosedNotice />
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      eyebrow=\"Begin Your Chronicle\"
      title=\"Enter the Living World\"
      description=\"Create your account and take the first step toward forging a character, choosing an allegiance and shaping Sepulchria.\"
    >
      <SignUpForm />
    </AuthPageShell>
  );
}
'''

COMPLETE_PAGE_CONTENT = r'''import { AuthPageShell } from \"@/components/auth-page-shell\";
import { CompleteInvitationForm } from \"@/components/complete-invitation-form\";

export const dynamic = \"force-dynamic\";

export default function CompleteInvitationPage() {
  return (
    <AuthPageShell
      eyebrow=\"Your Invitation\"
      title=\"The City Gates Open For You\"
      description=\"Complete your Sepulchria account setup.\"
    >
      <CompleteInvitationForm />
    </AuthPageShell>
  );
}
'''

COMPLETE_FORM_CONTENT = r'''\"use client\";

import Link from \"next/link\";
import { useEffect, useState } from \"react\";
import { useRouter } from \"next/navigation\";

import {
  PRIVACY_VERSION,
  TERMS_VERSION,
} from \"@/lib/legal/versions\";
import { createClient } from \"@/lib/supabase/client\";

function isAtLeast18(dateOfBirth: string) {
  if (!dateOfBirth) return false;

  const dob = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return false;

  const today = new Date();
  const eighteenthBirthday = new Date(
    dob.getFullYear() + 18,
    dob.getMonth(),
    dob.getDate(),
  );

  return eighteenthBirthday <= today;
}

export function CompleteInvitationForm() {
  const router = useRouter();

  const [email, setEmail] =
    useState<string | null>(null);
  const [checkingSession, setCheckingSession] =
    useState(true);
  const [password, setPassword] = useState(\"\");
  const [repeatPassword, setRepeatPassword] =
    useState(\"\");
  const [dateOfBirth, setDateOfBirth] =
    useState(\"\");
  const [ageConfirmed, setAgeConfirmed] =
    useState(false);
  const [legalAccepted, setLegalAccepted] =
    useState(false);
  const [isLoading, setIsLoading] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function readSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      setEmail(session?.user.email ?? null);
      setCheckingSession(false);
    }

    void readSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;

        setEmail(session?.user.email ?? null);
        setCheckingSession(false);
      },
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!email) {
      setError(
        \"This invitation is invalid, expired, or has already been used.\",
      );
      return;
    }

    if (password !== repeatPassword) {
      setError(\"Passwords do not match.\");
      return;
    }

    if (!isAtLeast18(dateOfBirth)) {
      setError(
        \"Sepulchria is only available to users aged 18 or older.\",
      );
      return;
    }

    if (!ageConfirmed) {
      setError(
        \"You must confirm that you are at least 18 years old.\",
      );
      return;
    }

    if (!legalAccepted) {
      setError(
        \"You must accept the Terms of Service, Community Rules and Privacy Policy.\",
      );
      return;
    }

    const supabase = createClient();

    setIsLoading(true);
    setError(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          \"Your invitation session could not be verified. Please open the invitation email again.\",
        );
      }

      const applicationId =
        String(
          user.user_metadata
            ?.registration_application_id ?? \"\",
        ).trim();

      if (!applicationId) {
        throw new Error(
          \"This account is not linked to a Sepulchria registration invitation.\",
        );
      }

      const { error: updateError } =
        await supabase.auth.updateUser({
          password,
          data: {
            ...user.user_metadata,
            date_of_birth: dateOfBirth,
            age_18_confirmed: true,
            legal_terms_accepted: true,
            terms_version: TERMS_VERSION,
            privacy_version: PRIVACY_VERSION,
          },
        });

      if (updateError) {
        throw updateError;
      }

      const completeResponse = await fetch(
        \"/api/registration-invitations/complete\",
        {
          method: \"POST\",
          headers: {
            \"Content-Type\": \"application/json\",
          },
          body: JSON.stringify({
            applicationId,
          }),
        },
      );

      const completeResult =
        await completeResponse
          .json()
          .catch(() => null);

      if (!completeResponse.ok) {
        throw new Error(
          completeResult?.error ??
            \"Your account was updated, but the invitation could not be completed. Please contact staff.\",
        );
      }

      router.replace(\"/homepage\");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : \"Unable to complete your invitation.\",
      );
    } finally {
      setIsLoading(false);
    }
  }

  const fieldClass =
    \"h-12 w-full border border-[rgb(var(--sep-colour-62482f))] bg-[rgb(var(--sep-colour-0b0807))]/90 px-4 text-sm text-[rgb(var(--sep-colour-e8dcc4))] outline-none transition placeholder:text-[rgb(var(--sep-colour-5f574d))] focus:border-[rgb(var(--sep-colour-b28149))] focus:ring-1 focus:ring-[rgb(var(--sep-colour-b28149))]/50\";

  const labelClass =
    \"block text-[9px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-a68a63))]\";

  if (checkingSession) {
    return (
      <p className=\"text-sm leading-7 text-[rgb(var(--sep-colour-a99b87))]\">
        Verifying your invitation...
      </p>
    );
  }

  if (!email) {
    return (
      <div className=\"space-y-5\">
        <div className=\"border border-[rgb(var(--sep-colour-873e35))]/55 bg-[rgb(var(--sep-colour-421d1a))]/35 px-4 py-4 text-sm leading-6 text-[rgb(var(--sep-colour-e2aaa1))]\">
          This invitation is invalid, expired, or has already been used.
          Open the most recent invitation email you received.
        </div>

        <p className=\"text-center text-sm text-[rgb(var(--sep-colour-897d6c))]\">
          <Link
            href=\"/homepage\"
            className=\"text-[rgb(var(--sep-colour-c8a46e))] underline decoration-[rgb(var(--sep-colour-725636))] underline-offset-4\"
          >
            Return to Sepulchria
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className=\"space-y-5\"
    >
      <div className=\"space-y-2\">
        <label className={labelClass}>
          Invited email
        </label>
        <input
          readOnly
          value={email}
          className={`${fieldClass} cursor-not-allowed opacity-75`}
        />
      </div>

      <div className=\"space-y-2\">
        <label
          htmlFor=\"invite-date-of-birth\"
          className={labelClass}
        >
          Date of birth
        </label>
        <input
          id=\"invite-date-of-birth\"
          type=\"date\"
          autoComplete=\"bday\"
          required
          value={dateOfBirth}
          onChange={(event) =>
            setDateOfBirth(event.target.value)
          }
          className={fieldClass}
        />
        <p className=\"text-[10px] leading-5 text-[rgb(var(--sep-colour-776e63))]\">
          Sepulchria is strictly for users aged 18 or older.
        </p>
      </div>

      <div className=\"space-y-2\">
        <label
          htmlFor=\"invite-password\"
          className={labelClass}
        >
          Password
        </label>
        <input
          id=\"invite-password\"
          type=\"password\"
          autoComplete=\"new-password\"
          minLength={6}
          required
          value={password}
          onChange={(event) =>
            setPassword(event.target.value)
          }
          className={fieldClass}
        />
      </div>

      <div className=\"space-y-2\">
        <label
          htmlFor=\"invite-repeat-password\"
          className={labelClass}
        >
          Repeat password
        </label>
        <input
          id=\"invite-repeat-password\"
          type=\"password\"
          autoComplete=\"new-password\"
          minLength={6}
          required
          value={repeatPassword}
          onChange={(event) =>
            setRepeatPassword(event.target.value)
          }
          className={fieldClass}
        />
      </div>

      <div className=\"border border-[rgb(var(--sep-colour-7d4b3d))]/65 bg-[rgb(var(--sep-colour-1d0f0d))]/55 px-4 py-4\">
        <label className=\"flex cursor-pointer items-start gap-3\">
          <input
            type=\"checkbox\"
            checked={ageConfirmed}
            onChange={(event) =>
              setAgeConfirmed(event.target.checked)
            }
            required
            className=\"mt-1 h-4 w-4 shrink-0 accent-[rgb(var(--sep-colour-a77a42))]\"
          />
          <span className=\"text-xs leading-6 text-[rgb(var(--sep-colour-c9b8a0))]\">
            I confirm that I am 18 years of age or older.
          </span>
        </label>
      </div>

      <div className=\"border border-[rgb(var(--sep-colour-62482f))]/55 bg-[rgb(var(--sep-colour-0b0807))]/55 px-4 py-4\">
        <label className=\"flex cursor-pointer items-start gap-3\">
          <input
            type=\"checkbox\"
            checked={legalAccepted}
            onChange={(event) =>
              setLegalAccepted(event.target.checked)
            }
            required
            className=\"mt-1 h-4 w-4 shrink-0 accent-[rgb(var(--sep-colour-a77a42))]\"
          />
          <span className=\"text-xs leading-6 text-[rgb(var(--sep-colour-a99b87))]\">
            I have read and agree to Sepulchria&apos;s{\" \"}
            <Link
              href=\"/terms\"
              target=\"_blank\"
              className=\"text-[rgb(var(--sep-colour-d0aa72))] underline decoration-[rgb(var(--sep-colour-725636))] underline-offset-4\"
            >
              Terms of Service
            </Link>
            ,{\" \"}
            <Link
              href=\"/community-rules\"
              target=\"_blank\"
              className=\"text-[rgb(var(--sep-colour-d0aa72))] underline decoration-[rgb(var(--sep-colour-725636))] underline-offset-4\"
            >
              Community Rules
            </Link>
            {\" \"}and{\" \"}
            <Link
              href=\"/privacy\"
              target=\"_blank\"
              className=\"text-[rgb(var(--sep-colour-d0aa72))] underline decoration-[rgb(var(--sep-colour-725636))] underline-offset-4\"
            >
              Privacy Policy
            </Link>
            .
          </span>
        </label>
      </div>

      {error ? (
        <div
          role=\"alert\"
          className=\"border border-[rgb(var(--sep-colour-873e35))]/55 bg-[rgb(var(--sep-colour-421d1a))]/35 px-4 py-3 text-sm text-[rgb(var(--sep-colour-e2aaa1))]\"
        >
          {error}
        </div>
      ) : null}

      <button
        type=\"submit\"
        disabled={
          isLoading ||
          !dateOfBirth ||
          !ageConfirmed ||
          !legalAccepted
        }
        className=\"h-12 w-full border border-[rgb(var(--sep-colour-a77a42))]/80 bg-[rgb(var(--sep-colour-382313))] font-serif text-base tracking-[0.05em] text-[rgb(var(--sep-colour-ead3a6))] transition hover:border-[rgb(var(--sep-colour-d4a460))] hover:bg-[rgb(var(--sep-colour-472c17))] disabled:cursor-not-allowed disabled:opacity-45\"
      >
        {isLoading
          ? \"Opening the City Gates...\"
          : \"Complete your account\"}
      </button>
    </form>
  );
}
'''

COMPLETE_API_CONTENT = r'''import { NextResponse } from \"next/server\";

import { createClient } from \"@/lib/supabase/server\";
import { createAdminClient } from \"@/lib/supabase/admin\";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const applicationId =
    String(
      (body as { applicationId?: unknown } | null)
        ?.applicationId ?? \"\",
    ).trim();

  if (!applicationId) {
    return NextResponse.json(
      { error: \"Missing registration application.\" },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (
    userError ||
    !user ||
    !user.email
  ) {
    return NextResponse.json(
      { error: \"Your invitation session is not valid.\" },
      { status: 401 },
    );
  }

  const metadataApplicationId =
    String(
      user.user_metadata
        ?.registration_application_id ?? \"\",
    ).trim();

  if (
    !metadataApplicationId ||
    metadataApplicationId !== applicationId
  ) {
    return NextResponse.json(
      {
        error:
          \"This account is not linked to this registration application.\",
      },
      { status: 403 },
    );
  }

  const admin = createAdminClient();

  const {
    data: application,
    error: applicationError,
  } = await admin
    .from(\"registration_applications\")
    .select(\"id,email,status\")
    .eq(\"id\", applicationId)
    .maybeSingle();

  if (applicationError || !application) {
    return NextResponse.json(
      {
        error:
          applicationError?.message ??
          \"Registration application not found.\",
      },
      { status: 404 },
    );
  }

  if (
    application.email.toLowerCase() !==
    user.email.toLowerCase()
  ) {
    return NextResponse.json(
      {
        error:
          \"This invitation belongs to a different email address.\",
      },
      { status: 403 },
    );
  }

  if (
    application.status === \"declined\"
  ) {
    return NextResponse.json(
      {
        error:
          \"This registration application has been declined.\",
      },
      { status: 403 },
    );
  }

  const completedAt = new Date().toISOString();

  const { error: updateError } = await admin
    .from(\"registration_applications\")
    .update({
      status: \"registered\",
      registered_at: completedAt,
      updated_at: completedAt,
    })
    .eq(\"id\", application.id);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    );
  }

  const {
    data: latestInvitation,
  } = await admin
    .from(\"registration_auth_invitations\")
    .select(\"id\")
    .eq(\"application_id\", application.id)
    .is(\"accepted_at\", null)
    .order(\"sent_at\", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestInvitation?.id) {
    await admin
      .from(\"registration_auth_invitations\")
      .update({
        accepted_at: completedAt,
      })
      .eq(\"id\", latestInvitation.id);
  }

  return NextResponse.json({ ok: true });
}
'''

SQL_CONTENT = r'''-- Native Supabase Auth invitation history.
-- Run this ONCE in Supabase SQL Editor before testing the new invitation flow.

create table if not exists public.registration_auth_invitations (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null
    references public.registration_applications(id)
    on delete cascade,
  auth_user_id uuid null
    references auth.users(id)
    on delete set null,
  email text not null,
  created_by uuid null
    references auth.users(id)
    on delete set null,
  sent_at timestamptz not null default now(),
  accepted_at timestamptz null
);

create index if not exists
  registration_auth_invitations_application_id_idx
on public.registration_auth_invitations(application_id);

create index if not exists
  registration_auth_invitations_sent_at_idx
on public.registration_auth_invitations(sent_at desc);

alter table public.registration_auth_invitations
  enable row level security;

comment on table public.registration_auth_invitations is
  'Staff audit/history for native Supabase Auth closed-alpha invitations.';
'''

def patch_signup_form() -> None:
    backup(SIGNUP_FORM)
    text = SIGNUP_FORM.read_text(encoding="utf-8")

    old = '''export function SignUpForm({
  invitedEmail = null,
  invitationToken = null,
}: {
  invitedEmail?: string | null;
  invitationToken?: string | null;
}) {
  const [email, setEmail] =
    useState(invitedEmail ?? "");'''
    new = '''export function SignUpForm() {
  const [email, setEmail] =
    useState("");'''
    text = replace_once(text, old, new, "remove custom invite props")

    text = replace_once(
        text,
        '''  const isInvited =
    Boolean(invitedEmail && invitationToken);

''',
        "",
        "remove isInvited",
    )

    text = replace_once(
        text,
        '''  if (
    isInvited &&
    invitedEmail &&
    email.toLowerCase() !==
      invitedEmail.toLowerCase()
  ) {
    throw new Error(
      "This invitation is only valid for the email address it was sent to.",
    );
  }

''',
        "",
        "remove custom invite email check",
    )

    text = replace_once(
        text,
        '''      if (
        isInvited &&
        invitationToken
      ) {
        const consumeResponse =
          await fetch(
            "/api/registration-invitations/consume",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                token:
                  invitationToken,
                email,
              }),
            },
          );

        if (!consumeResponse.ok) {
          const consumeResult =
            await consumeResponse
              .json()
              .catch(() => null);

          throw new Error(
            consumeResult?.error ??
              "Your account was created, but the invitation could not be marked as used. Please contact staff.",
          );
        }
      }

''',
        "",
        "remove custom invitation consume",
    )

    text = replace_once(
        text,
        '''            readOnly={isInvited}
            value={email}''',
        '''            value={email}''',
        "remove invited email readonly",
    )

    text = replace_once(
        text,
        '''            className={`${fieldClass} ${
              isInvited
                ? "cursor-not-allowed opacity-75"
                : ""
            }`}''',
        '''            className={fieldClass}''',
        "restore normal email styling",
    )

    SIGNUP_FORM.write_text(text, encoding="utf-8", newline="\n")

def patch_admin_page() -> None:
    backup(ADMIN_PAGE)
    text = ADMIN_PAGE.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '''type Props = {
  searchParams?: Promise<{
    inviteLink?: string;
    sent?: string;
    warning?: string;
  }>;
};''',
        '''type Props = {
  searchParams?: Promise<{
    inviteSent?: string;
    inviteEmail?: string;
    inviteError?: string;
  }>;
};''',
        "admin search params",
    )

    text = replace_once(
        text,
        '''    { data: invitations, error: invitationsError },
  ] = await Promise.all([''',
        '''    { data: invitations, error: invitationsError },
    {
      data: authInvitations,
      error: authInvitationsError,
    },
  ] = await Promise.all([''',
        "add native history result",
    )

    text = replace_once(
        text,
        '''    admin
      .from("registration_invitations")
      .select(
        "id,application_id,invitation_url,created_at,expires_at,used_at,sent_at",
      )
      .order("created_at", { ascending: false }),
  ]);''',
        '''    admin
      .from("registration_invitations")
      .select(
        "id,application_id,invitation_url,created_at,expires_at,used_at,sent_at",
      )
      .order("created_at", { ascending: false }),
    admin
      .from("registration_auth_invitations")
      .select(
        "id,application_id,email,auth_user_id,sent_at,accepted_at",
      )
      .order("sent_at", { ascending: false }),
  ]);''',
        "query native invite history",
    )

    text = replace_once(
        text,
        '''  if (invitationsError) throw new Error(invitationsError.message);

  const registrationsOpen =''',
        '''  if (invitationsError) throw new Error(invitationsError.message);
  if (authInvitationsError) {
    throw new Error(authInvitationsError.message);
  }

  const registrationsOpen =''',
        "native history error",
    )

    text = replace_once(
        text,
        '''  const invitationsByApplication = new Map<
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
  }''',
        '''  const invitationsByApplication = new Map<
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
  }

  const authInvitationsByApplication = new Map<
    string,
    NonNullable<typeof authInvitations>
  >();

  for (
    const invitation of authInvitations ?? []
  ) {
    const existing =
      authInvitationsByApplication.get(
        invitation.application_id,
      ) ?? [];

    existing.push(invitation);

    authInvitationsByApplication.set(
      invitation.application_id,
      existing,
    );
  }''',
        "native history map",
    )

    text = replace_once(
        text,
        '''        {params.inviteLink ? (
          <section className="mt-5 border border-[rgb(var(--sep-colour-987344))]/60 bg-[rgb(var(--sep-colour-21170f))] p-5">
            <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-b99765))]">
              Invitation created
            </p>
            <p className="mt-2 text-sm leading-6 text-[rgb(var(--sep-colour-c8b89d))]">
              {params.sent === "1"
                ? "The invitation email was sent. The link is also shown below."
                : "Email delivery is not configured or failed. Copy this link and send it to the applicant manually."}
            </p>
            {params.warning ? (
              <p className="mt-2 text-xs leading-5 text-amber-300">
                {params.warning}
              </p>
            ) : null}
            <input
              readOnly
              value={params.inviteLink}
              className="mt-3 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0f0c09))] px-3 py-2 text-xs text-[rgb(var(--sep-colour-d8c29b))]"
            />
          </section>
        ) : null}''',
        '''        {params.inviteSent === "1" ? (
          <section className="mt-5 border border-[rgb(var(--sep-colour-987344))]/60 bg-[rgb(var(--sep-colour-21170f))] p-5">
            <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-b99765))]">
              Invitation sent
            </p>
            <p className="mt-2 text-sm leading-6 text-[rgb(var(--sep-colour-c8b89d))]">
              Supabase Auth sent the invitation email
              {params.inviteEmail
                ? ` to ${params.inviteEmail}`
                : ""}.
            </p>
          </section>
        ) : null}

        {params.inviteError ? (
          <section className="mt-5 border border-red-900/60 bg-red-950/20 p-5">
            <p className="text-[8px] uppercase tracking-[0.18em] text-red-400">
              Invitation failed
            </p>
            <p className="mt-2 text-sm leading-6 text-red-300">
              {params.inviteError}
            </p>
          </section>
        ) : null}''',
        "replace resend status panel",
    )

    text = replace_once(
        text,
        '''                  {(
                    invitationsByApplication.get(
                      application.id,
                    ) ?? []
                  ).length > 0 ? (''',
        '''                  {(
                    authInvitationsByApplication.get(
                      application.id,
                    ) ?? []
                  ).length > 0 ? (
                    <div className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/30 bg-[rgb(var(--sep-colour-100c09))] p-4">
                      <p className="text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-806a4d))]">
                        Supabase invitation history
                      </p>

                      <div className="mt-3 space-y-2">
                        {(
                          authInvitationsByApplication.get(
                            application.id,
                          ) ?? []
                        ).map((invitation, index) => (
                          <div
                            key={invitation.id}
                            className="flex flex-wrap items-center justify-between gap-2 border border-[rgb(var(--sep-colour-60482e))]/25 bg-[rgb(var(--sep-colour-0d0a08))] p-3"
                          >
                            <span className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-b99765))]">
                              {index === 0
                                ? "Latest invitation"
                                : "Previous invitation"}
                              {" · "}
                              {invitation.accepted_at
                                ? "Accepted"
                                : "Sent"}
                            </span>

                            <span className="text-[8px] text-[rgb(var(--sep-colour-756957))]">
                              {new Date(
                                invitation.sent_at,
                              ).toLocaleString("en-GB")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {(
                    invitationsByApplication.get(
                      application.id,
                    ) ?? []
                  ).length > 0 ? (''',
        "insert native history UI",
    )

    text = text.replace(
        "Invitation history",
        "Previous custom invitation history",
        1,
    )

    ADMIN_PAGE.write_text(text, encoding="utf-8", newline="\n")

def main() -> None:
    for path in [ACTIONS, ADMIN_PAGE, SIGNUP_PAGE, SIGNUP_FORM]:
        if not path.exists():
            fail(
                f"Run this from the sepulchria-portal repository root. Missing {path.relative_to(ROOT)}"
            )

    for path in [COMPLETE_PAGE, COMPLETE_FORM, COMPLETE_API, SQL]:
        if path.exists():
            fail(
                f"Refusing to overwrite existing file: {path.relative_to(ROOT)}"
            )

    for path in [
        ACTIONS,
        ADMIN_PAGE,
        SIGNUP_PAGE,
        SIGNUP_FORM,
        OLD_INVITE_LIB,
        OLD_CONSUME_ROUTE,
    ]:
        backup(path)

    ACTIONS.write_text(ACTIONS_CONTENT, encoding="utf-8", newline="\n")
    SIGNUP_PAGE.write_text(SIGNUP_PAGE_CONTENT, encoding="utf-8", newline="\n")

    patch_signup_form()
    patch_admin_page()

    for path, content in [
        (COMPLETE_PAGE, COMPLETE_PAGE_CONTENT),
        (COMPLETE_FORM, COMPLETE_FORM_CONTENT),
        (COMPLETE_API, COMPLETE_API_CONTENT),
        (SQL, SQL_CONTENT),
    ]:
        ensure_parent(path)
        path.write_text(content, encoding="utf-8", newline="\n")

    if OLD_INVITE_LIB.exists():
        OLD_INVITE_LIB.unlink()

    if OLD_CONSUME_ROUTE.exists():
        OLD_CONSUME_ROUTE.unlink()

    print()
    print("Native Supabase invitation restructure applied.")
    print()
    print("WHAT CHANGED")
    print("- Resend is no longer used for Closed Alpha invitations.")
    print("- Admin Send invitation now calls Supabase Auth inviteUserByEmail().")
    print("- Supabase's Invite User email template is now the email that is sent.")
    print("- Invitees finish account setup at /auth/complete-invitation.")
    print("- Date of birth, 18+ confirmation, password and legal acceptance are still collected.")
    print("- Public /auth/sign-up is public-signup only again.")
    print("- The old custom token validation/consume route is removed.")
    print("- Native invitation sends are stored in registration_auth_invitations.")
    print("- Existing legacy custom invitation history remains visible in admin.")
    print("- Decline remains available only for pending applications.")
    print("- Existing Total / Invited / Declined counters are preserved.")
    print()
    print("NEXT STEPS")
    print("1. Run registration_native_invitation_history.sql in Supabase SQL Editor.")
    print("2. In Supabase > Authentication > URL Configuration, add:")
    print("   https://sepulchria.com/auth/complete-invitation")
    print("   to Redirect URLs.")
    print("3. In Supabase > Authentication > Email Templates > Invite user,")
    print("   style the Invite user template however you want. Keep {{ .ConfirmationURL }} as the invite link.")
    print("4. Run npm run build.")
    print("5. Commit, push, wait for Vercel, then send a NEW test invitation.")
    print()
    print("You can remove RESEND_API_KEY and REGISTRATION_INVITE_FROM_EMAIL from Vercel later if nothing else uses them.")
    print()
    print(f"Backups use suffix: {BACKUP_SUFFIX}")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"PATCH FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
