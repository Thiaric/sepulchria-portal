import Link from "next/link";

import type { RoomMessage } from "@/types/game";

type RoomMessageListProps = {
  messages: RoomMessage[];
  olderBefore?: string;
};

export default function RoomMessageList({
  messages,
  olderBefore,
}: RoomMessageListProps) {
  return (
    <div
      id="room-chronicle"
      className="max-h-[650px] min-h-72 overflow-y-auto"
    >
      {olderBefore ? (
        <div className="border-b border-[#4f3b28]/35 p-4 text-center">
          <Link
            href={`/game?before=${encodeURIComponent(
              olderBefore,
            )}#room-chronicle`}
            className="text-[10px] uppercase tracking-[0.2em] text-[#a98b61] hover:text-[#ecd29e]"
          >
            Load earlier actions
          </Link>
        </div>
      ) : null}

      {messages.length > 0 ? (
        <div className="divide-y divide-[#4f3b28]/35">
          {messages.map((item) => {
            const author = Array.isArray(item.character)
              ? item.character[0]
              : item.character;

            const time = new Intl.DateTimeFormat("en-GB", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(item.created_at));

            return (
              <article key={item.id} className="flex gap-4 px-5 py-5 sm:px-7">
                <Link
                  href={author ? `/character/${author.id}` : "#"}
                  className="h-12 w-12 shrink-0 overflow-hidden border border-[#60482e] bg-[#0d0a08]"
                >
                  {author?.portrait_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={author.portrait_url}
                      alt={`Portrait of ${author.display_name}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center">
                      ?
                    </span>
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link
                      href={author ? `/character/${author.id}` : "#"}
                      className="font-serif text-lg text-[#d8bf91] hover:text-[#ecd29e]"
                    >
                      {author?.display_name ?? "Unknown character"}
                    </Link>

                    <time className="text-[9px] uppercase tracking-[0.18em] text-[#776b5b]">
                      {time}
                    </time>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#b8aa96]">
                    {item.message}
                  </p>
                </div>
              </article>
            );
          })}

          <div id="chat-end" />
        </div>
      ) : (
        <div className="flex min-h-72 items-center justify-center px-6 py-10 text-center font-serif italic text-[#8e7d66]">
          The room is silent.
        </div>
      )}
    </div>
  );
}
