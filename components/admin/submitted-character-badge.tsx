"use client";

import {
  useCallback,
  useEffect,
  useId,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type SubmittedCharacterBadgeProps = {
  variant: "floating" | "admin-nav";
};

const STAFF_ROLES = [
  "owner",
  "admin",
  "moderator",
  "master",
];

export function SubmittedCharacterBadge({
  variant,
}: SubmittedCharacterBadgeProps) {
  const instanceId = useId();
  const [count, setCount] = useState(0);
  const [isStaff, setIsStaff] =
    useState(false);

  const refreshCount =
    useCallback(async () => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsStaff(false);
        setCount(0);
        return;
      }

      const {
        data: staffMember,
        error: staffError,
      } = await supabase
        .from("staff_members")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (
        staffError ||
        !staffMember ||
        !STAFF_ROLES.includes(
          staffMember.role,
        )
      ) {
        setIsStaff(false);
        setCount(0);
        return;
      }

      setIsStaff(true);

      const {
        count: submittedCount,
        error: countError,
      } = await supabase
        .from("characters")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("status", "submitted");

      if (countError) {
        console.error(
          "Unable to count submitted characters:",
          countError.message,
        );
        return;
      }

      setCount(submittedCount ?? 0);
    }, []);

  useEffect(() => {
    const supabase = createClient();

    void refreshCount();

    const safeInstanceId =
      instanceId.replace(
        /[^a-zA-Z0-9_-]/g,
        "",
      );

    const channel = supabase
      .channel(
        `submitted-character-alerts-${variant}-${safeInstanceId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "characters",
        },
        () => {
          void refreshCount();
        },
      )
      .subscribe();

    const intervalId =
      window.setInterval(() => {
        void refreshCount();
      }, 5_000);

    const handleFocus = () => {
      void refreshCount();
    };

    window.addEventListener(
      "focus",
      handleFocus,
    );

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener(
        "focus",
        handleFocus,
      );
      void supabase.removeChannel(channel);
    };
  }, [
    instanceId,
    refreshCount,
    variant,
  ]);

  if (!isStaff || count <= 0) {
    return null;
  }

  const label =
    count > 9 ? "9+" : String(count);

  if (variant === "floating") {
    return (
      <span
        title={`${count} submitted character sheet${
          count === 1 ? "" : "s"
        } awaiting review`}
        className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-[#e1a14d] bg-[#7a291f] text-[8px] font-bold leading-none text-[#ffe1ac] shadow-[0_0_10px_rgba(225,161,77,0.35)]"
      >
        {label}
      </span>
    );
  }

  return (
    <span
      title={`${count} submitted character sheet${
        count === 1 ? "" : "s"
      } awaiting review`}
      className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#d19a4c] bg-[#7a291f] text-[7px] font-bold leading-none text-[#ffe1ac]"
    >
      {label}
    </span>
  );
}
