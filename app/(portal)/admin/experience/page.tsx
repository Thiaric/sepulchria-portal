import Link from "next/link";

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
    <div className="space-y-6">
      <header className="border border-[rgb(var(--sep-colour-5c4b35))] bg-[rgb(var(--sep-colour-140f0b))] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8d775b))]">
              Admin · Experience
            </p>
            <h1 className="mt-1 font-serif text-3xl text-[rgb(var(--sep-colour-efd6a3))]">
              How Was Your Experience?
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-[rgb(var(--sep-colour-c7b493))]">
              Satisfaction prompts shown to players when they leave Sepulchria, at most once every 7 days. Staff accounts are excluded.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin"
              className="border border-[rgb(var(--sep-colour-5c4b35))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-cfb486))]"
            >
              Back to Admin
            </Link>
          </div>
        </div>
      </header>

      <form className="grid gap-3 border border-[rgb(var(--sep-colour-5c4b35))] bg-[rgb(var(--sep-colour-140f0b))] p-4 md:grid-cols-4 xl:grid-cols-6">
        <label className="md:col-span-2 xl:col-span-2">
          <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
            Search user / comment
          </span>
          <input
            name="query"
            defaultValue={asSingle(params.query)}
            placeholder="Character, slug, user ID, comment..."
            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
          />
        </label>

        <label>
          <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
            Rating
          </span>
          <select
            name="rating"
            defaultValue={String(ratingFilter || "")}
            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
          >
            <option value="">All</option>
            {EXPERIENCE_RATINGS.map((rating) => (
              <option key={rating.value} value={rating.value}>
                {rating.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
            From
          </span>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
          />
        </label>

        <label>
          <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
            To
          </span>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
          />
        </label>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="border border-[rgb(var(--sep-colour-d2aa63))] bg-[rgb(var(--sep-colour-2a1e14))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-f1ddb4))]"
          >
            Filter
          </button>
          <Link
            href="/admin/experience"
            className="border border-[rgb(var(--sep-colour-5c4b35))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-cfb486))]"
          >
            Reset
          </Link>
        </div>
      </form>

      <section className="grid gap-4 lg:grid-cols-4">
        <div className="border border-[rgb(var(--sep-colour-5c4b35))] bg-[rgb(var(--sep-colour-140f0b))] p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
            Prompted
          </p>
          <p className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-efd6a3))]">
            {promptedCount}
          </p>
        </div>
        <div className="border border-[rgb(var(--sep-colour-5c4b35))] bg-[rgb(var(--sep-colour-140f0b))] p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
            Answered
          </p>
          <p className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-efd6a3))]">
            {answeredCount}
          </p>
          <p className="mt-2 text-xs text-[rgb(var(--sep-colour-8d775b))]">
            Response rate {formatPercent(percentage(answeredCount, promptedCount))}
          </p>
        </div>
        <div className="border border-[rgb(var(--sep-colour-5c4b35))] bg-[rgb(var(--sep-colour-140f0b))] p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
            Skipped
          </p>
          <p className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-efd6a3))]">
            {skippedCount}
          </p>
        </div>
        <div className="border border-[rgb(var(--sep-colour-5c4b35))] bg-[rgb(var(--sep-colour-140f0b))] p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
            Distinct users
          </p>
          <p className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-efd6a3))]">
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
              className="border border-[rgb(var(--sep-colour-5c4b35))] bg-[rgb(var(--sep-colour-140f0b))] p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-[rgb(var(--sep-colour-6a5437))] bg-[rgb(var(--sep-colour-0e0a08))] p-1">
                  <img src={rating.imageSrc} alt={rating.label} className="h-full w-full object-contain" />
                </div>
                <div>
                  <p className="text-sm text-[rgb(var(--sep-colour-efd6a3))]">{rating.label}</p>
                  <p className="text-[11px] text-[rgb(var(--sep-colour-8d775b))]">{count} answers</p>
                </div>
              </div>
              <p className="mt-4 font-serif text-2xl text-[rgb(var(--sep-colour-dec69a))]">
                {formatPercent(percent)}
              </p>
            </article>
          );
        })}
      </section>

      <section className="border border-[rgb(var(--sep-colour-5c4b35))] bg-[rgb(var(--sep-colour-140f0b))] p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl text-[rgb(var(--sep-colour-efd6a3))]">
              Per-user distribution
            </h2>
            <p className="mt-1 text-xs text-[rgb(var(--sep-colour-8d775b))]">
              Percentages below are calculated from answered prompts only.
            </p>
          </div>
        </div>

        {users.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[rgb(var(--sep-colour-4c3c2b))] text-left text-[11px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">
                  <th className="px-3 py-3">User</th>
                  <th className="px-3 py-3">Prompts</th>
                  <th className="px-3 py-3">Answered</th>
                  <th className="px-3 py-3">Response rate</th>
                  {EXPERIENCE_RATINGS.map((rating) => (
                    <th key={rating.value} className="px-3 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <img src={rating.imageSrc} alt={rating.label} className="h-8 w-8 object-contain" />
                        <span>{rating.label}</span>
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-3">Latest comment</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.userId}
                    className="border-b border-[rgb(var(--sep-colour-241b14))] align-top text-[rgb(var(--sep-colour-d7c4a5))]"
                  >
                    <td className="px-3 py-3">
                      <div className="font-medium text-[rgb(var(--sep-colour-efd6a3))]">
                        {user.publicSlug ? (
                          <Link href={`/characters/${user.publicSlug}`} className="hover:underline">
                            {user.displayName}
                          </Link>
                        ) : (
                          user.displayName
                        )}
                      </div>
                      <div className="mt-1 text-[11px] text-[rgb(var(--sep-colour-8d775b))]">
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
                        <div className="mt-1 text-[11px] text-[rgb(var(--sep-colour-8d775b))]">
                          {user.counts[rating.value]}
                        </div>
                      </td>
                    ))}
                    <td className="max-w-xs px-3 py-3 text-[12px] text-[rgb(var(--sep-colour-bca788))]">
                      {user.latestComment ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[rgb(var(--sep-colour-8d775b))]">
            No experience feedback matches the current filters.
          </p>
        )}
      </section>

      <section className="border border-[rgb(var(--sep-colour-5c4b35))] bg-[rgb(var(--sep-colour-140f0b))] p-4">
        <div className="mb-4">
          <h2 className="font-serif text-2xl text-[rgb(var(--sep-colour-efd6a3))]">
            Recent comments
          </h2>
          <p className="mt-1 text-xs text-[rgb(var(--sep-colour-8d775b))]">
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
                  className="border border-[rgb(var(--sep-colour-241b14))] bg-[rgb(var(--sep-colour-17110d))] p-3"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[rgb(var(--sep-colour-8d775b))]">
                    <span className="font-medium text-[rgb(var(--sep-colour-dec69a))]">
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
                  <p className="mt-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))]">
                    {row.comment}
                  </p>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[rgb(var(--sep-colour-8d775b))]">
            No comments yet for the current filters.
          </p>
        )}
      </section>
    </div>
  );
}
