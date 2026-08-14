"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type OrderLeadershipSidebarLinkProps = {
  variant?: "desktop" | "mobile";
};

export function OrderLeadershipSidebarLink({
  variant = "desktop",
}: OrderLeadershipSidebarLinkProps) {
  const pathname = usePathname();

  const [
    hasLeadership,
    setHasLeadership,
  ] = useState(false);

  const checkLeadership =
    useCallback(async () => {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        setHasLeadership(false);
        return;
      }

      const {
        data: character,
        error: characterError,
      } = await supabase
        .from("characters")
        .select("id")
        .eq(
          "user_id",
          user.id,
        )
        .maybeSingle();

      if (
        characterError ||
        !character
      ) {
        setHasLeadership(false);
        return;
      }

      const {
        data: memberships,
        error: membershipError,
      } = await supabase
        .from("order_memberships")
        .select(`
          id,
          level:order_levels!order_memberships_order_level_id_fkey(
            level
          )
        `)
        .eq(
          "character_id",
          character.id,
        );

      if (membershipError) {
        console.error(
          "Unable to check Order leadership:",
          membershipError,
        );

        setHasLeadership(false);
        return;
      }

      const isHead =
        (memberships ?? []).some(
          (membership) => {
            const relation =
              Array.isArray(
                membership.level,
              )
                ? membership
                    .level[0]
                : membership.level;

            return (
              relation?.level === 5
            );
          },
        );

      setHasLeadership(isHead);
    }, []);

  useEffect(() => {
    void checkLeadership();

    function handleFocus() {
      void checkLeadership();
    }

    function handleVisibility() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void checkLeadership();
      }
    }

    window.addEventListener(
      "focus",
      handleFocus,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility,
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );
    };
  }, [checkLeadership]);

  if (!hasLeadership) {
    return null;
  }

  const active =
    pathname ===
      "/orders/manage" ||
    pathname.startsWith(
      "/orders/manage/",
    );

  if (variant === "mobile") {
    return (
      <Link
        href="/orders/manage"
        title="Manage Order"
        aria-label="Manage Order"
        className={`relative flex h-10 min-w-0 items-center justify-center border text-[17px] leading-none transition ${
          active
            ? "border-[#8d6d3e] bg-[#332719] text-[#efd9aa]"
            : "border-transparent text-[#b68b4f] hover:border-[#5d4930] hover:bg-[#1d1712] hover:text-[#efd9aa]"
        }`}
      >
        <span aria-hidden="true">
          ⚜
        </span>
      </Link>
    );
  }

  return (
    <Link
      href="/orders/manage"
      title="Manage the members, Levels and jobs of the Order you lead."
      className={`flex min-h-[var(--portal-nav-min-h)] items-center gap-2 border px-2.5 py-[var(--portal-nav-y)] text-[11px] transition lg:text-xs ${
        active
          ? "border-[#8d6d3e] bg-[#332719] text-[#efd9aa]"
          : "border-transparent text-[#b6a894] hover:border-[#5d4930] hover:bg-[#1d1712] hover:text-[#e8d8ba]"
      }`}
    >
      <span className="w-4 shrink-0 text-center text-[12px] text-[#b68b4f]">
        ⚜
      </span>

      <span className="truncate">
        Manage Order
      </span>
    </Link>
  );
}
