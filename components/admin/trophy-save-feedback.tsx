"use client";

import { useEffect, useState } from "react";

export function TrophySaveFeedback({
  type,
  message,
}: {
  type: "success" | "error";
  message: string;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(false);
    }, 5000);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <p
      role={type === "error" ? "alert" : "status"}
      className={
        type === "success"
          ? "mt-2 border border-[rgb(var(--sep-colour-5f704f))]/45 bg-[rgb(var(--sep-colour-11150f))] px-3 py-2 text-[9px] leading-4 text-[rgb(var(--sep-colour-b7c7a8))]"
          : "mt-2 border border-[rgb(var(--sep-colour-7a4a3f))]/45 bg-[rgb(var(--sep-colour-1b100d))] px-3 py-2 text-[9px] leading-4 text-[rgb(var(--sep-colour-c9a398))]"
      }
    >
      {message}
    </p>
  );
}
