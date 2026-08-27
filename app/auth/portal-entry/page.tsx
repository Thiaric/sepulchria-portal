"use client";

import { useEffect } from "react";

const STORAGE_KEY =
  "sepulchria-portal-instance-id";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function PortalEntryPage() {
  useEffect(() => {
    const instanceId =
      decodeURIComponent(
        window.location.hash.slice(1),
      );

    if (!UUID_PATTERN.test(instanceId)) {
      window.location.replace(
        "/auth/login",
      );
      return;
    }

    window.sessionStorage.setItem(
      STORAGE_KEY,
      instanceId,
    );

    window.history.replaceState(
      null,
      "",
      "/auth/portal-entry",
    );

    window.location.replace("/");
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[rgb(var(--sep-colour-120f0d))] px-6 text-[rgb(var(--sep-colour-e8dcc4))]">
      <p className="font-serif text-lg text-[rgb(var(--sep-colour-d4b27e))]">
        Entering Sepulchria...
      </p>
    </main>
  );
}
