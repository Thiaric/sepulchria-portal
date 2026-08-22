"use client";

import { useEffect } from "react";

const STORAGE_KEY =
  "sepulchria:portal-skin";

function validSkinSlug(
  value: string | null,
): value is string {
  return (
    typeof value === "string" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
      value,
    )
  );
}

function applySkin(
  skin: string,
) {
  document.documentElement.dataset.portalSkin =
    skin;

  document.body.dataset.portalSkin =
    skin;

  document.documentElement.classList.add(
    "portal-skin-scope",
  );

  document.body.classList.add(
    "portal-skin-scope",
  );
}

export function EmbeddedPortalSkinBridge() {
  useEffect(() => {
    const stored =
      window.localStorage.getItem(
        STORAGE_KEY,
      );

    applySkin(
      validSkinSlug(stored)
        ? stored
        : "sepulchria",
    );

    function onStorage(
      event: StorageEvent,
    ) {
      if (
        event.key !== STORAGE_KEY ||
        !validSkinSlug(
          event.newValue,
        )
      ) {
        return;
      }

      applySkin(
        event.newValue,
      );
    }

    window.addEventListener(
      "storage",
      onStorage,
    );

    return () => {
      window.removeEventListener(
        "storage",
        onStorage,
      );
    };
  }, []);

  return null;
}
