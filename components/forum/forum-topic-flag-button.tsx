"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";

import {
  flagForumTopic,
  loadForumFlagRecipients,
  type FlagTopicState,
  type ForumFlagRecipient,
} from "@/app/(portal)/forum/flag-actions";

const initialFlagTopicState: FlagTopicState = {
  ok: false,
  message: "",
};

type Option = {
  id: string;
  name: string;
};

type Props = {
  topicId: string;
  topicTitle: string;
  sectionId: string;
  sectionSlug: string;
  topicSlug: string;
};

export function ForumTopicFlagButton({
  topicId,
  topicTitle,
  sectionId,
  sectionSlug,
  topicSlug,
}: Props) {
  const [open, setOpen] =
    useState(false);

  const [mounted, setMounted] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [query, setQuery] =
    useState("");

  const [
    characters,
    setCharacters,
  ] = useState<
    ForumFlagRecipient[]
  >([]);

  const [
    selectedCharacters,
    setSelectedCharacters,
  ] = useState<Set<string>>(
    new Set(),
  );

  const [
    selectedRaces,
    setSelectedRaces,
  ] = useState<Set<string>>(
    new Set(),
  );

  const [
    selectedAssociations,
    setSelectedAssociations,
  ] = useState<Set<string>>(
    new Set(),
  );

  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    flagForumTopic,
    initialFlagTopicState,
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function keydown(
      event: KeyboardEvent,
    ) {
      if (
        event.key === "Escape"
      ) {
        setOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      keydown,
    );

    return () =>
      window.removeEventListener(
        "keydown",
        keydown,
      );
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    async function loadOptions() {
      setLoading(true);
      setLoadError(null);

      try {
        const recipients =
          await loadForumFlagRecipients(
            sectionId,
          );

        if (!cancelled) {
          setCharacters(
            recipients,
          );
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load eligible characters.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, [open, sectionId]);

  useEffect(() => {
    if (
      state.ok &&
      state.sent &&
      state.sent > 0
    ) {
      setSelectedCharacters(
        new Set(),
      );

      setSelectedRaces(
        new Set(),
      );

      setSelectedAssociations(
        new Set(),
      );
    }
  }, [state]);

  const races = useMemo(() => {
    const map =
      new Map<string, string>();

    for (
      const character
      of characters
    ) {
      if (
        character.raceId &&
        character.raceName
      ) {
        map.set(
          character.raceId,
          character.raceName,
        );
      }
    }

    return [...map]
      .map(
        ([id, name]) => ({
          id,
          name,
        }),
      )
      .sort((a, b) =>
        a.name.localeCompare(
          b.name,
        ),
      );
  }, [characters]);

  const associations =
    useMemo(() => {
      const map =
        new Map<
          string,
          string
        >();

      for (
        const character
        of characters
      ) {
        if (
          character.associationId &&
          character.associationName
        ) {
          map.set(
            character.associationId,
            character.associationName,
          );
        }
      }

      return [...map]
        .map(
          ([id, name]) => ({
            id,
            name,
          }),
        )
        .sort((a, b) =>
          a.name.localeCompare(
            b.name,
          ),
        );
    }, [characters]);

  const friends =
    useMemo(
      () =>
        characters
          .filter(
            (character) =>
              character.isFriend,
          )
          .map(
            (character) => ({
              id: character.id,
              name:
                character.name,
            }),
          ),
      [characters],
    );

  function selectAllFriends() {
    setSelectedCharacters(
      (current) =>
        new Set([
          ...current,
          ...friends.map(
            (friend) =>
              friend.id,
          ),
        ]),
    );
  }

  const matchingCharacters =
    useMemo(() => {
      const needle =
        query
          .trim()
          .toLowerCase();

      if (!needle) {
        return characters;
      }

      return characters.filter(
        (character) =>
          [
            character.name,
            character.raceName,
            character.associationName,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(needle),
      );
    }, [
      characters,
      query,
    ]);

  const resolvedCount =
    useMemo(() => {
      return characters.filter(
        (character) =>
          selectedCharacters.has(
            character.id,
          ) ||
          (character.raceId !==
            null &&
            selectedRaces.has(
              character.raceId,
            )) ||
          (character.associationId !==
            null &&
            selectedAssociations.has(
              character.associationId,
            )),
      ).length;
    }, [
      characters,
      selectedCharacters,
      selectedRaces,
      selectedAssociations,
    ]);

  function toggle(
    setter: Dispatch<
      SetStateAction<Set<string>>
    >,
    id: string,
  ) {
    setter((current) => {
      const next =
        new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  const modal = open ? (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onMouseDown={(
        event,
      ) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          setOpen(false);
        }
      }}
    >
      <div className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden border border-[rgb(var(--sep-colour-765735))] bg-[rgb(var(--sep-colour-100c09))] shadow-[0_28px_90px_rgba(var(--sep-rgb-0-0-0),0.9)]">
        <div className="flex items-start justify-between gap-4 border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-19120d))] px-5 py-4">
          <div>
            <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8f6c43))]">
              Call attention
            </p>

            <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-e0c89e))]">
              Flag this topic
              for reading
            </h2>

            <p className="mt-1 text-xs text-[rgb(var(--sep-colour-837565))]">
              Only characters
              who can access this
              forum section are
              shown.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setOpen(false)
            }
            className="flex h-8 w-8 shrink-0 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/55 text-[rgb(var(--sep-colour-a58b68))] hover:border-[rgb(var(--sep-colour-9a7445))] hover:text-[rgb(var(--sep-colour-e5c99a))]"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="border-b border-[rgb(var(--sep-colour-60482e))]/35 p-4">
          <input
            type="search"
            value={query}
            onChange={(event) =>
              setQuery(
                event.target.value,
              )
            }
            placeholder="Search characters, ancestries or associations…"
            className="w-full border border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-0b0806))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d7c1a0))] outline-none placeholder:text-[rgb(var(--sep-colour-62584b))] focus:border-[rgb(var(--sep-colour-9a7445))] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="py-10 text-center text-xs text-[rgb(var(--sep-colour-847666))]">
              Checking forum
              access…
            </p>
          ) : loadError ? (
            <p className="border border-red-900/55 bg-red-950/15 p-4 text-xs text-red-300">
              {loadError}
            </p>
          ) : characters.length ===
            0 ? (
            <p className="py-10 text-center text-xs text-[rgb(var(--sep-colour-847666))]">
              No other
              characters have
              access to this
              section.
            </p>
          ) : (
            <div className="space-y-5">
              {friends.length > 0 ? (
                <section className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-0d0a08))] p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-9b774b))]">
                      Friend List
                    </h3>

                    <button
                      type="button"
                      onClick={
                        selectAllFriends
                      }
                      className="border border-[rgb(var(--sep-colour-765735))] px-2.5 py-1.5 text-[8px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-c4a578))] hover:border-[rgb(var(--sep-colour-a47a45))] hover:text-[rgb(var(--sep-colour-e3c79a))]"
                    >
                      Select full Friend List
                    </button>
                  </div>

                  <SelectionGroup
                    title="Select individual friends"
                    options={
                      friends
                    }
                    selected={
                      selectedCharacters
                    }
                    onToggle={(id) =>
                      toggle(
                        setSelectedCharacters,
                        id,
                      )
                    }
                  />
                </section>
              ) : null}

              <SelectionGroup
                title="Ancestries"
                options={races}
                selected={
                  selectedRaces
                }
                onToggle={(id) =>
                  toggle(
                    setSelectedRaces,
                    id,
                  )
                }
              />

              <SelectionGroup
                title="Associations"
                options={
                  associations
                }
                selected={
                  selectedAssociations
                }
                onToggle={(id) =>
                  toggle(
                    setSelectedAssociations,
                    id,
                  )
                }
              />

              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-9b774b))]">
                    Characters
                  </h3>

                  <span className="text-[8px] text-[rgb(var(--sep-colour-6d6255))]">
                    {
                      matchingCharacters.length
                    }{" "}
                    shown
                  </span>
                </div>

                <div className="grid gap-1.5 sm:grid-cols-2">
                  {matchingCharacters.map(
                    (character) => (
                      <label
                        key={
                          character.id
                        }
                        className={`flex cursor-pointer items-center gap-3 border p-2.5 transition ${
                          selectedCharacters.has(
                            character.id,
                          )
                            ? "border-[rgb(var(--sep-colour-a47a45))] bg-[rgb(var(--sep-colour-2b1d12))]"
                            : "border-[rgb(var(--sep-colour-4e3a27))]/60 bg-[rgb(var(--sep-colour-15100d))] hover:border-[rgb(var(--sep-colour-765735))]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCharacters.has(
                            character.id,
                          )}
                          onChange={() =>
                            toggle(
                              setSelectedCharacters,
                              character.id,
                            )
                          }
                          className="accent-[rgb(var(--sep-colour-a47a45))]"
                        />

                        <div className="h-9 w-9 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0b0806))]">
                          {character.portraitUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={
                                character.portraitUrl
                              }
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-serif text-sm text-[rgb(var(--sep-colour-d7be94))]">
                            {
                              character.name
                            }
                          </p>

                          <p className="truncate text-[8px] text-[rgb(var(--sep-colour-776a5b))]">
                            {[
                              character.raceName,
                              character.associationName,
                            ]
                              .filter(
                                Boolean,
                              )
                              .join(
                                " · ",
                              ) ||
                              "No ancestry or association"}
                          </p>
                        </div>
                      </label>
                    ),
                  )}
                </div>
              </section>
            </div>
          )}
        </div>

        <form
          action={formAction}
          className="border-t border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4"
        >
          <input
            type="hidden"
            name="topicId"
            value={topicId}
          />

          <input
            type="hidden"
            name="topicTitle"
            value={topicTitle}
          />

          <input
            type="hidden"
            name="sectionId"
            value={sectionId}
          />

          <input
            type="hidden"
            name="sectionSlug"
            value={sectionSlug}
          />

          <input
            type="hidden"
            name="topicSlug"
            value={topicSlug}
          />

          {[
            ...selectedCharacters,
          ].map((id) => (
            <input
              key={`c-${id}`}
              type="hidden"
              name="characterIds"
              value={id}
            />
          ))}

          {[
            ...selectedRaces,
          ].map((id) => (
            <input
              key={`r-${id}`}
              type="hidden"
              name="raceIds"
              value={id}
            />
          ))}

          {[
            ...selectedAssociations,
          ].map((id) => (
            <input
              key={`a-${id}`}
              type="hidden"
              name="associationIds"
              value={id}
            />
          ))}

          <label className="mb-3 block">
            <span className="mb-1.5 block text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-9b774b))]">
              Personal message
              <span className="ml-1 normal-case tracking-normal text-[rgb(var(--sep-colour-6f6254))]">
                (optional)
              </span>
            </span>

            <textarea
              name="customMessage"
              maxLength={1000}
              rows={3}
              placeholder='Example: "Read this, I found Reply number 3 quite interesting."'
              className="w-full resize-y border border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-0b0806))] px-3 py-2.5 text-xs leading-5 text-[rgb(var(--sep-colour-d7c1a0))] outline-none placeholder:text-[rgb(var(--sep-colour-62584b))] focus:border-[rgb(var(--sep-colour-9a7445))]"
            />
          </label>

          {state.message ? (
            <p
              className={`mb-3 text-xs ${
                state.ok
                  ? "text-[rgb(var(--sep-colour-93a875))]"
                  : "text-[rgb(var(--sep-colour-d18b80))]"
              }`}
            >
              {state.message}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-4">
            <p className="text-[9px] text-[rgb(var(--sep-colour-7b6d5d))]">
              {resolvedCount}{" "}
              character
              {resolvedCount ===
              1
                ? ""
                : "s"}{" "}
              will receive the
              message
            </p>

            <button
              type="submit"
              disabled={
                pending ||
                resolvedCount ===
                  0
              }
              className="border border-[rgb(var(--sep-colour-8d693d))] bg-[rgb(var(--sep-colour-302014))] px-4 py-2.5 text-[8px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-e0c292))] transition hover:border-[rgb(var(--sep-colour-b4874e))] hover:bg-[rgb(var(--sep-colour-3b2818))] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending
                ? "Sending…"
                : `Flag to ${resolvedCount || 0}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setOpen(true)
        }
        className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap border border-[rgb(var(--sep-colour-6f6755))]/70 bg-[rgb(var(--sep-colour-17110d))] px-4 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-c8ae83))] transition hover:bg-[rgb(var(--sep-colour-21170f))] hover:text-[rgb(var(--sep-colour-ead4ad))]"
        title="Send selected characters a private message asking them to read this topic"
      >
        ⚑ Flag for reading
      </button>

      {mounted && modal
        ? createPortal(
            modal,
            document.body,
          )
        : null}
    </>
  );
}

function SelectionGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: Option[];
  selected: Set<string>;
  onToggle: (
    id: string,
  ) => void;
}) {
  if (options.length === 0) {
    return null;
  }

  return (
    <section>
      <h3 className="mb-2 text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-9b774b))]">
        {title}
      </h3>

      <div className="flex flex-wrap gap-1.5">
        {options.map(
          (option) => {
            const active =
              selected.has(
                option.id,
              );

            return (
              <button
                key={
                  option.id
                }
                type="button"
                onClick={() =>
                  onToggle(
                    option.id,
                  )
                }
                className={`border px-2.5 py-1.5 text-[9px] transition ${
                  active
                    ? "border-[rgb(var(--sep-colour-a47a45))] bg-[rgb(var(--sep-colour-342216))] text-[rgb(var(--sep-colour-e3c79a))]"
                    : "border-[rgb(var(--sep-colour-4f3b28))] bg-[rgb(var(--sep-colour-15100d))] text-[rgb(var(--sep-colour-89775f))] hover:border-[rgb(var(--sep-colour-765735))]"
                }`}
              >
                {active
                  ? "✓ "
                  : ""}
                {option.name}
              </button>
            );
          },
        )}
      </div>
    </section>
  );
}
