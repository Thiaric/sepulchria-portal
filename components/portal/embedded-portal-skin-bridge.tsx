"use client";

import {
  readPreferenceStorage,
  writePreferenceStorage,
} from "@/lib/privacy/storage-preferences";

import { useEffect } from "react";

const STORAGE_KEY =
  "sepulchria:portal-skin";

const SKIN_COOKIE_NAME =
  "sepulchria:portal-skin";

function writeSkinCookie(
  skin: string,
) {
  if (!validSkinSlug(skin)) {
    return;
  }

  document.cookie =
    `${SKIN_COOKIE_NAME}=${encodeURIComponent(skin)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

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

  writeSkinCookie(skin);
}

export function EmbeddedPortalSkinBridge() {
  useEffect(() => {
    const stored =
      readPreferenceStorage(
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
