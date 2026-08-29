"use client";

import { useState } from "react";

import { clearOwnPresenceForLogout } from "@/app/(portal)/logout-presence-actions";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const [isLoggingOut, setIsLoggingOut] =
    useState(false);

  const logout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    window.dispatchEvent(
      new Event(
        "sepulchria-logout-started",
      ),
    );

    const supabase = createClient();

    try {
      try {
        const presenceResult =
          await clearOwnPresenceForLogout();

        if (!presenceResult.ok) {
          console.error(
            "Unable to remove presence before logout:",
            presenceResult.message,
          );
        }
      } catch (presenceError) {
        console.error(
          "Unable to remove presence before logout:",
          presenceError,
        );
      }

      const { error: signOutError } =
        await supabase.auth.signOut();

      if (signOutError) {
        throw signOutError;
      }

      /*
       * Sepulchria is normally running in the dedicated popup created
       * by the Enter Sepulchria button. On an intentional logout, close
       * that game window instead of turning it into another homepage.
       */
      sessionStorage.removeItem(
        "sepulchria-portal-instance-id",
      );

      /*
       * Tell the original public homepage that logout succeeded before
       * this dedicated game window disappears.
       */
      if (
        window.opener &&
        !window.opener.closed
      ) {
        try {
          window.opener.postMessage(
            {
              type:
                "sepulchria:portal-logged-out",
            },
            window.location.origin,
          );
        } catch (error) {
          console.warn(
            "Unable to notify homepage about logout:",
            error,
          );
        }
      }

      window.close();

      /*
       * Script-opened portal windows are allowed to close themselves.
       * Keep a fallback for browsers/environments that refuse window.close().
       */
      window.setTimeout(() => {
        if (!window.closed) {
          window.location.replace(
            "/homepage",
          );
        }
      }, 150);
    } catch (error) {
      console.error(
        "Logout failed:",
        error instanceof Error
          ? error.message
          : error,
      );

      setIsLoggingOut(false);
    }
  };

  return (
  <button
    type="button"
    onPointerDown={() => {
      window.dispatchEvent(
        new Event(
          "sepulchria-logout-started",
        ),
      );
    }}
    onClick={logout}
    disabled={isLoggingOut}
    className="
      inline-flex
      h-10
      items-center
      justify-center
      gap-0
      border
      border-[rgb(var(--sep-colour-6f5233))]
      bg-[rgb(var(--sep-colour-16100c))]
      px-4
      text-[10px]
      font-medium
      uppercase
      tracking-[0.22em]
      text-[rgb(var(--sep-colour-d7b980))]
      transition-all
      duration-200
      hover:border-[rgb(var(--sep-colour-a97d47))]
      hover:bg-[rgb(var(--sep-colour-241811))]
      hover:text-[rgb(var(--sep-colour-f2d8a3))]
      disabled:cursor-not-allowed
      disabled:opacity-60
    "
  >
    <LogOut className="h-4 w-4" />

    <span>
      {isLoggingOut
        ? "Exiting..."
        : ""}
    </span>
  </button>
);
}