"use client";

import {
  useCallback,
  useState,
} from "react";

import {
  PortalAppearanceModal,
} from "@/components/portal/portal-appearance-modal";
import {
  usePortalSkin,
} from "@/components/portal/portal-skin-provider";

export function PortalSkinSwitcher() {
  const { selectedSkin } =
    usePortalSkin();

  const [open, setOpen] =
    useState(false);

  const close =
    useCallback(() => {
      setOpen(false);
    }, []);

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setOpen(true)
        }
        aria-label="Portal appearance"
        aria-haspopup="dialog"
        aria-expanded={open}
        title={`Portal appearance - ${selectedSkin}`}
        className="relative flex h-8 w-8 items-center justify-center border border-[rgb(var(--sep-colour-614b31))] bg-[rgb(var(--sep-colour-17120f))] text-base text-[rgb(var(--sep-colour-c69b5c))] transition hover:border-[rgb(var(--sep-colour-977242))] hover:text-[rgb(var(--sep-colour-efd6a3))] sm:h-9 sm:w-9 2xl:h-10 2xl:w-10 2xl:text-lg"
      >

        
        
          ◐

        
      </button>

      <PortalAppearanceModal
        open={open}
        onClose={close}
      />
    </>
  );
}
