"use client";

import Link from "next/link";
import { Flag } from "lucide-react";
import { useState } from "react";

export type ReportSourceType =
  | "forum_topic"
  | "forum_post"
  | "direct_message"
  | "room_message"
  | "instant_chat_message";

const REASONS = [
  ["child_sexual_content", "Sexual content involving a minor / minor-presenting character"],
  ["child_grooming", "Grooming or sexual solicitation of a minor"],
  ["suicide_self_harm", "Suicide or self-harm encouragement / instructions"],
  ["eating_disorder", "Eating-disorder encouragement / instructions"],
  ["pornographic_media", "Pornographic visual / audiovisual content"],
  ["immediate_safety", "Immediate safety concern"],
  ["harassment", "Harassment / threats / stalking"],
  ["offensive_inappropriate", "Offensive / inappropriate content"],
  ["metagaming_rule_breach", "Metagaming / rule breach"],
  ["spam", "Spam"],
  ["impersonation", "Impersonation"],
  ["sexual_inappropriate", "Other sexual / inappropriate behaviour"],
  ["other", "Other"],
] as const;

export function ReportButton({
  sourceType,
  sourceId,
  label = "Report",
  compact = false,
  toolbar = false,
}: {
  sourceType: ReportSourceType;
  sourceId: string;
  label?: string;
  compact?: boolean;
  toolbar?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("harassment");
  const [explanation, setExplanation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  async function submit() {
    if (busy) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          sourceType,
          sourceId,
          reason,
          explanation: explanation.trim(),
          sourceUrl:
            `${window.location.pathname}${window.location.search}${window.location.hash}`,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Unable to submit this report.",
        );
      }

      setReference(
        typeof payload.reference === "string"
          ? payload.reference
          : null,
      );

      window.dispatchEvent(
        new Event("sepulchria:ticket-notifications-changed"),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to submit this report.",
      );
    } finally {
      setBusy(false);
    }
  }

  function close() {
    if (busy) return;
    setOpen(false);
    setReference(null);
    setError(null);
    setExplanation("");
    setReason("harassment");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={compact ? "Report this content" : undefined}
        aria-label={compact ? "Report this content" : undefined}
        className={
          compact
            ? "inline-flex h-5 w-5 shrink-0 items-center justify-center border border-[rgb(var(--sep-colour-70483f))]/55 bg-[rgb(var(--sep-colour-17110d))] text-[rgb(var(--sep-colour-9b765e))] transition hover:border-[rgb(var(--sep-colour-a65d51))] hover:text-[rgb(var(--sep-colour-e4b0a5))]"
            : toolbar
              ? "border border-[rgb(var(--sep-colour-7b4035))]/80 bg-[rgb(var(--sep-colour-27120f))] px-2.5 py-1.5 text-[7px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-d99b8e))] transition hover:border-[rgb(var(--sep-colour-ad5a4c))] hover:bg-[rgb(var(--sep-colour-391713))] hover:text-[rgb(var(--sep-colour-f1b2a5))]"
              : "border border-[rgb(var(--sep-colour-70483f))]/65 bg-[rgb(var(--sep-colour-211311))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-c99589))] transition hover:border-[rgb(var(--sep-colour-a65d51))] hover:text-[rgb(var(--sep-colour-e4b0a5))]"
        }
      >
        {compact ? <Flag aria-hidden="true" className="h-2.5 w-2.5" /> : label}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Report content"
        >
          <div className="w-full max-w-lg border border-[rgb(var(--sep-colour-73513a))] bg-[rgb(var(--sep-colour-100c09))] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[rgb(var(--sep-colour-59432c))]/45 px-5 py-4">
              <div>
                <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-8c704b))]">
                  Moderation Report
                </p>
                <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-e2c99f))]">
                  Report this content
                </h2>
              </div>

              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="text-lg text-[rgb(var(--sep-colour-907c63))] hover:text-[rgb(var(--sep-colour-d6bf9d))]"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {reference ? (
              <div className="p-5">
                <div className="border border-[rgb(var(--sep-colour-6e7547))]/60 bg-[rgb(var(--sep-colour-182016))] p-4 text-sm leading-6 text-[rgb(var(--sep-colour-c9c99d))]">
                  Your report has been submitted as <strong>{reference}</strong>.
                  The reported content has been preserved for staff review.
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href={`/support/${reference}`}
                    onClick={close}
                    className="border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-261b12))] px-4 py-2.5 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d5b785))]"
                  >
                    Open Report Ticket
                  </Link>
                  <button
                    type="button"
                    onClick={close}
                    className="border border-[rgb(var(--sep-colour-59432c))] px-4 py-2.5 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-a58b68))]"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5 p-5">
                <p className="text-xs leading-6 text-[rgb(var(--sep-colour-9e8c75))]">
                  Choose the reason that best describes the problem. Staff will
                  receive a preserved snapshot of the content as it exists now.
                </p>

                <label className="block">
                  <span className="text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-9d8464))]">
                    Reason
                  </span>
                  <select
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    className="mt-2 h-11 w-full border border-[rgb(var(--sep-colour-60482e))]/60 bg-[rgb(var(--sep-colour-0c0907))] px-3 text-sm text-[rgb(var(--sep-colour-d2c0a5))]"
                  >
                    {REASONS.map(([value, text]) => (
                      <option key={value} value={value}>
                        {text}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-9d8464))]">
                    Additional details · Optional
                  </span>
                  <textarea
                    value={explanation}
                    onChange={(event) => setExplanation(event.target.value)}
                    maxLength={5000}
                    rows={6}
                    className="mt-2 w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/60 bg-[rgb(var(--sep-colour-0c0907))] p-3 text-sm leading-6 text-[rgb(var(--sep-colour-d2c0a5))]"
                    placeholder="Anything staff should know about why you are reporting this?"
                  />
                </label>

                {error ? (
                  <p
                    role="alert"
                    className="border border-red-900/60 bg-red-950/25 p-3 text-xs leading-5 text-red-300"
                  >
                    {error}
                  </p>
                ) : null}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={close}
                    disabled={busy}
                    className="border border-[rgb(var(--sep-colour-59432c))] px-4 py-2.5 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-a58b68))]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void submit()}
                    disabled={busy}
                    className="border border-[rgb(var(--sep-colour-9a5147))] bg-[rgb(var(--sep-colour-351815))] px-4 py-2.5 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-e0a69a))] disabled:opacity-50"
                  >
                    {busy ? "Submitting…" : "Submit Report"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
