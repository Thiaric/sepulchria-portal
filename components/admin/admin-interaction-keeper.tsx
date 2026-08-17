"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

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

function captureState() {
  const details =
    Array.from(
      document.querySelectorAll<HTMLDetailsElement>(
        "details",
      ),
    );

  const active =
    document.activeElement;

  const activeField =
    active instanceof
      HTMLInputElement ||
    active instanceof
      HTMLTextAreaElement ||
    active instanceof
      HTMLSelectElement
      ? active.name || active.id || null
      : null;

  const state: SavedAdminState = {
    pathname:
      window.location.pathname,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    openDetails: details
      .map((entry, index) => ({
        entry,
        key: detailKey(
          entry,
          index,
        ),
      }))
      .filter(
        ({ entry }) =>
          entry.open,
      )
      .map(({ key }) => key),
    activeField,
  };

  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(state),
  );
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
      JSON.parse(raw) as SavedAdminState;
  } catch {
    sessionStorage.removeItem(
      STORAGE_KEY,
    );
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

  if (state.activeField) {
    const candidates =
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
      candidates.find(
        (field) =>
          field.name ===
            state.activeField ||
          field.id ===
            state.activeField,
      );

    target?.focus({
      preventScroll: true,
    });
  }
}

export function AdminInteractionKeeper() {
  const pathname =
    usePathname();

  useEffect(() => {
    if (
      "scrollRestoration" in
      window.history
    ) {
      window.history.scrollRestoration =
        "manual";
    }

    const onSubmit = () => {
      captureState();
    };

    document.addEventListener(
      "submit",
      onSubmit,
      true,
    );

    const firstRestore =
      window.requestAnimationFrame(
        restoreState,
      );

    let restoreFrame:
      | number
      | null = null;

    const observer =
      new MutationObserver(() => {
        if (
          restoreFrame !== null
        ) {
          window.cancelAnimationFrame(
            restoreFrame,
          );
        }

        restoreFrame =
          window.requestAnimationFrame(
            () => {
              restoreState();
              restoreFrame = null;
            },
          );
      });

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true,
      },
    );

    return () => {
      document.removeEventListener(
        "submit",
        onSubmit,
        true,
      );

      window.cancelAnimationFrame(
        firstRestore,
      );

      if (
        restoreFrame !== null
      ) {
        window.cancelAnimationFrame(
          restoreFrame,
        );
      }

      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
