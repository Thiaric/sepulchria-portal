"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

const DISMISS_KEY =
  "sepulchria:pwa-install-dismissed-at";

const DISMISS_FOR_MS =
  7 * 24 * 60 * 60 * 1000;

const SHOW_DELAY_MS = 6000;

function isStandalone() {
  const navigatorWithStandalone =
    navigator as Navigator & {
      standalone?: boolean;
    };

  return (
    window.matchMedia(
      "(display-mode: standalone)",
    ).matches ||
    navigatorWithStandalone.standalone ===
      true
  );
}

function isMobileDevice() {
  const navigatorWithUAData =
    navigator as Navigator & {
      userAgentData?: {
        mobile?: boolean;
      };
    };

  if (
    typeof navigatorWithUAData.userAgentData
      ?.mobile === "boolean"
  ) {
    return navigatorWithUAData.userAgentData
      .mobile;
  }

  return /Android|iPhone|iPad|iPod|Mobile/i.test(
    navigator.userAgent,
  );
}

function isIosDevice() {
  return /iPhone|iPad|iPod/i.test(
    navigator.userAgent,
  );
}

function wasDismissedRecently() {
  try {
    const raw =
      window.localStorage.getItem(
        DISMISS_KEY,
      );

    if (!raw) {
      return false;
    }

    const dismissedAt = Number(raw);

    return (
      Number.isFinite(dismissedAt) &&
      Date.now() - dismissedAt <
        DISMISS_FOR_MS
    );
  } catch {
    return false;
  }
}

function rememberDismissal() {
  try {
    window.localStorage.setItem(
      DISMISS_KEY,
      String(Date.now()),
    );
  } catch {
    // Storage may be unavailable.
  }
}

export function PwaInstallPrompt() {
  const [visible, setVisible] =
    useState(false);

  const [ios, setIos] = useState(false);

  const [
    deferredPrompt,
    setDeferredPrompt,
  ] =
    useState<BeforeInstallPromptEvent | null>(
      null,
    );

  useEffect(() => {
    if (
      !isMobileDevice() ||
      isStandalone() ||
      wasDismissedRecently()
    ) {
      return;
    }

    const isIos = isIosDevice();
    setIos(isIos);

    let showTimer:
      | ReturnType<typeof setTimeout>
      | null = null;

    const scheduleShow = () => {
      if (showTimer) {
        return;
      }

      showTimer = setTimeout(() => {
        if (!isStandalone()) {
          setVisible(true);
        }
      }, SHOW_DELAY_MS);
    };

    const handleBeforeInstallPrompt = (
      event: Event,
    ) => {
      event.preventDefault();

      setDeferredPrompt(
        event as BeforeInstallPromptEvent,
      );

      scheduleShow();
    };

    const handleInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt,
    );

    window.addEventListener(
      "appinstalled",
      handleInstalled,
    );

    /*
     * iOS does not provide beforeinstallprompt.
     * Show our own Add to Home Screen guidance.
     */
    if (isIos) {
      scheduleShow();
    }

    return () => {
      if (showTimer) {
        clearTimeout(showTimer);
      }

      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );

      window.removeEventListener(
        "appinstalled",
        handleInstalled,
      );
    };
  }, []);

  function dismiss() {
    rememberDismissal();
    setVisible(false);
  }

  async function install() {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();

    const choice =
      await deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
      setVisible(false);
    } else {
      dismiss();
    }

    setDeferredPrompt(null);
  }

  if (
    !visible ||
    (!ios && !deferredPrompt)
  ) {
    return null;
  }

  return (
    <div
      className="
        fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))]
        z-[120]
        mx-auto max-w-md
        border border-[rgb(var(--sep-colour-60482e))]/70
        bg-[rgb(var(--sep-colour-100c09))]/[0.98]
        p-4
        shadow-[0_16px_55px_rgba(var(--sep-rgb-0-0-0),0.7)]
        backdrop-blur
        lg:hidden
      "
      role="dialog"
      aria-label="Install Sepulchria"
    >
      <div className="flex items-start gap-3">
        <img
          src="/icons/pwa/icon-192.png"
          alt=""
          aria-hidden="true"
          className="h-11 w-11 shrink-0"
        />

        <div className="min-w-0 flex-1">
          <p className="font-serif text-base text-[rgb(var(--sep-colour-ecd9b2))]">
            Install Sepulchria
          </p>

          <p className="mt-1 text-[10px] leading-4 text-[rgb(var(--sep-colour-a99a84))]">
            {ios
              ? "Add Sepulchria to your Home Screen for faster access and an app-like experience."
              : "Install Sepulchria on your phone for faster access and an app-like experience."}
          </p>

          {ios ? (
            <p className="mt-2 text-[10px] leading-4 text-[rgb(var(--sep-colour-c6ab80))]">
              Tap Share, then choose
              {" "}
              <span className="font-semibold">
                Add to Home Screen
              </span>
              .
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {!ios ? (
              <button
                type="button"
                onClick={() => {
                  void install();
                }}
                className="
                  border border-[rgb(var(--sep-colour-987344))]
                  bg-[rgb(var(--sep-colour-3b2919))]
                  px-4 py-2
                  text-[9px] uppercase tracking-[0.18em]
                  text-[rgb(var(--sep-colour-efd6a8))]
                  transition
                  hover:border-[rgb(var(--sep-colour-b98c50))]
                  hover:bg-[rgb(var(--sep-colour-50371f))]
                "
              >
                Install
              </button>
            ) : null}

            <button
              type="button"
              onClick={dismiss}
              className="
                border border-[rgb(var(--sep-colour-60482e))]/55
                bg-[rgb(var(--sep-colour-15100d))]
                px-4 py-2
                text-[9px] uppercase tracking-[0.18em]
                text-[rgb(var(--sep-colour-b8a98f))]
                transition
                hover:border-[rgb(var(--sep-colour-987344))]
                hover:text-[rgb(var(--sep-colour-ead2a5))]
              "
            >
              {ios ? "Got it" : "Not now"}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="
            flex h-8 w-8 shrink-0 items-center justify-center
            border border-[rgb(var(--sep-colour-60482e))]/45
            bg-[rgb(var(--sep-colour-17120f))]
            text-base text-[rgb(var(--sep-colour-a99b89))]
          "
        >
          ×
        </button>
      </div>
    </div>
  );
}
