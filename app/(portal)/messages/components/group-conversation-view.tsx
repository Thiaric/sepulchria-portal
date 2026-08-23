import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { DirectMessage } from "@/types/messages";

import MessageComposer from "./MessageComposer";
import { ConversationMessageList } from "../[id]/components/ConversationMessageList";
import ConversationRealtime from "../[id]/components/ConversationRealtime";
import { DeleteConversationForm } from "../[id]/components/DeleteConversationForm";
import { toggleArchive } from "../actions";

type Participant = {
  id: string;
  display_name: string | null;
  first_name: string;
  surname: string | null;
  portrait_url: string | null;
};

function nameOf(
  character: Participant,
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

export async function GroupConversationView({
  conversationId,
  viewerCharacterId,
  title,
}: {
  conversationId: string;
  viewerCharacterId: string;
  title: string | null;
}) {
  const supabase =
    await createClient();

  const [
    participantsResult,
    messagesResult,
    deletionsResult,
  ] = await Promise.all([
    supabase
      .from(
        "direct_conversation_participants",
      )
      .select(`
        character:characters(
          id,
          display_name,
          first_name,
          surname,
          portrait_url
        )
      `)
      .eq(
        "conversation_id",
        conversationId,
      )
      .is(
        "deleted_at",
        null,
      ),
    supabase
      .from("direct_messages")
      .select(`
        id,
        body,
        created_at,
        sender_character_id,
        message_mode,
        forwarded_from_message_id,
        forwarded_sender_name,
        forwarded_created_at,
        forwarded_body,
        sender:characters!direct_messages_sender_character_id_fkey(
          id,
          display_name,
          portrait_url
        )
      `)
      .eq(
        "conversation_id",
        conversationId,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      )
      .limit(1000),
    supabase
      .from(
        "direct_message_deletions",
      )
      .select("message_id")
      .eq(
        "character_id",
        viewerCharacterId,
      ),
  ]);

  const firstError =
    participantsResult.error ??
    messagesResult.error ??
    deletionsResult.error;

  if (firstError) {
    throw new Error(
      firstError.message,
    );
  }

  const participants =
    (
      participantsResult.data ??
      []
    )
      .map((row) => {
        const relation =
          row.character;

        return (
          Array.isArray(relation)
            ? relation[0]
            : relation
        ) as Participant | null;
      })
      .filter(
        (
          row,
        ): row is Participant =>
          Boolean(row),
      );

  if (
    !participants.some(
      (participant) =>
        participant.id ===
        viewerCharacterId,
    )
  ) {
    notFound();
  }

  const deleted =
    new Set(
      (
        deletionsResult.data ??
        []
      ).map(
        (row) =>
          row.message_id,
      ),
    );

  const messages =
    (
      messagesResult.data ??
      []
    )
      .filter(
        (message) =>
          !deleted.has(
            message.id,
          ),
      )
      .reverse() as unknown as DirectMessage[];

  const displayTitle =
    title?.trim() ||
    participants
      .filter(
        (participant) =>
          participant.id !==
          viewerCharacterId,
      )
      .map(nameOf)
      .join(", ");

  const viewerParticipant =
    participants.find(
      (participant) =>
        participant.id ===
        viewerCharacterId,
    );

  if (!viewerParticipant) {
    notFound();
  }

  const viewerSender = {
    id: viewerParticipant.id,
    display_name:
      nameOf(viewerParticipant) ||
      "Unknown",
    portrait_url:
      viewerParticipant.portrait_url ??
      null,
  };

  const participantSenders =
    participants
      .filter(
        (participant) =>
          participant.id !==
          viewerCharacterId,
      )
      .map((participant) => ({
        id: participant.id,
        display_name:
          nameOf(participant) ||
          "Unknown",
        portrait_url:
          participant.portrait_url ??
          null,
      }));

  return (
    <main className="min-h-screen bg-[rgb(var(--sep-colour-100d0b))] text-[rgb(var(--sep-colour-e7d5b0))]">
      <ConversationRealtime
        conversationId={
          conversationId
        }
      />

      <div className="mx-auto max-w-[1000px] px-5 py-8">
        <Link
          href="/messages"
          className="text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-a98b61))]"
        >
          ← Messages
        </Link>

        <section className="mt-4 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[rgb(var(--sep-colour-59432c))]/40 p-5 sm:p-6">
            <div>
              <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-826b4d))]">
                Group conversation
              </p>

              <h1 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dec69a))]">
                {displayTitle ||
                  "Group conversation"}
              </h1>

              <p className="mt-2 max-w-2xl text-[10px] leading-5 text-[rgb(var(--sep-colour-887a67))]">
                {participants
                  .map(nameOf)
                  .join(" · ")}
              </p>
            </div>

            <div className="flex gap-2">
              <form
                action={
                  toggleArchive
                }
              >
                <input
                  type="hidden"
                  name="conversationId"
                  value={
                    conversationId
                  }
                />
                <input
                  type="hidden"
                  name="archive"
                  value="true"
                />
                <button
                  type="submit"
                  className="border border-[rgb(var(--sep-colour-59432c))] px-3 py-2 text-[9px] uppercase tracking-[0.16em]"
                >
                  Archive
                </button>
              </form>

              <DeleteConversationForm
                conversationId={
                  conversationId
                }
                isGroup
              />
            </div>
          </header>

          <ConversationMessageList
            conversationId={
              conversationId
            }
            viewerCharacterId={
              viewerCharacterId
            }
            viewerSender={
              viewerSender
            }
            participantSenders={
              participantSenders
            }
            messages={messages}
          />

          <MessageComposer
            conversationId={
              conversationId
            }
          />
        </section>
      </div>
    </main>
  );
}
