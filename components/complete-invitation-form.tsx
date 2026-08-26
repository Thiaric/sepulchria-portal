"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "@/lib/legal/versions";
import { createClient } from "@/lib/supabase/client";

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
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] =
    useState("");
  const [dateOfBirth, setDateOfBirth] =
    useState("");
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
        "This invitation is invalid, expired, or has already been used.",
      );
      return;
    }

    if (password !== repeatPassword) {
      setError("Passwords do not match.");
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
        "You must accept the Terms of Service, Community Rules and Privacy Policy.",
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
          "Your invitation session could not be verified. Please open the invitation email again.",
        );
      }

      const applicationId =
        String(
          user.user_metadata
            ?.registration_application_id ?? "",
        ).trim();

      if (!applicationId) {
        throw new Error(
          "This account is not linked to a Sepulchria registration invitation.",
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
        "/api/registration-invitations/complete",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
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
            "Your account was updated, but the invitation could not be completed. Please contact staff.",
        );
      }

      router.replace("/homepage");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to complete your invitation.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  const fieldClass =
    "h-12 w-full border border-[rgb(var(--sep-colour-62482f))] bg-[rgb(var(--sep-colour-0b0807))]/90 px-4 text-sm text-[rgb(var(--sep-colour-e8dcc4))] outline-none transition placeholder:text-[rgb(var(--sep-colour-5f574d))] focus:border-[rgb(var(--sep-colour-b28149))] focus:ring-1 focus:ring-[rgb(var(--sep-colour-b28149))]/50";

  const labelClass =
    "block text-[9px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-a68a63))]";

  if (checkingSession) {
    return (
      <p className="text-sm leading-7 text-[rgb(var(--sep-colour-a99b87))]">
        Verifying your invitation...
      </p>
    );
  }

  if (!email) {
    return (
      <div className="space-y-5">
        <div className="border border-[rgb(var(--sep-colour-873e35))]/55 bg-[rgb(var(--sep-colour-421d1a))]/35 px-4 py-4 text-sm leading-6 text-[rgb(var(--sep-colour-e2aaa1))]">
          This invitation is invalid, expired, or has already been used.
          Open the most recent invitation email you received.
        </div>

        <p className="text-center text-sm text-[rgb(var(--sep-colour-897d6c))]">
          <Link
            href="/homepage"
            className="text-[rgb(var(--sep-colour-c8a46e))] underline decoration-[rgb(var(--sep-colour-725636))] underline-offset-4"
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
      className="space-y-5"
    >
      <div className="space-y-2">
        <label className={labelClass}>
          Invited email
        </label>
        <input
          readOnly
          value={email}
          className={`${fieldClass} cursor-not-allowed opacity-75`}
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="invite-date-of-birth"
          className={labelClass}
        >
          Date of birth
        </label>
        <input
          id="invite-date-of-birth"
          type="date"
          autoComplete="bday"
          required
          value={dateOfBirth}
          onChange={(event) =>
            setDateOfBirth(event.target.value)
          }
          className={fieldClass}
        />
        <p className="text-[10px] leading-5 text-[rgb(var(--sep-colour-776e63))]">
          Sepulchria is strictly for users aged 18 or older.
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="invite-password"
          className={labelClass}
        >
          Password
        </label>
        <input
          id="invite-password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          value={password}
          onChange={(event) =>
            setPassword(event.target.value)
          }
          className={fieldClass}
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="invite-repeat-password"
          className={labelClass}
        >
          Repeat password
        </label>
        <input
          id="invite-repeat-password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          value={repeatPassword}
          onChange={(event) =>
            setRepeatPassword(event.target.value)
          }
          className={fieldClass}
        />
      </div>

      <div className="border border-[rgb(var(--sep-colour-7d4b3d))]/65 bg-[rgb(var(--sep-colour-1d0f0d))]/55 px-4 py-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={ageConfirmed}
            onChange={(event) =>
              setAgeConfirmed(event.target.checked)
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
            checked={legalAccepted}
            onChange={(event) =>
              setLegalAccepted(event.target.checked)
            }
            required
            className="mt-1 h-4 w-4 shrink-0 accent-[rgb(var(--sep-colour-a77a42))]"
          />
          <span className="text-xs leading-6 text-[rgb(var(--sep-colour-a99b87))]">
            I have read and agree to Sepulchria&apos;s{" "}
            <Link
              href="/terms"
              target="_blank"
              className="text-[rgb(var(--sep-colour-d0aa72))] underline decoration-[rgb(var(--sep-colour-725636))] underline-offset-4"
            >
              Terms of Service
            </Link>
            ,{" "}
            <Link
              href="/community-rules"
              target="_blank"
              className="text-[rgb(var(--sep-colour-d0aa72))] underline decoration-[rgb(var(--sep-colour-725636))] underline-offset-4"
            >
              Community Rules
            </Link>
            {" "}and{" "}
            <Link
              href="/privacy"
              target="_blank"
              className="text-[rgb(var(--sep-colour-d0aa72))] underline decoration-[rgb(var(--sep-colour-725636))] underline-offset-4"
            >
              Privacy Policy
            </Link>
            .
          </span>
        </label>
      </div>

      {error ? (
        <div
          role="alert"
          className="border border-[rgb(var(--sep-colour-873e35))]/55 bg-[rgb(var(--sep-colour-421d1a))]/35 px-4 py-3 text-sm text-[rgb(var(--sep-colour-e2aaa1))]"
        >
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={
          isLoading ||
          !dateOfBirth ||
          !ageConfirmed ||
          !legalAccepted
        }
        className="h-12 w-full border border-[rgb(var(--sep-colour-a77a42))]/80 bg-[rgb(var(--sep-colour-382313))] font-serif text-base tracking-[0.05em] text-[rgb(var(--sep-colour-ead3a6))] transition hover:border-[rgb(var(--sep-colour-d4a460))] hover:bg-[rgb(var(--sep-colour-472c17))] disabled:cursor-not-allowed disabled:opacity-45"
      >
        {isLoading
          ? "Opening the City Gates..."
          : "Complete your account"}
      </button>
    </form>
  );
}
