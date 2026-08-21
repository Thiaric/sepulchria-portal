"use client";

import { useEffect } from "react";

export function AdminOrdersCollapseEnhancer() {
  useEffect(() => {
    const sections =
      Array.from(
        document.querySelectorAll<HTMLElement>(
          'section[id^="order-"]',
        ),
      ).filter(
        (section) =>
          section.id !== "order-new",
      );

    const cleanups: Array<
      () => void
    > = [];

    for (const section of sections) {
      if (
        section.dataset
          .orderCollapseReady === "true"
      ) {
        continue;
      }

      section.dataset
        .orderCollapseReady = "true";

      const originalChildren =
        Array.from(
          section.childNodes,
        );

      const content =
        document.createElement(
          "div",
        );

      content.dataset
        .orderCollapseContent = "true";
      content.hidden = true;

      for (
        const child
        of originalChildren
      ) {
        content.appendChild(
          child,
        );
      }

      const name =
        section
          .querySelector("h3")
          ?.textContent
          ?.trim() ||
        section.id
          .replace(
            /^order-/,
            "",
          )
          .replaceAll("-", " ");

      const toggle =
        document.createElement(
          "button",
        );

      toggle.type = "button";
      toggle.dataset
        .orderCollapseToggle = "true";

      toggle.className =
        "flex w-full items-center justify-between gap-4 border-b border-transparent bg-[rgb(var(--sep-colour-100c09))] px-5 py-4 text-left transition hover:bg-[rgb(var(--sep-colour-18110d))]";

      const label =
        document.createElement(
          "span",
        );

      label.className =
        "min-w-0 truncate font-serif text-xl text-[rgb(var(--sep-colour-dec69a))]";
      label.textContent = name;

      const arrow =
        document.createElement(
          "span",
        );

      arrow.className =
        "shrink-0 text-sm text-[rgb(var(--sep-colour-9b7446))] transition-transform";
      arrow.textContent = "▼";

      toggle.append(
        label,
        arrow,
      );

      function setOpen(
        open: boolean,
      ) {
        content.hidden = !open;
        toggle.setAttribute(
          "aria-expanded",
          String(open),
        );

        toggle.classList.toggle(
          "border-[rgb(var(--sep-colour-60482e))]/35",
          open,
        );

        arrow.style.transform =
          open
            ? "rotate(180deg)"
            : "";
      }

      const onClick = () => {
        setOpen(
          content.hidden,
        );
      };

      toggle.addEventListener(
        "click",
        onClick,
      );

      section.append(
        toggle,
        content,
      );

      setOpen(false);

      cleanups.push(() => {
        toggle.removeEventListener(
          "click",
          onClick,
        );

        while (
          content.firstChild
        ) {
          section.insertBefore(
            content.firstChild,
            toggle,
          );
        }

        toggle.remove();
        content.remove();

        delete section.dataset
          .orderCollapseReady;
      });
    }

    return () => {
      for (
        const cleanup
        of cleanups.reverse()
      ) {
        cleanup();
      }
    };
  }, []);

  return null;
}
