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

type LegalDocument =
  | "terms"
  | "privacy"
  | null;

export function SignUpForm() {
  const [email, setEmail] =
    useState("");
  const [password, setPassword] =
    useState("");
  const [
    repeatPassword,
    setRepeatPassword,
  ] = useState("");
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
  const router = useRouter();

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

    if (!legalAccepted) {
      setError(
        "You must accept the Terms of Service and Privacy Policy before creating an account.",
      );
      return;
    }

    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } =
        await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo:
              `${window.location.origin}/homepage`,
            data: {
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
    "h-12 w-full border border-[#62482f] bg-[#0b0807]/90 px-4 text-sm text-[#e8dcc4] outline-none transition placeholder:text-[#5f574d] focus:border-[#b28149] focus:ring-1 focus:ring-[#b28149]/50";

  const labelClass =
    "block text-[9px] uppercase tracking-[0.22em] text-[#a68a63]";

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
            value={email}
            onChange={(event) =>
              setEmail(
                event.target.value,
              )
            }
            className={fieldClass}
          />
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

        <div className="border border-[#62482f]/55 bg-[#0b0807]/55 px-4 py-4">
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
              className="mt-1 h-4 w-4 shrink-0 accent-[#a77a42]"
            />

            <span className="text-xs leading-6 text-[#a99b87]">
              I have read and
              agree to
              Sepulchria&apos;s{" "}
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  setLegalDocument(
                    "terms",
                  );
                }}
                className="text-[#d0aa72] underline decoration-[#725636] underline-offset-4 transition hover:text-[#efd5a7]"
              >
                Terms of Service
              </button>{" "}
              and{" "}
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  setLegalDocument(
                    "privacy",
                  );
                }}
                className="text-[#d0aa72] underline decoration-[#725636] underline-offset-4 transition hover:text-[#efd5a7]"
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
            className="border border-[#873e35]/55 bg-[#421d1a]/35 px-4 py-3 text-sm text-[#e2aaa1]"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={
            isLoading ||
            !legalAccepted
          }
          className="h-12 w-full border border-[#a77a42]/80 bg-[#382313] font-serif text-base tracking-[0.05em] text-[#ead3a6] transition hover:border-[#d4a460] hover:bg-[#472c17] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isLoading
            ? "Writing your name..."
            : "Create your account"}
        </button>

        <p className="text-center text-sm text-[#897d6c]">
          Already registered?{" "}
          <Link
            href="/auth/login"
            className="text-[#c8a46e] underline decoration-[#725636] underline-offset-4 transition hover:text-[#efd5a7]"
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

        <div className="mt-6 space-y-6 text-sm leading-7 text-[#aa9c88]">
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

          <p className="text-xs text-[#766b5e]">
            Version: {TERMS_VERSION}
          </p>
        </div>
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

        <div className="mt-6 space-y-6 text-sm leading-7 text-[#aa9c88]">
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

          <p className="text-xs text-[#766b5e]">
            Version: {PRIVACY_VERSION}
          </p>
        </div>
      </LegalModal>
    </>
  );
}

function LegalDevelopmentNotice() {
  return (
    <div className="border border-[#7a5b37]/45 bg-[#21160f] p-4 text-sm leading-6 text-[#c7aa7c]">
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
      <h3 className="font-serif text-xl text-[#d7bd91]">
        {title}
      </h3>

      <p className="mt-2">
        {children}
      </p>
    </section>
  );
}
