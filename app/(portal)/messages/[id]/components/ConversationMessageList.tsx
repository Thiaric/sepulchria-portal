"use client";

import {
  useMemo,
  useState,
} from "react";

import { RichTextContentClient } from "@/components/editor/rich-text-content-client";
import { stripRichTextForPreview } from "@/lib/rich-text-shared";
import type {
  DirectMessage,
  PrivateMessageMode,
} from "@/types/messages";

import {
  deletePrivateMessages,
} from "../../actions";

type Props = {
  conversationId: string;
  viewerCharacterId: string;
  messages: DirectMessage[];
};

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
  messages,
}: Props) {
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

      return messages.filter(
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
      messages,
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
      <section className="border-b border-[#59432c]/40 bg-[#120e0b] p-4 sm:px-6">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px_150px_150px_auto]">
          <input
            type="search"
            value={query}
            onChange={(event) =>
              setQuery(
                event.target.value,
              )
            }
            placeholder="Search words in this conversation…"
            className="min-w-0 border border-[#60482e]/55 bg-[#0d0907] px-3 py-2.5 text-xs text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
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
            className="border border-[#60482e]/55 bg-[#0d0907] px-3 py-2.5 text-xs text-[#cdbb9f] outline-none focus:border-[#a17a49]"
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
            <span className="text-[7px] uppercase tracking-[0.15em] text-[#716350]">
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
              className="border border-[#60482e]/55 bg-[#0d0907] px-2 py-2 text-[10px] text-[#cdbb9f] outline-none focus:border-[#a17a49]"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-[7px] uppercase tracking-[0.15em] text-[#716350]">
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
              className="border border-[#60482e]/55 bg-[#0d0907] px-2 py-2 text-[10px] text-[#cdbb9f] outline-none focus:border-[#a17a49]"
            />
          </label>

          <div className="flex items-end gap-2">
            {hasFilters ? (
              <button
                type="button"
                onClick={
                  clearFilters
                }
                className="h-9 border border-[#59432c] px-3 text-[8px] uppercase tracking-[0.15em] text-[#9e8767] transition hover:border-[#80613c] hover:text-[#d5ba8c]"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#59432c]/25 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[8px] uppercase tracking-[0.15em] text-[#6f6253]">
              {
                filteredMessages.length
              }{" "}
              of {messages.length}{" "}
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
                className="border border-[#59432c]/65 bg-[#100c09] px-2.5 py-1.5 text-[7px] uppercase tracking-[0.14em] text-[#9e8767] transition hover:border-[#80613c] hover:text-[#d5ba8c]"
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
              <span className="text-[8px] uppercase tracking-[0.14em] text-[#b79063]">
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
                className="border border-[#59432c] px-3 py-2 text-[8px] uppercase tracking-[0.15em] text-[#9e8767] transition hover:border-[#80613c] hover:text-[#d5ba8c]"
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
                  className="border border-[#a65343] bg-[#301713] px-4 py-2 text-[8px] uppercase tracking-[0.15em] text-[#e6aa9d] transition hover:border-[#c66d5b] hover:bg-[#431d18]"
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
            <p className="text-[7px] uppercase tracking-[0.13em] text-[#655a4d]">
              Tick messages to
              delete several at
              once
            </p>
          )}
        </div>
      </section>

      <div
        data-conversation-scrollbox
        className="max-h-[58vh] space-y-4 overflow-y-auto p-5 sm:p-6"
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
                className={`relative max-w-[82%] border p-4 pb-10 transition ${
                  own
                    ? ongame
                      ? "ml-auto border-[#80613c] bg-[#2c2117]"
                      : "ml-auto border-[#687083] bg-[#252830]"
                    : ongame
                      ? "border-[#514233] bg-[#100c09]"
                      : "border-[#5c6372] bg-[#191b21]"
                } ${
                  selected
                    ? "ring-1 ring-[#c18b4d]"
                    : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* CHARACTER PORTRAIT */}
                  <div className="h-11 w-11 shrink-0 overflow-hidden border border-[#60482e]/75 bg-[#0d0907]">
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
                      <span className="flex h-full items-center justify-center font-serif text-sm text-[#9b805b]">
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
                              ? "text-[#d8bf91]"
                              : "text-[#cbd0dc]"
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

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <time className="text-[9px] uppercase tracking-[0.16em] text-[#776b5c]">
                          {new Date(
                            message.created_at,
                          ).toLocaleString(
                            "en-GB",
                          )}
                        </time>

                        <form
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
                            className="border border-[#7b4035]/80 bg-[#27120f] px-2.5 py-1.5 text-[7px] uppercase tracking-[0.13em] text-[#d99b8e] transition hover:border-[#ad5a4c] hover:bg-[#391713] hover:text-[#f1b2a5]"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </div>

                    {/* MESSAGE BODY */}
                    <div
                      className={`mt-3 break-words text-sm leading-7 ${
                        ongame
                          ? "text-[#c7b79d]"
                          : "text-[#c2c7d1]"
                      }`}
                    >
                      <RichTextContentClient
                        body={
                          message.body
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* CHECKBOX — BOTTOM RIGHT */}
                <label
                  className={`absolute bottom-3 right-3 flex h-6 w-6 cursor-pointer items-center justify-center border transition ${
                    selected
                      ? "border-[#b8874d] bg-[#382516]"
                      : "border-[#6a5135] bg-[#0d0907] hover:border-[#9b7446]"
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
                    className="h-3.5 w-3.5 accent-[#b8874d]"
                    aria-label="Select message"
                  />
                </label>
              </article>
            );
          },
        )}

        {filteredMessages.length ===
        0 ? (
          <p className="py-12 text-center text-sm text-[#8f8271]">
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