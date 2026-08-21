"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const supabase = createClient();

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });

      if (error) {
        throw error;
      }

      setSuccess(true);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[rgb(var(--sep-colour-8e693e))]/70 bg-[rgb(var(--sep-colour-2a1b10))]/70 font-serif text-2xl text-[rgb(var(--sep-colour-d9b478))]">
          ✦
        </div>

        <h3 className="mt-5 font-serif text-2xl text-[rgb(var(--sep-colour-e5cfa6))]">
          Check Your Email
        </h3>

        <p className="mt-3 text-sm leading-6 text-[rgb(var(--sep-colour-9f927f))]">
          If an account exists for{" "}
          <span className="text-[rgb(var(--sep-colour-d3b27d))]">{email}</span>, password-reset
          instructions have been sent.
        </p>

        <Link
          href="/auth/login"
          className="mt-7 inline-flex h-12 w-full items-center justify-center border border-[rgb(var(--sep-colour-a77a42))]/80 bg-[rgb(var(--sep-colour-382313))] font-serif text-base tracking-[0.05em] text-[rgb(var(--sep-colour-ead3a6))] transition hover:border-[rgb(var(--sep-colour-d4a460))] hover:bg-[rgb(var(--sep-colour-472c17))]"
        >
          Return to Login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleForgotPassword} className="space-y-5">
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-[9px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-a68a63))]"
        >
          Account email
        </label>

        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-12 w-full border border-[rgb(var(--sep-colour-62482f))] bg-[rgb(var(--sep-colour-0b0807))]/90 px-4 text-sm text-[rgb(var(--sep-colour-e8dcc4))] outline-none transition placeholder:text-[rgb(var(--sep-colour-5f574d))] focus:border-[rgb(var(--sep-colour-b28149))] focus:ring-1 focus:ring-[rgb(var(--sep-colour-b28149))]/50"
        />
      </div>

      {error && (
        <div
          role="alert"
          className="border border-[rgb(var(--sep-colour-873e35))]/55 bg-[rgb(var(--sep-colour-421d1a))]/35 px-4 py-3 text-sm text-[rgb(var(--sep-colour-e2aaa1))]"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="h-12 w-full border border-[rgb(var(--sep-colour-a77a42))]/80 bg-[rgb(var(--sep-colour-382313))] font-serif text-base tracking-[0.05em] text-[rgb(var(--sep-colour-ead3a6))] transition hover:border-[rgb(var(--sep-colour-d4a460))] hover:bg-[rgb(var(--sep-colour-472c17))] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Sending the sealed message..." : "Send Reset Link"}
      </button>

      <p className="text-center text-sm text-[rgb(var(--sep-colour-897d6c))]">
        Remembered your password?{" "}
        <Link
          href="/auth/login"
          className="text-[rgb(var(--sep-colour-c8a46e))] underline decoration-[rgb(var(--sep-colour-725636))] underline-offset-4 transition hover:text-[rgb(var(--sep-colour-efd5a7))]"
        >
          Return to Login
        </Link>
      </p>
    </form>
  );
}
