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
    aria-label="Log out"
    data-experience-logout="1"
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
  relative
  flex
  h-8
  w-8
  items-center
  justify-center
  border
  border-[rgb(var(--sep-colour-614b31))]
  bg-[rgb(var(--sep-colour-17120f))]
  p-0
  text-[rgb(var(--sep-colour-c69b5c))]
  transition
  hover:border-[rgb(var(--sep-colour-977242))]
  hover:text-[rgb(var(--sep-colour-efd6a3))]
  disabled:cursor-not-allowed
  disabled:opacity-60
  sm:h-9
  sm:w-9
  2xl:h-10
  2xl:w-10
"
  >
    <LogOut className="pointer-events-none h-5 w-5" />

    <span>
      {isLoggingOut
        ? "Exiting..."
        : ""}
    </span>
  </button>
);
}