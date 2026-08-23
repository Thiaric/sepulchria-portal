#!/usr/bin/env python3
from pathlib import Path
import argparse, subprocess

BASELINE="51ce3a89cf28daecd525d23b45c3bf0e3cb1f3d4"

def once(s,a,b,label):
    n=s.count(a)
    if n!=1:
        raise SystemExit(f"ERROR: {label}: expected anchor once, found {n}. Nothing written.")
    return s.replace(a,b,1)

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--dry-run",action="store_true")
    args=ap.parse_args()
    root=Path.cwd()
    if not (root/"package.json").exists():
        raise SystemExit("ERROR: run from sepulchria-portal root.")
    head=subprocess.check_output(["git","rev-parse","HEAD"],text=True).strip()
    if head!=BASELINE:
        raise SystemExit(f"ERROR: HEAD is {head}; expected {BASELINE}.")
    changes={}

    # 1) Realtime becomes a transport: no full RSC refresh. Broadcast the inserted row locally.
    p=root/"app/(portal)/messages/[id]/components/ConversationRealtime.tsx"
    s=p.read_text(encoding="utf-8")
    s=once(s,'import { useRouter } from "next/navigation";\n\n','',"remove router import")
    s=once(s,'''type DirectMessageInsert = {
  sender_character_id:
    | string
    | null;
};''','''type DirectMessageInsert = {
  id: string;
  body: string;
  created_at: string;
  sender_character_id: string;
  message_mode: "ongame" | "offgame";
  client_nonce?: string | null;
  forwarded_from_message_id?: string | null;
  forwarded_sender_name?: string | null;
  forwarded_created_at?: string | null;
  forwarded_body?: string | null;
};''',"expand realtime row type")
    s=once(s,'''const PRIVATE_MESSAGE_SENT_EVENT =
  "sepulchria:private-message-sent";''','''const PRIVATE_MESSAGE_SENT_EVENT =
  "sepulchria:private-message-sent";

const PRIVATE_MESSAGE_REALTIME_EVENT =
  "sepulchria:private-message-realtime";''',"add realtime event")
    s=once(s,'''  const router =
    useRouter();

''','',"remove router hook")
    s=once(s,'''  const refreshTimerRef =
    useRef<number | null>(
      null,
    );

''','',"remove refresh timer")
    s=once(s,'''            if (
              refreshTimerRef.current !==
              null
            ) {
              window.clearTimeout(
                refreshTimerRef.current,
              );
            }

            refreshTimerRef.current =
              window.setTimeout(
                () => {
                  refreshTimerRef.current =
                    null;
                  router.refresh();
                },
                25,
              );

            window.setTimeout(
              keepConversationRead,
              120,
            );''','''            window.dispatchEvent(
              new CustomEvent(
                PRIVATE_MESSAGE_REALTIME_EVENT,
                {
                  detail: {
                    conversationId,
                    message: inserted,
                  },
                },
              ),
            );

            window.setTimeout(
              keepConversationRead,
              120,
            );''',"replace RSC refresh with client event")
    s=once(s,'''      if (
        refreshTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          refreshTimerRef.current,
        );
      }

''','',"remove refresh cleanup")
    s=once(s,'''    playPortalSound,
    router,
    scrollToBottom,''','''    playPortalSound,
    scrollToBottom,''',"remove router dependency")
    changes[p]=s

    # 2) Composer emits an optimistic row immediately and removes it if the server rejects the send.
    p=root/"app/(portal)/messages/components/MessageComposer.tsx"
    s=p.read_text(encoding="utf-8")
    s=once(s,'''const PRIVATE_MESSAGE_SENT_EVENT =
  "sepulchria:private-message-sent";''','''const PRIVATE_MESSAGE_SENT_EVENT =
  "sepulchria:private-message-sent";

const PRIVATE_MESSAGE_OPTIMISTIC_EVENT =
  "sepulchria:private-message-optimistic";

const PRIVATE_MESSAGE_SEND_RESULT_EVENT =
  "sepulchria:private-message-send-result";''',"composer event constants")
    s=once(s,'''  const formRef =
    useRef<HTMLFormElement>(null);

  useEffect(() => {''','''  const formRef =
    useRef<HTMLFormElement>(null);

  const submittedNonceRef =
    useRef<string | null>(null);

  useEffect(() => {''',"composer submitted nonce ref")
    s=once(s,'''  useEffect(() => {
    if (
      state.ok &&
      state.submittedAt
    ) {
      setBody("");
      setNonce(
        crypto.randomUUID(),
      );

      /*
       * Tell the open conversation that a successful send just happened.
       * ConversationRealtime owns the actual scroll behaviour.
       */
      window.dispatchEvent(
        new CustomEvent(
          PRIVATE_MESSAGE_SENT_EVENT,
          {
            detail: {
              conversationId,
            },
          },
        ),
      );

      formRef.current
        ?.querySelector<HTMLTextAreaElement>(
          "textarea",
        )
        ?.focus();
    }
  }, [
    conversationId,
    state.ok,
    state.submittedAt,
  ]);''','''  useEffect(() => {
    const submittedNonce =
      submittedNonceRef.current;

    if (!submittedNonce || !state.message) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent(
        PRIVATE_MESSAGE_SEND_RESULT_EVENT,
        {
          detail: {
            conversationId,
            nonce: submittedNonce,
            ok: state.ok,
          },
        },
      ),
    );

    submittedNonceRef.current = null;

    if (state.ok && state.submittedAt) {
      setBody("");
      setNonce(crypto.randomUUID());

      window.dispatchEvent(
        new CustomEvent(
          PRIVATE_MESSAGE_SENT_EVENT,
          {
            detail: {
              conversationId,
            },
          },
        ),
      );

      formRef.current
        ?.querySelector<HTMLTextAreaElement>(
          "textarea",
        )
        ?.focus();
    }
  }, [
    conversationId,
    state.message,
    state.ok,
    state.submittedAt,
  ]);''',"composer result effect")
    s=once(s,'''    <form
      ref={formRef}
      action={action}
      className="border-t border-[rgb(var(--sep-colour-59432c))]/40 p-5 sm:p-6"
    >''','''    <form
      ref={formRef}
      action={action}
      onSubmit={() => {
        submittedNonceRef.current = nonce;

        window.dispatchEvent(
          new CustomEvent(
            PRIVATE_MESSAGE_OPTIMISTIC_EVENT,
            {
              detail: {
                conversationId,
                nonce,
                body,
                messageMode,
              },
            },
          ),
        );
      }}
      className="border-t border-[rgb(var(--sep-colour-59432c))]/40 p-5 sm:p-6"
    >''',"composer optimistic submit")
    changes[p]=s

    # 3) Message list owns live client state and merges optimistic + realtime rows by nonce/id.
    p=root/"app/(portal)/messages/[id]/components/ConversationMessageList.tsx"
    s=p.read_text(encoding="utf-8")
    s=once(s,'''import {
  useMemo,
  useState,
} from "react";''','''import {
  useEffect,
  useMemo,
  useState,
} from "react";''',"message list useEffect import")
    s=once(s,'''type Props = {
  conversationId: string;
  viewerCharacterId: string;
  messages: DirectMessage[];
};''','''type SenderIdentity = {
  id: string;
  display_name: string;
  portrait_url: string | null;
};

type LiveDirectMessage = DirectMessage & {
  client_nonce?: string | null;
  optimistic?: boolean;
};

type Props = {
  conversationId: string;
  viewerCharacterId: string;
  viewerSender: SenderIdentity;
  otherSender: SenderIdentity;
  messages: DirectMessage[];
};

const PRIVATE_MESSAGE_OPTIMISTIC_EVENT =
  "sepulchria:private-message-optimistic";
const PRIVATE_MESSAGE_REALTIME_EVENT =
  "sepulchria:private-message-realtime";
const PRIVATE_MESSAGE_SEND_RESULT_EVENT =
  "sepulchria:private-message-send-result";''',"message list live types")
    s=once(s,'''export function ConversationMessageList({
  conversationId,
  viewerCharacterId,
  messages,
}: Props) {
  const [query, setQuery] =''','''export function ConversationMessageList({
  conversationId,
  viewerCharacterId,
  viewerSender,
  otherSender,
  messages,
}: Props) {
  const [liveMessages, setLiveMessages] =
    useState<LiveDirectMessage[]>(messages);

  useEffect(() => {
    setLiveMessages((current) => {
      const optimistic = current.filter(
        (message) => message.optimistic,
      );
      const serverIds = new Set(
        messages.map((message) => message.id),
      );
      return [
        ...messages,
        ...optimistic.filter(
          (message) => !serverIds.has(message.id),
        ),
      ];
    });
  }, [messages]);

  useEffect(() => {
    const handleOptimistic = (event: Event) => {
      const detail = (event as CustomEvent<{
        conversationId: string;
        nonce: string;
        body: string;
        messageMode: PrivateMessageMode;
      }>).detail;

      if (detail?.conversationId !== conversationId) return;

      const optimistic: LiveDirectMessage = {
        id: `optimistic:${detail.nonce}`,
        body: detail.body,
        created_at: new Date().toISOString(),
        sender_character_id: viewerCharacterId,
        message_mode: detail.messageMode,
        sender: viewerSender,
        client_nonce: detail.nonce,
        optimistic: true,
      };

      setLiveMessages((current) => [
        ...current.filter(
          (message) => message.client_nonce !== detail.nonce,
        ),
        optimistic,
      ]);
    };

    const handleRealtime = (event: Event) => {
      const detail = (event as CustomEvent<{
        conversationId: string;
        message: Omit<LiveDirectMessage, "sender">;
      }>).detail;

      if (
        detail?.conversationId !== conversationId ||
        !detail.message?.id
      ) return;

      const row = detail.message;
      const sender =
        row.sender_character_id === viewerCharacterId
          ? viewerSender
          : otherSender;
      const real: LiveDirectMessage = {
        ...row,
        sender,
        optimistic: false,
      };

      setLiveMessages((current) => {
        const withoutMatch = current.filter((message) => {
          if (message.id === real.id) return false;
          if (
            real.client_nonce &&
            message.client_nonce === real.client_nonce
          ) return false;
          return true;
        });
        return [...withoutMatch, real].sort(
          (a, b) =>
            Date.parse(a.created_at) - Date.parse(b.created_at),
        );
      });
    };

    const handleSendResult = (event: Event) => {
      const detail = (event as CustomEvent<{
        conversationId: string;
        nonce: string;
        ok: boolean;
      }>).detail;

      if (
        detail?.conversationId !== conversationId ||
        detail.ok
      ) return;

      setLiveMessages((current) =>
        current.filter(
          (message) => message.client_nonce !== detail.nonce,
        ),
      );
    };

    window.addEventListener(
      PRIVATE_MESSAGE_OPTIMISTIC_EVENT,
      handleOptimistic,
    );
    window.addEventListener(
      PRIVATE_MESSAGE_REALTIME_EVENT,
      handleRealtime,
    );
    window.addEventListener(
      PRIVATE_MESSAGE_SEND_RESULT_EVENT,
      handleSendResult,
    );

    return () => {
      window.removeEventListener(
        PRIVATE_MESSAGE_OPTIMISTIC_EVENT,
        handleOptimistic,
      );
      window.removeEventListener(
        PRIVATE_MESSAGE_REALTIME_EVENT,
        handleRealtime,
      );
      window.removeEventListener(
        PRIVATE_MESSAGE_SEND_RESULT_EVENT,
        handleSendResult,
      );
    };
  }, [
    conversationId,
    otherSender,
    viewerCharacterId,
    viewerSender,
  ]);

  const [query, setQuery] =''',"message list live state")
    s=once(s,'''      return messages.filter(
        (message) => {''','''      return liveMessages.filter(
        (message) => {''',"filter live messages")
    s=once(s,'''      messages,
      mode,
      startDate,''','''      liveMessages,
      mode,
      startDate,''',"memo live dependency")
    s=once(s,'''              of {messages.length}{" "}
              visible''','''              of {liveMessages.length}{" "}
              visible''',"visible count live")
    s=once(s,'''                        <a
                          href={`/messages/forward/${message.id}`}''','''                        {!message.optimistic ? <a
                          href={`/messages/forward/${message.id}`}''',"wrap forward start")
    s=once(s,'''                        >
                          Forward
                        </a>

                        {!own ? (''','''                        >
                          Forward
                        </a> : null}

                        {!own && !message.optimistic ? (''',"wrap forward end")
    s=once(s,'''                        <form
                          action={
                            deletePrivateMessages
                          }''','''                        {!message.optimistic ? <form
                          action={
                            deletePrivateMessages
                          }''',"wrap delete start")
    s=once(s,'''                          </button>
                        </form>
                      </div>
                    </div>''','''                          </button>
                        </form> : null}
                      </div>
                    </div>''',"wrap delete end")
    changes[p]=s

    # 4) Page supplies sender identities so realtime rows render with no extra query.
    p=root/"app/(portal)/messages/[id]/page.tsx"
    s=p.read_text(encoding="utf-8")
    s=once(s,'''    .from("characters")
    .select("id")
    .eq("user_id", user.id)''','''    .from("characters")
    .select("id, display_name, portrait_url")
    .eq("user_id", user.id)''',"load viewer identity")
    s=once(s,'''          <ConversationMessageList
            conversationId={id}
            viewerCharacterId={
              character.id
            }
            messages={
              rawMessages
            }
          />''','''          <ConversationMessageList
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
            otherSender={{
              id: other.id,
              display_name:
                other.display_name ?? "Unknown",
              portrait_url:
                other.portrait_url ?? null,
            }}
            messages={
              rawMessages
            }
          />''',"pass sender identities")
    changes[p]=s

    print("Baseline:",head[:7])
    print(f"Prepared {len(changes)} local file change(s):")
    for p in changes:
        print(" ",str(p.relative_to(root)).replace("/","\\"))
    if args.dry_run:
        print("\nDRY RUN ONLY — no files written.")
        return
    for p,s in changes.items():
        p.write_text(s,encoding="utf-8",newline="\n")
    print("\nApplied LOCALLY only.")
    print("No SQL changes required.")
    print("Next: npm run build")

if __name__=="__main__":
    main()
