"use client";

import { openPortalModal } from "@/components/portal/portal-modal-button";
import { CharacterOrderIdentity } from "@/components/characters/character-order-identity";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { moveCharacter } from "@/app/(portal)/game/actions";
import {
  PRESENCE_ACTIVE_MINUTES,
} from "@/lib/game/constants";
import { createClient } from "@/lib/supabase/client";
import type { PresenceStatus } from "@/types/game";
import { MessageCharacterModalButton } from "@/components/messages/message-character-modal-button";
import { SanctionRestrictionNotice, useSanctionCapability } from "@/components/sanctions/sanction-capability-ui";

type GameContextPanelProps = {
  roomId: string | null;
  currentCharacterId: string | null;
  viewerIsStaff: boolean;
  canManageCharacters: boolean;
};

type CodexSummary = {
  id: string;
  name: string;
  slug: string;
  icon_url: string | null;
  colour: string | null;
};

type CharacterSummary = {
  id: string;
  display_name: string | null;
  portrait_url: string | null;
  public_slug: string;
  title: string | null;

  race:
    | CodexSummary
    | CodexSummary[]
    | null;

  association:
    | CodexSummary
    | CodexSummary[]
    | null;
};

type PresentCharacter = {
  character_id: string;
  status: PresenceStatus;
  appear_offline: boolean;

  character:
    | CharacterSummary
    | CharacterSummary[]
    | null;
};

type Destination = {
  id: string;
  name: string;
};

type RoomExit = {
  id: string;
  connection_name: string | null;
  sort_order: number | null;

  destination:
    | Destination
    | Destination[]
    | null;
};

export function GameContextPanel({
  roomId,
  currentCharacterId,
  viewerIsStaff,
  canManageCharacters,
}: GameContextPanelProps) {
  const [
    presentCharacters,
    setPresentCharacters,
  ] = useState<PresentCharacter[]>([]);

  const [exits, setExits] =
    useState<RoomExit[]>([]);

  const [loading, setLoading] =
    useState(Boolean(roomId));

  const [error, setError] =
    useState<string | null>(null);

  const communication = useSanctionCapability("communication");

  const [
    blockedCharacterIds,
    setBlockedCharacterIds,
  ] = useState<Set<string>>(
    () => new Set(),
  );

  const loadRoomContext =
    useCallback(async () => {
      if (!roomId) {
        setPresentCharacters([]);
        setExits([]);
        setLoading(false);
        return;
      }

      setError(null);

      const supabase = createClient();

      const activeSince = new Date(
        Date.now() -
          PRESENCE_ACTIVE_MINUTES *
            60_000,
      ).toISOString();

      const [
        presenceResult,
        outgoingResult,
        incomingResult,
      ] = await Promise.all([
        supabase
          .from("character_presence")
          .select(
            `
              character_id,
              status,
              last_seen_at,
              appear_offline,

              character:characters!character_presence_character_id_fkey(
                id,
                display_name,
                portrait_url,
                public_slug,
                title,

                race:races!characters_race_id_fkey(
                  id,
                  name,
                  slug,
                  icon_url,
                  colour
                ),

                association:associations!characters_association_id_fkey(
                  id,
                  name,
                  slug,
                  icon_url,
                  colour
                )
              )
            `,
          )
          .eq("room_id", roomId)
          .gte(
            "last_seen_at",
            activeSince,
          )
          .order("last_seen_at", {
            ascending: false,
          }),

        supabase
          .from("room_connections")
          .select(
            `
              id,
              connection_name,
              sort_order,

              destination:rooms!room_connections_to_room_id_fkey(
                id,
                name
              )
            `,
          )
          .eq("from_room_id", roomId)
          .order("sort_order"),

        supabase
          .from("room_connections")
          .select(
            `
              id,
              connection_name,
              sort_order,

              destination:rooms!room_connections_from_room_id_fkey(
                id,
                name
              )
            `,
          )
          .eq("to_room_id", roomId)
          .eq("is_two_way", true)
          .order("sort_order"),
      ]);

      const firstError =
        presenceResult.error ??
        outgoingResult.error ??
        incomingResult.error;

      if (firstError) {
        setError(firstError.message);
        setLoading(false);
        return;
      }

      const blockedIds =
        new Set<string>();

      if (currentCharacterId) {
        const {
          data: blockRows,
          error: blockError,
        } = await supabase
          .from("character_blocks")
          .select(
            "blocker_character_id, blocked_character_id",
          )
          .or(
            [
              `blocker_character_id.eq.${currentCharacterId}`,
              `blocked_character_id.eq.${currentCharacterId}`,
            ].join(","),
          );

        if (blockError) {
          setError(blockError.message);
          setLoading(false);
          return;
        }

        for (const row of blockRows ?? []) {
          const blocker = String(
            row.blocker_character_id,
          );
          const blocked = String(
            row.blocked_character_id,
          );

          blockedIds.add(
            blocker === currentCharacterId
              ? blocked
              : blocker,
          );
        }
      }

      setBlockedCharacterIds(
        blockedIds,
      );

            setPresentCharacters(
        (
          (presenceResult.data ??
            []) as unknown as PresentCharacter[]
        ).filter(
          (presence) =>
            viewerIsStaff ||
            presence.appear_offline !== true,
        ),
      );

      setExits([
        ...((outgoingResult.data ??
          []) as unknown as RoomExit[]),

        ...((incomingResult.data ??
          []) as unknown as RoomExit[]),
      ]);

      setLoading(false);
        }, [
      roomId,
      currentCharacterId,
      viewerIsStaff,
    ]);

  useEffect(() => {
    setLoading(Boolean(roomId));
    void loadRoomContext();
  }, [loadRoomContext, roomId]);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    const supabase = createClient();

    const channel = supabase
      .channel(
        `portal-room-context:${roomId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "character_presence",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          void loadRoomContext();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "character_blocks",
        },
        () => {
          void loadRoomContext();
        },
      )
      .subscribe();

    const refreshInterval =
      window.setInterval(() => {
        void loadRoomContext();
      }, 5_000);

    return () => {
      window.clearInterval(
        refreshInterval,
      );

      void supabase.removeChannel(
        channel,
      );
    };
  }, [loadRoomContext, roomId]);

  if (!roomId) {
    return (
      <div className="h-full overflow-y-auto components_portal_game_context_panel_div_outside_city">
        <p className="text-[9px] uppercase tracking-[0.3em] text-[rgb(var(--sep-colour-876a46))] components_portal_game_context_panel_p_outside_city">
          Play
        </p>

        <h2 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-d6bd91))] components_portal_game_context_panel_h2_outside_city">
          Outside the city
        </h2>

        <p className="mt-4 text-xs leading-6 text-[rgb(var(--sep-colour-938673))] components_portal_game_context_panel_p_outside_city_2">
          Your character has not yet
          been assigned to a room.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col components_portal_game_context_panel_div_container">
      <div id="game-music-context-slot" className="shrink-0 components_portal_game_context_panel_div_game_music_context_slot" />

      {error ? (
        <p className="mt-3 shrink-0 border border-[rgb(var(--sep-colour-743d35))] bg-[rgb(var(--sep-colour-2a1512))] p-2.5 text-[11px] leading-5 text-[rgb(var(--sep-colour-d8a49a))] components_portal_game_context_panel_p_text">
          The room information could
          not be loaded.
        </p>
      ) : null}

      <section className="mt-1 flex min-h-0 flex-1 flex-col border-[rgb(var(--sep-colour-59432c))]/40 pt-0 components_portal_game_context_panel_section_section">
        <div className="flex shrink-0 items-center justify-between gap-3 components_portal_game_context_panel_div_container_2">
          <div className="min-w-0 components_portal_game_context_panel_div_container_3">
            <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-876a46))] components_portal_game_context_panel_p_text_2">
              Present in this Location
            </p>

            
          </div>

          <span className="flex h-6 min-w-6 shrink-0 items-center justify-center border border-[rgb(var(--sep-colour-59432c))]/50 bg-[rgb(var(--sep-colour-15100d))] px-1.5 text-[10px] text-[rgb(var(--sep-colour-a68b67))] components_portal_game_context_panel_span_text">
            {presentCharacters.length}
          </span>
        </div>

        <div className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pr-1 components_portal_game_context_panel_div_container_4">
          {loading ? (
            <SidebarLoadingRows />
          ) : (
            presentCharacters.map(
              (presence) => {
                const person =
                  normaliseRelation(
                    presence.character,
                  );

                if (!person) {
                  return null;
                }

                const race =
                  normaliseRelation(
                    person.race,
                  );

                

                const displayName =
                  person.display_name?.trim() ||
                  "Unnamed character";

                const raceName =
  race?.name ?? null;

                return (
  <div
    key={presence.character_id}
    title={
      presence.appear_offline
        ? "Appearing offline"
        : undefined
    }
    className={[((presence.appear_offline
        ? "group relative overflow-hidden border border-dashed border-[rgb(var(--sep-colour-876a46))]/55 bg-[rgb(var(--sep-colour-100c09))] opacity-40 transition hover:border-[rgb(var(--sep-colour-9b7446))] hover:bg-[rgb(var(--sep-colour-1a120c))] hover:opacity-100"
        : "group relative overflow-hidden border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] transition hover:border-[rgb(var(--sep-colour-9b7446))] hover:bg-[rgb(var(--sep-colour-1a120c))]")), "components_portal_game_context_panel_div_container_5"].filter(Boolean).join(" ")}
  >
    <button
      type="button"
      title={`Open ${displayName}'s profile`}
      aria-label={`Open ${displayName}'s character sheet`}
      onClick={() =>
        openPortalModal({
          label: displayName,
          title: `${displayName}'s character sheet`,
          icon:
            person.portrait_url ??
            "/icons/characters.png",
          href: `/characters/${person.public_slug}?from=game`,
        })
      }
      className="block w-full text-left components_portal_game_context_panel_button_action"
    >
      <div className="absolute inset-y-0 left-0 w-px bg-[rgb(var(--sep-colour-b88a52))]/0 transition group-hover:bg-[rgb(var(--sep-colour-b88a52))]/70 components_portal_game_context_panel_div_container_6" />

      <div className="flex  items-center gap-3 px-3 py-2.5 pr-10 components_portal_game_context_panel_div_container_7">
        <div className="relative shrink-0 py-1 px-0.5 components_portal_game_context_panel_div_container_8">
          

          <PresenceDot
            status={presence.status}
          />
        </div>

        <div className="min-w-0 flex-1 components_portal_game_context_panel_div_container_9">
          <div className="flex min-w-0 items-center gap-1 components_portal_game_context_panel_div_container_10">
  <MiniCodexIcon entry={race} />

  <CharacterOrderIdentity
    characterId={person.id}
    variant="mini"
  />

            <div className="px-1 font-serif text-[11px] leading-4 text-[rgb(var(--sep-colour-dbc397))] transition group-hover:text-[rgb(var(--sep-colour-ecd5a8))] components_portal_game_context_panel_div_container_11">
              {displayName}
            </div></div>

            

          

          

        </div>
      </div>
    </button>

    <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1 components_portal_game_context_panel_div_container_12">
      {person.id !== currentCharacterId &&
      !blockedCharacterIds.has(person.id) &&
      !communication.blocked ? (
        <MessageCharacterModalButton
          recipientId={person.id}
          recipientName={displayName}
          className="flex h-6 w-6 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/60 bg-[rgb(var(--sep-colour-17110d))] text-[12px] text-[rgb(var(--sep-colour-a98b61))] transition hover:border-[rgb(var(--sep-colour-9a7445))] hover:bg-[rgb(var(--sep-colour-2a1d12))] hover:text-[rgb(var(--sep-colour-e0c392))]"
        />
      ) : person.id !== currentCharacterId && communication.blocked ? (
        <SanctionRestrictionNotice message={communication.message} compact />
      ) : null}

      {canManageCharacters ? (
        <button
          type="button"
          title={`Manage ${displayName}`}
          aria-label={`Manage ${displayName}`}
          onClick={() =>
            openPortalModal({
              label: `Manage ${displayName}`,
              title: `Manage ${displayName}`,
              icon: person.portrait_url ?? "/icons/characters.png",
              href: `/admin/characters/${person.id}`,
            })
          }
          className="flex h-6 w-6 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/60 bg-[rgb(var(--sep-colour-17110d))] text-[12px] text-[rgb(var(--sep-colour-a98b61))] transition hover:border-[rgb(var(--sep-colour-9a7445))] hover:bg-[rgb(var(--sep-colour-2a1d12))] hover:text-[rgb(var(--sep-colour-e0c392))] components_portal_game_context_panel_button_action_2"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.42 1.42-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.55V20h-2v-.09a1.7 1.7 0 0 0-1.03-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06-1.42-1.42.06-.06A1.7 1.7 0 0 0 9.4 15.4a1.7 1.7 0 0 0-1.55-1.03H7.76v-2h.09A1.7 1.7 0 0 0 9.4 11.34a1.7 1.7 0 0 0-.34-1.88L9 9.4 10.42 8l.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.03-1.55V6.76h2v.09a1.7 1.7 0 0 0 1.03 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.42 1.42-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.55 1.03H21v2h-.09A1.7 1.7 0 0 0 19.4 15Z" />
          </svg>
        </button>
      ) : null}
    </div>
  </div>
);
              },
            )
          )}

          {!loading &&
          presentCharacters.length ===
            0 ? (
            <p className="border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-100c09))]/60 p-3 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))] components_portal_game_context_panel_p_text_3">
              No active characters are
              currently visible here.
            </p>
          ) : null}
        </div>
      </section>

      <section className="mt-4 max-h-48 shrink-0 border-t border-[rgb(var(--sep-colour-59432c))]/40 pt-4 components_portal_game_context_panel_section_section_2">
        <div className="flex items-end justify-between gap-3 components_portal_game_context_panel_div_container_13">
          <div className="components_portal_game_context_panel_div_container_14">
            <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-876a46))] components_portal_game_context_panel_p_text_4">
              Journey to...
            </p>

            
          </div>

          <span className="text-[10px] text-[rgb(var(--sep-colour-806c52))] components_portal_game_context_panel_span_text_2">
            {exits.length}
          </span>
        </div>

        <div className="mt-3 max-h-28 space-y-1.5 overflow-y-auto overscroll-contain pr-1 components_portal_game_context_panel_div_container_15">
          {loading ? (
            <CompactLoadingRows />
          ) : (
            exits.map((exit) => {
              const destination =
                normaliseRelation(
                  exit.destination,
                );

              if (!destination) {
                return null;
              }

              return (
                <form className="components_portal_game_context_panel_form_move_character"
                  key={`${exit.id}-${destination.id}`}
                  action={moveCharacter}
                >
                  <input className="components_portal_game_context_panel_input_room_id"
                    type="hidden"
                    name="roomId"
                    value={
                      destination.id
                    }
                  />

                  <button
                    type="submit"
                    className="group w-full border border-[rgb(var(--sep-colour-765937))]/60 bg-[rgb(var(--sep-colour-271c12))] px-2.5 py-2 text-left transition hover:border-[rgb(var(--sep-colour-a17a49))] hover:bg-[rgb(var(--sep-colour-3b2919))] components_portal_game_context_panel_button_action_3"
                  >
                    <span className="flex items-center justify-between gap-3 components_portal_game_context_panel_span_text_3">
                      <span className="min-w-0 components_portal_game_context_panel_span_text_4">
                        <span className="block truncate font-serif text-[13px] leading-4 text-[rgb(var(--sep-colour-d8bf91))] transition group-hover:text-[rgb(var(--sep-colour-ead2a4))] components_portal_game_context_panel_span_text_5">
                          {destination.name}
                        </span>

                        
                      </span>

                      <span
                        aria-hidden="true"
                        className="shrink-0 text-[10px] text-[rgb(var(--sep-colour-836746))] transition group-hover:translate-x-0.5 components_portal_game_context_panel_span_text_6"
                      >
                        →
                      </span>
                    </span>
                  </button>
                </form>
              );
            })
          )}

          {!loading &&
          exits.length === 0 ? (
            <p className="text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))] components_portal_game_context_panel_p_text_5">
              No accessible passages
              have been recorded.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function MiniCodexIcon({
  entry,
}: {
  entry: CodexSummary | null;
}) {
  if (!entry) {
    return null;
  }

  const colour =
    entry.colour ?? "#8d6d3e";

  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden border bg-[rgb(var(--sep-colour-0d0907))] font-serif text-[8px] components_portal_game_context_panel_span_text_7"
      style={{
        borderColor: `${colour}88`,
        color: colour,
      }}
      title={entry.name}
    >
      {entry.icon_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={entry.icon_url}
          alt=""
          className="h-full w-full object-cover components_portal_game_context_panel_img_image"
        />
      ) : (
        entry.name
          .charAt(0)
          .toUpperCase()
      )}
    </span>
  );
}

function normaliseRelation<T>(
  value: T | T[] | null,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function PresenceDot({
  status,
}: {
  status: PresenceStatus;
}) {
  const classes: Record<
    PresenceStatus,
    string
  > = {
    online:
      "border-emerald-400 bg-emerald-500 shadow-[0_0_7px_rgba(16,185,129,0.65)]",

    away:
      "border-amber-400 bg-amber-500 shadow-[0_0_7px_rgba(245,158,11,0.60)]",

    busy:
      "border-red-400 bg-red-500 shadow-[0_0_7px_rgba(239,68,68,0.60)]",
  };

  return (
    <span
      title={status}
      className={[((`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 ${classes[status]}`)), "components_portal_game_context_panel_span_text_8"].filter(Boolean).join(" ")}
    />
  );
}

function PresenceLabel({
  status,
}: {
  status: PresenceStatus;
}) {
  const classes: Record<
    PresenceStatus,
    string
  > = {
    online: "text-emerald-500",
    away: "text-amber-500",
    busy: "text-red-500",
  };

  return (
    <span
      className={[((`shrink-0 text-[7px] uppercase tracking-[0.14em] ${classes[status]}`)), "components_portal_game_context_panel_span_text_9"].filter(Boolean).join(" ")}
    >
      {status}
    </span>
  );
}

function Portrait({
  src,
  name,
}: {
  src: string | null;
  name: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase(),
    )
    .join("");

  return (
    <div className="h-9 w-9 overflow-hidden border border-[rgb(var(--sep-colour-705538))] bg-[rgb(var(--sep-colour-0d0a08))] shadow-inner components_portal_game_context_panel_div_container_16">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`Portrait of ${name}`}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105 components_portal_game_context_panel_img_image_2"
        />
      ) : (
        <span className="flex h-full items-center justify-center font-serif text-[11px] text-[rgb(var(--sep-colour-a0845e))] components_portal_game_context_panel_span_text_10">
          {initials || "?"}
        </span>
      )}
    </div>
  );
}

function SidebarLoadingRows() {
  return (
    <>
      <div className="h-[60px] animate-pulse border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-19120d))] components_portal_game_context_panel_div_container_17" />
      <div className="h-[60px] animate-pulse border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-19120d))] components_portal_game_context_panel_div_container_18" />
      <div className="h-[60px] animate-pulse border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-19120d))] components_portal_game_context_panel_div_container_19" />
    </>
  );
}

function CompactLoadingRows() {
  return (
    <>
      <div className="h-[43px] animate-pulse border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-19120d))] components_portal_game_context_panel_div_container_20" />
      <div className="h-[43px] animate-pulse border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-19120d))] components_portal_game_context_panel_div_container_21" />
    </>
  );
}