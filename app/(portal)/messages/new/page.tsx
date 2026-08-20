import Link from "next/link";
import { redirect } from "next/navigation";

import { hasCharacterFeature } from "@/lib/features/character-feature-entitlements";
import { createClient } from "@/lib/supabase/server";

import {
  startMultiConversation,
} from "../pm-upgrade-actions";
import {
  PmRecipientPicker,
} from "../components/pm-recipient-picker";

type CharacterRow = {
  id: string;
  first_name: string;
  surname: string | null;
  display_name: string | null;
  title: string | null;
};

function nameOf(
  character: CharacterRow,
) {
  return (
    character.display_name?.trim() ||
    [
      character.first_name,
      character.surname,
    ]
      .filter(Boolean)
      .join(" ")
      .trim()
  );
}

export default async function NewPrivateMessagePage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const {
    data: character,
    error: characterError,
  } = await supabase
    .from("characters")
    .select("id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (characterError) {
    throw new Error(
      characterError.message,
    );
  }

  if (!character) {
    redirect(
      "/character/create",
    );
  }

  const [
    charactersResult,
    blocksResult,
    friendEnabled,
  ] = await Promise.all([
    supabase
      .from("characters")
      .select(
        "id, first_name, surname, display_name, title",
      )
      .eq("status", "approved")
      .eq("is_system", false)
      .eq("is_system", false)
      .neq("id", character.id)
      .order("display_name"),
    supabase
      .from("character_blocks")
      .select(
        "blocker_character_id, blocked_character_id",
      )
      .or(
        `blocker_character_id.eq.${character.id},blocked_character_id.eq.${character.id}`,
      ),
    hasCharacterFeature(
      character.id,
      "friend_list",
    ),
  ]);

  const firstError =
    charactersResult.error ??
    blocksResult.error;

  if (firstError) {
    throw new Error(
      firstError.message,
    );
  }

  const blocked =
    new Set<string>();

  for (
    const row of
      blocksResult.data ?? []
  ) {
    blocked.add(
      row.blocker_character_id ===
        character.id
        ? row.blocked_character_id
        : row.blocker_character_id,
    );
  }

  const characters =
    (
      charactersResult.data ??
      []
    )
      .filter(
        (row) =>
          !blocked.has(
            row.id,
          ),
      )
      .map((row) => ({
        id: row.id,
        name: nameOf(
          row as CharacterRow,
        ),
        title:
          row.title ?? null,
      }));

  let friends: Array<{
    id: string;
    name: string;
    scope:
      | "ingame"
      | "offgame";
  }> = [];

  if (friendEnabled) {
    const {
      data: entries,
      error,
    } = await supabase
      .from(
        "character_friend_entries",
      )
      .select(
        "target_character_id, list_scope",
      )
      .eq(
        "owner_character_id",
        character.id,
      );

    if (error) {
      throw new Error(
        error.message,
      );
    }

    const byId =
      new Map(
        characters.map(
          (entry) => [
            entry.id,
            entry,
          ],
        ),
      );

    friends =
      (entries ?? [])
        .map((entry) => {
          const target =
            byId.get(
              entry.target_character_id,
            );

          return target
            ? {
                id:
                  target.id,
                name:
                  target.name,
                scope:
                  entry.list_scope as
                    | "ingame"
                    | "offgame",
              }
            : null;
        })
        .filter(
          (
            entry,
          ): entry is {
            id: string;
            name: string;
            scope:
              | "ingame"
              | "offgame";
          } =>
            entry !== null,
        );
  }

  return (
    <main className="mx-auto max-w-3xl p-5 sm:p-7">
      <Link
        href="/messages"
        className="text-[9px] uppercase tracking-[0.18em] text-[#a98b61]"
      >
        ← Messages
      </Link>

      <section className="mt-4 border border-[#60482e]/45 bg-[#15100d] p-5 sm:p-6">
        <p className="text-[8px] uppercase tracking-[0.22em] text-[#8c704b]">
          Private correspondence
        </p>

        <h1 className="mt-2 font-serif text-3xl text-[#e2c99d]">
          New message
        </h1>

        <form
          action={
            startMultiConversation
          }
          className="mt-5 space-y-5"
        >
          <PmRecipientPicker
            characters={
              characters
            }
            friends={friends}
            friendListEnabled={
              friendEnabled
            }
          />

          <label className="block">
            <span className="mb-2 block text-[8px] uppercase tracking-[0.18em] text-[#806b50]">
              Group name (optional)
            </span>

            <input
              name="groupTitle"
              maxLength={80}
              placeholder="Used only when several recipients are selected"
              className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-2.5 text-xs text-[#d7c4a5] outline-none"
            />
          </label>

          <button
            type="submit"
            className="border border-[#a07742] bg-[#402a17] px-5 py-2.5 text-[9px] uppercase tracking-[0.18em] text-[#f1d5a2]"
          >
            Start conversation
          </button>
        </form>
      </section>
    </main>
  );
}
