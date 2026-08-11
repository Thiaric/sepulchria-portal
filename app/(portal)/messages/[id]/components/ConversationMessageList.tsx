"use client";

import { useMemo, useState } from "react";

import { RichTextContentClient } from "@/components/editor/rich-text-content-client";
import { stripRichTextForPreview } from "@/lib/rich-text-shared";
import type { DirectMessage, PrivateMessageMode } from "@/types/messages";

import { deletePrivateMessages } from "../../actions";

type Props = {
  conversationId: string;
  viewerCharacterId: string;
  messages: DirectMessage[];
};

function MessageModeBadge({ mode }: { mode: PrivateMessageMode }) {
  const ongame = mode === "ongame";
  return (
    <span
      className={`inline-flex border px-2 py-1 text-[7px] uppercase tracking-[0.18em] ${
        ongame
          ? "border-[#9b7446]/70 bg-[#312215] text-[#e2bd82]"
          : "border-[#687083]/70 bg-[#22252c] text-[#c6ccd8]"
      }`}
    >
      {ongame ? "On-game" : "Off-game"}
    </span>
  );
}

function dateStart(value: string): number | null {
  if (!value) return null;
  const result = new Date(`${value}T00:00:00`).getTime();
  return Number.isNaN(result) ? null : result;
}

function dateEnd(value: string): number | null {
  if (!value) return null;
  const result = new Date(`${value}T23:59:59.999`).getTime();
  return Number.isNaN(result) ? null : result;
}

export function ConversationMessageList({
  conversationId,
  viewerCharacterId,
  messages,
}: Props) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"all" | PrivateMessageMode>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const normalizedQuery = query.trim().toLowerCase();

  const filteredMessages = useMemo(() => {
    const start = dateStart(startDate);
    const end = dateEnd(endDate);

    return messages.filter((message) => {
      if (mode !== "all" && message.message_mode !== mode) return false;

      const created = Date.parse(message.created_at);
      if (start !== null && created < start) return false;
      if (end !== null && created > end) return false;

      if (
        normalizedQuery &&
        !stripRichTextForPreview(message.body)
          .toLowerCase()
          .includes(normalizedQuery)
      ) {
        return false;
      }

      return true;
    });
  }, [messages, mode, startDate, endDate, normalizedQuery]);

  function toggleMessage(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearFilters() {
    setQuery("");
    setMode("all");
    setStartDate("");
    setEndDate("");
  }

  const hasFilters = Boolean(
    normalizedQuery || mode !== "all" || startDate || endDate,
  );

  return (
    <>
      <section className="border-b border-[#59432c]/40 bg-[#120e0b] p-4 sm:px-6">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px_150px_150px_auto]">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search words in this conversation…"
            className="min-w-0 border border-[#60482e]/55 bg-[#0d0907] px-3 py-2.5 text-xs text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
          />

          <select
            value={mode}
            onChange={(event) =>
              setMode(event.target.value as "all" | PrivateMessageMode)
            }
            className="border border-[#60482e]/55 bg-[#0d0907] px-3 py-2.5 text-xs text-[#cdbb9f] outline-none focus:border-[#a17a49]"
          >
            <option value="all">All types</option>
            <option value="ongame">On-game</option>
            <option value="offgame">Off-game</option>
          </select>

          <label className="grid gap-1">
            <span className="text-[7px] uppercase tracking-[0.15em] text-[#716350]">From</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="border border-[#60482e]/55 bg-[#0d0907] px-2 py-2 text-[10px] text-[#cdbb9f] outline-none focus:border-[#a17a49]"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-[7px] uppercase tracking-[0.15em] text-[#716350]">To</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="border border-[#60482e]/55 bg-[#0d0907] px-2 py-2 text-[10px] text-[#cdbb9f] outline-none focus:border-[#a17a49]"
            />
          </label>

          <div className="flex items-end gap-2">
            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="h-9 border border-[#59432c] px-3 text-[8px] uppercase tracking-[0.15em] text-[#9e8767] transition hover:border-[#80613c] hover:text-[#d5ba8c]"
              >
                Clear
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setSelecting((current) => !current);
                setSelectedIds(new Set());
              }}
              className={`h-9 border px-3 text-[8px] uppercase tracking-[0.15em] transition ${
                selecting
                  ? "border-[#a27845] bg-[#322217] text-[#e0c08c]"
                  : "border-[#59432c] text-[#9e8767] hover:border-[#80613c] hover:text-[#d5ba8c]"
              }`}
            >
              {selecting ? "Cancel selection" : "Select messages"}
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[8px] uppercase tracking-[0.15em] text-[#6f6253]">
            {filteredMessages.length} of {messages.length} visible
          </p>

          {selecting && selectedIds.size > 0 ? (
            <form
              action={deletePrivateMessages}
              onSubmit={(event) => {
                if (
                  !window.confirm(
                    `Delete ${selectedIds.size} selected message${selectedIds.size === 1 ? "" : "s"} from your view? The other character will still see them.`,
                  )
                ) {
                  event.preventDefault();
                }
              }}
            >
              <input type="hidden" name="conversationId" value={conversationId} />
              {[...selectedIds].map((id) => (
                <input key={id} type="hidden" name="messageIds" value={id} />
              ))}
              <button
                type="submit"
                className="border border-[#85493e] bg-[#2a1512] px-3 py-2 text-[8px] uppercase tracking-[0.15em] text-[#d99b8e] transition hover:border-[#b05e50] hover:bg-[#391b17]"
              >
                Delete selected ({selectedIds.size})
              </button>
            </form>
          ) : null}
        </div>
      </section>

      <div
        data-conversation-scrollbox
        className="max-h-[58vh] space-y-4 overflow-y-auto p-5 sm:p-6"
      >
        {filteredMessages.map((message) => {
          const senderRelation = message.sender;
          const sender = Array.isArray(senderRelation)
            ? senderRelation[0]
            : senderRelation;
          const own = message.sender_character_id === viewerCharacterId;
          const ongame = message.message_mode === "ongame";
          const selected = selectedIds.has(message.id);

          return (
            <article
              key={message.id}
              className={`relative max-w-[82%] border p-4 transition ${
                own
                  ? ongame
                    ? "ml-auto border-[#80613c] bg-[#2c2117]"
                    : "ml-auto border-[#687083] bg-[#252830]"
                  : ongame
                    ? "border-[#514233] bg-[#100c09]"
                    : "border-[#5c6372] bg-[#191b21]"
              } ${selected ? "ring-1 ring-[#c18b4d]" : ""}`}
            >
              {selecting ? (
                <label className="absolute -left-3 -top-3 flex h-7 w-7 cursor-pointer items-center justify-center border border-[#755835] bg-[#100c09]">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleMessage(message.id)}
                    className="accent-[#a77a42]"
                    aria-label="Select message"
                  />
                </label>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`font-serif text-sm ${ongame ? "text-[#d8bf91]" : "text-[#cbd0dc]"}`}>
                    {sender?.display_name ?? "Unknown"}
                  </p>
                  <MessageModeBadge mode={message.message_mode} />
                </div>

                <div className="flex items-center gap-2">
                  <time className="text-[9px] uppercase tracking-[0.16em] text-[#776b5c]">
                    {new Date(message.created_at).toLocaleString("en-GB")}
                  </time>

                  {!selecting ? (
                    <form
                      action={deletePrivateMessages}
                      onSubmit={(event) => {
                        if (
                          !window.confirm(
                            "Delete this message from your view? The other character will still see it unless they delete it too.",
                          )
                        ) {
                          event.preventDefault();
                        }
                      }}
                    >
                      <input type="hidden" name="conversationId" value={conversationId} />
                      <input type="hidden" name="messageIds" value={message.id} />
                      <button
                        type="submit"
                        title="Delete this message from your view"
                        aria-label="Delete message"
                        className="text-[10px] text-[#755f50] transition hover:text-[#d58c7c]"
                      >
                        ×
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>

              <div className={`mt-3 break-words text-sm leading-7 ${ongame ? "text-[#c7b79d]" : "text-[#c2c7d1]"}`}>
                <RichTextContentClient body={message.body} />
              </div>
            </article>
          );
        })}

        {filteredMessages.length === 0 ? (
          <p className="py-12 text-center text-sm text-[#8f8271]">
            {messages.length === 0
              ? "Begin the conversation."
              : "No messages match these filters."}
          </p>
        ) : null}
      </div>
    </>
  );
}
