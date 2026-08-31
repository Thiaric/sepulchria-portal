import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  canViewPoll,
  getPollViewer,
} from "@/lib/polls/access";
import { closeExpiredPolls } from "@/lib/polls/lifecycle";
import { PollSeenMarker } from "@/components/polls/poll-seen-marker";

import { submitPollVote } from "./actions";

type PollOption = {
  id: string;
  label: string;
  sort_order: number;
};

type BallotChoice = {
  option_id: string;
};

type PollBallot = {
  id: string;
  character_id: string;
  poll_ballot_choices:
    | BallotChoice[]
    | null;
};

type PollRow = {
  id: string;
  title: string;
  description: string;
  status: string;
  selection_mode:
    | "single"
    | "multiple";
  max_choices: number;
  allow_vote_change: boolean;
  is_anonymous: boolean;
  results_visibility:
    | "live"
    | "after_vote"
    | "after_close"
    | "staff_only";
  opens_at: string | null;
  closes_at: string | null;
  closed_at: string | null;
  poll_targets:
    | {
        target_type: string;
        target_id: string | null;
      }[]
    | null;
  poll_options:
    | PollOption[]
    | null;
  poll_ballots:
    | PollBallot[]
    | null;
};

function formatDate(
  value: string | null,
) {
  if (!value) return null;

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date.toLocaleString();
}

export default async function PollsPage() {
  await closeExpiredPolls();

  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const viewer =
    await getPollViewer(user.id);

  const admin =
    createAdminClient();

  const {
    data,
    error,
  } = await admin
    .from("polls")
    .select(`
      id,
      title,
      description,
      status,
      selection_mode,
      max_choices,
      allow_vote_change,
      is_anonymous,
      results_visibility,
      opens_at,
      closes_at,
      closed_at,
      poll_targets(
        target_type,
        target_id
      ),
      poll_options(
        id,
        label,
        sort_order
      ),
      poll_ballots(
        id,
        character_id,
        poll_ballot_choices(
          option_id
        )
      )
    `)
    .neq("status", "draft")
    .order(
      "created_at",
      {
        ascending: false,
      },
    );

  if (error) {
    throw new Error(
      `Unable to load polls: ${error.message}`,
    );
  }

  const polls =
    (
      (data ?? []) as unknown as
        PollRow[]
    ).filter((poll) =>
      canViewPoll(
        viewer,
        poll.poll_targets ??
          [],
      ),
    );

  const {
    data: pollReads,
    error: pollReadsError,
  } = await admin
    .from("poll_reads")
    .select("poll_id")
    .eq("user_id", user.id);

  if (pollReadsError) {
    throw new Error(
      `Unable to load Poll seen state: ${pollReadsError.message}`,
    );
  }

  const seenPollIds =
    new Set(
      (pollReads ?? []).map(
        (row) => row.poll_id,
      ),
    );

  const now = Date.now();

  return (
    <>
      <PollSeenMarker />
    <main className="mx-auto max-w-4xl space-y-5 p-3 sm:p-5 lg:p-6">
      <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-4 py-4 sm:px-5">
        <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
          Offgame
        </p>
        <h1 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dec69a))]">
          Polls
        </h1>
        <p className="mt-2 max-w-2xl text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
          Vote in polls addressed to your character or account. Poll eligibility is checked by the server.
        </p>
      </section>

      {polls.length === 0 ? (
        <section className="border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] p-8 text-center">
          <p className="font-serif text-lg text-[rgb(var(--sep-colour-c9b184))]">
            No polls are available.
          </p>
        </section>
      ) : (
        polls.map((poll) => {
          const options =
            [...(poll.poll_options ?? [])]
              .sort(
                (a, b) =>
                  a.sort_order -
                  b.sort_order,
              );

          const ballots =
            poll.poll_ballots ?? [];

          const myBallot =
            viewer.characterId
              ? ballots.find(
                  (ballot) =>
                    ballot.character_id ===
                    viewer.characterId,
                ) ?? null
              : null;

          const myChoices =
            new Set(
              (
                myBallot
                  ?.poll_ballot_choices ??
                []
              ).map(
                (choice) =>
                  choice.option_id,
              ),
            );

          const opensAt =
            poll.opens_at
              ? new Date(
                  poll.opens_at,
                ).getTime()
              : 0;

          const closesAt =
            poll.closes_at
              ? new Date(
                  poll.closes_at,
                ).getTime()
              : null;

          const open =
            poll.status ===
              "open" &&
            opensAt <= now &&
            (
              closesAt === null ||
              closesAt > now
            );

          const closed =
            poll.status ===
              "closed" ||
            (
              closesAt !== null &&
              closesAt <= now
            );

          const canSeeResults =
            viewer.isStaff ||
            poll.results_visibility ===
              "live" ||
            (
              poll.results_visibility ===
                "after_vote" &&
              myBallot !== null
            ) ||
            (
              poll.results_visibility ===
                "after_close" &&
              closed
            );

          const counts =
            new Map<string, number>();

          for (const option of options) {
            counts.set(
              option.id,
              0,
            );
          }

          for (const ballot of ballots) {
            for (
              const choice of
                ballot.poll_ballot_choices ??
                []
            ) {
              counts.set(
                choice.option_id,
                (
                  counts.get(
                    choice.option_id,
                  ) ?? 0
                ) + 1,
              );
            }
          }

          const totalBallots =
            ballots.length;

          const isNew =
            open &&
            !seenPollIds.has(
              poll.id,
            );

          return (
            <section
              key={poll.id}
              id={`poll-${poll.id}`}
              data-public-poll-id={poll.id}
              data-public-poll-title={poll.title}
              data-public-poll-description={poll.description}
              data-public-poll-state={
                open
                  ? "open"
                  : closed
                    ? "closed"
                    : "upcoming"
              }
              data-public-poll-voted={
                myBallot !== null
                  ? "true"
                  : "false"
              }
              data-public-poll-new={
                isNew
                  ? "true"
                  : "false"
              }
              className={[
                "scroll-mt-6 border transition",
                isNew
                  ? "border-[rgb(var(--sep-colour-a87532))] bg-[rgb(var(--sep-colour-1f160e))] shadow-[0_0_22px_rgba(var(--sep-rgb-177-132-75),0.13),inset_0_0_22px_rgba(var(--sep-rgb-177-132-75),0.04)]"
                  : "border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))]",
              ].join(" ")}
            >
              <div className="border-b border-[rgb(var(--sep-colour-59432c))]/35 px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
                        {open
                          ? "Open poll"
                          : closed
                            ? "Closed poll"
                            : "Upcoming poll"}
                      </p>

                      {isNew ? (
                        <span className="inline-flex items-center border border-[rgb(var(--sep-colour-c28e45))] bg-[rgb(var(--sep-colour-6f291c))] px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-ffe0a8))] shadow-[0_0_10px_rgba(var(--sep-rgb-177-132-75),0.22)]">
                          New
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
                      {poll.title}
                    </h2>
                  </div>

                  <div className="text-right text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))]">
                    {poll.is_anonymous
                      ? "Anonymous"
                      : "Named"}
                    {" · "}
                    {poll.selection_mode ===
                    "single"
                      ? "Single choice"
                      : `Up to ${poll.max_choices}`}
                  </div>
                </div>

                {poll.description ? (
                  <p className="mt-3 whitespace-pre-wrap text-[11px] leading-5 text-[rgb(var(--sep-colour-a99b89))]">
                    {poll.description}
                  </p>
                ) : null}

                {poll.closes_at ? (
                  <p className="mt-3 text-[9px] text-[rgb(var(--sep-colour-756958))]">
                    Closes:{" "}
                    {formatDate(
                      poll.closes_at,
                    )}
                  </p>
                ) : null}
              </div>

              <div className="space-y-3 p-4 sm:p-5">
                <form
                  action={
                    submitPollVote
                  }
                  className="space-y-2"
                >
                  <input
                    type="hidden"
                    name="pollId"
                    value={poll.id}
                  />

                  {options.map(
                    (option) => {
                      const count =
                        counts.get(
                          option.id,
                        ) ?? 0;

                      const percent =
                        totalBallots > 0
                          ? Math.round(
                              (
                                count /
                                totalBallots
                              ) * 100,
                            )
                          : 0;

                      return (
                        <label
                          key={
                            option.id
                          }
                          className="block border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-15100d))] px-3 py-3"
                        >
                          <span className="flex items-center gap-3">
                            <input
                              type={
                                poll.selection_mode ===
                                "single"
                                  ? "radio"
                                  : "checkbox"
                              }
                              name="optionId"
                              value={
                                option.id
                              }
                              defaultChecked={myChoices.has(
                                option.id,
                              )}
                              disabled={
                                !open ||
                                (
                                  myBallot !==
                                    null &&
                                  !poll.allow_vote_change
                                ) ||
                                !viewer.characterId
                              }
                              className="h-4 w-4 accent-[rgb(var(--sep-colour-a17a49))]"
                            />

                            <span className="min-w-0 flex-1 text-sm text-[rgb(var(--sep-colour-d5c2a4))]">
                              {option.label}
                            </span>

                            {canSeeResults ? (
                              <span className="shrink-0 text-[9px] text-[rgb(var(--sep-colour-8f806c))]">
                                {count}
                                {" · "}
                                {percent}%
                              </span>
                            ) : null}
                          </span>

                          {canSeeResults ? (
                            <span className="mt-2 block h-1 overflow-hidden bg-[rgb(var(--sep-colour-21170f))]">
                              <span
                                className="block h-full bg-[rgb(var(--sep-colour-876a46))]"
                                style={{
                                  width:
                                    `${percent}%`,
                                }}
                              />
                            </span>
                          ) : null}
                        </label>
                      );
                    },
                  )}

                  {open &&
                  viewer.characterId &&
                  (
                    !myBallot ||
                    poll.allow_vote_change
                  ) ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <p className="text-[9px] text-[rgb(var(--sep-colour-756958))]">
                        {myBallot
                          ? "You have voted. You may change your ballot."
                          : "You have not voted yet."}
                      </p>

                      <button
                        type="submit"
                        className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-2 text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd6a8))]"
                      >
                        {myBallot
                          ? "Update Vote"
                          : "Cast Vote"}
                      </button>
                    </div>
                  ) : null}
                </form>

                {canSeeResults ? (
                  <p className="text-right text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">
                    {totalBallots} ballot
                    {totalBallots === 1
                      ? ""
                      : "s"}
                  </p>
                ) : (
                  <p className="text-[9px] italic text-[rgb(var(--sep-colour-756958))]">
                    Results are hidden under this poll&apos;s visibility rules.
                  </p>
                )}
              </div>
            </section>
          );
        })
      )}
    </main>
    </>
  );
}
