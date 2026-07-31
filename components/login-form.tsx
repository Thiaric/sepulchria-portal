"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      router.replace("/");
      router.refresh();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-5">
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-[9px] uppercase tracking-[0.22em] text-[#a68a63]"
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
          onChange={(event) => setEmail(event.target.value)}
          className="h-12 w-full border border-[#62482f] bg-[#0b0807]/90 px-4 text-sm text-[#e8dcc4] outline-none transition placeholder:text-[#5f574d] focus:border-[#b28149] focus:ring-1 focus:ring-[#b28149]/50"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <label
            htmlFor="password"
            className="block text-[9px] uppercase tracking-[0.22em] text-[#a68a63]"
          >
            Password
          </label>

          <Link
            href="/auth/forgot-password"
            className="text-xs text-[#8e806d] transition hover:text-[#d4b27e]"
          >
            Forgot your password?
          </Link>
        </div>

        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-12 w-full border border-[#62482f] bg-[#0b0807]/90 px-4 text-sm text-[#e8dcc4] outline-none transition focus:border-[#b28149] focus:ring-1 focus:ring-[#b28149]/50"
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
        className="relative h-12 w-full overflow-hidden border border-[#a77a42]/80 bg-[#382313] font-serif text-base tracking-[0.05em] text-[#ead3a6] transition hover:border-[#d4a460] hover:bg-[#472c17] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Opening the gates..." : "Enter Sepulchria"}
      </button>

      <p className="text-center text-sm text-[#897d6c]">
        Do not yet have an account?{" "}
        <Link
          href="/auth/sign-up"
          className="text-[#c8a46e] underline decoration-[#725636] underline-offset-4 transition hover:text-[#efd5a7]"
        >
          Register
        </Link>
      </p>
    </form>
  );
}
