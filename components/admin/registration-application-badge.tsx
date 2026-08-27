"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

type RegistrationApplicationBadgeProps = {
  variant: "floating" | "admin-nav";
};

export function RegistrationApplicationBadge({
  variant,
}: RegistrationApplicationBadgeProps) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    const response = await fetch(
      "/api/admin/registration-applications/pending-count",
      {
        cache: "no-store",
      },
    ).catch(() => null);

    if (!response?.ok) {
      setCount(0);
      return;
    }

    const result = await response
      .json()
      .catch(() => ({ count: 0 }));

    setCount(
      Math.max(
        0,
        Number(result.count) || 0,
      ),
    );
  }, []);

  useEffect(() => {
    void refresh();

    const intervalId =
      window.setInterval(
        () => void refresh(),
        20_000,
      );

    const handleFocus = () => {
      void refresh();
    };

    window.addEventListener(
      "focus",
      handleFocus,
    );

    return () => {
      window.clearInterval(
        intervalId,
      );
      window.removeEventListener(
        "focus",
        handleFocus,
      );
    };
  }, [refresh]);

  if (count <= 0) {
    return null;
  }

  const label =
    count > 99
      ? "99+"
      : String(count);

  const title =
    `${count} pending registration application${
      count === 1 ? "" : "s"
    }`;

  const baseClass =
    "inline-flex items-center justify-center rounded-full border border-[rgb(var(--sep-colour-d19a4c))] bg-[rgb(var(--sep-colour-7a291f))] font-bold leading-none text-[rgb(var(--sep-colour-ffe1ac))]";

  if (variant === "floating") {
    return (
      <span
        title={title}
        className={`absolute -left-2 -top-2 h-5 min-w-5 px-1 text-[8px] ${baseClass}`}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      title={title}
      className={`ml-auto h-4 min-w-4 px-1 text-[7px] ${baseClass}`}
    >
      {label}
    </span>
  );
}
