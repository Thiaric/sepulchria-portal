"use client";

import { useEffect } from "react";

type ManagedModalState = {
  dialog: HTMLElement;
  frame: HTMLElement;
  toggle: HTMLButtonElement;
  restoredOnce: boolean;
  savedWidth: string | null;
  savedHeight: string | null;
};

const managed = new WeakMap<HTMLElement, ManagedModalState>();

function isBackdropElement(element: HTMLElement): boolean {
  const classes = element.className;

  if (typeof classes !== "string") {
    return false;
  }

  return (
    element.tagName === "BUTTON" &&
    classes.includes("absolute") &&
    classes.includes("inset-0")
  );
}

function resolveFrame(dialog: HTMLElement): HTMLElement {
  const directChildren = Array.from(dialog.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement &&
      !isBackdropElement(child),
  );

  const semanticFrame = directChildren.find((child) =>
    child.matches("section, article"),
  );

  if (semanticFrame) {
    return semanticFrame;
  }

  const borderedFrame = directChildren.find((child) => {
    const classes = child.className;

    return (
      typeof classes === "string" &&
      (
        classes.split(/\s+/).includes("border") ||
        classes.includes("max-w-") ||
        classes.includes("shadow-")
      )
    );
  });

  if (borderedFrame) {
    return borderedFrame;
  }

  return directChildren[0] ?? dialog;
}

function findControl(
  frame: HTMLElement,
  kind: "minimize" | "close",
): HTMLButtonElement | null {
  const buttons = Array.from(
    frame.querySelectorAll<HTMLButtonElement>("button"),
  );

  return (
    buttons.find((button) => {
      const text = [
        button.getAttribute("aria-label"),
        button.getAttribute("title"),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (kind === "minimize") {
        return text.includes("minimize") || text.includes("minimise");
      }

      return text.includes("close");
    }) ?? null
  );
}

function setToggleAppearance(
  state: ManagedModalState,
  maximized: boolean,
) {
  state.toggle.textContent = maximized ? "❐" : "□";
  state.toggle.setAttribute(
    "aria-label",
    maximized ? "Restore modal size" : "Maximize modal",
  );
  state.toggle.setAttribute(
    "title",
    maximized ? "Restore size" : "Maximize",
  );
  state.toggle.setAttribute(
    "aria-pressed",
    maximized ? "true" : "false",
  );
}

function setMaximized(
  state: ManagedModalState,
  maximized: boolean,
) {
  state.dialog.dataset.sepModalMaximized =
    maximized ? "true" : "false";

  state.frame.dataset.sepModalMaximized =
    maximized ? "true" : "false";

  if (!maximized) {
    if (
      state.restoredOnce &&
      state.savedWidth &&
      state.savedHeight
    ) {
      state.frame.style.width = state.savedWidth;
      state.frame.style.height = state.savedHeight;
    }

    state.restoredOnce = true;
  }

  setToggleAppearance(state, maximized);
}

function createToggle(
  dialog: HTMLElement,
  frame: HTMLElement,
): HTMLButtonElement {
  const existing =
    frame.querySelector<HTMLButtonElement>(
      "button[data-sep-modal-size-toggle='true']",
    );

  if (existing) {
    return existing;
  }

  const toggle = document.createElement("button");

  toggle.type = "button";
  toggle.dataset.sepModalSizeToggle = "true";

  const minimize = findControl(frame, "minimize");
  const close = findControl(frame, "close");
  const visualSibling = minimize ?? close;

  // Match the modal's EXISTING control geometry exactly.
  if (visualSibling) {
    toggle.className =
      `${visualSibling.className} sep-modal-size-toggle`;
  } else {
    toggle.className =
      "sep-modal-size-toggle sep-modal-size-toggle--fallback";
  }

  if (minimize?.parentElement) {
    minimize.insertAdjacentElement(
      "afterend",
      toggle,
    );
  } else if (close?.parentElement) {
    close.parentElement.insertBefore(
      toggle,
      close,
    );
  } else {
    toggle.dataset.sepModalToggleFloating = "true";
    frame.appendChild(toggle);
  }

  return toggle;
}

function manageDialog(dialog: HTMLElement) {
  const previous = managed.get(dialog);

  if (
    previous &&
    previous.toggle.isConnected &&
    previous.frame.isConnected
  ) {
    return;
  }

  const frame = resolveFrame(dialog);
  const toggle = createToggle(dialog, frame);

  dialog.dataset.sepManagedModal = "true";
  frame.dataset.sepManagedModalFrame = "true";

  const state: ManagedModalState = {
    dialog,
    frame,
    toggle,
    restoredOnce: false,
    savedWidth: null,
    savedHeight: null,
  };

  managed.set(dialog, state);

  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    const isMaximized =
      dialog.dataset.sepModalMaximized === "true";

    if (!isMaximized) {
      const rect =
        frame.getBoundingClientRect();

      state.savedWidth = `${Math.round(rect.width)}px`;
      state.savedHeight = `${Math.round(rect.height)}px`;

      setMaximized(state, true);
      return;
    }

    setMaximized(state, false);
  });

  // Every modal opens maximized by default.
  setMaximized(state, true);
}

function scanForModals() {
  const dialogs = Array.from(
    document.querySelectorAll<HTMLElement>(
      '[role="dialog"], [aria-modal="true"]',
    ),
  );

  dialogs.forEach((dialog) => {
    /* Explicit modal exceptions retain their own original implementation. */
    if (
      dialog.hasAttribute(
        "data-sep-modal-exempt",
      )
    ) {
      return;
    }

    /*
     * PublicPageModal owns its own drag/resize/minimize/maximize state.
     * Never apply the generic viewport manager to those native windows.
     */
    if (
      dialog.dataset.sepNativeWindow ===
      "true"
    ) {
      return;
    }

    // If an aria-modal node is inside a role=dialog parent, manage only
    // the outer modal root once.
    const parentDialog = dialog.parentElement?.closest<HTMLElement>(
      '[role="dialog"], [aria-modal="true"]',
    );

    if (parentDialog) {
      return;
    }

    manageDialog(dialog);
  });
}

export function PortalModalViewportManager() {
  useEffect(() => {
    scanForModals();

    const observer = new MutationObserver(() => {
      scanForModals();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return null;
}
