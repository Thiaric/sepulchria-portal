"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password !== repeatPassword) {
      setError("Passwords do not match.");
      return;
    }

    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/homepage`,
        },
      });

      if (error) {
        throw error;
      }

      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const fieldClass =
    "h-12 w-full border border-[#62482f] bg-[#0b0807]/90 px-4 text-sm text-[#e8dcc4] outline-none transition placeholder:text-[#5f574d] focus:border-[#b28149] focus:ring-1 focus:ring-[#b28149]/50";

  const labelClass =
    "block text-[9px] uppercase tracking-[0.22em] text-[#a68a63]";

  return (
    <form onSubmit={handleSignUp} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className={labelClass}>
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
          onChange={(event) => setEmail(event.target.value)}
          className={fieldClass}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className={labelClass}>
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
          onChange={(event) => setPassword(event.target.value)}
          className={fieldClass}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="repeat-password" className={labelClass}>
          Repeat password
        </label>
        <input
          id="repeat-password"
          name="repeat-password"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          value={repeatPassword}
          onChange={(event) => setRepeatPassword(event.target.value)}
          className={fieldClass}
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
        {isLoading ? "Writing your name..." : "Create your account"}
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
  );
}
