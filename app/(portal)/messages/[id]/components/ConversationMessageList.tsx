"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { RichTextContentClient } from "@/components/editor/rich-text-content-client";
import { ReportButton } from "@/components/reports/report-button";
import { PrivateLocationInvitationMessage } from "@/components/messages/private-location-invitation-message";
import { BreezeLodgingInvitationMessage } from "@/components/messages/breeze-lodging-invitation-message";
import { OrderHeadquartersInvitationMessage } from "@/components/messages/order-headquarters-invitation-message";
import { stripRichTextForPreview } from "@/lib/rich-text-shared";
import type {
  DirectMessage,
  PrivateMessageMode,
} from "@/types/messages";

import {
  deletePrivateMessages,
} from "../../actions";

type SenderIdentity = {
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
  participantSenders: SenderIdentity[];
  messages: DirectMessage[];
};

const PRIVATE_MESSAGE_OPTIMISTIC_EVENT =
  "sepulchria:private-message-optimistic";
const PRIVATE_MESSAGE_REALTIME_EVENT =
  "sepulchria:private-message-realtime";
const PRIVATE_MESSAGE_SEND_RESULT_EVENT =
  "sepulchria:private-message-send-result";

function MessageModeBadge({
  mode,
}: {
  mode: PrivateMessageMode;
}) {
  const ongame =
    mode === "ongame";

  return (
    <span
      className={`inline-flex border px-2 py-1 text-[7px] uppercase tracking-[0.18em] ${
        ongame
          ? "border-[rgb(var(--sep-colour-9b7446))]/70 bg-[rgb(var(--sep-colour-312215))] text-[rgb(var(--sep-colour-e2bd82))]"
          : "border-[rgb(var(--sep-colour-687083))]/70 bg-[rgb(var(--sep-colour-22252c))] text-[rgb(var(--sep-colour-c6ccd8))]"
      }`}
    >
      {ongame
        ? "On-game"
        : "Off-game"}
    </span>
  );
}

function dateStart(
  value: string,
): number | null {
  if (!value) {
    return null;
  }

  const result =
    new Date(
      `${value}T00:00:00`,
    ).getTime();

  return Number.isNaN(
    result,
  )
    ? null
    : result;
}

function dateEnd(
  value: string,
): number | null {
  if (!value) {
    return null;
  }

  const result =
    new Date(
      `${value}T23:59:59.999`,
    ).getTime();

  return Number.isNaN(
    result,
  )
    ? null
    : result;
}

export function ConversationMessageList({
  conversationId,
  viewerCharacterId,
  viewerSender,
  participantSenders,
  messages,
}: Props) {
  const [liveMessages, setLiveMessages] =
    useState<LiveDirectMessage[]>(messages);

  const scrollBoxRef =
    useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const scrollBox =
      scrollBoxRef.current;

    if (!scrollBox) {
      return;
    }

    const frameId =
      window.requestAnimationFrame(
        () => {
          scrollBox.scrollTop =
            scrollBox.scrollHeight;
        },
      );

    return () => {
      window.cancelAnimationFrame(
        frameId,
      );
    };
  }, [liveMessages]);


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
          : participantSenders.find(
              (participant) =>
                participant.id === row.sender_character_id,
            ) ?? {
              id: row.sender_character_id,
              display_name: "Unknown",
              portrait_url: null,
            };
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
    participantSenders,
    viewerCharacterId,
    viewerSender,
  ]);

  const [query, setQuery] =
    useState("");

  const [mode, setMode] =
    useState<
      "all" | PrivateMessageMode
    >("all");

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  const [
    selectedIds,
    setSelectedIds,
  ] = useState<Set<string>>(
    new Set(),
  );

  const normalizedQuery =
    query
      .trim()
      .toLowerCase();

  const filteredMessages =
    useMemo(() => {
      const start =
        dateStart(
          startDate,
        );

      const end =
        dateEnd(
          endDate,
        );

      return liveMessages.filter(
        (message) => {
          if (
            mode !== "all" &&
            message.message_mode !==
              mode
          ) {
            return false;
          }

          const created =
            Date.parse(
              message.created_at,
            );

          if (
            start !== null &&
            created < start
          ) {
            return false;
          }

          if (
            end !== null &&
            created > end
          ) {
            return false;
          }

          if (
            normalizedQuery &&
            !stripRichTextForPreview(
              message.body,
            )
              .toLowerCase()
              .includes(
                normalizedQuery,
              )
          ) {
            return false;
          }

          return true;
        },
      );
    }, [
      liveMessages,
      mode,
      startDate,
      endDate,
      normalizedQuery,
    ]);

  function toggleMessage(
    id: string,
  ) {
    setSelectedIds(
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

  function clearFilters() {
    setQuery("");
    setMode("all");
    setStartDate("");
    setEndDate("");
  }

  function clearSelection() {
    setSelectedIds(
      new Set(),
    );
  }

  function selectAllVisible() {
    setSelectedIds(
      new Set(
        filteredMessages.map(
          (message) =>
            message.id,
        ),
      ),
    );
  }

  const hasFilters =
    Boolean(
      normalizedQuery ||
        mode !== "all" ||
        startDate ||
        endDate,
    );

  const allVisibleSelected =
    filteredMessages.length >
      0 &&
    filteredMessages.every(
      (message) =>
        selectedIds.has(
          message.id,
        ),
    );

  return (
    <>
      <section className="border-b border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-120e0b))] p-3 sm:px-4">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_135px_135px_135px_auto]">
          <input
            type="search"
            value={query}
            onChange={(event) =>
              setQuery(
                event.target.value,
              )
            }
            placeholder="Search words in this conversation…"
            className="min-w-0 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2 text-xs text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
          />

          <select
            value={mode}
            onChange={(event) =>
              setMode(
                event.target
                  .value as
                  | "all"
                  | PrivateMessageMode,
              )
            }
            className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2 text-xs text-[rgb(var(--sep-colour-cdbb9f))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
          >
            <option value="all">
              All types
            </option>

            <option value="ongame">
              On-game
            </option>

            <option value="offgame">
              Off-game
            </option>
          </select>

          <label className="grid gap-1">
            <span className="text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-716350))]">
              From
            </span>

            <input
              type="date"
              value={startDate}
              onChange={(event) =>
                setStartDate(
                  event.target.value,
                )
              }
              className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-2 py-2 text-[10px] text-[rgb(var(--sep-colour-cdbb9f))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-716350))]">
              To
            </span>

            <input
              type="date"
              value={endDate}
              onChange={(event) =>
                setEndDate(
                  event.target.value,
                )
              }
              className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-2 py-2 text-[10px] text-[rgb(var(--sep-colour-cdbb9f))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
            />
          </label>

          <div className="flex items-end gap-2">
            {hasFilters ? (
              <button
                type="button"
                onClick={
                  clearFilters
                }
                className="h-9 border border-[rgb(var(--sep-colour-59432c))] px-3 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-9e8767))] transition hover:border-[rgb(var(--sep-colour-80613c))] hover:text-[rgb(var(--sep-colour-d5ba8c))]"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[rgb(var(--sep-colour-59432c))]/25 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-6f6253))]">
              {
                filteredMessages.length
              }{" "}
              of {liveMessages.length}{" "}
              visible
            </p>

            {filteredMessages.length >
            0 ? (
              <button
                type="button"
                onClick={() => {
                  if (
                    allVisibleSelected
                  ) {
                    clearSelection();
                  } else {
                    selectAllVisible();
                  }
                }}
                className="border border-[rgb(var(--sep-colour-59432c))]/65 bg-[rgb(var(--sep-colour-100c09))] px-2.5 py-1.5 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-9e8767))] transition hover:border-[rgb(var(--sep-colour-80613c))] hover:text-[rgb(var(--sep-colour-d5ba8c))]"
              >
                {allVisibleSelected
                  ? "Clear selection"
                  : "Select all visible"}
              </button>
            ) : null}
          </div>

          {selectedIds.size >
          0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-b79063))]">
                {
                  selectedIds.size
                }{" "}
                selected
              </span>

              <button
                type="button"
                onClick={
                  clearSelection
                }
                className="border border-[rgb(var(--sep-colour-59432c))] px-3 py-2 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-9e8767))] transition hover:border-[rgb(var(--sep-colour-80613c))] hover:text-[rgb(var(--sep-colour-d5ba8c))]"
              >
                Cancel
              </button>

              <form
                action={
                  deletePrivateMessages
                }
                onSubmit={(
                  event,
                ) => {
                  if (
                    !window.confirm(
                      `Delete ${selectedIds.size} selected message${selectedIds.size === 1 ? "" : "s"} from your view? The other character will still see them.`,
                    )
                  ) {
                    event.preventDefault();
                  }
                }}
              >
                <input
                  type="hidden"
                  name="conversationId"
                  value={
                    conversationId
                  }
                />

                {[
                  ...selectedIds,
                ].map((id) => (
                  <input
                    key={id}
                    type="hidden"
                    name="messageIds"
                    value={id}
                  />
                ))}

                <button
                  type="submit"
                  data-sep-danger="true"
                  className="border border-[rgb(var(--sep-colour-a65343))] bg-[rgb(var(--sep-colour-301713))] px-4 py-2 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-e6aa9d))] transition hover:border-[rgb(var(--sep-colour-c66d5b))] hover:bg-[rgb(var(--sep-colour-431d18))]"
                >
                  Delete selected (
                  {
                    selectedIds.size
                  }
                  )
                </button>
              </form>
            </div>
          ) : (
            <p className="text-[7px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-655a4d))]">
              Tick messages to
              delete several at
              once
            </p>
          )}
        </div>
      </section>

      <div
        ref={scrollBoxRef}
        data-conversation-scrollbox
        className="max-h-[64vh] space-y-1.5 overflow-y-auto p-2 sm:p-3"
      >
        {filteredMessages.map(
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
              viewerCharacterId;

            const ongame =
              message.message_mode ===
              "ongame";

            const selected =
              selectedIds.has(
                message.id,
              );

            const senderName =
              sender?.display_name ??
              "Unknown";

            return (
              <article
                key={message.id}
                data-sep-interaction-ignore="true"
                className={`relative max-w-[92%] border px-2.5 py-2 transition ${
                  own
                    ? ongame
                      ? "ml-auto border-[rgb(var(--sep-colour-80613c))] bg-[rgb(var(--sep-colour-2c2117))]"
                      : "ml-auto border-[rgb(var(--sep-colour-687083))] bg-[rgb(var(--sep-colour-252830))]"
                    : ongame
                      ? "border-[rgb(var(--sep-colour-514233))] bg-[rgb(var(--sep-colour-100c09))]"
                      : "border-[rgb(var(--sep-colour-5c6372))] bg-[rgb(var(--sep-colour-191b21))]"
                } ${
                  selected
                    ? "ring-1 ring-[rgb(var(--sep-colour-c18b4d))]"
                    : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  {/* CHARACTER PORTRAIT */}
                  <div className="h-8 w-8 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/75 bg-[rgb(var(--sep-colour-0d0907))]">
                    {sender?.portrait_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={
                          sender.portrait_url
                        }
                        alt={`Portrait of ${senderName}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center font-serif text-sm text-[rgb(var(--sep-colour-9b805b))]">
                        {senderName
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* TOP ROW */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={`font-serif text-sm ${
                            ongame
                              ? "text-[rgb(var(--sep-colour-d8bf91))]"
                              : "text-[rgb(var(--sep-colour-cbd0dc))]"
                          }`}
                        >
                          {senderName}
                        </p>

                        <MessageModeBadge
                          mode={
                            message.message_mode
                          }
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <time className="text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-776b5c))]">
                          {new Date(
                            message.created_at,
                          ).toLocaleString(
                            "en-GB",
                          )}
                        </time>

                        {!message.optimistic ? <a
                          href={`/messages/forward/${message.id}`}
                          className="border border-[rgb(var(--sep-colour-59432c))]/80 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-b99b70))] transition hover:border-[rgb(var(--sep-colour-8b6a40))] hover:text-[rgb(var(--sep-colour-e3c28d))]"
                        >
                          Forward
                        </a> : null}

                        {!own && !message.optimistic ? (
                          <ReportButton
                            sourceType="direct_message"
                            sourceId={message.id}
                            toolbar
                          />
                        ) : null}

                        {!message.optimistic ? <form
                          action={
                            deletePrivateMessages
                          }
                          onSubmit={(
                            event,
                          ) => {
                            if (
                              !window.confirm(
                                "Delete this message from your view? The other character will still see it unless they delete it too.",
                              )
                            ) {
                              event.preventDefault();
                            }
                          }}
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
                            name="messageIds"
                            value={
                              message.id
                            }
                          />

                          <button
                            type="submit"
                            title="Delete this message from your view"
                            data-sep-danger="true"
                            className="border border-[rgb(var(--sep-colour-7b4035))]/80 bg-[rgb(var(--sep-colour-27120f))] px-2.5 py-1.5 text-[7px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-d99b8e))] transition hover:border-[rgb(var(--sep-colour-ad5a4c))] hover:bg-[rgb(var(--sep-colour-391713))] hover:text-[rgb(var(--sep-colour-f1b2a5))]"
                          >
                            Delete
                          </button>
                        </form> : null}
                      </div>
                    </div>

                    {/* MESSAGE BODY */}
                    <div
                      className={`mt-1.5 break-words text-xs leading-5 ${
                        ongame
                          ? "text-[rgb(var(--sep-colour-c7b79d))]"
                          : "text-[rgb(var(--sep-colour-c2c7d1))]"
                      }`}
                    >
                      {message.forwarded_body ? (
                        <div className="mb-1.5 border-l-2 border-[rgb(var(--sep-colour-9a7543))] bg-black/20 p-2">
                          <p className="mb-2 text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-9b8465))]">
                            Forwarded from{" "}
                            {message.forwarded_sender_name ??
                              "Unknown"}
                            {message.forwarded_created_at
                              ? ` · ${new Date(
                                  message.forwarded_created_at,
                                ).toLocaleString("en-GB")}`
                              : ""}
                          </p>

                          <RichTextContentClient
                            body={
                              message.forwarded_body
                            }
                            className="text-xs text-[rgb(var(--sep-colour-aa9c88))] [&_p]:my-1"
                          />
                        </div>
                      ) : null}

                      {(() => {
                        const inviteMatch =
                          message.body.match(
                            /PRIVATE_LOCATION_INVITE:([0-9a-f-]{36})/i,
                          );

                        const headquartersInviteMatch =
                          message.body.match(
                            /ORDER_HEADQUARTERS_INVITE:([0-9a-f-]{36})/i,
                          );

                        const breezeInviteMatch =
                          message.body.match(
                            /BREEZE_LODGING_INVITE:([0-9a-f-]{36})/i,
                          );

                        return breezeInviteMatch ? (
                          <BreezeLodgingInvitationMessage
                            invitationId={
                              breezeInviteMatch[1]
                            }
                          />
                        ) : headquartersInviteMatch ? (
                          <OrderHeadquartersInvitationMessage
                            invitationId={
                              headquartersInviteMatch[1]
                            }
                          />
                        ) : inviteMatch ? (
                          <PrivateLocationInvitationMessage
                            invitationId={
                              inviteMatch[1]
                            }
                          />
                        ) : (
                          <RichTextContentClient
                            body={
                              message.body
                            }
                          />
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* MESSAGE SELECTION */}
                <label
                  className={`mt-1.5 ml-auto flex h-5 w-5 cursor-pointer items-center justify-center border transition ${
                    selected
                      ? "border-[rgb(var(--sep-colour-b8874d))] bg-[rgb(var(--sep-colour-382516))]"
                      : "border-[rgb(var(--sep-colour-6a5135))] bg-[rgb(var(--sep-colour-0d0907))] hover:border-[rgb(var(--sep-colour-9b7446))]"
                  }`}
                  title="Select this message"
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() =>
                      toggleMessage(
                        message.id,
                      )
                    }
                    className="h-3.5 w-3.5 accent-[rgb(var(--sep-colour-b8874d))]"
                    aria-label="Select message"
                  />
                </label>
              </article>
            );
          },
        )}

        {filteredMessages.length ===
        0 ? (
          <p className="py-12 text-center text-sm text-[rgb(var(--sep-colour-8f8271))]">
            {messages.length ===
            0
              ? "Begin the conversation."
              : "No messages match these filters."}
          </p>
        ) : null}
      </div>
    </>
  );
}