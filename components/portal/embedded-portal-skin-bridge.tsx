"use client";

import { useEffect } from "react";

type PortalSkin =
  | "sepulchria"
  | "moonlit";

const STORAGE_KEY =
  "sepulchria:portal-skin";

function isPortalSkin(
  value: string | null,
): value is PortalSkin {
  return (
    value === "sepulchria" ||
    value === "moonlit"
  );
}

function applySkin(
  skin: PortalSkin,
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
      isPortalSkin(stored)
        ? stored
        : "sepulchria",
    );

    function onStorage(
      event: StorageEvent,
    ) {
      if (
        event.key !== STORAGE_KEY ||
        !isPortalSkin(
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
