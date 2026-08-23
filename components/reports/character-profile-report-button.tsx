"use client";

import Link from "next/link";
import { Flag } from "lucide-react";
import { useState } from "react";

export type CharacterReportField =
  | "bio"
  | "physical"
  | "background"
  | "public_notes"
  | "relationships"
  | "offgame"
  | "profile_picture"
  | "mp3_music";

const FIELDS: ReadonlyArray<{
  key: CharacterReportField;
  label: string;
}> = [
  { key: "bio", label: "Bio" },
  { key: "physical", label: "Physical" },
  { key: "background", label: "Background" },
  { key: "public_notes", label: "Public Notes" },
  { key: "relationships", label: "Relationships" },
  { key: "offgame", label: "Offgame" },
  { key: "profile_picture", label: "Profile picture" },
  { key: "mp3_music", label: "MP3 music" },
];

const REASONS = [
  ["harassment", "Harassment"],
  ["offensive_inappropriate", "Offensive / inappropriate content"],
  ["metagaming_rule_breach", "Metagaming / rule breach"],
  ["spam", "Spam"],
  ["impersonation", "Impersonation"],
  ["sexual_inappropriate", "Sexual / inappropriate behaviour"],
  ["other", "Other"],
] as const;

export function CharacterProfileReportButton({
  characterId,
  availableFields,
}: {
  characterId: string;
  availableFields: CharacterReportField[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CharacterReportField[]>([]);
  const [reason, setReason] = useState("offensive_inappropriate");
  const [explanation, setExplanation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  const available = new Set(availableFields);

  function toggle(field: CharacterReportField) {
    if (!available.has(field) || busy) return;

    setSelected((current) =>
      current.includes(field)
        ? current.filter((item) => item !== field)
        : [...current, field],
    );
  }

  async function submit() {
    if (busy) return;

    if (selected.length === 0) {
      setError("Choose at least one profile field to report.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          sourceType: "character",
          sourceId: characterId,
          fields: selected,
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
            : "Unable to submit this character report.",
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
          : "Unable to submit this character report.",
      );
    } finally {
      setBusy(false);
    }
  }

  function close() {
    if (busy) return;
    setOpen(false);
    setSelected([]);
    setReason("offensive_inappropriate");
    setExplanation("");
    setError(null);
    setReference(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Report character"
        aria-label="Report character"
        className="inline-flex h-[34px] w-[34px] items-center justify-center border border-[rgb(var(--sep-colour-7b4035))] bg-[rgb(var(--sep-colour-24100d))] text-[rgb(var(--sep-colour-d99b8e))] transition hover:bg-[rgb(var(--sep-colour-351713))] hover:text-[rgb(var(--sep-colour-f1b2a5))]"
      >
        <Flag aria-hidden="true" className="h-3.5 w-3.5" />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Report character profile"
        >
          <div className="w-full max-w-xl border border-[rgb(var(--sep-colour-73513a))] bg-[rgb(var(--sep-colour-100c09))] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[rgb(var(--sep-colour-59432c))]/45 px-5 py-4">
              <div>
                <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-8c704b))]">
                  Moderation Report
                </p>
                <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-e2c99f))]">
                  Report character profile
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
                  Every selected profile field has been preserved for staff review.
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
                  Select every profile field that should be reviewed. The current
                  value of each selected field will be preserved as evidence.
                </p>

                <div className="grid gap-2 sm:grid-cols-2">
                  {FIELDS.map((field) => {
                    const enabled = available.has(field.key);
                    const checked = selected.includes(field.key);

                    return (
                      <label
                        key={field.key}
                        className={`flex items-center gap-3 border px-3 py-3 ${
                          enabled
                            ? "cursor-pointer border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))]"
                            : "cursor-not-allowed border-[rgb(var(--sep-colour-40362d))]/35 bg-black/10 opacity-40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!enabled || busy}
                          onChange={() => toggle(field.key)}
                          className="h-4 w-4 accent-[rgb(var(--sep-colour-9a5147))]"
                        />
                        <span className="text-[9px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-c8b18d))]">
                          {field.label}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {availableFields.length === 0 ? (
                  <p className="text-xs text-[rgb(var(--sep-colour-8f8170))]">
                    This character currently has no reportable profile content.
                  </p>
                ) : null}

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
                    rows={5}
                    className="mt-2 w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/60 bg-[rgb(var(--sep-colour-0c0907))] p-3 text-sm leading-6 text-[rgb(var(--sep-colour-d2c0a5))]"
                    placeholder="Anything staff should know about the selected profile content?"
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
                    disabled={busy || selected.length === 0 || availableFields.length === 0}
                    className="border border-[rgb(var(--sep-colour-9a5147))] bg-[rgb(var(--sep-colour-351815))] px-4 py-2.5 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-e0a69a))] disabled:opacity-50"
                  >
                    {busy ? "Submitting…" : "Create Report Ticket"}
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
