"use client";

import {
  useEffect,
  useRef,
} from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type RoomRealtimeProps = {
  roomId: string;
};

type LocationBroadcast = {
  type: "location-changed";
  userId: string;
  roomId: string | null;
  sentAt: number;
};

const LOCATION_CHANNEL =
  "sepulchria-character-location";

export default function RoomRealtime({
  roomId,
}: RoomRealtimeProps) {
  const router = useRouter();

  const refreshTimer =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  const hardReloadingRef =
    useRef(false);

  useEffect(() => {
    const supabase = createClient();

    let cancelled = false;

    let realtimeChannel:
      | ReturnType<
          typeof supabase.channel
        >
      | null = null;

    let broadcastChannel:
      | BroadcastChannel
      | null = null;

    let currentUserId:
      | string
      | null = null;

    let currentCharacterId:
      | string
      | null = null;

    function softRefresh(
      delay = 0,
    ) {
      if (
        hardReloadingRef.current
      ) {
        return;
      }

      if (refreshTimer.current) {
        clearTimeout(
          refreshTimer.current,
        );
      }

      refreshTimer.current =
        setTimeout(() => {
          router.refresh();
        }, delay);
    }

    /*
     * A room change is different from an ordinary realtime update.
     *
     * router.refresh() is excellent for message/presence updates, but
     * the whole central /game Server Component is keyed from the
     * character's current_room_id. When another tab changes that room,
     * force the /game document to be read again so the old tab cannot
     * continue displaying the previous room/chat.
     */
    function reloadGameForLocationChange() {
      if (
        hardReloadingRef.current
      ) {
        return;
      }

      hardReloadingRef.current =
        true;

      window.location.replace(
        "/game",
      );
    }

    async function verifyCurrentLocation() {
      if (
        cancelled ||
        hardReloadingRef.current ||
        !currentUserId
      ) {
        return;
      }

      const {
        data: character,
        error,
      } = await supabase
        .from("characters")
        .select(
          "id, current_room_id",
        )
        .eq(
          "user_id",
          currentUserId,
        )
        .maybeSingle();

      if (
        cancelled ||
        error ||
        !character
      ) {
        return;
      }

      currentCharacterId =
        character.id;

      const authoritativeRoomId =
        character.current_room_id ??
        null;

      if (
        authoritativeRoomId !==
        roomId
      ) {
        reloadGameForLocationChange();
      }
    }

    async function startLocationSync() {
      const {
        data: { user },
        error: authError,
      } =
        await supabase.auth.getUser();

      if (
        cancelled ||
        authError ||
        !user
      ) {
        return;
      }

      currentUserId =
        user.id;

      const {
        data: character,
        error: characterError,
      } = await supabase
        .from("characters")
        .select(
          "id, current_room_id",
        )
        .eq(
          "user_id",
          user.id,
        )
        .maybeSingle();

      if (
        cancelled ||
        characterError ||
        !character
      ) {
        return;
      }

      currentCharacterId =
        character.id;

      /*
       * If this tab was already stale before the client component
       * mounted, correct it immediately.
       */
      if (
        (
          character.current_room_id ??
          null
        ) !== roomId
      ) {
        reloadGameForLocationChange();
        return;
      }

      /*
       * Same-browser cross-tab/window sync.
       */
      if (
        typeof BroadcastChannel !==
        "undefined"
      ) {
        broadcastChannel =
          new BroadcastChannel(
            LOCATION_CHANNEL,
          );

        broadcastChannel.onmessage = (
          event: MessageEvent<
            LocationBroadcast
          >,
        ) => {
          const message =
            event.data;

          if (
            !message ||
            message.type !==
              "location-changed" ||
            message.userId !==
              user.id
          ) {
            return;
          }

          if (
            message.roomId !==
            roomId
          ) {
            reloadGameForLocationChange();
          }
        };

        broadcastChannel.postMessage({
          type:
            "location-changed",
          userId: user.id,
          roomId:
            character.current_room_id ??
            null,
          sentAt: Date.now(),
        } satisfies LocationBroadcast);
      }

      /*
       * Follow THIS character's presence row, not the room.
       */
      realtimeChannel = supabase
        .channel(
          `character-location-${character.id}`,
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table:
              "character_presence",
            filter:
              `character_id=eq.${character.id}`,
          },
          (payload) => {
            const nextRoomId =
              (
                payload.new as {
                  room_id?:
                    | string
                    | null;
                }
              ).room_id ?? null;

            if (
              nextRoomId !==
              roomId
            ) {
              /*
               * This is the important change:
               * do NOT merely refresh the RSC tree. Force /game
               * to reload so the centre panel definitely switches
               * to the new room and chat.
               */
              reloadGameForLocationChange();
              return;
            }

            /*
             * Status / heartbeat / other presence updates in the
             * same room only need a normal Server Component refresh.
             */
            softRefresh(100);
          },
        )
        .subscribe();
    }

    void startLocationSync();

    /*
     * Browsers can suspend background tabs and miss/delay realtime
     * events. On return, ask the database for the authoritative room.
     */
    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void verifyCurrentLocation();
      }
    }

    function handleFocus() {
      void verifyCurrentLocation();
    }

    function handlePageshow() {
      void verifyCurrentLocation();
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    window.addEventListener(
      "focus",
      handleFocus,
    );

    window.addEventListener(
      "pageshow",
      handlePageshow,
    );

    return () => {
      cancelled = true;

      if (refreshTimer.current) {
        clearTimeout(
          refreshTimer.current,
        );
      }

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      window.removeEventListener(
        "focus",
        handleFocus,
      );

      window.removeEventListener(
        "pageshow",
        handlePageshow,
      );

      if (broadcastChannel) {
        broadcastChannel.close();
      }

      if (realtimeChannel) {
        void supabase.removeChannel(
          realtimeChannel,
        );
      }
    };
  }, [roomId, router]);

  return null;
}
