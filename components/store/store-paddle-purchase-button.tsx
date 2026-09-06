"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import {
  startStorePaddleCheckout,
  type StorePaddleState,
} from "@/app/(portal)/store/actions";

declare global {
  interface Window {
    Paddle?: {
      Environment: {
        set(environment: "sandbox" | "production"): void;
      };
      Initialize(options: { token: string }): void;
      Checkout: {
        open(options: { transactionId: string }): void;
      };
    };
  }
}

const initialState: StorePaddleState = {
  ok: false,
  error: null,
  checkoutUrl: null,
  transactionId: null,
};

let paddleInitializationPromise: Promise<void> | null = null;

function loadPaddle(): Promise<void> {
  if (paddleInitializationPromise) return paddleInitializationPromise;

  paddleInitializationPromise = new Promise((resolve, reject) => {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim();

    if (!token) {
      reject(new Error("Paddle client-side token is not configured."));
      return;
    }

    const initialize = () => {
      if (!window.Paddle) {
        reject(new Error("Paddle.js did not load."));
        return;
      }

      try {
        if (token.startsWith("test_")) {
          window.Paddle.Environment.set("sandbox");
        }

        window.Paddle.Initialize({ token });
        resolve();
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error("Paddle could not initialize."),
        );
      }
    };

    if (window.Paddle) {
      initialize();
      return;
    }

    const src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    const existing =
      document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);

    if (existing) {
      existing.addEventListener("load", initialize, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Paddle.js could not be loaded.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener("load", initialize, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Paddle.js could not be loaded.")),
      { once: true },
    );
    document.head.appendChild(script);
  });

  return paddleInitializationPromise;
}

export function StorePaddlePurchaseButton({
  productId,
  label,
}: {
  productId: string;
  label: string;
}) {
  const [state, action, pending] = useActionState(
    startStorePaddleCheckout,
    initialState,
  );
  const [clientError, setClientError] = useState<string | null>(null);
  const openedTransactionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!state.ok || !state.transactionId) return;
    if (openedTransactionRef.current === state.transactionId) return;

    openedTransactionRef.current = state.transactionId;
    setClientError(null);

    void loadPaddle()
      .then(() => {
        if (!window.Paddle) {
          throw new Error("Paddle.js did not initialize.");
        }

        window.Paddle.Checkout.open({
          transactionId: state.transactionId!,
        });
      })
      .catch((error) => {
        openedTransactionRef.current = null;
        setClientError(
          error instanceof Error
            ? error.message
            : "Paddle checkout could not be opened.",
        );
      });
  }, [state.ok, state.transactionId]);

  return (
    <form action={action} className="mt-2">
      <input type="hidden" name="productId" value={productId} />

      <button
        type="submit"
        disabled={pending}
        className="w-full border border-[rgb(var(--sep-colour-987344))]/70 bg-[rgb(var(--sep-colour-2a1d12))] px-3 py-2 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd9aa))] transition hover:border-[rgb(var(--sep-colour-b78b50))] disabled:cursor-wait disabled:opacity-55"
      >
        {pending ? "Opening checkout..." : `Buy for ${label}`}
      </button>

      {state.error || clientError ? (
        <p className="mt-2 text-[9px] leading-4 text-red-300">
          {state.error ?? clientError}
        </p>
      ) : null}
    </form>
  );
}
