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
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#8e693e]/70 bg-[#2a1b10]/70 font-serif text-2xl text-[#d9b478]">
          ✦
        </div>

        <h3 className="mt-5 font-serif text-2xl text-[#e5cfa6]">
          Check Your Email
        </h3>

        <p className="mt-3 text-sm leading-6 text-[#9f927f]">
          If an account exists for{" "}
          <span className="text-[#d3b27d]">{email}</span>, password-reset
          instructions have been sent.
        </p>

        <Link
          href="/auth/login"
          className="mt-7 inline-flex h-12 w-full items-center justify-center border border-[#a77a42]/80 bg-[#382313] font-serif text-base tracking-[0.05em] text-[#ead3a6] transition hover:border-[#d4a460] hover:bg-[#472c17]"
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
          className="block text-[9px] uppercase tracking-[0.22em] text-[#a68a63]"
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
          className="h-12 w-full border border-[#62482f] bg-[#0b0807]/90 px-4 text-sm text-[#e8dcc4] outline-none transition placeholder:text-[#5f574d] focus:border-[#b28149] focus:ring-1 focus:ring-[#b28149]/50"
        />
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
        disabled={isLoading}
        className="h-12 w-full border border-[#a77a42]/80 bg-[#382313] font-serif text-base tracking-[0.05em] text-[#ead3a6] transition hover:border-[#d4a460] hover:bg-[#472c17] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Sending the sealed message..." : "Send Reset Link"}
      </button>

      <p className="text-center text-sm text-[#897d6c]">
        Remembered your password?{" "}
        <Link
          href="/auth/login"
          className="text-[#c8a46e] underline decoration-[#725636] underline-offset-4 transition hover:text-[#efd5a7]"
        >
          Return to Login
        </Link>
      </p>
    </form>
  );
}
