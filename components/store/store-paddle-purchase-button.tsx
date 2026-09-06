"use client";

import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { useActionState, useEffect, useRef, useState } from "react";

import {
  startStorePaddleCheckout,
  type StorePaddleState,
} from "@/app/(portal)/store/actions";

const initialState: StorePaddleState = {
  ok: false,
  error: null,
  checkoutUrl: null,
  transactionId: null,
  customerEmail: null,
};

let paddlePromise: Promise<Paddle | undefined> | null = null;

function getPaddle(): Promise<Paddle | undefined> {
  if (paddlePromise) return paddlePromise;

  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim();

  if (!token) {
    return Promise.reject(
      new Error("Paddle client-side token is not configured."),
    );
  }

  paddlePromise = initializePaddle({
    token,
    environment: token.startsWith("test_") ? "sandbox" : "production",
  });

  return paddlePromise;
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
    if (!state.ok || !state.transactionId || !state.customerEmail) return;
    if (openedTransactionRef.current === state.transactionId) return;

    openedTransactionRef.current = state.transactionId;
    setClientError(null);

    void getPaddle()
      .then((paddle) => {
        if (!paddle) {
          throw new Error("Paddle.js did not initialize.");
        }

        paddle.Checkout.open({
          transactionId: state.transactionId!,
          customer: {
            email: state.customerEmail!,
          },
          settings: {
            allowLogout: false,
          },
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
  }, [state.ok, state.transactionId, state.customerEmail]);

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
