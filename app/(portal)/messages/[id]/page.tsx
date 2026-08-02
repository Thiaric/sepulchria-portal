import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import MessageComposer from "../components/MessageComposer";
import { RichMessageContent } from "@/components/messages/rich-message-content";
import {
  toggleArchive,
  toggleBlock,
} from "../actions";
import ConversationRealtime from "./components/ConversationRealtime";

import { createClient } from "@/lib/supabase/server";
import type {
  DirectMessage,
  PrivateMessageMode,
} from "@/types/messages";

type ConversationPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type OtherCharacter = {
  id: string;
  display_name: string | null;
  portrait_url: string | null;
  public_slug: string | null;
};

function MessageModeBadge({
  mode,
}: {
  mode: PrivateMessageMode;
}) {
  const ongame = mode === "ongame";

  return (
    <span
      className={`inline-flex border px-2 py-1 text-[7px] uppercase tracking-[0.18em] ${
        ongame
          ? "border-[#9b7446]/70 bg-[#312215] text-[#e2bd82]"
          : "border-[#687083]/70 bg-[#22252c] text-[#c6ccd8]"
      }`}
    >
      {ongame
        ? "On-game"
        : "Off-game"}
    </span>
  );
}

export default async function ConversationPage({
  params,
}: ConversationPageProps) {
  const { id } = await params;

  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const {
    data: character,
    error: characterError,
  } = await supabase
    .from("characters")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (characterError) {
    throw new Error(
      characterError.message,
    );
  }

  if (!character) {
    redirect("/character/create");
  }

  const {
    data: membership,
    error: membershipError,
  } = await supabase
    .from(
      "direct_conversation_participants",
    )
    .select("conversation_id")
    .eq("conversation_id", id)
    .eq(
      "character_id",
      character.id,
    )
    .maybeSingle();

  if (membershipError) {
    throw new Error(
      membershipError.message,
    );
  }

  if (!membership) {
    notFound();
  }

  const [
    otherParticipantResult,
    messagesResult,
  ] = await Promise.all([
    supabase
      .from(
        "direct_conversation_participants",
      )
      .select(`
        character:characters(
          id,
          display_name,
          portrait_url,
          public_slug
        )
      `)
      .eq("conversation_id", id)
      .neq(
        "character_id",
        character.id,
      )
      .maybeSingle(),

    supabase
      .from("direct_messages")
      .select(`
        id,
        body,
        created_at,
        sender_character_id,
        message_mode,
        sender:characters!direct_messages_sender_character_id_fkey(
          id,
          display_name,
          portrait_url
        )
      `)
      .eq("conversation_id", id)
      .order("created_at", {
        ascending: true,
      })
      .limit(200),
  ]);

  if (
    otherParticipantResult.error
  ) {
    throw new Error(
      otherParticipantResult.error
        .message,
    );
  }

  if (messagesResult.error) {
    throw new Error(
      messagesResult.error.message,
    );
  }

  const relation =
    otherParticipantResult.data
      ?.character;

  const other = (
    Array.isArray(relation)
      ? relation[0]
      : relation
  ) as
    | OtherCharacter
    | null
    | undefined;

  if (!other) {
    notFound();
  }

  const [
    blockedByMeResult,
    blockedMeResult,
  ] = await Promise.all([
    supabase
      .from("character_blocks")
      .select(
        "blocked_character_id",
      )
      .eq(
        "blocker_character_id",
        character.id,
      )
      .eq(
        "blocked_character_id",
        other.id,
      )
      .maybeSingle(),

    supabase
      .from("character_blocks")
      .select(
        "blocker_character_id",
      )
      .eq(
        "blocker_character_id",
        other.id,
      )
      .eq(
        "blocked_character_id",
        character.id,
      )
      .maybeSingle(),
  ]);

  if (blockedByMeResult.error) {
    throw new Error(
      blockedByMeResult.error
        .message,
    );
  }

  if (blockedMeResult.error) {
    throw new Error(
      blockedMeResult.error.message,
    );
  }

  const blockedByMe = Boolean(
    blockedByMeResult.data,
  );

  const blocked = Boolean(
    blockedByMeResult.data ||
      blockedMeResult.data,
  );

  const rawMessages =
    (messagesResult.data ??
      []) as DirectMessage[];

  const profileHref =
    other.public_slug
      ? `/characters/${other.public_slug}?from=messages`
      : "/characters";

  return (
    <main className="min-h-screen bg-[#100d0b] text-[#e7d5b0]">
      <ConversationRealtime
        conversationId={id}
      />

      <header className="border-b border-[#654b2e]/40 bg-[#0c0a08]/90">
        <div className="mx-auto flex min-h-20 max-w-[1000px] items-center justify-between px-5">
          <Link
            href="/messages"
            className="text-xs uppercase tracking-[0.2em] text-[#a98b61]"
          >
            ← Messages
          </Link>

          <Link
            href="/"
            className="font-serif text-xl tracking-[0.22em] text-[#d9bd82]"
          >
            SEPULCHRIA
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1000px] px-5 py-8">
        <section className="border border-[#60482e]/45 bg-[#15100d]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#59432c]/40 p-5 sm:p-6">
            <Link
              href={profileHref}
              className="flex min-w-0 items-center gap-4"
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden border border-[#60482e] bg-[#0d0a08]">
                {other.portrait_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={
                      other.portrait_url
                    }
                    alt={`Portrait of ${
                      other.display_name ??
                      "character"
                    }`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center font-serif text-lg text-[#947a59]">
                    ?
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-[0.25em] text-[#826b4d]">
                  Conversation with
                </p>

                <h1 className="mt-1 truncate font-serif text-2xl text-[#dec69a]">
                  {other.display_name ??
                    "Unknown character"}
                </h1>
              </div>
            </Link>

            <div className="flex gap-2">
              <form
                action={toggleArchive}
              >
                <input
                  type="hidden"
                  name="conversationId"
                  value={id}
                />

                <input
                  type="hidden"
                  name="archive"
                  value="true"
                />

                <button
                  type="submit"
                  className="border border-[#59432c] px-3 py-2 text-[10px] uppercase tracking-[0.18em]"
                >
                  Archive
                </button>
              </form>

              <form
                action={toggleBlock}
              >
                <input
                  type="hidden"
                  name="characterId"
                  value={other.id}
                />

                <input
                  type="hidden"
                  name="block"
                  value={
                    blockedByMe
                      ? "false"
                      : "true"
                  }
                />

                <button
                  type="submit"
                  className="border border-[#7b4035] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#d99b8e]"
                >
                  {blockedByMe
                    ? "Unblock"
                    : "Block"}
                </button>
              </form>
            </div>
          </div>

          <div className="border-b border-[#59432c]/35 bg-[#100c09] px-5 py-3 text-[9px] leading-5 text-[#827564] sm:px-6">
            <span className="text-[#d0aa70]">
              On-game
            </span>{" "}
            messages belong to the story.{" "}
            <span className="text-[#aeb5c4]">
              Off-game
            </span>{" "}
            messages are player communication.
          </div>

          <div className="max-h-[58vh] space-y-4 overflow-y-auto p-5 sm:p-6">
            {rawMessages.map(
              (message) => {
                const senderRelation =
                  message.sender;

                const sender =
                  Array.isArray(
                    senderRelation,
                  )
                    ? senderRelation[0]
                    : senderRelation;

                const own =
                  message.sender_character_id ===
                  character.id;

                const ongame =
                  message.message_mode ===
                  "ongame";

                return (
                  <article
                    key={message.id}
                    className={`max-w-[82%] border p-4 ${
                      own
                        ? ongame
                          ? "ml-auto border-[#80613c] bg-[#2c2117]"
                          : "ml-auto border-[#687083] bg-[#252830]"
                        : ongame
                          ? "border-[#514233] bg-[#100c09]"
                          : "border-[#5c6372] bg-[#191b21]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={`font-serif text-sm ${
                            ongame
                              ? "text-[#d8bf91]"
                              : "text-[#cbd0dc]"
                          }`}
                        >
                          {sender?.display_name ??
                            "Unknown"}
                        </p>

                        <MessageModeBadge
                          mode={
                            message.message_mode
                          }
                        />
                      </div>

                      <time className="text-[9px] uppercase tracking-[0.16em] text-[#776b5c]">
                        {new Date(
                          message.created_at,
                        ).toLocaleString(
                          "en-GB",
                        )}
                      </time>
                    </div>

                    <div
                      className={`mt-3 break-words text-sm leading-7 ${
                        ongame
                          ? "text-[#c7b79d]"
                          : "text-[#c2c7d1]"
                      }`}
                    >
                      <RichMessageContent
                        body={message.body}
                      />
                    </div>
                  </article>
                );
              },
            )}

            {rawMessages.length ===
            0 ? (
              <p className="py-12 text-center text-sm text-[#8f8271]">
                Begin the conversation.
              </p>
            ) : null}
          </div>

          {blocked ? (
            <p className="border-t border-[#59432c]/40 p-6 text-center text-sm text-[#c78f7e]">
              Messaging is disabled
              for this conversation.
            </p>
          ) : (
            <MessageComposer
              conversationId={id}
            />
          )}
        </section>
      </div>
    </main>
  );
}
