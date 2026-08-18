"use client";

import {
  useLayoutEffect,
} from "react";
import {
  usePathname,
} from "next/navigation";

type SavedAdminState = {
  pathname: string;
  scrollX: number;
  scrollY: number;
  openDetails: string[];
  activeField: string | null;
};

const STORAGE_KEY =
  "sepulchria-admin-interaction-state";

function detailKey(
  details: HTMLDetailsElement,
  index: number,
) {
  if (details.id) {
    return `id:${details.id}`;
  }

  const hiddenId =
    details.querySelector<HTMLInputElement>(
      'input[type="hidden"][name$="Id"], input[type="hidden"][name$="_id"], input[type="hidden"][name="id"]',
    );

  if (hiddenId?.value) {
    return `hidden:${hiddenId.name}:${hiddenId.value}`;
  }

  return `index:${index}`;
}

function restoreState() {
  const raw =
    sessionStorage.getItem(
      STORAGE_KEY,
    );

  if (!raw) {
    return;
  }

  let state:
    | SavedAdminState
    | null = null;

  try {
    state =
      JSON.parse(
        raw,
      ) as SavedAdminState;
  } catch {
    return;
  }

  if (
    !state ||
    state.pathname !==
      window.location.pathname
  ) {
    return;
  }

  const wanted =
    new Set(
      state.openDetails,
    );

  const details =
    Array.from(
      document.querySelectorAll<HTMLDetailsElement>(
        "details",
      ),
    );

  details.forEach(
    (entry, index) => {
      entry.open =
        wanted.has(
          detailKey(
            entry,
            index,
          ),
        );
    },
  );

  window.scrollTo({
    left: state.scrollX,
    top: state.scrollY,
    behavior: "instant",
  });

  if (
    state.activeField
  ) {
    const fields =
      Array.from(
        document.querySelectorAll<
          | HTMLInputElement
          | HTMLTextAreaElement
          | HTMLSelectElement
        >(
          "input, textarea, select",
        ),
      );

    const target =
      fields.find(
        (field) =>
          field.name ===
            state?.activeField ||
          field.id ===
            state?.activeField,
      );

    target?.focus({
      preventScroll: true,
    });
  }
}

export function AdminInteractionKeeper() {
  const pathname =
    usePathname();

  useLayoutEffect(() => {
    if (
      "scrollRestoration" in
      window.history
    ) {
      window.history.scrollRestoration =
        "manual";
    }

    restoreState();
  }, [pathname]);

  return null;
}
