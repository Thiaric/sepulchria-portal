"use client";

import {
  useMemo,
  useState,
} from "react";

export type PmRecipient = {
  id: string;
  name: string;
  title: string | null;
};

export type PmFriend = {
  id: string;
  name: string;
  scope: "ingame" | "offgame";
};

export function PmRecipientPicker({
  characters,
  friends,
  friendListEnabled,
}: {
  characters: PmRecipient[];
  friends: PmFriend[];
  friendListEnabled: boolean;
}) {
  const [
    selected,
    setSelected,
  ] = useState<Set<string>>(
    new Set(),
  );

  const [query, setQuery] =
    useState("");

  const filtered =
    useMemo(() => {
      const q =
        query
          .trim()
          .toLowerCase();

      if (!q) {
        return characters;
      }

      return characters.filter(
        (character) =>
          `${character.name} ${character.title ?? ""}`
            .toLowerCase()
            .includes(q),
      );
    }, [characters, query]);

  function toggle(id: string) {
    setSelected(
      (current) => {
        const next =
          new Set(current);

        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }

        return next;
      },
    );
  }

  function selectFriends() {
    setSelected(
      (current) => {
        const next =
          new Set(current);

        for (const friend of friends) {
          next.add(friend.id);
        }

        return next;
      },
    );
  }

  return (
    <div className="space-y-4">
      {[
        ...selected,
      ].map((id) => (
        <input
          key={id}
          type="hidden"
          name="recipientIds"
          value={id}
        />
      ))}

      <div>
        <label className="mb-2 block text-[8px] uppercase tracking-[0.2em] text-[#806b50]">
          Find characters
        </label>

        <input
          type="search"
          value={query}
          onChange={(event) =>
            setQuery(
              event.target.value,
            )
          }
          placeholder="Search by character name..."
          className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-2.5 text-xs text-[#d7c4a5] outline-none"
        />
      </div>

      {friendListEnabled &&
      friends.length > 0 ? (
        <details className="border border-[#60482e]/45 bg-[#100c09]">
          <summary className="cursor-pointer px-3 py-2 text-[8px] uppercase tracking-[0.16em] text-[#c6a36f]">
            Friend List
          </summary>

          <div className="border-t border-[#60482e]/35 p-3">
            <button
              type="button"
              onClick={
                selectFriends
              }
              className="mb-2 border border-[#80613b] px-2.5 py-1.5 text-[7px] uppercase tracking-[0.14em] text-[#dfbd84]"
            >
              Select all Friend List
            </button>

            <div className="grid gap-1 sm:grid-cols-2">
              {friends.map(
                (friend) => (
                  <label
                    key={
                      friend.id
                    }
                    className="flex cursor-pointer items-center gap-2 border border-[#60482e]/25 px-2 py-1.5 text-[10px] text-[#bbaa90]"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(
                        friend.id,
                      )}
                      onChange={() =>
                        toggle(
                          friend.id,
                        )
                      }
                    />

                    <span className="min-w-0 flex-1 truncate">
                      {
                        friend.name
                      }
                    </span>

                    <span className="text-[7px] uppercase text-[#746653]">
                      {friend.scope ===
                      "ingame"
                        ? "IG"
                        : "OG"}
                    </span>
                  </label>
                ),
              )}
            </div>
          </div>
        </details>
      ) : null}

      <div className="max-h-64 space-y-1 overflow-y-auto border border-[#60482e]/35 p-2">
        {filtered.map(
          (character) => (
            <label
              key={
                character.id
              }
              className="flex cursor-pointer items-center gap-2 border border-[#60482e]/25 px-2 py-2 text-xs text-[#c7b394]"
            >
              <input
                type="checkbox"
                checked={selected.has(
                  character.id,
                )}
                onChange={() =>
                  toggle(
                    character.id,
                  )
                }
              />

              <span className="min-w-0 flex-1 truncate">
                {
                  character.name
                }
              </span>
            </label>
          ),
        )}
      </div>

      <p className="text-[9px] text-[#7e715f]">
        {selected.size} recipient
        {selected.size === 1
          ? ""
          : "s"}{" "}
        selected. Selecting two or more recipients creates one shared group conversation.
      </p>
    </div>
  );
}
