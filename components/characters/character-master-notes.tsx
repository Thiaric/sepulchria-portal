"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type CharacterMasterNotesProps = {
  notes: string | null | undefined;
  expiresAt?: string | null | undefined;
};

const MAX_TIMEOUT_MS = 2_147_000_000;

export function CharacterMasterNotes({
  notes,
  expiresAt = null,
}: CharacterMasterNotesProps) {
  const value = notes?.trim();

  const parsedExpiry = useMemo(() => {
    if (!expiresAt) {
      return null;
    }

    const timestamp =
      new Date(expiresAt).getTime();

    return Number.isNaN(timestamp)
      ? null
      : timestamp;
  }, [expiresAt]);

  const [expired, setExpired] =
    useState(() =>
      parsedExpiry !== null &&
      parsedExpiry <= Date.now(),
    );

  useEffect(() => {
    if (parsedExpiry === null) {
      setExpired(false);
      return;
    }

    let timer:
      | ReturnType<typeof setTimeout>
      | null = null;

    let cancelled = false;

    const scheduleExpiry = () => {
      if (cancelled) {
        return;
      }

      const remaining =
        parsedExpiry - Date.now();

      if (remaining <= 0) {
        setExpired(true);
        return;
      }

      setExpired(false);

      timer = setTimeout(
        scheduleExpiry,
        Math.min(
          remaining,
          MAX_TIMEOUT_MS,
        ),
      );
    };

    scheduleExpiry();

    return () => {
      cancelled = true;

      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [parsedExpiry]);

  if (!value || expired) {
    return null;
  }

  const expiryLabel =
    parsedExpiry === null
      ? "Permanent"
      : `Temporary · expires ${new Intl.DateTimeFormat(
          "en-GB",
          {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          },
        ).format(
          new Date(parsedExpiry),
        )}`;

  return (
    <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/80 p-4 components_characters_character_master_notes_section">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-8c704b))] components_characters_character_master_notes_label">
          Masters&apos; Notes
        </p>

        <p className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-8f8271))]">
          {expiryLabel}
        </p>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-[11px] leading-5 text-[rgb(var(--sep-colour-c9b99d))] components_characters_character_master_notes_text">
        {value}
      </p>
    </section>
  );
}
