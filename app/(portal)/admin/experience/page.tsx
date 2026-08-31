import Link from "next/link";

import { ExperienceLiveFilters } from "@/components/admin/experience-live-filters";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSection } from "@/lib/auth/require-staff";
import {
  EXPERIENCE_RATINGS,
  type ExperienceRating,
} from "@/lib/experience/experience-ratings";

type SearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

type FeedbackRow = {
  id: string;
  user_id: string;
  rating: number | null;
  comment: string | null;
  prompted_at: string;
  responded_at: string | null;
  skipped: boolean;
  created_at: string;
};

type CharacterRow = {
  user_id: string;
  display_name: string | null;
  public_slug: string | null;
};

type UserAggregate = {
  userId: string;
  displayName: string;
  publicSlug: string | null;
  prompts: number;
  answered: number;
  skipped: number;
  counts: Record<number, number>;
  latestPromptAt: string | null;
  latestComment: string | null;
};

function asSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function startOfDay(input: string) {
  return new Date(`${input}T00:00:00.000Z`).getTime();
}

function endOfDay(input: string) {
  return new Date(`${input}T23:59:59.999Z`).getTime();
}

function percentage(part: number, whole: number) {
  if (!whole) {
    return 0;
  }

  return Math.round((part / whole) * 1000) / 10;
}

function formatPercent(value: number) {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

function getFace(value: number) {
  return EXPERIENCE_RATINGS.find((entry) => entry.value === value) as ExperienceRating;
}

export default async function AdminExperiencePage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  await requireAdminSection("experience");

  const params = searchParams ? await searchParams : {};
  const query = asSingle(params.query).trim().toLowerCase();
  const ratingFilter = Number(asSingle(params.rating) || 0);
  const from = asSingle(params.from);
  const to = asSingle(params.to);

  const admin = createAdminClient();
  const [feedbackResult, charactersResult, staffResult] = await Promise.all([
    admin
      .from("experience_feedback")
      .select(
        "id, user_id, rating, comment, prompted_at, responded_at, skipped, created_at",
      )
      .order("prompted_at", { ascending: false }),
    admin
      .from("characters")
      .select("user_id, display_name, public_slug")
      .order("display_name", { ascending: true }),
    admin
      .from("staff_members")
      .select("user_id"),
  ]);

  if (feedbackResult.error) {
    throw new Error(
      `Unable to load experience feedback: ${feedbackResult.error.message}`,
    );
  }

  if (charactersResult.error) {
    throw new Error(
      `Unable to load characters: ${charactersResult.error.message}`,
    );
  }

  if (staffResult.error) {
    throw new Error(
      `Unable to load staff: ${staffResult.error.message}`,
    );
  }

  const staffUserIds = new Set(
    (staffResult.data ?? []).map((row) => row.user_id),
  );

  const feedbackRows = ((feedbackResult.data ?? []) as FeedbackRow[]).filter(
    (row) => !staffUserIds.has(row.user_id),
  );
  const characters = (charactersResult.data ?? []) as CharacterRow[];

  const characterByUserId = new Map(
    characters.map((row) => [
      row.user_id,
      {
        displayName: row.display_name?.trim() || "Unknown character",
        publicSlug: row.public_slug,
      },
    ]),
  );

  const filteredRows = feedbackRows.filter((row) => {
    const promptTime = new Date(row.prompted_at).getTime();

    if (from && promptTime < startOfDay(from)) {
      return false;
    }

    if (to && promptTime > endOfDay(to)) {
      return false;
    }

    if (ratingFilter > 0 && row.rating !== ratingFilter) {
      return false;
    }

    if (!query) {
      return true;
    }

    const profile = characterByUserId.get(row.user_id);
    const haystack = [
      row.user_id,
      profile?.displayName ?? "",
      profile?.publicSlug ?? "",
      row.comment ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });

  const responseRows = filteredRows.filter(
    (row) => row.rating !== null && !row.skipped,
  );
  const answeredCount = responseRows.length;
  const promptedCount = filteredRows.length;
  const skippedCount = filteredRows.filter((row) => row.skipped).length;

  const overallCounts = Object.fromEntries(
    EXPERIENCE_RATINGS.map((rating) => [rating.value, 0]),
  ) as Record<number, number>;

  for (const row of responseRows) {
    if (row.rating !== null) {
      overallCounts[row.rating] += 1;
    }
  }

  const aggregates = new Map<string, UserAggregate>();

  for (const row of filteredRows) {
    const profile = characterByUserId.get(row.user_id);
    const aggregate =
      aggregates.get(row.user_id) ??
      {
        userId: row.user_id,
        displayName: profile?.displayName ?? row.user_id,
        publicSlug: profile?.publicSlug ?? null,
        prompts: 0,
        answered: 0,
        skipped: 0,
        counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        latestPromptAt: null,
        latestComment: null,
      };

    aggregate.prompts += 1;

    if (!aggregate.latestPromptAt || row.prompted_at > aggregate.latestPromptAt) {
      aggregate.latestPromptAt = row.prompted_at;
    }

    if (row.skipped) {
      aggregate.skipped += 1;
    }

    if (row.rating !== null && !row.skipped) {
      aggregate.answered += 1;
      aggregate.counts[row.rating] += 1;
    }

    if (!aggregate.latestComment && row.comment?.trim()) {
      aggregate.latestComment = row.comment.trim();
    }

    aggregates.set(row.user_id, aggregate);
  }

  const users = [...aggregates.values()].sort((left, right) => {
    if (right.answered !== left.answered) {
      return right.answered - left.answered;
    }

    return left.displayName.localeCompare(right.displayName);
  });

  const commentRows = filteredRows.filter((row) => row.comment?.trim());

  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-5">
      <header data-sep-interaction-ignore="true" className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 [transform:none!important]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[9px] tracking-[0.08em] text-[rgb(var(--sep-colour-876a46))]">
              Player experience
            </p>
            <h1 className="mt-1 font-serif text-3xl text-[rgb(var(--sep-colour-dec89f))]">
              Satisfaction overview
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-[rgb(var(--sep-colour-a99b89))]">
              Review how players are feeling over time, identify changes in satisfaction and read optional comments when more context is needed.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin"
              className="border border-[rgb(var(--sep-colour-765937))]/60 bg-[rgb(var(--sep-colour-21170f))] px-3 py-2 text-[10px] tracking-[0.08em] text-[rgb(var(--sep-colour-cdb58e))] transition hover:-translate-y-[1px] hover:border-[rgb(var(--sep-colour-a07945))] hover:bg-[rgb(var(--sep-colour-2b1d12))] hover:text-[rgb(var(--sep-colour-dec89f))]"
            >
              Back to Admin
            </Link>
          </div>
        </div>
      </header>

      <ExperienceLiveFilters
        initialQuery={asSingle(params.query)}
        initialRating={String(ratingFilter || "")}
        initialFrom={from}
        initialTo={to}
      />

      <section className="grid gap-4 lg:grid-cols-4">
        <div data-sep-interaction-ignore="true" className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4 [transform:none!important]">
          <p className="text-[9px] tracking-[0.08em] text-[rgb(var(--sep-colour-756957))]">
            Prompted
          </p>
          <p className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-dec89f))]">
            {promptedCount}
          </p>
        </div>
        <div data-sep-interaction-ignore="true" className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4 [transform:none!important]">
          <p className="text-[9px] tracking-[0.08em] text-[rgb(var(--sep-colour-756957))]">
            Answered
          </p>
          <p className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-dec89f))]">
            {answeredCount}
          </p>
          <p className="mt-2 text-xs text-[rgb(var(--sep-colour-756957))]">
            Response rate {formatPercent(percentage(answeredCount, promptedCount))}
          </p>
        </div>
        <div data-sep-interaction-ignore="true" className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4 [transform:none!important]">
          <p className="text-[9px] tracking-[0.08em] text-[rgb(var(--sep-colour-756957))]">
            Skipped
          </p>
          <p className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-dec89f))]">
            {skippedCount}
          </p>
        </div>
        <div data-sep-interaction-ignore="true" className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4 [transform:none!important]">
          <p className="text-[9px] tracking-[0.08em] text-[rgb(var(--sep-colour-756957))]">
            Distinct users
          </p>
          <p className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-dec89f))]">
            {users.length}
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {EXPERIENCE_RATINGS.map((rating) => {
          const count = overallCounts[rating.value] ?? 0;
          const percent = percentage(count, answeredCount);
          return (
            <article
              key={rating.value}
              data-sep-interaction-ignore="true" className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4 [transform:none!important]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-[rgb(var(--sep-colour-6a5437))] bg-[rgb(var(--sep-colour-0e0a08))] p-1">
                  <img src={rating.imageSrc} alt={rating.label} className="h-full w-full object-contain" />
                </div>
                <div>
                  <p className="text-sm text-[rgb(var(--sep-colour-dec89f))]">{rating.label}</p>
                  <p className="text-[11px] text-[rgb(var(--sep-colour-756957))]">{count} answers</p>
                </div>
              </div>
              <p className="mt-4 font-serif text-2xl text-[rgb(var(--sep-colour-b79c73))]">
                {formatPercent(percent)}
              </p>
            </article>
          );
        })}
      </section>

      <section data-sep-interaction-ignore="true" className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4 [transform:none!important]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl text-[rgb(var(--sep-colour-dec89f))]">
              Per-user distribution
            </h2>
            <p className="mt-1 text-xs text-[rgb(var(--sep-colour-756957))]">
              Percentages below are calculated from answered prompts only.
            </p>
          </div>
        </div>

        {users.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[rgb(var(--sep-colour-60482e))]/35 text-left text-[9px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756957))]">
                  <th className="px-2 py-2">User</th>
                  <th className="px-2 py-2">Prompts</th>
                  <th className="px-2 py-2">Answered</th>
                  <th className="px-2 py-2">Response rate</th>
                  {EXPERIENCE_RATINGS.map((rating) => (
                    <th key={rating.value} className="px-2 py-2 text-center">
                      <div className="flex flex-col items-center gap-0.5 text-[8px] leading-tight tracking-[0.08em]">
                        <img src={rating.imageSrc} alt={rating.label} className="h-7 w-7 object-contain" />
                        <span>{rating.label}</span>
                      </div>
                    </th>
                  ))}
                  <th className="px-2 py-2">Latest comment</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.userId}
                    className="border-b border-[rgb(var(--sep-colour-60482e))]/25 align-top text-[rgb(var(--sep-colour-a99b89))]"
                  >
                    <td className="px-3 py-3">
                      <div className="font-medium text-[rgb(var(--sep-colour-dec89f))]">
                        {user.publicSlug ? (
                          <Link href={`/characters/${user.publicSlug}`} className="hover:underline">
                            {user.displayName}
                          </Link>
                        ) : (
                          user.displayName
                        )}
                      </div>
                      <div className="mt-1 text-[11px] text-[rgb(var(--sep-colour-756957))]">
                        {user.userId}
                      </div>
                    </td>
                    <td className="px-3 py-3">{user.prompts}</td>
                    <td className="px-3 py-3">{user.answered}</td>
                    <td className="px-3 py-3">
                      {formatPercent(percentage(user.answered, user.prompts))}
                    </td>
                    {EXPERIENCE_RATINGS.map((rating) => (
                      <td key={rating.value} className="px-3 py-3 text-center">
                        <div className="font-medium">
                          {formatPercent(
                            percentage(user.counts[rating.value], user.answered),
                          )}
                        </div>
                        <div className="mt-1 text-[11px] text-[rgb(var(--sep-colour-756957))]">
                          {user.counts[rating.value]}
                        </div>
                      </td>
                    ))}
                    <td className="max-w-xs px-3 py-3 text-[12px] text-[rgb(var(--sep-colour-9d8d79))]">
                      {user.latestComment ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[rgb(var(--sep-colour-756957))]">
            No experience feedback matches the current filters.
          </p>
        )}
      </section>

      <section data-sep-interaction-ignore="true" className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4 [transform:none!important]">
        <div className="mb-4">
          <h2 className="font-serif text-2xl text-[rgb(var(--sep-colour-dec89f))]">
            Recent comments
          </h2>
          <p className="mt-1 text-xs text-[rgb(var(--sep-colour-756957))]">
            Optional notes left by players, newest prompts first.
          </p>
        </div>

        {commentRows.length ? (
          <div className="space-y-3">
            {commentRows.slice(0, 25).map((row) => {
              const profile = characterByUserId.get(row.user_id);
              const face = row.rating ? getFace(row.rating) : null;
              return (
                <article
                  key={row.id}
                  className="border border-[rgb(var(--sep-colour-60482e))]/25 bg-[rgb(var(--sep-colour-17110d))] p-3"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[rgb(var(--sep-colour-756957))]">
                    <span className="font-medium text-[rgb(var(--sep-colour-b79c73))]">
                      {profile?.displayName ?? row.user_id}
                    </span>
                    {face ? (
                      <span className="inline-flex items-center gap-1">
                        <img src={face.imageSrc} alt={face.label} className="h-5 w-5 object-contain" />
                        {face.label}
                      </span>
                    ) : null}
                    <span>{new Date(row.prompted_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-2 text-sm text-[rgb(var(--sep-colour-a99b89))]">
                    {row.comment}
                  </p>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[rgb(var(--sep-colour-756957))]">
            No comments yet for the current filters.
          </p>
        )}
      </section>
    </div>
  );
}
