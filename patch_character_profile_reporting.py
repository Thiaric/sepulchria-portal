#!/usr/bin/env python3
from pathlib import Path
import argparse
import subprocess

BASELINE = "2dc9c00632bfa78c295fb77de1f4569f430fdc46"

FILES = [
    "app/(portal)/api/reports/route.ts",
    "app/(portal)/characters/[slug]/page.tsx",
    "components/characters/public-character-profile.tsx",
    "app/(portal)/admin/tickets/[reference]/page.tsx",
    "components/sanctions/sanction-evidence.tsx",
]

NEW_FILE = "components/reports/character-profile-report-button.tsx"


def die(message):
    raise SystemExit(f"ERROR: {message}. Nothing written.")


def baseline_text(path):
    try:
        return subprocess.check_output(
            ["git", "show", f"{BASELINE}:{path}"],
            text=True,
            encoding="utf-8",
        )
    except subprocess.CalledProcessError:
        die(f"could not read {path} from baseline commit")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        die(f"{label}: expected exact baseline block once, found {count}")
    return text.replace(old, new, 1)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    root = Path.cwd()
    if not (root / "package.json").exists():
        die("run this from the sepulchria-portal root")

    head = subprocess.check_output(
        ["git", "rev-parse", "HEAD"],
        text=True,
    ).strip()

    if head != BASELINE:
        die(f"HEAD is {head}; expected {BASELINE}")

    if (root / NEW_FILE).exists():
        die(f"{NEW_FILE} already exists")

    out = {path: baseline_text(path) for path in FILES}

    # API route -------------------------------------------------------
    p = "app/(portal)/api/reports/route.ts"
    s = out[p]

    s = replace_once(
        s,
        '  "instant_chat_message",\n] as const;',
        '  "instant_chat_message",\n  "character",\n] as const;',
        "report source allowlist",
    )

    reasons_anchor = '''const REASONS = [
  "harassment",
  "offensive_inappropriate",
  "metagaming_rule_breach",
  "spam",
  "impersonation",
  "sexual_inappropriate",
  "other",
] as const;
'''
    reasons_replacement = reasons_anchor + '''
const CHARACTER_PROFILE_FIELDS = {
  bio: {
    label: "Bio",
    column: "personality",
    valueType: "text",
  },
  physical: {
    label: "Physical",
    column: "physical_description",
    valueType: "text",
  },
  background: {
    label: "Background",
    column: "biography",
    valueType: "text",
  },
  public_notes: {
    label: "Public Notes",
    column: "public_notes",
    valueType: "text",
  },
  relationships: {
    label: "Relationships",
    column: "relationships",
    valueType: "text",
  },
  offgame: {
    label: "Offgame",
    column: "offgame",
    valueType: "text",
  },
  profile_picture: {
    label: "Profile picture",
    column: "portrait_url",
    valueType: "image_url",
  },
  mp3_music: {
    label: "MP3 music",
    column: "music_url",
    valueType: "audio_url",
  },
} as const;

type CharacterProfileField =
  keyof typeof CHARACTER_PROFILE_FIELDS;

function isCharacterProfileField(
  value: unknown,
): value is CharacterProfileField {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(
      CHARACTER_PROFILE_FIELDS,
      value,
    )
  );
}
'''
    s = replace_once(
        s,
        reasons_anchor,
        reasons_replacement,
        "character report field metadata",
    )

    branch_anchor = '''  let contextSnapshot: Record<string, unknown> = {};

  if (sourceType === "forum_post") {'''
    branch_replacement = '''  let contextSnapshot: Record<string, unknown> = {};

  let characterProfileEvidence: Array<{
    key: CharacterProfileField;
    label: string;
    column: string;
    valueType: string;
    value: string;
  }> = [];

  if (sourceType === "character") {
    const requestedFields = Array.from(
      new Set(
        (Array.isArray(body?.fields) ? body.fields : [])
          .filter(isCharacterProfileField),
      ),
    );

    if (requestedFields.length === 0) {
      return NextResponse.json(
        { error: "Choose at least one character profile field to report." },
        { status: 400 },
      );
    }

    const { data: target, error } = await admin
      .from("characters")
      .select(
        "id,user_id,public_slug,display_name,first_name,surname,status,is_system,personality,physical_description,biography,public_notes,relationships,offgame,portrait_url,music_url,updated_at",
      )
      .eq("id", sourceId)
      .maybeSingle();

    if (
      error ||
      !target ||
      target.status !== "approved" ||
      target.is_system
    ) {
      return NextResponse.json(
        { error: "This character profile is unavailable." },
        { status: 404 },
      );
    }

    if (
      target.user_id === user.id ||
      target.id === reporterCharacter.id
    ) {
      return NextResponse.json(
        { error: "You cannot report your own character profile." },
        { status: 400 },
      );
    }

    const fieldValues: Record<CharacterProfileField, string> = {
      bio: target.personality ?? "",
      physical: target.physical_description ?? "",
      background: target.biography ?? "",
      public_notes: target.public_notes ?? "",
      relationships: target.relationships ?? "",
      offgame: target.offgame ?? "",
      profile_picture: target.portrait_url ?? "",
      mp3_music: target.music_url ?? "",
    };

    characterProfileEvidence = requestedFields.map((key) => {
      const meta = CHARACTER_PROFILE_FIELDS[key];

      return {
        key,
        label: meta.label,
        column: meta.column,
        valueType: meta.valueType,
        value: fieldValues[key].trim(),
      };
    });

    const emptySelection =
      characterProfileEvidence.find(
        (item) => !item.value,
      );

    if (emptySelection) {
      return NextResponse.json(
        {
          error: `${emptySelection.label} does not currently contain reportable content.`,
        },
        { status: 400 },
      );
    }

    const first = characterProfileEvidence[0];

    authorUserId = target.user_id ?? null;
    authorCharacterId = target.id;
    authorName =
      target.display_name?.trim() ||
      [target.first_name, target.surname]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      "Unknown character";

    contentSnapshot = first.value;
    originalCreatedAt = target.updated_at;

    sourceContext = {
      ...sourceContext,
      character_id: target.id,
      public_slug: target.public_slug,
      selected_fields: characterProfileEvidence.map(
        (item) => ({
          key: item.key,
          label: item.label,
        }),
      ),
    };

    contextSnapshot = {
      character_profile_field: first.key,
      character_profile_field_label: first.label,
      character_profile_column: first.column,
      value_type: first.valueType,
      public_slug: target.public_slug,
    };
  } else if (sourceType === "forum_post") {'''
    s = replace_once(
        s,
        branch_anchor,
        branch_replacement,
        "character report source branch",
    )

    success_anchor = '''  if (!created?.public_reference) {
    return NextResponse.json(
      { error: "The report could not be created." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    reference: created.public_reference,
  });'''
    success_replacement = '''  if (!created?.public_reference) {
    return NextResponse.json(
      { error: "The report could not be created." },
      { status: 500 },
    );
  }

  if (
    sourceType === "character" &&
    characterProfileEvidence.length > 1
  ) {
    const { data: createdTicket, error: ticketLookupError } =
      await admin
        .from("tickets")
        .select("id")
        .eq("public_reference", created.public_reference)
        .maybeSingle();

    if (ticketLookupError || !createdTicket) {
      return NextResponse.json(
        {
          error:
            "The report was created, but its additional profile evidence could not be attached.",
          reference: created.public_reference,
        },
        { status: 500 },
      );
    }

    const { data: createdReport, error: reportLookupError } =
      await admin
        .from("reports")
        .select("id")
        .eq("ticket_id", createdTicket.id)
        .maybeSingle();

    if (reportLookupError || !createdReport) {
      return NextResponse.json(
        {
          error:
            "The report was created, but its additional profile evidence could not be attached.",
          reference: created.public_reference,
        },
        { status: 500 },
      );
    }

    const additionalEvidence =
      characterProfileEvidence.slice(1).map((item) => ({
        ticket_id: createdTicket.id,
        report_id: createdReport.id,
        evidence_type: "character_profile_field",
        source_type: "character",
        source_id: sourceId,
        author_user_id: authorUserId,
        author_character_id: authorCharacterId,
        author_name_snapshot: authorName,
        content_snapshot: item.value,
        original_created_at: originalCreatedAt,
        context_snapshot: {
          character_profile_field: item.key,
          character_profile_field_label: item.label,
          character_profile_column: item.column,
          value_type: item.valueType,
          public_slug:
            typeof sourceContext.public_slug === "string"
              ? sourceContext.public_slug
              : null,
        },
      }));

    const { error: additionalEvidenceError } =
      await admin
        .from("report_evidence")
        .insert(additionalEvidence);

    if (additionalEvidenceError) {
      return NextResponse.json(
        {
          error:
            "The report was created, but not all selected profile evidence could be attached.",
          reference: created.public_reference,
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    reference: created.public_reference,
  });'''
    s = replace_once(
        s,
        success_anchor,
        success_replacement,
        "multiple character evidence rows",
    )
    out[p] = s

    # Public route ----------------------------------------------------
    p = "app/(portal)/characters/[slug]/page.tsx"
    s = out[p]
    s = replace_once(
        s,
        '''        canBlock={
          Boolean(activeCharacter) &&
          activeCharacter?.id !==
            character.id &&
          !targetIsStaff
        }
        blockedByViewer={blockedByViewer}''',
        '''        canBlock={
          Boolean(activeCharacter) &&
          activeCharacter?.id !==
            character.id &&
          !targetIsStaff
        }
        canReport={
          Boolean(activeCharacter) &&
          activeCharacter?.id !== character.id
        }
        blockedByViewer={blockedByViewer}''',
        "public route canReport",
    )
    out[p] = s

    # Public profile --------------------------------------------------
    p = "components/characters/public-character-profile.tsx"
    s = out[p]
    s = replace_once(
        s,
        'import { PublicCharacterOrder } from "@/components/characters/public-character-order";',
        'import { PublicCharacterOrder } from "@/components/characters/public-character-order";\nimport { CharacterProfileReportButton } from "@/components/reports/character-profile-report-button";',
        "character report import",
    )
    s = replace_once(
        s,
        '''  canBlock: boolean;
  blockedByViewer: boolean;''',
        '''  canBlock: boolean;
  canReport: boolean;
  blockedByViewer: boolean;''',
        "character report prop type",
    )
    s = replace_once(
        s,
        '''  canBlock,
  blockedByViewer,''',
        '''  canBlock,
  canReport,
  blockedByViewer,''',
        "character report prop destructure",
    )
    s = replace_once(
        s,
        '''          {hasGlobalBlock && !blockedByViewer ? (
            <span className="inline-flex items-center border border-[rgb(var(--sep-colour-60482e))]/55 px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-8f8170))]">
              Communication unavailable
            </span>
          ) : null}''',
        '''          {canReport ? (
            <CharacterProfileReportButton
              characterId={character.id}
              availableFields={[
                ...(character.personality?.trim() ? ["bio" as const] : []),
                ...(character.physical_description?.trim() ? ["physical" as const] : []),
                ...(character.biography?.trim() ? ["background" as const] : []),
                ...(character.public_notes?.trim() ? ["public_notes" as const] : []),
                ...(character.relationships?.trim() ? ["relationships" as const] : []),
                ...(character.offgame?.trim() ? ["offgame" as const] : []),
                ...(character.portrait_url?.trim() ? ["profile_picture" as const] : []),
                ...(character.music_url?.trim() ? ["mp3_music" as const] : []),
              ]}
            />
          ) : null}

          {hasGlobalBlock && !blockedByViewer ? (
            <span className="inline-flex items-center border border-[rgb(var(--sep-colour-60482e))]/55 px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-8f8170))]">
              Communication unavailable
            </span>
          ) : null}''',
        "character report button placement",
    )
    out[p] = s

    # Admin ticket evidence ------------------------------------------
    p = "app/(portal)/admin/tickets/[reference]/page.tsx"
    s = out[p]
    object_anchor = '''function objectRecord(
  value: unknown,
): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}
'''
    s = replace_once(
        s,
        object_anchor,
        object_anchor + '''
function characterProfileFieldLabel(
  value: unknown,
): string | null {
  const record = objectRecord(value);
  return typeof record?.character_profile_field_label === "string"
    ? record.character_profile_field_label
    : null;
}
''',
        "admin evidence field-label helper",
    )
    s = replace_once(
        s,
        '''                  {report.source_type === "forum_topic" ||
                  report.source_type === "forum_post"
                    ? "Open Original Source"
                    : "Open Communication Logs"}''',
        '''                  {report.source_type === "forum_topic" ||
                  report.source_type === "forum_post"
                    ? "Open Original Source"
                    : report.source_type === "character"
                      ? "Open Character Profile"
                      : "Open Communication Logs"}''',
        "admin character source link label",
    )
    s = replace_once(
        s,
        '                        Evidence #{index + 1} · {sourceLabel(item.source_type)}',
        '                        Evidence #{index + 1} · {characterProfileFieldLabel(item.context_snapshot) ?? sourceLabel(item.source_type)}',
        "admin evidence profile heading",
    )
    s = replace_once(
        s,
        '''                        Original content
                        {item.author_name_snapshot''',
        '''                        {characterProfileFieldLabel(item.context_snapshot)
                          ? `Preserved ${characterProfileFieldLabel(item.context_snapshot)}`
                          : "Original content"}
                        {item.author_name_snapshot''',
        "admin evidence original-content label",
    )
    out[p] = s

    # Sanction evidence ----------------------------------------------
    p = "components/sanctions/sanction-evidence.tsx"
    s = out[p]
    label_anchor = '''function label(value: string | null) {
  return (value ?? "content")
    .replaceAll("_", " ")
    .replace(/\\b\\w/g, (letter) => letter.toUpperCase());
}
'''
    s = replace_once(
        s,
        label_anchor,
        label_anchor + '''
function characterProfileFieldLabel(
  value: unknown,
): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  return typeof record.character_profile_field_label === "string"
    ? record.character_profile_field_label
    : null;
}
''',
        "sanction evidence field-label helper",
    )
    s = replace_once(
        s,
        '                  Evidence #{index + 1} · {label(item.source_type)}',
        '                  Evidence #{index + 1} · {characterProfileFieldLabel(item.context_snapshot) ?? label(item.source_type)}',
        "sanction evidence profile heading",
    )
    s = replace_once(
        s,
        '''                  Original content
                  {item.author_name_snapshot''',
        '''                  {characterProfileFieldLabel(item.context_snapshot)
                    ? `Preserved ${characterProfileFieldLabel(item.context_snapshot)}`
                    : "Original content"}
                  {item.author_name_snapshot''',
        "sanction evidence original-content label",
    )
    out[p] = s

    # New report panel ------------------------------------------------
    out[NEW_FILE] = '''"use client";

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
'''

    print("Baseline:", head[:7])
    print("Prepared character-profile reporting changes:")
    for path in [*FILES, NEW_FILE]:
        print(" ", path.replace("/", "\\"))

    if args.dry_run:
        print("\nDRY RUN ONLY — no project files written.")
        return

    for rel, content in out.items():
        target = root / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")

    print("\nApplied LOCALLY only.")
    print("No SQL migration is required for the existing 'character' report source.")
    print("Next: npm run build")


if __name__ == "__main__":
    main()
