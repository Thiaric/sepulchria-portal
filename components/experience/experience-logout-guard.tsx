"use client";

import { useEffect, useRef, useState } from "react";

import { EXPERIENCE_RATINGS } from "@/lib/experience/experience-ratings";

type StatusPayload = {
  due: boolean;
};

type PromptPayload = {
  due: boolean;
  promptId: string | null;
};

type PendingAction =
  | {
      kind: "anchor";
      element: HTMLAnchorElement;
    }
  | {
      kind: "form";
      form: HTMLFormElement;
      submitter?: HTMLElement | null;
    }
  | {
      kind: "button";
      element: HTMLButtonElement | HTMLInputElement;
    };

const BYPASS_ATTR = "data-experience-logout-bypass";

function normalise(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function elementText(
  element: HTMLElement | HTMLInputElement | HTMLAnchorElement,
) {
  if (element instanceof HTMLInputElement) {
    return normalise(element.value);
  }

  return normalise(
    element.getAttribute("aria-label") ??
      element.getAttribute("title") ??
      element.textContent,
  );
}

function looksLikeLogoutText(value: string) {
  return ["logout", "log out", "sign out", "signout", "exit"].some(
    (token) => value.includes(token),
  );
}

function isLogoutAnchor(element: HTMLAnchorElement) {
  const href = normalise(element.getAttribute("href"));
  return (
    href.includes("logout") ||
    href.includes("signout") ||
    href.includes("sign-out") ||
    looksLikeLogoutText(elementText(element))
  );
}

function isBypassed(element: Element | null) {
  if (!element) {
    return false;
  }

  return element.getAttribute(BYPASS_ATTR) === "1";
}

async function readJson<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export function ExperienceLogoutGuard() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const pendingActionRef = useRef<PendingAction | null>(null);
  const promptIdRef = useRef<string | null>(null);
  const flowLockRef = useRef(false);

  function resetModal() {
    setOpen(false);
    setBusy(false);
    setSelectedRating(null);
    setComment("");
    promptIdRef.current = null;
  }

  function continueLogout() {
    const pending = pendingActionRef.current;
    pendingActionRef.current = null;

    if (!pending) {
      resetModal();
      return;
    }

    if (pending.kind === "anchor") {
      pending.element.setAttribute(BYPASS_ATTR, "1");
      pending.element.click();
      pending.element.removeAttribute(BYPASS_ATTR);
      resetModal();
      return;
    }

    if (pending.kind === "form") {
      pending.form.setAttribute(BYPASS_ATTR, "1");
      pending.form.requestSubmit();
      pending.form.removeAttribute(BYPASS_ATTR);
      resetModal();
      return;
    }

    pending.element.setAttribute(BYPASS_ATTR, "1");
    pending.element.click();
    pending.element.removeAttribute(BYPASS_ATTR);
    resetModal();
  }

  async function maybeStartPrompt(pending: PendingAction) {
    pendingActionRef.current = pending;

    if (flowLockRef.current) {
      return;
    }

    flowLockRef.current = true;

    try {
      const status = await readJson<StatusPayload>(
        "/api/experience-feedback/status",
        {
          method: "GET",
        },
      );

      if (!status.due) {
        continueLogout();
        return;
      }

      const prompt = await readJson<PromptPayload>(
        "/api/experience-feedback/prompt",
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );

      if (!prompt.due || !prompt.promptId) {
        continueLogout();
        return;
      }

      promptIdRef.current = prompt.promptId;
      setOpen(true);
    } catch {
      // Never trap a player in the logout flow.
      continueLogout();
    } finally {
      flowLockRef.current = false;
    }
  }

  async function completePrompt(payload: {
    rating?: number;
    comment?: string;
    skipped?: boolean;
  }) {
    const promptId = promptIdRef.current;

    if (!promptId || busy) {
      return;
    }

    setBusy(true);

    try {
      await readJson(
        "/api/experience-feedback/complete",
        {
          method: "POST",
          body: JSON.stringify({
            promptId,
            rating: payload.rating,
            comment: payload.comment,
            skipped: payload.skipped ?? false,
          }),
        },
      );
    } catch {
      // Ignore analytics errors and still let the player leave.
    } finally {
      continueLogout();
    }
  }

  useEffect(() => {
    function onAnchorClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (isBypassed(anchor) || !isLogoutAnchor(anchor)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      maybeStartPrompt({
        kind: "anchor",
        element: anchor,
      });
    }

    function onSubmit(event: SubmitEvent) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) {
        return;
      }

      if (isBypassed(form)) {
        return;
      }

      const submitter = event.submitter;

      if (!(submitter instanceof HTMLElement)) {
        return;
      }

      if (!looksLikeLogoutText(elementText(submitter as HTMLButtonElement))) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      maybeStartPrompt({
        kind: "form",
        form,
        submitter,
      });
    }

    function onStandaloneButtonClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const button = target.closest("button, input[type=button], input[type=submit]");
      if (
        !(button instanceof HTMLButtonElement) &&
        !(button instanceof HTMLInputElement)
      ) {
        return;
      }

      if (button.form || isBypassed(button)) {
        return;
      }

      if (!looksLikeLogoutText(elementText(button))) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      maybeStartPrompt({
        kind: "button",
        element: button,
      });
    }

    document.addEventListener("click", onAnchorClick, true);
    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("click", onStandaloneButtonClick, true);

    return () => {
      document.removeEventListener("click", onAnchorClick, true);
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("click", onStandaloneButtonClick, true);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        completePrompt({ skipped: true });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, open]);

  const needsCommentStep = selectedRating === 1 || selectedRating === 2;

  if (!open) {
    return null;
  }

  return (
    <div
      data-sep-interaction-ignore="true"
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm"
    >
      <div className="w-full max-w-xl border border-[rgb(var(--sep-colour-6c5434))] bg-[rgb(var(--sep-colour-120d0a))] p-4 shadow-[0_16px_46px_rgba(0,0,0,0.42)] [transform:none!important] sm:p-5">
        <div className="mb-4">
          <p className="text-[10px] tracking-[0.08em] text-[rgb(var(--sep-colour-8d775b))]">
            Session feedback
          </p>
          <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-efd6a3))] sm:text-2xl">
            How was your experience?
          </h2>
          <p className="mt-1.5 max-w-lg text-[12px] leading-5 text-[rgb(var(--sep-colour-c7b493))]">
            A quick check-in helps us understand how your time in Sepulchria felt.
          </p>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {EXPERIENCE_RATINGS.map((rating) => {
            const active = selectedRating === rating.value;
            return (
              <button
                key={rating.value}
                type="button"
                disabled={busy}
                onClick={() => {
                  if (rating.value <= 2) {
                    setSelectedRating(rating.value);
                    return;
                  }

                  completePrompt({ rating: rating.value });
                }}
                className={[
                  "group flex flex-col items-center justify-center gap-1.5 border px-2 py-2.5 transition duration-150",
                  active
                    ? "border-[rgb(var(--sep-colour-d2aa63))] bg-[rgb(var(--sep-colour-201710))] shadow-[0_0_16px_rgba(var(--sep-rgb-177-132-75),0.16)]"
                    : "border-[rgb(var(--sep-colour-5a4630))] bg-[rgb(var(--sep-colour-17110d))] hover:-translate-y-[1px] hover:border-[rgb(var(--sep-colour-977242))] hover:bg-[rgb(var(--sep-colour-221912))] hover:shadow-[0_0_14px_rgba(var(--sep-rgb-177-132-75),0.12)]",
                  busy ? "cursor-wait opacity-60" : "cursor-pointer",
                ].join(" ")}
              >
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-[rgb(var(--sep-colour-6a5437))] bg-[rgb(var(--sep-colour-0e0a08))] p-1.5 sm:h-16 sm:w-16">
                  <img
                    src={rating.imageSrc}
                    alt={rating.label}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="text-center">
                  <p className="text-[11px] text-[rgb(var(--sep-colour-efd6a3))] sm:text-xs">
                    {rating.label}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {needsCommentStep ? (
          <div className="mt-4 border border-[rgb(var(--sep-colour-5a4630))] bg-[rgb(var(--sep-colour-17110d))] p-3 [transform:none!important]">
            <p className="text-sm text-[rgb(var(--sep-colour-efd6a3))]">
              Want to tell us why?
            </p>
            <p className="mt-1 text-[11px] text-[rgb(var(--sep-colour-8d775b))]">
              Optional. Even a short note helps staff understand what needs attention.
            </p>
            <textarea
              value={comment}
              disabled={busy}
              onChange={(event) => setComment(event.target.value.slice(0, 400))}
              rows={4}
              maxLength={400}
              placeholder="Optional comment"
              className="mt-3 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none"
            />
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => completePrompt({ rating: selectedRating ?? undefined })}
                className="border border-[rgb(var(--sep-colour-6a5437))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-cfb486))] [transform:none!important]"
              >
                Skip comment
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  completePrompt({
                    rating: selectedRating ?? undefined,
                    comment,
                  })
                }
                className="border border-[rgb(var(--sep-colour-d2aa63))] bg-[rgb(var(--sep-colour-2a1e14))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-f1ddb4))] [transform:none!important]"
              >
                Send feedback
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={() => completePrompt({ skipped: true })}
            className="border border-[rgb(var(--sep-colour-6a5437))] px-3 py-1.5 text-xs text-[rgb(var(--sep-colour-cfb486))] [transform:none!important]"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
