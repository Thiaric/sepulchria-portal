"use client";

import { createClient } from "@/lib/supabase/client";
import {
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "@/lib/legal/versions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useState,
} from "react";

import {
  LegalModal,
} from "@/components/legal-modal";
import {
  TurnstileWidget,
} from "@/components/turnstile-widget";

type LegalDocument =
  | "terms"
  | "privacy"
  | "community"
  | null;

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

export function SignUpForm({
  invitedEmail = null,
  invitationToken = null,
}: {
  invitedEmail?: string | null;
  invitationToken?: string | null;
}) {
  const [email, setEmail] =
    useState(invitedEmail ?? "");
  const [password, setPassword] =
    useState("");
  const [
    repeatPassword,
    setRepeatPassword,
  ] = useState("");
  const [
    dateOfBirth,
    setDateOfBirth,
  ] = useState("");
  const [
    ageConfirmed,
    setAgeConfirmed,
  ] = useState(false);
  const [
    legalAccepted,
    setLegalAccepted,
  ] = useState(false);
  const [
    legalDocument,
    setLegalDocument,
  ] = useState<LegalDocument>(null);
  const [error, setError] =
    useState<string | null>(null);
  const [isLoading, setIsLoading] =
    useState(false);

  const [
    captchaToken,
    setCaptchaToken,
  ] = useState<string | null>(
    null,
  );

  const router = useRouter();

  const isInvited =
    Boolean(invitedEmail && invitationToken);

  const closeLegalModal =
    useCallback(() => {
      setLegalDocument(null);
    }, []);

  const handleSignUp = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (
      password !==
      repeatPassword
    ) {
      setError(
        "Passwords do not match.",
      );
      return;
    }

    if (!dateOfBirth) {
      setError(
        "Please enter your date of birth.",
      );
      return;
    }

    if (!isAtLeast18(dateOfBirth)) {
      setError(
        "Sepulchria is only available to users aged 18 or older.",
      );
      return;
    }

    if (!ageConfirmed) {
      setError(
        "You must confirm that you are at least 18 years old.",
      );
      return;
    }

    if (!legalAccepted) {
      setError(
        "You must accept the Terms of Service and Privacy Policy before creating an account.",
      );
      return;
    }

    if (!captchaToken) {
      setError(
        "Please complete the security verification before creating your account.",
      );
      return;
    }

    const supabase = createClient();
setIsLoading(true);
setError(null);

try {
  const rateLimitResponse =
    await fetch(
      "/api/auth/rate-limit",
      {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          action: "signup",
        }),
      },
    );

  const rateLimitResult =
    await rateLimitResponse
      .json()
      .catch(() => null);

  if (!rateLimitResponse.ok) {
    throw new Error(
      rateLimitResult?.error ??
        "Unable to verify account creation security.",
    );
  }

  const emailCheckResponse =
    await fetch(
      "/api/auth/check-email",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          email,
          invitationToken,
        }),
      },
    );

  const emailCheck =
    await emailCheckResponse.json();

  if (!emailCheckResponse.ok) {
    throw new Error(
      emailCheck.error ??
        "Unable to check this email address.",
    );
  }

  if (emailCheck.exists) {
    throw new Error(
      "An account with this email address already exists. Please log in instead.",
    );
  }

  if (
    isInvited &&
    invitedEmail &&
    email.toLowerCase() !==
      invitedEmail.toLowerCase()
  ) {
    throw new Error(
      "This invitation is only valid for the email address it was sent to.",
    );
  }

  const { data: signUpData, error } =
    await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          `${window.location.origin}/homepage`,

        captchaToken,

        data: {
          date_of_birth:
            dateOfBirth,
          age_18_confirmed:
            true,
          legal_terms_accepted:
            true,
          terms_version:
            TERMS_VERSION,
          privacy_version:
            PRIVACY_VERSION,
        },
      },
    });

      if (error) {
        throw error;
      }

      if (
        isInvited &&
        invitationToken
      ) {
        const createdUserId =
          signUpData.user?.id;

        if (!createdUserId) {
          throw new Error(
            "Your account could not be linked to this invitation. Please contact staff.",
          );
        }

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
                userId:
                  createdUserId,
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

      router.push(
        "/auth/sign-up-success",
      );
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fieldClass =
    "h-12 w-full border border-[rgb(var(--sep-colour-62482f))] bg-[rgb(var(--sep-colour-0b0807))]/90 px-4 text-sm text-[rgb(var(--sep-colour-e8dcc4))] outline-none transition placeholder:text-[rgb(var(--sep-colour-5f574d))] focus:border-[rgb(var(--sep-colour-b28149))] focus:ring-1 focus:ring-[rgb(var(--sep-colour-b28149))]/50";

  const labelClass =
    "block text-[9px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-a68a63))]";

  return (
    <>
      <form
        onSubmit={handleSignUp}
        className="space-y-5"
      >
        <div className="space-y-2">
          <label
            htmlFor="email"
            className={labelClass}
          >
            Email
          </label>

          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            required
            readOnly={isInvited}
            value={email}
            onChange={(event) =>
              setEmail(
                event.target.value,
              )
            }
            className={`${fieldClass} ${
              isInvited
                ? "cursor-not-allowed opacity-75"
                : ""
            }`}
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="date-of-birth"
            className={labelClass}
          >
            Date of birth
          </label>

          <input
            id="date-of-birth"
            name="date-of-birth"
            type="date"
            autoComplete="bday"
            required
            value={dateOfBirth}
            onChange={(event) =>
              setDateOfBirth(
                event.target.value,
              )
            }
            className={fieldClass}
          />

          <p className="text-[10px] leading-5 text-[rgb(var(--sep-colour-776e63))]">
            Sepulchria is strictly for users aged 18 or older.
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className={labelClass}
          >
            Password
          </label>

          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value,
              )
            }
            className={fieldClass}
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="repeat-password"
            className={labelClass}
          >
            Repeat password
          </label>

          <input
            id="repeat-password"
            name="repeat-password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
            value={
              repeatPassword
            }
            onChange={(event) =>
              setRepeatPassword(
                event.target.value,
              )
            }
            className={fieldClass}
          />
        </div>

        <div className="border border-[rgb(var(--sep-colour-7d4b3d))]/65 bg-[rgb(var(--sep-colour-1d0f0d))]/55 px-4 py-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="age-confirmation"
              checked={
                ageConfirmed
              }
              onChange={(event) =>
                setAgeConfirmed(
                  event.target.checked,
                )
              }
              required
              className="mt-1 h-4 w-4 shrink-0 accent-[rgb(var(--sep-colour-a77a42))]"
            />

            <span className="text-xs leading-6 text-[rgb(var(--sep-colour-c9b8a0))]">
              I confirm that I am 18 years of age or older.
            </span>
          </label>
        </div>

        <div className="border border-[rgb(var(--sep-colour-62482f))]/55 bg-[rgb(var(--sep-colour-0b0807))]/55 px-4 py-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="legal-acceptance"
              checked={
                legalAccepted
              }
              onChange={(event) =>
                setLegalAccepted(
                  event.target
                    .checked,
                )
              }
              required
              className="mt-1 h-4 w-4 shrink-0 accent-[rgb(var(--sep-colour-a77a42))]"
            />

            <span className="text-xs leading-6 text-[rgb(var(--sep-colour-a99b87))]">
  I have read and agree to Sepulchria&apos;s{" "}
  <button
    type="button"
    onClick={(event) => {
      event.preventDefault();
      setLegalDocument("terms");
    }}
    className="text-[rgb(var(--sep-colour-d0aa72))] underline decoration-[rgb(var(--sep-colour-725636))] underline-offset-4 transition hover:text-[rgb(var(--sep-colour-efd5a7))]"
  >
    Terms of Service
  </button>
  ,{" "}
  <button
  type="button"
  onClick={(event) => {
    event.preventDefault();
    setLegalDocument(
      "community",
    );
  }}
  className="text-[rgb(var(--sep-colour-d0aa72))] underline decoration-[rgb(var(--sep-colour-725636))] underline-offset-4 transition hover:text-[rgb(var(--sep-colour-efd5a7))]"
>
  Community Rules
</button>
  {" "}and{" "}
  <button
    type="button"
    onClick={(event) => {
      event.preventDefault();
      setLegalDocument("privacy");
    }}
    className="text-[rgb(var(--sep-colour-d0aa72))] underline decoration-[rgb(var(--sep-colour-725636))] underline-offset-4 transition hover:text-[rgb(var(--sep-colour-efd5a7))]"
  >
    Privacy Policy
  </button>
  .
</span>
          </label>
        </div>

        {error && (
          <div
            role="alert"
            className="border border-[rgb(var(--sep-colour-873e35))]/55 bg-[rgb(var(--sep-colour-421d1a))]/35 px-4 py-3 text-sm text-[rgb(var(--sep-colour-e2aaa1))]"
          >
            {error}
          </div>
        )}

        <div className="border border-[rgb(var(--sep-colour-62482f))]/45 bg-[rgb(var(--sep-colour-0b0807))]/35 px-4 py-3">
          <TurnstileWidget
            onTokenChange={
              setCaptchaToken
            }
          />
        </div>

        <button
          type="submit"
          disabled={
            isLoading ||
            !ageConfirmed ||
            !legalAccepted ||
            !dateOfBirth ||
            !captchaToken
          }
          className="h-12 w-full border border-[rgb(var(--sep-colour-a77a42))]/80 bg-[rgb(var(--sep-colour-382313))] font-serif text-base tracking-[0.05em] text-[rgb(var(--sep-colour-ead3a6))] transition hover:border-[rgb(var(--sep-colour-d4a460))] hover:bg-[rgb(var(--sep-colour-472c17))] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isLoading
            ? "Writing your name..."
            : "Create your account"}
        </button>

        <p className="text-center text-sm text-[rgb(var(--sep-colour-897d6c))]">
          Already registered?{" "}
          <Link
            href="/auth/login"
            className="text-[rgb(var(--sep-colour-c8a46e))] underline decoration-[rgb(var(--sep-colour-725636))] underline-offset-4 transition hover:text-[rgb(var(--sep-colour-efd5a7))]"
          >
            Login
          </Link>
        </p>
      </form>

      <LegalModal
        open={
          legalDocument ===
          "terms"
        }
        onClose={
          closeLegalModal
        }
        eyebrow="Sepulchria"
        title="Terms of Service"
      >
        <LegalDevelopmentNotice />

        <div className="mt-6 space-y-6 text-sm leading-7 text-[rgb(var(--sep-colour-aa9c88))]">
          <LegalSection
            title="1. Use of Sepulchria"
          >
            Sepulchria is an online
            roleplaying platform.
            Users are responsible for
            activity performed through
            their accounts and for
            following the published
            game and community rules.
          </LegalSection>

          <LegalSection
            title="2. Accounts and characters"
          >
            Account information must
            be kept secure. Character
            approval, moderation,
            access to game areas and
            participation in community
            features may be subject to
            the rules and staff
            processes published on the
            platform.
          </LegalSection>

          <LegalSection
            title="3. User content"
          >
            Users remain responsible
            for content they submit,
            including roleplay posts,
            forum posts, messages and
            uploaded character
            material. Content may be
            moderated where necessary
            to operate the service or
            enforce its rules.
          </LegalSection>

          <LegalSection
            title="4. Conduct and moderation"
          >
            Harassment, abuse,
            unlawful content, attempts
            to compromise the service
            and deliberate disruption
            may result in content
            removal, restrictions or
            account action.
          </LegalSection>

          <LegalSection
            title="5. Changes"
          >
            These terms may be updated
            as Sepulchria develops.
            Where a material change
            requires renewed
            acceptance, the platform
            may ask users to accept a
            newer version before
            continuing.
          </LegalSection>

          <p className="text-xs text-[rgb(var(--sep-colour-766b5e))]">
            Version: {TERMS_VERSION}
          </p>
        </div>
      </LegalModal>

      <LegalModal
  open={
    legalDocument ===
    "community"
  }
  onClose={
    closeLegalModal
  }
  eyebrow="Sepulchria"
  title="Community Rules"
>
  <iframe
    src="/community-rules"
    title="Community Rules"
    className="h-[60dvh] w-full border-0 bg-[rgb(var(--sep-colour-090706))]"
  />
</LegalModal>

      <LegalModal
        open={
          legalDocument ===
          "privacy"
        }
        onClose={
          closeLegalModal
        }
        eyebrow="Sepulchria"
        title="Privacy Policy"
      >
        <LegalDevelopmentNotice />

        <div className="mt-6 space-y-6 text-sm leading-7 text-[rgb(var(--sep-colour-aa9c88))]">
          <LegalSection
            title="1. Information used by the service"
          >
            Sepulchria uses account
            information such as email
            address, authentication
            data, character
            information and content
            submitted through game,
            forum and messaging
            features in order to
            provide the service.
          </LegalSection>

          <LegalSection
            title="2. Authentication and hosting"
          >
            The service uses
            third-party infrastructure
            for authentication, hosting
            and database functionality.
            The final policy should
            identify the providers in
            use at launch and explain
            the relevant processing.
          </LegalSection>

          <LegalSection
            title="3. Community content"
          >
            Information intentionally
            posted to public character
            profiles, forums or other
            public areas may be visible
            to other users. Direct and
            administrative features
            may have different
            visibility rules.
          </LegalSection>

          <LegalSection
            title="4. Retention and account management"
          >
            The final policy should
            state how long account and
            gameplay data is retained,
            how deletion requests are
            handled and which
            information may need to be
            retained for security or
            legal reasons.
          </LegalSection>

          <LegalSection
            title="5. Contact and rights"
          >
            Before public launch, add
            the appropriate operator
            contact details and the
            procedures users should
            follow to exercise
            applicable data
            protection rights.
          </LegalSection>

          <p className="text-xs text-[rgb(var(--sep-colour-766b5e))]">
            Version: {PRIVACY_VERSION}
          </p>
        </div>
      </LegalModal>
    </>
  );
}

function LegalDevelopmentNotice() {
  return (
    <div className="border border-[rgb(var(--sep-colour-7a5b37))]/45 bg-[rgb(var(--sep-colour-21160f))] p-4 text-sm leading-6 text-[rgb(var(--sep-colour-c7aa7c))]">
      Development notice: this is a
      functional placeholder for the
      registration-consent system.
      Replace it with your final
      reviewed legal text before
      public launch.
    </div>
  );
}

function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="font-serif text-xl text-[rgb(var(--sep-colour-d7bd91))]">
        {title}
      </h3>

      <p className="mt-2">
        {children}
      </p>
    </section>
  );
}