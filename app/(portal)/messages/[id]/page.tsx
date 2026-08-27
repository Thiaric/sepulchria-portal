import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import {
  MessageCharacterIcons,
  MessagePresenceStatus,
} from "@/components/messages/message-character-meta";
import { createClient } from "@/lib/supabase/server";
import { getStaffSession } from "@/lib/auth/require-staff";
import type { DirectMessage } from "@/types/messages";

import {
  toggleArchive,
} from "../actions";
import MessageComposer from "../components/MessageComposer";
import { ConversationMessageList } from "./components/ConversationMessageList";
import ConversationRealtime from "./components/ConversationRealtime";
import { DeleteConversationForm } from "./components/DeleteConversationForm";
import { GroupConversationView } from "../components/group-conversation-view";

type ConversationPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type CodexIdentity = {
  id: string;
  name: string;
  icon_url: string | null;
  colour: string | null;
};

type OtherCharacter = {
  id: string;
  display_name: string | null;
  portrait_url: string | null;
  public_slug: string | null;
  is_system: boolean;

  race:
    | CodexIdentity
    | CodexIdentity[]
    | null;

  association:
    | CodexIdentity
    | CodexIdentity[]
    | null;
};

type MessageDeletionRow = {
  message_id: string;
};

export default async function ConversationPage({
  params,
}: ConversationPageProps) {
  const { id } =
    await params;

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
    .select("id, display_name, portrait_url")
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

  const staffSession =
    await getStaffSession();

  const {
    data: membership,
    error: membershipError,
  } = await supabase
    .from(
      "direct_conversation_participants",
    )
    .select(
      "conversation_id, deleted_at",
    )
    .eq(
      "conversation_id",
      id,
    )
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

  if (
    !membership ||
    membership.deleted_at
  ) {
    notFound();
  }

  const {
    data: conversationMeta,
    error: conversationMetaError,
  } = await supabase
    .from("direct_conversations")
    .select("is_group, title")
    .eq("id", id)
    .maybeSingle();

  if (conversationMetaError) {
    throw new Error(
      conversationMetaError.message,
    );
  }

  if (conversationMeta?.is_group) {
    return (
      <GroupConversationView
        conversationId={id}
        viewerCharacterId={
          character.id
        }
        title={
          conversationMeta.title
        }
      />
    );
  }

  const [
    otherParticipantResult,
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
          portrait_url,
          public_slug,
          is_system,

          race:races!characters_race_id_fkey(
            id,
            name,
            icon_url,
            colour
          ),

          association:associations!characters_association_id_fkey(
            id,
            name,
            icon_url,
            colour
          )
        )
      `)
      .eq(
        "conversation_id",
        id,
      )
      .neq(
        "character_id",
        character.id,
      )
      .maybeSingle(),

    supabase
      .from(
        "direct_messages",
      )
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
        id,
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
      .select(
        "message_id",
      )
      .eq(
        "character_id",
        character.id,
      ),
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
      messagesResult.error
        .message,
    );
  }

  if (
    deletionsResult.error
  ) {
    throw new Error(
      deletionsResult.error
        .message,
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
      .from(
        "character_blocks",
      )
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
      .from(
        "character_blocks",
      )
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

  if (
    blockedByMeResult.error
  ) {
    throw new Error(
      blockedByMeResult.error
        .message,
    );
  }

  if (blockedMeResult.error) {
    throw new Error(
      blockedMeResult.error
        .message,
    );
  }

  const blocked =
    Boolean(
      blockedByMeResult.data ||
        blockedMeResult.data,
    );

  const deletedIds =
    new Set(
      (
        (deletionsResult.data ??
          []) as MessageDeletionRow[]
      ).map(
        (row) =>
          row.message_id,
      ),
    );

  const rawMessages = (
    (messagesResult.data ??
      []) as DirectMessage[]
  )
    .filter(
      (message) =>
        !deletedIds.has(
          message.id,
        ),
    )
    .reverse();

  const profileHref =
    !other.is_system &&
    other.public_slug
      ? `/characters/${other.public_slug}?from=messages`
      : "/messages";

  return (
    <main className="min-h-screen bg-[rgb(var(--sep-colour-100d0b))] text-[rgb(var(--sep-colour-e7d5b0))]">
      <ConversationRealtime
        conversationId={id}
      />

      <header className="border-b border-[rgb(var(--sep-colour-654b2e))]/40 bg-[rgb(var(--sep-colour-0c0a08))]/90">
        <div className="mx-auto flex min-h-14 max-w-[1000px] items-center justify-between px-4">
          <Link
            href="/messages"
            className="border border-[rgb(var(--sep-colour-59432c))] px-3 py-1.5 text-[9px] uppercase tracking-[0.16em]"
          >
            ← Messages
          </Link>

          <Link
            href="/"
            className="font-serif text-xl tracking-[0.22em] text-[rgb(var(--sep-colour-d9bd82))]"
          >
            SEPULCHRIA
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1000px] px-4 py-4">
        <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--sep-colour-59432c))]/40 p-3 sm:p-4">
            <Link
              href={profileHref}
              className="flex min-w-0 items-center gap-3"
            >
              <div className="h-11 w-11 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0d0a08))]">
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
                  <span className="flex h-full items-center justify-center font-serif text-lg text-[rgb(var(--sep-colour-947a59))]">
                    ?
                  </span>
                )}
              </div>

              <MessageCharacterIcons
                characterId={other.id}
                race={other.race}
              />

              <div className="min-w-0 pl-1">
                <p className="text-[9px] uppercase tracking-[0.25em] text-[rgb(var(--sep-colour-826b4d))]">
                  Conversation with
                </p>

                <h1 className="mt-0.5 truncate font-serif text-xl text-[rgb(var(--sep-colour-dec69a))]">
                  {other.display_name ??
                    "Unknown character"}
                </h1>

                <div className="mt-1">
                  <MessagePresenceStatus
                    characterId={
                      other.id
                    }
                    viewerIsStaff={
                      staffSession !==
                      null
                    }
                  />
                </div>
              </div>
            </Link>

            <div className="flex flex-wrap gap-2">
              <form
                action={
                  toggleArchive
                }
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
                  className="border border-[rgb(var(--sep-colour-59432c))] px-3 py-2 text-[10px] uppercase tracking-[0.18em]"
                >
                  Archive
                </button>
              </form>

              <DeleteConversationForm
  conversationId={id}
/>

            </div>
          </div>

          

          <ConversationMessageList
            conversationId={id}
            viewerCharacterId={
              character.id
            }
            viewerSender={{
              id: character.id,
              display_name:
                character.display_name ?? "Unknown",
              portrait_url:
                character.portrait_url ?? null,
            }}
            participantSenders={[
              {
                id: other.id,
                display_name:
                  other.display_name ?? "Unknown",
                portrait_url:
                  other.portrait_url ?? null,
              },
            ]}
            messages={
              rawMessages
            }
          />

          {other.is_system ? (
            <div className="border-t border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] px-4 py-2.5 text-center text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-7f725f))]">
              Automated Forum notification - replies are disabled
            </div>
          ) : blocked ? (
            <p className="border-t border-[rgb(var(--sep-colour-59432c))]/40 p-4 text-center text-sm text-[rgb(var(--sep-colour-c78f7e))]">
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
