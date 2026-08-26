"use client";

import { createClient } from "@/lib/supabase/client";
import { TurnstileWidget } from "@/components/turnstile-widget";
import Link from "next/link";
import { useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
const [isLoading, setIsLoading] = useState(false);
const [captchaToken, setCaptchaToken] =
  useState<string | null>(null);
  

    const handleLogin = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

const isEmbedded =
  window.self !== window.top;

if (isEmbedded) {
  setError(
    "The login page cannot be used inside a portal modal. Close the modal and continue from the main Sepulchria window.",
  );
  return;
}    

const isPortalWindow =
  window.name ===
  "SepulchriaPortal";

if (!captchaToken) {
  setError(
    "Please complete the security verification before entering Sepulchria.",
  );
  return;
}

/*
 * Open the game window immediately from the user's click.
     * This has to happen BEFORE awaiting Supabase or the browser
     * may treat it as an unsolicited popup and block it.
     */
    const portalWindow =
  isPortalWindow
    ? window
    : window.open(
        "about:blank",
        "SepulchriaPortal",
        [
          "popup=yes",
          `width=${window.screen.availWidth}`,
          `height=${window.screen.availHeight}`,
          "left=0",
          "top=0",
          "resizable=yes",
          "scrollbars=yes",
        ].join(","),
      );

if (!portalWindow) {
  setError(
    "Sepulchria needs permission to open the game window. Please allow popups for this website and try again.",
  );
  return;
}

portalWindow.document.title =
  "Sepulchria";

    const supabase =
      createClient();

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
              action: "login",
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
            "Unable to verify login security.",
        );
      }

      const { error } =
  await supabase.auth.signInWithPassword({
    email,
    password,
    options: {
      captchaToken,
    },
  });

      if (error) {
        throw error;
      }

      /*
       * Every successful login gets its own portal-window identity.
       * The newest successful login becomes the only active portal
       * instance for this account.
       */
      const portalInstanceId =
        crypto.randomUUID();

      const claimResponse =
        await fetch(
          "/api/portal-session/claim",
          {
            method: "POST",
            credentials: "same-origin",
            cache: "no-store",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              instanceId:
                portalInstanceId,
            }),
          },
        );

      if (!claimResponse.ok) {
        const claimResult =
          (await claimResponse
            .json()
            .catch(() => null)) as
            | {
                message?: string;
              }
            | null;

        throw new Error(
          claimResult?.message ??
            "Unable to establish the active Sepulchria login.",
        );
      }

      portalWindow.sessionStorage.setItem(
        "sepulchria-portal-instance-id",
        portalInstanceId,
      );

      /*
       * Supabase authentication is shared because the new
       * window is on the same Sepulchria origin.
       */
      if (isPortalWindow) {
  window.location.replace("/");
} else {
  portalWindow.location.replace(
    `${window.location.origin}/`,
  );

  portalWindow.focus();

  window.location.replace(
    "/homepage",
  );
}
    } catch (error: unknown) {
      if (!isPortalWindow) {
  portalWindow.close();
}

      setError(
        error instanceof Error
          ? error.message
          : "An error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-5">
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-[9px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-a68a63))]"
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
          className="h-12 w-full border border-[rgb(var(--sep-colour-62482f))] bg-[rgb(var(--sep-colour-0b0807))]/90 px-4 text-sm text-[rgb(var(--sep-colour-e8dcc4))] outline-none transition placeholder:text-[rgb(var(--sep-colour-5f574d))] focus:border-[rgb(var(--sep-colour-b28149))] focus:ring-1 focus:ring-[rgb(var(--sep-colour-b28149))]/50"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <label
            htmlFor="password"
            className="block text-[9px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-a68a63))]"
          >
            Password
          </label>

          <Link
            href="/auth/forgot-password"
            className="text-xs text-[rgb(var(--sep-colour-8e806d))] transition hover:text-[rgb(var(--sep-colour-d4b27e))]"
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
          className="h-12 w-full border border-[rgb(var(--sep-colour-62482f))] bg-[rgb(var(--sep-colour-0b0807))]/90 px-4 text-sm text-[rgb(var(--sep-colour-e8dcc4))] outline-none transition focus:border-[rgb(var(--sep-colour-b28149))] focus:ring-1 focus:ring-[rgb(var(--sep-colour-b28149))]/50"
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

      <div className="border border-[rgb(var(--sep-colour-62482f))]/45 bg-[rgb(var(--sep-colour-0b0807))]/35 px-4 py-3">
        <TurnstileWidget
          onTokenChange={setCaptchaToken}
        />
      </div>

      <button
        type="submit"
        disabled={
  isLoading ||
  !captchaToken
}
        className="relative h-12 w-full overflow-hidden border border-[rgb(var(--sep-colour-a77a42))]/80 bg-[rgb(var(--sep-colour-382313))] font-serif text-base tracking-[0.05em] text-[rgb(var(--sep-colour-ead3a6))] transition hover:border-[rgb(var(--sep-colour-d4a460))] hover:bg-[rgb(var(--sep-colour-472c17))] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Opening the gates..." : "Enter Sepulchria"}
      </button>

      <p className="text-center text-sm text-[rgb(var(--sep-colour-897d6c))]">
        Do not yet have an account?{" "}
        <Link
          href="/auth/sign-up"
          className="text-[rgb(var(--sep-colour-c8a46e))] underline decoration-[rgb(var(--sep-colour-725636))] underline-offset-4 transition hover:text-[rgb(var(--sep-colour-efd5a7))]"
        >
          Register
        </Link>
      </p>
    </form>
  );
}
