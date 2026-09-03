#!/usr/bin/env python3
from pathlib import Path

path = Path("components/orders/order-headquarters-manage-menu.tsx")

if not path.exists():
    raise SystemExit(
        "\nPATCH STOPPED: Run this from the sepulchria-portal repository root.\n"
    )

text = path.read_text(encoding="utf-8")

if text.startswith('"use client";'):
    raise SystemExit(
        "\nPATCH STOPPED: This component is already client-side. Send me the current file before re-running.\n"
    )

text = '"use client";\n\n' + text

anchor = '''import {
  InvitationOwnerStateRefresh,
} from "@/components/invitations/invitation-owner-state-refresh";
'''

replacement = '''import {
  InvitationOwnerStateRefresh,
} from "@/components/invitations/invitation-owner-state-refresh";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
'''

if text.count(anchor) != 1:
    raise SystemExit(
        f"\nPATCH STOPPED: import anchor expected 1 match, found {text.count(anchor)}.\n"
    )

text = text.replace(anchor, replacement, 1)

anchor = '''}) {
  return (
    <details className="relative col-span-2 sm:col-auto">
'''

replacement = '''}) {
  const [open, setOpen] =
    useState(false);

  const buttonRef =
    useRef<HTMLButtonElement | null>(
      null,
    );

  const [panelPosition, setPanelPosition] =
    useState({
      right: 12,
      bottom: 72,
    });

  function updatePanelPosition() {
    const button =
      buttonRef.current;

    if (!button) {
      return;
    }

    const rect =
      button.getBoundingClientRect();

    setPanelPosition({
      right: Math.max(
        12,
        window.innerWidth -
          rect.right,
      ),
      bottom: Math.max(
        12,
        window.innerHeight -
          rect.top +
          8,
      ),
    });
  }

  function toggleOpen() {
    if (!open) {
      updatePanelPosition();
    }

    setOpen(
      (current) => !current,
    );
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    const reposition = () =>
      updatePanelPosition();

    const closeOnEscape = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key === "Escape"
      ) {
        setOpen(false);
      }
    };

    window.addEventListener(
      "resize",
      reposition,
    );
    window.addEventListener(
      "scroll",
      reposition,
      true,
    );
    window.addEventListener(
      "keydown",
      closeOnEscape,
    );

    return () => {
      window.removeEventListener(
        "resize",
        reposition,
      );
      window.removeEventListener(
        "scroll",
        reposition,
        true,
      );
      window.removeEventListener(
        "keydown",
        closeOnEscape,
      );
    };
  }, [open]);

  return (
    <div className="relative col-span-2 sm:col-auto">
'''

if text.count(anchor) != 1:
    raise SystemExit(
        f"\nPATCH STOPPED: component opening anchor expected 1 match, found {text.count(anchor)}.\n"
    )

text = text.replace(anchor, replacement, 1)

anchor = '''      <summary className="flex cursor-pointer list-none items-center justify-center border border-[rgb(var(--sep-colour-725c3d))] bg-[rgb(var(--sep-colour-21190f))] px-2 py-1.5 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-d6bb8d))] transition hover:border-[rgb(var(--sep-colour-a17a49))] hover:bg-[rgb(var(--sep-colour-352718))] hover:text-[rgb(var(--sep-colour-f0d6a7))] sm:px-3 sm:text-[9px] sm:tracking-[0.18em] [&::-webkit-details-marker]:hidden">
        Manage Headquarters
      </summary>

      <div className="absolute right-0 top-full z-[120] mt-2 max-h-[72vh] w-[min(92vw,560px)] overflow-y-auto border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-15100d))] p-4 text-left shadow-2xl">
'''

replacement = '''      <button
        ref={buttonRef}
        type="button"
        data-skin-role="primary-control"
        aria-expanded={open}
        onClick={toggleOpen}
        className="flex items-center justify-center border px-2 py-1.5 text-[8px] uppercase tracking-[0.12em] transition sm:px-3 sm:text-[9px] sm:tracking-[0.18em]"
        style={{
          borderColor:
            "rgb(var(--sep-skin-c1, var(--sep-colour-725c3d)) / 0.65)",
          backgroundColor:
            "rgb(var(--sep-colour-21190f))",
          color:
            "rgb(var(--sep-skin-c2, var(--sep-colour-d6bb8d)))",
        }}
      >
        Manage Headquarters
      </button>

      {open &&
      typeof document !==
        "undefined"
        ? createPortal(
      <div
        data-skin-widget="order-headquarters-manage"
        className="fixed z-[9999] max-h-[72vh] w-[min(92vw,560px)] overflow-y-auto border bg-[rgb(var(--sep-colour-15100d))] p-4 text-left shadow-2xl"
        style={{
          right:
            panelPosition.right,
          bottom:
            panelPosition.bottom,
          borderColor:
            "rgb(var(--sep-skin-c1, var(--sep-colour-80613b)) / 0.72)",
        }}
      >
'''

if text.count(anchor) != 1:
    raise SystemExit(
        f"\nPATCH STOPPED: summary/panel anchor expected 1 match, found {text.count(anchor)}.\n"
    )

text = text.replace(anchor, replacement, 1)

anchor = '''      </div>
    </details>
  );
}
'''

replacement = '''      </div>,
            document.body,
          )
        : null}
    </div>
  );
}
'''

if text.count(anchor) != 1:
    raise SystemExit(
        f"\nPATCH STOPPED: component closing anchor expected 1 match, found {text.count(anchor)}.\n"
    )

text = text.replace(anchor, replacement, 1)

path.write_text(
    text,
    encoding="utf-8",
    newline="\n",
)

print("✓ Manage Headquarters is now a real button.")
print("✓ Button follows active --sep-skin-c1 / --sep-skin-c2.")
print("✓ Management panel renders through document.body.")
print("✓ Panel uses z-[9999], bypassing chat composer clipping.")
print("✓ Escape closes it; scroll/resize keeps it positioned.")
print("\nPATCH COMPLETE")
print("\nRun: npm run build")
