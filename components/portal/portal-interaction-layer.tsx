"use client";

import { useEffect } from "react";

type SurfaceKind =
  | "card"
  | "row"
  | "control"
  | "nav";

type SurfaceMatch = {
  element: HTMLElement;
  kind: SurfaceKind;
};

const CONTROL_SELECTOR = [
  "button:not(:disabled)",
  "a[href]",
  '[role="button"]',
].join(", ");

const EXCLUDED_SELECTOR = [
  "input",
  "select",
  "textarea",
  '[contenteditable="true"]',
  '[role="separator"]',
  '[data-sep-interaction-ignore="true"]',
].join(", ");

function classText(
  element: HTMLElement,
) {
  return typeof element.className === "string"
    ? element.className
    : "";
}

function hasVisualFrame(
  element: HTMLElement,
) {
  const classes = classText(element);

  return (
    classes.includes("border") &&
    (
      classes.includes("bg-") ||
      classes.includes("background")
    )
  );
}

function isVisibleCandidate(
  element: HTMLElement,
) {
  const rect =
    element.getBoundingClientRect();

  return (
    rect.width >= 120 &&
    rect.height >= 34 &&
    rect.width > 0 &&
    rect.height > 0
  );
}

function classifyControl(
  element: HTMLElement,
): SurfaceKind {
  if (
    element.closest(
      "[data-portal-navigation]",
    )
  ) {
    return "nav";
  }

  const rect =
    element.getBoundingClientRect();

  if (
    rect.height >= 52 ||
    (
      rect.width >= 240 &&
      rect.height >= 38
    )
  ) {
    return "row";
  }

  return "control";
}

function explicitSurface(
  target: HTMLElement,
): SurfaceMatch | null {
  const explicit =
    target.closest<HTMLElement>(
      "[data-sep-interactive-surface]",
    );

  if (!explicit) {
    return null;
  }

  const requested =
    explicit.dataset
      .sepInteractiveSurface;

  const kind: SurfaceKind =
    requested === "row" ||
    requested === "control" ||
    requested === "nav"
      ? requested
      : "card";

  return {
    element: explicit,
    kind,
  };
}

function resolveSurface(
  target: EventTarget | null,
): SurfaceMatch | null {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  const portal =
    target.closest<HTMLElement>(
      "[data-portal-shell]",
    );

  if (!portal) {
    return null;
  }

  if (
    target.closest(
      '[data-sep-interaction-ignore="true"]',
    )
  ) {
    return null;
  }

  const explicit =
    explicitSurface(target);

  if (explicit) {
    return explicit;
  }

  const control =
    target.closest<HTMLElement>(
      CONTROL_SELECTOR,
    );

  if (
    control &&
    portal.contains(control) &&
    !control.closest(
      '[data-sep-interaction-ignore="true"]',
    )
  ) {
    return {
      element: control,
      kind: classifyControl(control),
    };
  }

  const fixedSurface =
    target.closest<HTMLElement>(
      '[data-sep-interaction-fixed="true"]',
    );

  if (fixedSurface) {
    return null;
  }

  if (
    target.closest(
      EXCLUDED_SELECTOR,
    )
  ) {
    return null;
  }

  const article =
    target.closest<HTMLElement>(
      "article",
    );

  if (
    article &&
    portal.contains(article) &&
    isVisibleCandidate(article) &&
    !article.closest(
      '[data-sep-interaction-ignore="true"]',
    )
  ) {
    return {
      element: article,
      kind: "card",
    };
  }

  const candidates:
    HTMLElement[] = [];

  let current:
    HTMLElement | null = target;

  while (
    current &&
    current !== portal
  ) {
    if (
      current.matches(
        "main, section, nav, aside, header, footer",
      )
    ) {
      current =
        current.parentElement;
      continue;
    }

    if (
      current.matches(
        "div, form, li",
      ) &&
      hasVisualFrame(current)
    ) {
      const rect =
        current.getBoundingClientRect();

      const containsFormField =
        Boolean(
          current.querySelector(
            "input, select, textarea",
          ),
        );

      if (
        rect.width >= 170 &&
        rect.height >= 46 &&
        rect.width <= 1100 &&
        rect.height <= 560 &&
        !containsFormField
      ) {
        candidates.push(
          current,
        );
      }
    }

    if (
      current.hasAttribute(
        "data-portal-column",
      ) ||
      current.getAttribute("role") ===
        "dialog"
    ) {
      break;
    }

    current =
      current.parentElement;
  }

  if (!candidates.length) {
    return null;
  }

  const chosen =
    candidates.reduce(
      (largest, candidate) => {
        const largestRect =
          largest.getBoundingClientRect();

        const candidateRect =
          candidate.getBoundingClientRect();

        return (
          candidateRect.width *
            candidateRect.height >
          largestRect.width *
            largestRect.height
            ? candidate
            : largest
        );
      },
    );

  const rect =
    chosen.getBoundingClientRect();

  return {
    element: chosen,
    kind:
      rect.height <= 110
        ? "row"
        : "card",
  };
}

function strengthFor(
  kind: SurfaceKind,
) {
  switch (kind) {
    case "card":
      return {
        x: 0.72,
        y: 0.86,
      };

    case "row":
      return {
        x: 0.28,
        y: 0.38,
      };

    case "nav":
      return {
        x: 0.08,
        y: 0.12,
      };

    default:
      return {
        x: 0.07,
        y: 0.10,
      };
  }
}

function updatePointer(
  match: SurfaceMatch,
  clientX: number,
  clientY: number,
) {
  const {
    element,
    kind,
  } = match;

  const rect =
    element.getBoundingClientRect();

  if (
    rect.width <= 0 ||
    rect.height <= 0
  ) {
    return;
  }

  const localX =
    Math.min(
      1,
      Math.max(
        0,
        (
          clientX -
          rect.left
        ) /
          rect.width,
      ),
    );

  const localY =
    Math.min(
      1,
      Math.max(
        0,
        (
          clientY -
          rect.top
        ) /
          rect.height,
      ),
    );

  const normalX =
    localX * 2 - 1;

  const normalY =
    localY * 2 - 1;

  const strength =
    strengthFor(kind);

  element.style.setProperty(
    "--sep-interact-x",
    `${(
      localX * 100
    ).toFixed(2)}%`,
  );

  element.style.setProperty(
    "--sep-interact-y",
    `${(
      localY * 100
    ).toFixed(2)}%`,
  );

  element.style.setProperty(
    "--sep-interact-rx",
    `${(
      -normalY *
      strength.x
    ).toFixed(3)}deg`,
  );

  element.style.setProperty(
    "--sep-interact-ry",
    `${(
      normalX *
      strength.y
    ).toFixed(3)}deg`,
  );
}

function activate(
  match: SurfaceMatch,
) {
  match.element.dataset
    .sepInteractionKind =
      match.kind;

  match.element.dataset
    .sepInteractionActive =
      "true";
}

function deactivate(
  element: HTMLElement | null,
) {
  if (!element) {
    return;
  }

  delete element.dataset
    .sepInteractionActive;

  element.style.removeProperty(
    "--sep-interact-rx",
  );

  element.style.removeProperty(
    "--sep-interact-ry",
  );
}

export function PortalInteractionLayer() {
  useEffect(() => {
    let active:
      SurfaceMatch | null = null;

    let frame:
      number | null = null;

    let pointerX = 0;
    let pointerY = 0;

    function commitPointer() {
      frame = null;

      if (!active) {
        return;
      }

      updatePointer(
        active,
        pointerX,
        pointerY,
      );
    }

    function setActive(
      next: SurfaceMatch | null,
    ) {
      if (
        active?.element ===
          next?.element &&
        active?.kind === next?.kind
      ) {
        return;
      }

      deactivate(
        active?.element ?? null,
      );

      active = next;

      if (active) {
        activate(active);
      }
    }

    function handlePointerMove(
      event: PointerEvent,
    ) {
      if (
        event.pointerType ===
          "touch"
      ) {
        return;
      }

      const next =
        resolveSurface(
          event.target,
        );

      setActive(next);

      if (!active) {
        return;
      }

      pointerX =
        event.clientX;

      pointerY =
        event.clientY;

      if (frame === null) {
        frame =
          window.requestAnimationFrame(
            commitPointer,
          );
      }
    }

    function handlePointerOut(
      event: PointerEvent,
    ) {
      if (!active) {
        return;
      }

      const related =
        event.relatedTarget;

      if (
        related instanceof Node &&
        active.element.contains(
          related,
        )
      ) {
        return;
      }

      const next =
        resolveSurface(
          related,
        );

      setActive(next);
    }

    function handleFocusIn(
      event: FocusEvent,
    ) {
      const next =
        resolveSurface(
          event.target,
        );

      if (!next) {
        return;
      }

      setActive(next);

      next.element.style.setProperty(
        "--sep-interact-x",
        "50%",
      );

      next.element.style.setProperty(
        "--sep-interact-y",
        "38%",
      );

      next.element.style.setProperty(
        "--sep-interact-rx",
        "0deg",
      );

      next.element.style.setProperty(
        "--sep-interact-ry",
        "0deg",
      );
    }

    function handleFocusOut(
      event: FocusEvent,
    ) {
      if (!active) {
        return;
      }

      const related =
        event.relatedTarget;

      if (
        related instanceof Node &&
        active.element.contains(
          related,
        )
      ) {
        return;
      }

      deactivate(
        active.element,
      );

      active = null;
    }

    document.addEventListener(
      "pointermove",
      handlePointerMove,
      {
        passive: true,
      },
    );

    document.addEventListener(
      "pointerout",
      handlePointerOut,
      {
        passive: true,
      },
    );

    document.addEventListener(
      "focusin",
      handleFocusIn,
    );

    document.addEventListener(
      "focusout",
      handleFocusOut,
    );

    return () => {
      if (frame !== null) {
        window.cancelAnimationFrame(
          frame,
        );
      }

      deactivate(
        active?.element ?? null,
      );

      document.removeEventListener(
        "pointermove",
        handlePointerMove,
      );

      document.removeEventListener(
        "pointerout",
        handlePointerOut,
      );

      document.removeEventListener(
        "focusin",
        handleFocusIn,
      );

      document.removeEventListener(
        "focusout",
        handleFocusOut,
      );
    };
  }, []);

  return null;
}
