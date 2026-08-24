"use client";

import Script from "next/script";
import {
  useCallback,
  useEffect,
  useRef,
} from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (
            token: string,
          ) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      remove: (
        widgetId: string,
      ) => void;
    };
  }
}

type TurnstileWidgetProps = {
  onTokenChange: (
    token: string | null,
  ) => void;
};

export function TurnstileWidget({
  onTokenChange,
}: TurnstileWidgetProps) {
  const containerRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const widgetIdRef =
    useRef<string | null>(null);

  const siteKey =
    process.env
      .NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const renderWidget =
    useCallback(() => {
      if (
        !containerRef.current ||
        !window.turnstile ||
        !siteKey ||
        widgetIdRef.current
      ) {
        return;
      }

      widgetIdRef.current =
        window.turnstile.render(
          containerRef.current,
          {
            sitekey: siteKey,
            theme: "auto",

            callback: (
              token: string,
            ) => {
              onTokenChange(token);
            },

            "expired-callback": () => {
              onTokenChange(null);
            },

            "error-callback": () => {
              onTokenChange(null);
            },
          },
        );
    }, [
      onTokenChange,
      siteKey,
    ]);

  useEffect(() => {
    renderWidget();

    return () => {
      if (
        widgetIdRef.current &&
        window.turnstile
      ) {
        window.turnstile.remove(
          widgetIdRef.current,
        );

        widgetIdRef.current =
          null;
      }
    };
  }, [renderWidget]);

  if (!siteKey) {
    return (
      <div className="border border-red-800/60 bg-red-950/30 px-4 py-3 text-sm text-red-200">
        Turnstile site key is
        missing.
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={renderWidget}
      />

      <div
        ref={containerRef}
        className="flex min-h-[70px] justify-center"
      />
    </>
  );
}