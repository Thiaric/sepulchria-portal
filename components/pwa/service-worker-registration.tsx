"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    const register = async () => {
      try {
        const registration =
          await navigator.serviceWorker.register(
            "/sw.js",
            {
              scope: "/",
              updateViaCache: "none",
            },
          );

        await registration.update();
      } catch (error) {
        console.warn(
          "Sepulchria service worker registration failed:",
          error,
        );
      }
    };

    if (document.readyState === "complete") {
      void register();
      return;
    }

    window.addEventListener(
      "load",
      register,
      { once: true },
    );

    return () => {
      window.removeEventListener(
        "load",
        register,
      );
    };
  }, []);

  return null;
}
