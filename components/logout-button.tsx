"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";

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

      const { error: signOutError } =
        await supabase.auth.signOut();

      if (signOutError) {
        throw signOutError;
      }

      router.replace("/auth/login");
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
      gap-2
      border
      border-[#6f5233]
      bg-[#16100c]
      px-4
      text-[10px]
      font-medium
      uppercase
      tracking-[0.22em]
      text-[#d7b980]
      transition-all
      duration-200
      hover:border-[#a97d47]
      hover:bg-[#241811]
      hover:text-[#f2d8a3]
      disabled:cursor-not-allowed
      disabled:opacity-60
    "
  >
    <LogOut className="h-4 w-4" />

    <span>
      {isLoggingOut
        ? "Exiting..."
        : "Exit Game"}
    </span>
  </button>
);
}