"use client";

import {
  readPreferenceStorage,
  writePreferenceStorage,
} from "@/lib/privacy/storage-preferences";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";
import { CosmeticRuntime } from "@/components/cosmetics/cosmetic-runtime";
import { PortalSkinAtmosphere } from "@/components/portal/portal-skin-atmosphere";

export type PortalSkin = string;

type PortalSkinContextValue = {
  skin: PortalSkin;
  selectedSkin: PortalSkin;
  commitSkin: (skin: PortalSkin) => void;
  previewSkin: (skin: PortalSkin) => void;
  endPreview: () => void;
};

const STORAGE_KEY =
  "sepulchria:portal-skin";

const PortalSkinContext =
  createContext<PortalSkinContextValue | null>(null);

function validSkinSlug(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  );
}

function applySkinToDocument(skin: PortalSkin) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.portalSkin =
    skin;

  document.documentElement.classList.add(
    "portal-skin-scope",
  );

  if (document.body) {
    document.body.dataset.portalSkin =
      skin;

    document.body.classList.add(
      "portal-skin-scope",
    );
  }
}


export function PortalSkinProvider({
  children,
}: {
  children: ReactNode;
}) {
const [skin, setSkin] =
  useState<PortalSkin>("sepulchria");

const [selectedSkin, setSelectedSkin] =
  useState<PortalSkin>("sepulchria");

const [isEmbeddedPortal, setIsEmbeddedPortal] =
  useState(false);

  useEffect(() => {
    setIsEmbeddedPortal(
      Boolean(
        document.querySelector(
          '[data-portal-modal-shell="true"]',
        ),
      ),
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    const cached =
      readPreferenceStorage(STORAGE_KEY);

    if (validSkinSlug(cached)) {
      setSkin(cached);
      applySkinToDocument(cached);
    } else {
      applySkinToDocument("sepulchria");
    }

    async function loadAccountSkin() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) {
        return;
      }

      const {
        data: preference,
        error,
      } = await supabase
        .from("user_portal_preferences")
        .select(`
          selected_skin:portal_skins!user_portal_preferences_selected_skin_id_fkey(
            slug
          )
        `)
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (error) {
        console.error(
          "Unable to load portal skin preference:",
          error.message,
        );
        return;
      }

      const relation =
        Array.isArray(preference?.selected_skin)
          ? preference?.selected_skin[0]
          : preference?.selected_skin;

      const resolved =
        validSkinSlug(relation?.slug)
          ? relation.slug
          : "sepulchria";

      setSelectedSkin(resolved);
      setSkin(resolved);
      applySkinToDocument(resolved);

      writePreferenceStorage(
        STORAGE_KEY,
        resolved,
      );
    }

    void loadAccountSkin();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (
        event.key !== STORAGE_KEY ||
        !validSkinSlug(event.newValue)
      ) {
        return;
      }

      setSelectedSkin(event.newValue);
      setSkin(event.newValue);
      applySkinToDocument(event.newValue);
    }

    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function commitSkin(nextSkin: PortalSkin) {
    setSelectedSkin(nextSkin);
    setSkin(nextSkin);
    applySkinToDocument(nextSkin);
    writePreferenceStorage(STORAGE_KEY, nextSkin);
  }

  function previewSkin(nextSkin: PortalSkin) {
    setSkin(nextSkin);
    applySkinToDocument(nextSkin);
  }

  function endPreview() {
    setSkin(selectedSkin);
    applySkinToDocument(selectedSkin);
  }

  const value = useMemo(
    () => ({
      skin,
      selectedSkin,
      commitSkin,
      previewSkin,
      endPreview,
    }),
    [skin, selectedSkin],
  );

  return (
    <PortalSkinContext.Provider value={value}>
      <div className="contents portal-skin-scope">
  {children}
  {isEmbeddedPortal ? <CosmeticRuntime /> : null}
  <PortalSkinAtmosphere skin={skin} />
</div>
    </PortalSkinContext.Provider>
  );
}

export function usePortalSkin() {
  const context = useContext(PortalSkinContext);

  if (!context) {
    throw new Error(
      "usePortalSkin must be used inside PortalSkinProvider.",
    );
  }

  return context;
}
