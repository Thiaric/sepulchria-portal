"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function RegistrationClosedNotice() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [heardAbout, setHeardAbout] = useState("");
  const [roleplayEnjoyment, setRoleplayEnjoyment] = useState("");
  const [rpgExperience, setRpgExperience] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !loading) {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, loading]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/registration-applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          heardAbout,
          roleplayEnjoyment,
          rpgExperience,
          website,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error ?? "Unable to submit your application.",
        );
      }

      setSuccess(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to submit your application.",
      );
    } finally {
      setLoading(false);
    }
  }

  const field =
    "w-full border border-[rgb(var(--sep-colour-62482f))] bg-[rgb(var(--sep-colour-0b0807))]/90 px-4 py-3 text-sm text-[rgb(var(--sep-colour-e8dcc4))] outline-none transition placeholder:text-[rgb(var(--sep-colour-5f574d))] focus:border-[rgb(var(--sep-colour-b28149))]";
  const label =
    "block text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-a68a63))]";

  return (
    <>
      <div className="space-y-6">
        <div className="border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-21170f))]/70 p-6 text-center sm:p-8">
          <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-a88658))]">
            The City Gates Will Open Soon
          </p>

          <h2 className="mt-3 font-serif text-2xl text-[rgb(var(--sep-colour-e6cfa3))] sm:text-3xl">
            Closed Alpha access
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[rgb(var(--sep-colour-b8aa95))]">
  Public registrations will open soon. We are now selecting an
  initial group of up to 50 players for the Closed Alpha.
</p>

<p className="mx-auto mt-3 max-w-xl text-xs leading-6 text-[rgb(var(--sep-colour-8f8271))]">
  Applications are reviewed individually and invitations are limited.
</p>

          <div className="mx-auto mt-6 h-px w-28 bg-gradient-to-r from-transparent via-[rgb(var(--sep-colour-987344))] to-transparent" />

          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setError(null);
            }}
            className="mt-6 border border-[rgb(var(--sep-colour-a77a42))]/80 bg-[rgb(var(--sep-colour-382313))] px-6 py-3 font-serif text-base text-[rgb(var(--sep-colour-ead3a6))] transition hover:border-[rgb(var(--sep-colour-d4a460))] hover:bg-[rgb(var(--sep-colour-472c17))]"
          >
            Apply for Closed Alpha
          </button>
        </div>

        <p className="text-center text-sm text-[rgb(var(--sep-colour-897d6c))]">
          Already registered?{" "}
          <Link
            href="/auth/login"
            className="text-[rgb(var(--sep-colour-c8a46e))] underline decoration-[rgb(var(--sep-colour-725636))] underline-offset-4 transition hover:text-[rgb(var(--sep-colour-efd5a7))]"
          >
            Login
          </Link>
        </p>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="alpha-application-title"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && !loading) {
              setOpen(false);
            }
          }}
        >
          <div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto border border-[rgb(var(--sep-colour-765937))]/70 bg-[rgb(var(--sep-colour-120d09))] p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8b704e))]">
                  Closed Alpha
                </p>
                <h2
                  id="alpha-application-title"
                  className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-e2cda4))]"
                >
                  Application
                </h2>
              </div>

              <button
                type="button"
                onClick={() => !loading && setOpen(false)}
                className="text-xl text-[rgb(var(--sep-colour-9b876a))] hover:text-[rgb(var(--sep-colour-e0c99d))]"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {success ? (
              <div className="mt-6 border border-emerald-800/55 bg-emerald-950/15 p-5 text-sm leading-7 text-emerald-300">
                Thank you. Your application has been received. If selected,
                you will receive an invitation at the email address you
                provided.
              </div>
            ) : (
              <form onSubmit={submit} className="mt-6 space-y-5">
                <div className="space-y-2">
                  <label htmlFor="alpha-name" className={label}>Name</label>
                  <input
                    id="alpha-name"
                    required
                    maxLength={120}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={field}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="alpha-email" className={label}>Email</label>
                  <input
                    id="alpha-email"
                    type="email"
                    required
                    maxLength={320}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={field}
                  />
                </div>

                <div className="hidden" aria-hidden="true">
                  <label htmlFor="alpha-website">Website</label>
                  <input
                    id="alpha-website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="alpha-heard" className={label}>
                    How did you hear about the closed Alpha?
                  </label>
                  <textarea
                    id="alpha-heard"
                    required
                    rows={3}
                    maxLength={3000}
                    value={heardAbout}
                    onChange={(e) => setHeardAbout(e.target.value)}
                    className={field}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="alpha-enjoy" className={label}>
                    What do you enjoy about roleplay?
                  </label>
                  <textarea
                    id="alpha-enjoy"
                    required
                    rows={5}
                    maxLength={6000}
                    value={roleplayEnjoyment}
                    onChange={(e) => setRoleplayEnjoyment(e.target.value)}
                    className={field}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="alpha-experience" className={label}>
                    Previous RPG experience
                  </label>
                  <textarea
                    id="alpha-experience"
                    required
                    rows={5}
                    maxLength={6000}
                    value={rpgExperience}
                    onChange={(e) => setRpgExperience(e.target.value)}
                    className={field}
                  />
                </div>

                {error ? (
                  <div className="border border-red-900/55 bg-red-950/20 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full border border-[rgb(var(--sep-colour-a77a42))]/80 bg-[rgb(var(--sep-colour-382313))] px-6 py-3 font-serif text-base text-[rgb(var(--sep-colour-ead3a6))] transition hover:border-[rgb(var(--sep-colour-d4a460))] hover:bg-[rgb(var(--sep-colour-472c17))] disabled:opacity-50"
                >
                  {loading ? "Submitting..." : "Submit application"}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
