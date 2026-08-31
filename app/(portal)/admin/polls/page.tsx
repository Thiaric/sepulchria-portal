import { AdminActionForm } from "@/components/admin/admin-action-form";
import { AdminNotificationAudienceFields } from "@/components/notifications/admin-notification-audience-fields";
import { requireAdminSection } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { closeExpiredPolls } from "@/lib/polls/lifecycle";

import {
  closePoll,
  createPoll,
  deletePoll,
  openPoll,
} from "./actions";

type NamedOption = {
  id: string;
  name: string;
};

type CharacterOption = {
  id: string;
  display_name: string;
};

export default async function AdminPollsPage() {
  await requireAdminSection(
    "polls",
  );

  await closeExpiredPolls();

  const admin =
    createAdminClient();

  const [
    pollsResult,
    charactersResult,
    ancestriesResult,
    associationsResult,
    ordersResult,
  ] = await Promise.all([
    admin
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
        created_at,
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
          poll_ballot_choices(
            option_id
          )
        )
      `)
      .order(
        "created_at",
        {
          ascending: false,
        },
      ),

    admin
      .from("characters")
      .select(
        "id, display_name",
      )
      .eq(
        "is_system",
        false,
      )
      .order(
        "display_name",
        {
          ascending: true,
        },
      ),

    admin
      .from("races")
      .select("id, name")
      .order(
        "name",
        {
          ascending: true,
        },
      ),

    admin
      .from("associations")
      .select("id, name")
      .order(
        "name",
        {
          ascending: true,
        },
      ),

    admin
      .from("orders")
      .select("id, name")
      .order(
        "name",
        {
          ascending: true,
        },
      ),
  ]);

  for (const result of [
    pollsResult,
    charactersResult,
    ancestriesResult,
    associationsResult,
    ordersResult,
  ]) {
    if (result.error) {
      throw new Error(
        result.error.message,
      );
    }
  }

  const characters =
    (charactersResult.data ??
      []) as CharacterOption[];

  const ancestries =
    (ancestriesResult.data ??
      []) as NamedOption[];

  const associations =
    (associationsResult.data ??
      []) as NamedOption[];

  const orders =
    (ordersResult.data ??
      []) as NamedOption[];

  const polls =
    pollsResult.data ?? [];

  return (
    <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-5 lg:p-6">
      <section
        id="poll-new"
        className="scroll-mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5"
      >
        <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
          Community feedback
        </p>
        <h1 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dec69a))]">
          Create Poll
        </h1>

        <AdminActionForm
          action={createPoll}
          className="mt-5 space-y-4"
        >
          <label className="block">
            <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
              Title
            </span>
            <input
              name="title"
              required
              maxLength={180}
              className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
              Description
            </span>
            <textarea
              name="description"
              rows={3}
              className="w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm leading-6 text-[rgb(var(--sep-colour-d7c4a5))]"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
              Options · one per line
            </span>
            <textarea
              name="options"
              required
              rows={5}
              placeholder={"Yes\nNo\nPerhaps"}
              className="w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm leading-6 text-[rgb(var(--sep-colour-d7c4a5))]"
            />
          </label>

          <div className="grid gap-3 md:grid-cols-3">
            <label>
              <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
                Selection
              </span>
              <select
                name="selectionMode"
                defaultValue="single"
                className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
              >
                <option value="single">
                  Single choice
                </option>
                <option value="multiple">
                  Multiple choice
                </option>
              </select>
            </label>

            <label>
              <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
                Max choices
              </span>
              <input
                type="number"
                name="maxChoices"
                min={1}
                max={20}
                defaultValue={1}
                className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
                Results
              </span>
              <select
                name="resultsVisibility"
                defaultValue="after_vote"
                className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
              >
                <option value="live">
                  Live
                </option>
                <option value="after_vote">
                  After voting
                </option>
                <option value="after_close">
                  After close
                </option>
                <option value="staff_only">
                  Staff only
                </option>
              </select>
            </label>
          </div>

          <AdminNotificationAudienceFields
            initialType="global"
            initialTargetId={null}
            characters={characters}
            ancestries={ancestries}
            associations={associations}
            orders={orders}
          />

          <div className="grid gap-3 md:grid-cols-3">
            <label>
              <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
                Closing date · UTC
              </span>
              <input
                type="datetime-local"
                name="closesAt"
                className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
              />
            </label>

            <label className="flex items-center gap-3 self-end border border-[rgb(var(--sep-colour-59432c))]/40 px-3 py-2 text-sm text-[rgb(var(--sep-colour-bbaa90))]">
              <input
                type="checkbox"
                name="allowVoteChange"
                defaultChecked
                className="h-4 w-4 accent-[rgb(var(--sep-colour-8b673d))]"
              />
              Allow vote changes
            </label>

            <label className="flex items-center gap-3 self-end border border-[rgb(var(--sep-colour-59432c))]/40 px-3 py-2 text-sm text-[rgb(var(--sep-colour-bbaa90))]">
              <input
                type="checkbox"
                name="isAnonymous"
                defaultChecked
                className="h-4 w-4 accent-[rgb(var(--sep-colour-8b673d))]"
              />
              Anonymous results
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-efd6a8))]"
            >
              Create Draft Poll
            </button>
          </div>
        </AdminActionForm>
      </section>

      <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5">
        <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-dec69a))]">
          Polls · {polls.length}
        </h2>

        <div className="mt-4 space-y-3">
          {polls.map((poll) => {
            const options =
              [...(
                poll.poll_options ??
                []
              )].sort(
                (a, b) =>
                  a.sort_order -
                  b.sort_order,
              );

            const counts =
              new Map<string, number>();

            for (const option of options) {
              counts.set(
                option.id,
                0,
              );
            }

            for (
              const ballot of
                poll.poll_ballots ??
                []
            ) {
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

            return (
              <details
                key={poll.id}
                id={`admin-poll-${poll.id}`}
                data-admin-poll-id={poll.id}
                data-admin-poll-title={poll.title}
                data-admin-poll-status={poll.status}
                data-admin-poll-description={poll.description}
                data-admin-poll-ballots={
                  poll.poll_ballots?.length ??
                  0
                }
                className="scroll-mt-6 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))]"
              >
                <summary className="cursor-pointer list-none px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate font-serif text-base text-[rgb(var(--sep-colour-d8bf91))]">
                        {poll.title}
                      </p>
                      <p className="mt-1 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">
                        {poll.status}
                        {" · "}
                        {poll.poll_ballots?.length ??
                          0} ballots
                      </p>
                    </div>

                    <span className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-9caf7c))]">
                      {poll.results_visibility.replaceAll(
                        "_",
                        " ",
                      )}
                    </span>
                  </div>
                </summary>

                <div className="space-y-4 border-t border-[rgb(var(--sep-colour-59432c))]/35 p-4">
                  {poll.description ? (
                    <p className="whitespace-pre-wrap text-[11px] leading-5 text-[rgb(var(--sep-colour-a99b89))]">
                      {poll.description}
                    </p>
                  ) : null}

                  <div className="space-y-2">
                    {options.map(
                      (option) => (
                        <div
                          key={
                            option.id
                          }
                          className="flex items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/35 px-3 py-2"
                        >
                          <span className="text-sm text-[rgb(var(--sep-colour-d5c2a4))]">
                            {
                              option.label
                            }
                          </span>
                          <span className="text-[9px] text-[rgb(var(--sep-colour-8f806c))]">
                            {counts.get(
                              option.id,
                            ) ?? 0}
                          </span>
                        </div>
                      ),
                    )}
                  </div>

                  <div className="flex flex-wrap justify-end gap-2 border-t border-[rgb(var(--sep-colour-59432c))]/35 pt-4">
                    {poll.status ===
                    "draft" ? (
                      <>
                        <AdminActionForm
                          action={
                            openPoll
                          }
                        >
                          <input
                            type="hidden"
                            name="pollId"
                            value={
                              poll.id
                            }
                          />
                          <button
                            type="submit"
                            className="border border-emerald-800/70 bg-emerald-950/30 px-4 py-2 text-[8px] uppercase tracking-[0.16em] text-emerald-300"
                          >
                            Open Poll
                          </button>
                        </AdminActionForm>

                        <AdminActionForm
                          action={
                            deletePoll
                          }
                        >
                          <input
                            type="hidden"
                            name="pollId"
                            value={
                              poll.id
                            }
                          />
                          <button
                            type="submit"
                            data-confirm-message="Delete this draft poll permanently?"
                            className="border border-red-800/70 bg-red-950/35 px-4 py-2 text-[8px] uppercase tracking-[0.16em] text-red-300"
                          >
                            Delete Draft
                          </button>
                        </AdminActionForm>
                      </>
                    ) : null}

                    {poll.status ===
                    "open" ? (
                      <AdminActionForm
                        action={
                          closePoll
                        }
                      >
                        <input
                          type="hidden"
                          name="pollId"
                          value={
                            poll.id
                          }
                        />
                        <button
                          type="submit"
                          data-confirm-message="Close this poll now? Voting will stop."
                          className="border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-241a12))] px-4 py-2 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd4a0))]"
                        >
                          Close Poll
                        </button>
                      </AdminActionForm>
                    ) : null}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </main>
  );
}
