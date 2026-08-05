import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ApprovalNotice } from "@/components/character/approval-notice";
import { PendingSubmitButton } from "@/components/forms/pending-submit-button";

import {
  submitCharacterForReview,
  updateApprovedCharacterPortrait,
} from "./actions";
import { CharacterAttributesDisplay } from "@/components/characters/character-attributes-display";
import { CharacterHealthDisplay } from "@/components/characters/character-health-display";
import { createClient } from "@/lib/supabase/server";

type CharacterStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected";

type CodexRelation = {
  id: string;
  name: string;
  slug: string;
  icon_url: string | null;
  colour: string | null;
};

type CharacterProfile = {
  id?: string;
  pronouns?: string | null;
  date_of_birth?: string | null;
  birthplace?: string | null;
  origin?: string | null;
  occupation?: string | null;
  title?: string | null;
  physical_description?: string | null;
  personality?: string | null;
  biography?: string | null;
  public_notes?: string | null;
  portrait_url?: string | null;
  display_name?: string | null;
  approval_notice_seen_at?: string | null;
  muscles?: number | null;
  reflexes?: number | null;
  vigor?: number | null;
  brains?: number | null;
  shrewd?: number | null;
  presence_score?: number | null;
  current_health?: number | null;

  status?: CharacterStatus | null;
  rejection_reason?: string | null;
  submitted_at?: string | null;
  approved_at?: string | null;

  race:
    | CodexRelation
    | CodexRelation[]
    | null;

  association:
    | CodexRelation
    | CodexRelation[]
    | null;
};

type CharacterPageProps = {
  searchParams: Promise<{
    created?: string;
    updated?: string;
    submitted?: string;
    error?: string;
  }>;
};

export default async function CharacterPage({
  searchParams,
}: CharacterPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const {
    data: character,
    error,
  } = await supabase
    .from("characters")
    .select(`
      id,
      pronouns,
      date_of_birth,
      birthplace,
      origin,
      occupation,
      title,
      physical_description,
      personality,
      biography,
      public_notes,
      portrait_url,
      display_name,
      status,
      rejection_reason,
      submitted_at,
      approved_at,
      approval_notice_seen_at,
      muscles,
      reflexes,
      vigor,
      brains,
      shrewd,
      presence_score,
      current_health,

      race:races!characters_race_id_fkey(
        id,
        name,
        slug,
        icon_url,
        colour
      ),

      association:associations!characters_association_id_fkey(
        id,
        name,
        slug,
        icon_url,
        colour
      )
    `)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!character) {
    redirect("/character/create");
  }

  const notice = getPageNotice(params);

  return (
    <Profile
      character={
        character as unknown as CharacterProfile
      }
      own
      notice={notice}
    />
  );
}

export function Profile({
  character,
  own = false,
  messageAction = null,
  notice = null,
}: {
  character: CharacterProfile;
  own?: boolean;
  messageAction?: ReactNode;
  notice?: PageNotice | null;
}) {
  const race = normaliseRelation(
    character.race,
  );

  const association = normaliseRelation(
    character.association,
  );

  const status =
    character.status ?? "draft";

  const canEdit =
    own &&
    (status === "draft" ||
      status === "rejected");

  const canSubmit =
    own &&
    (status === "draft" ||
      status === "rejected");

  const items = [
    ["Pronouns", character.pronouns],
    [
  "Born",
  character.date_of_birth
    ? new Date(character.date_of_birth).toLocaleDateString("en-GB")
    : null,
],
    ["Birthplace", character.birthplace],
    ["Origin", character.origin],
    ["Occupation", character.occupation],
    ["Title", character.title],
  ];

  const sections = [
    [
      "Physical description",
      character.physical_description,
    ],
    ["Personality", character.personality],
    ["Biography", character.biography],
    ["Public notes", character.public_notes],
  ];

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-5xl">
        {notice ? (
          <PageNoticeBanner notice={notice} />
        ) : null}

        {own &&
character.status === "approved" &&
!character.approval_notice_seen_at ? (
  <ApprovalNotice />
) : null}
        

        {own ? (
          <CharacterStatusPanel
            status={status}
            rejectionReason={
              character.rejection_reason
            }
            submittedAt={
              character.submitted_at
            }
            approvedAt={
              character.approved_at
            }
          />
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={own ? "/" : "/game"}
            className="text-sm text-[#b8945d] transition hover:text-[#e3c28c]"
          >
            ← Return
          </Link>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {messageAction}

            {canEdit ? (
              <Link
                href="/character/edit"
                className="border border-[#8d6d3e] bg-[#332719] px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-[#efd9aa] transition hover:bg-[#49351f]"
              >
                Edit character
              </Link>
            ) : null}

            {canSubmit ? (
              <form
                action={
                  submitCharacterForReview
                }
              >
                <PendingSubmitButton
                  idleText={
                    status === "rejected"
                      ? "Submit again"
                      : "Submit for approval"
                  }
                  pendingText={
                    status === "rejected"
                      ? "Submitting again..."
                      : "Submitting..."
                  }
                  className="border border-[#a47b43] bg-[#472d18] px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-[#f3d7a5] transition hover:border-[#d0a15c] hover:bg-[#5c391d] disabled:cursor-not-allowed disabled:opacity-60"
                />
              </form>
            ) : null}
          </div>
        </div>

        <section className="mt-6 grid gap-8 border border-[#654b2e]/50 bg-[#17110d] p-5 sm:p-7 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div>
            {character.portrait_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={character.portrait_url}
                alt={`Portrait of ${
                  character.display_name ??
                  "character"
                }`}
                className="aspect-[3/4] w-full border border-[#60482e]/50 object-cover"
              />
            ) : (
              <div className="flex aspect-[3/4] w-full items-center justify-center border border-[#60482e]/50 bg-[#0d0a08] font-serif text-5xl text-[#5f503f]">
                ?
              </div>
            )}

          {own && status === "approved" ? (
            <form
              action={updateApprovedCharacterPortrait}
              className="mt-4 border border-[#60482e]/45 bg-[#100c09] p-3"
            >
              <label className="block">
                <span className="text-[8px] uppercase tracking-[0.18em] text-[#806b50]">
                  Change portrait
                </span>

                <input
                  type="url"
                  name="portrait_url"
                  defaultValue={
                    character.portrait_url ?? ""
                  }
                  placeholder="https://..."
                  className="mt-2 w-full border border-[#60482e]/55 bg-[#0d0907] px-3 py-2 text-xs text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                />
              </label>

              <button
                type="submit"
                className="mt-3 w-full border border-[#8d6d3e] bg-[#332719] px-3 py-2 text-[8px] uppercase tracking-[0.16em] text-[#efd9aa] transition hover:bg-[#49351f]"
              >
                Update portrait
              </button>
            </form>
          ) : null}
        </div>

        <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#876a46]">
                  Character profile
                </p>

                <h1 className="mt-3 break-words font-serif text-4xl text-[#ecd9b2] sm:text-5xl">
                  {character.display_name ??
                    "Unnamed character"}
                </h1>
              </div>

              {own ? (
                <CharacterStatusBadge
                  status={status}
                />
              ) : null}
            </div>

            <div className="mt-8 grid gap-px bg-[#4f3b28]/35 sm:grid-cols-2">
              {items.map(
                ([label, value]) => (
                  <div
                    key={label}
                    className="bg-[#17110d] p-4"
                  >
                    <p className="text-[9px] uppercase tracking-[0.25em] text-[#796448]">
                      {label}
                    </p>

                    <p className="mt-2 break-words text-sm text-[#cab89b]">
                      {value ||
                        "Not recorded"}
                    </p>
                  </div>
                ),
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-5 md:grid-cols-2">
          <HeritageCard
            label="Ancestry"
            entry={race}
            href={
              race
                ? `/races/${race.slug}`
                : "/races"
            }
          />

          <HeritageCard
            label="Association"
            entry={association}
            href={
              association
                ? `/associations/${association.slug}`
                : "/associations"
            }
          />
        </section>

        <div className="mt-6">
          <CharacterHealthDisplay
            character={character}
          />
        </div>

        <div className="mt-6">
          <CharacterAttributesDisplay
            character={character}
          />
        </div>

        <div className="mt-6 space-y-6">
          {sections.map(
            ([title, value]) => (
              <article
                key={title}
                className="border border-[#6b5032]/50 bg-[#17110d] p-5 sm:p-7"
              >
                <h2 className="font-serif text-2xl text-[#dfc79c] sm:text-3xl">
                  {title}
                </h2>

                <p className="mt-5 whitespace-pre-line break-words text-sm leading-8 text-[#b0a18d]">
                  {value ||
                    "No information has been added yet."}
                </p>
              </article>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function CharacterStatusPanel({
  status,
  rejectionReason,
  submittedAt,
  approvedAt,
}: {
  status: CharacterStatus;
  rejectionReason?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
}) {
  if (status === "submitted") {
    return (
      <section className="mb-6 border border-[#75613d]/65 bg-[#282112]/75 p-5">
        <p className="text-[9px] uppercase tracking-[0.25em] text-[#c0a166]">
          Awaiting staff review
        </p>

        <h2 className="mt-2 font-serif text-2xl text-[#ead3a4]">
          Your character has been submitted
        </h2>

        <p className="mt-3 text-sm leading-6 text-[#aa9c84]">
          The character sheet is currently
          locked while the staff reviews it.
          You will be able to edit it again if
          corrections are requested.
        </p>

        {submittedAt ? (
          <p className="mt-3 text-xs text-[#837661]">
            Submitted{" "}
            {formatDateTime(submittedAt)}
          </p>
        ) : null}
      </section>
    );
  }

  if (status === "approved") {
  return null;
}

  if (status === "rejected") {
    return (
      <section className="mb-6 border border-[#853e35]/70 bg-[#2d1512]/75 p-5">
        <p className="text-[9px] uppercase tracking-[0.25em] text-[#d2786d]">
          Corrections requested
        </p>

        <h2 className="mt-2 font-serif text-2xl text-[#efb4aa]">
          Your character was not approved
        </h2>

        <p className="mt-3 text-sm leading-6 text-[#bd958e]">
          Review the staff feedback below,
          edit the character sheet, and submit
          it again when the requested changes
          have been completed.
        </p>

        <div className="mt-4 border border-[#70352f]/55 bg-[#170b0a]/60 p-4">
          <p className="text-[8px] uppercase tracking-[0.22em] text-[#aa655d]">
            Staff reason
          </p>

          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#ddb2aa]">
            {rejectionReason ||
              "No rejection reason was provided. Contact the staff for clarification."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6 border border-[#615039]/60 bg-[#1b1710]/75 p-5">
      <p className="text-[9px] uppercase tracking-[0.25em] text-[#a58b61]">
        Draft character
      </p>

      <h2 className="mt-2 font-serif text-2xl text-[#dfc79c]">
        Complete your character sheet
      </h2>

      <p className="mt-3 text-sm leading-6 text-[#a89a84]">
        You may continue editing this record.
        When every required section is complete,
        submit it to the staff for approval.
      </p>
    </section>
  );
}

function CharacterStatusBadge({
  status,
}: {
  status: CharacterStatus;
}) {
  const styles: Record<
    CharacterStatus,
    string
  > = {
    draft:
      "border-[#76603e] bg-[#2a2115] text-[#d0ac72]",
    submitted:
      "border-[#81703f] bg-[#302813] text-[#dbc27a]",
    approved:
      "border-[#4c744f] bg-[#17291a] text-[#a7d1a5]",
    rejected:
      "border-[#843f37] bg-[#311512] text-[#e0968c]",
  };

  return (
    <span
      className={`inline-flex border px-3 py-2 text-[8px] uppercase tracking-[0.22em] ${styles[status]}`}
    >
      {status}
    </span>
  );
}

type PageNotice = {
  tone: "success" | "error";
  message: string;
};

function PageNoticeBanner({
  notice,
}: {
  notice: PageNotice;
}) {
  const classes =
    notice.tone === "error"
      ? "border-[#873e35]/65 bg-[#351613]/70 text-[#e0a39a]"
      : "border-[#4f704e]/65 bg-[#172619]/70 text-[#b7d2ae]";

  return (
    <div
      role={
        notice.tone === "error"
          ? "alert"
          : "status"
      }
      className={`mb-6 border px-4 py-3 text-sm ${classes}`}
    >
      {notice.message}
    </div>
  );
}

function getPageNotice(
  params: {
    created?: string;
    updated?: string;
    submitted?: string;
    error?: string;
  },
): PageNotice | null {
  if (params.error) {
    return {
      tone: "error",
      message: params.error,
    };
  }

  if (params.submitted === "true") {
    return {
      tone: "success",
      message:
        "Your character has been submitted to the staff for review.",
    };
  }

  if (params.created === "true") {
    return {
      tone: "success",
      message:
        "Your character was created successfully. Review the sheet and submit it when it is complete.",
    };
  }

  if (params.updated === "true") {
    return {
      tone: "success",
      message:
        "Your character sheet was updated successfully.",
    };
  }

  return null;
}

function HeritageCard({
  label,
  entry,
  href,
}: {
  label: string;
  entry: CodexRelation | null;
  href: string;
}) {
  const colour =
    entry?.colour ?? "#8d6d3e";

  return (
    <article
      className="relative overflow-hidden border border-[#654b2e]/55 bg-[#15100d] p-5"
      style={{
        borderColor: `${colour}88`,
        color: colour,
      }}
    >
      <p className="text-[9px] uppercase tracking-[0.25em] text-[#806b50]">
        {label}
      </p>

      <div className="mt-4 flex items-center gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden border bg-black/20 font-serif text-xl"
          style={{
            borderColor: `${colour}88`,
            color: colour,
          }}
        >
          {entry?.icon_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={entry.icon_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            entry?.name
              .charAt(0)
              .toUpperCase() ?? "?"
          )}
        </div>

        <div className="min-w-0">
          <h2 className="break-words font-serif text-2xl text-[#e1c99f]">
            {entry?.name ??
              "Not assigned"}
          </h2>

          <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-[#786b5b]">
            Permanent character record
          </p>
        </div>
      </div>

      <Link
        href={href}
        className="mt-5 flex items-center justify-between border-t border-[#5b452d]/40 pt-4 text-[9px] uppercase tracking-[0.2em] text-[#a27c4b] transition hover:text-[#e2c18a]"
      >
        <span>Open Codex entry</span>
        <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}

function normaliseRelation<T>(
  value: T | T[] | null,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function formatDateTime(
  value: string,
) {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}