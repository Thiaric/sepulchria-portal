"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] =
    useState(false);

  const logout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    const supabase = createClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const {
          data: character,
          error: characterError,
        } = await supabase
          .from("characters")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (characterError) {
          console.error(
            "Unable to find character before logout:",
            characterError.message,
          );
        }

        if (character) {
          const { error: presenceError } =
            await supabase
              .from("character_presence")
              .delete()
              .eq(
                "character_id",
                character.id,
              );

          if (presenceError) {
            console.error(
              "Unable to remove presence before logout:",
              presenceError.message,
            );
          }
        }
      }

      try {
        await fetch("/api/portal-session/release", {
          method: "POST",
          credentials: "same-origin",
        });
      } catch {
        // Signing out locally is still correct if release cleanup fails.
      }

      const { error: signOutError } =
        await supabase.auth.signOut({
          scope: "local",
        });

      if (signOutError) {
        throw signOutError;
      }

      router.replace("/homepage");
      router.refresh();
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
