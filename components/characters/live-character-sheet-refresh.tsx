"use client";

import {
  useEffect,
  useRef,
} from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type LiveCharacterSheetRefreshProps = {
  characterId: string;
  raceId?: string | null;
};

export function LiveCharacterSheetRefresh({
  characterId,
  raceId = null,
}: LiveCharacterSheetRefreshProps) {
  const router = useRouter();

  const refreshTimerRef =
    useRef<number | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let disposed = false;

    function refreshSheet() {
      if (disposed) return;

      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current =
        window.setTimeout(() => {
          if (!disposed) {
            router.refresh();
          }
        }, 250);
    }

    const channels = [
      supabase
        .channel(`live-sheet-character-${characterId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "characters",
            filter: `id=eq.${characterId}`,
          },
          refreshSheet,
        )
        .subscribe(),

      supabase
        .channel(`live-sheet-membership-${characterId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "order_memberships",
            filter: `character_id=eq.${characterId}`,
          },
          refreshSheet,
        )
        .subscribe(),

      supabase
        .channel(`live-sheet-character-gifts-${characterId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "character_gifts",
            filter: `character_id=eq.${characterId}`,
          },
          refreshSheet,
        )
        .subscribe(),

      supabase
        .channel(`live-sheet-active-items-${characterId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "character_active_item_effects",
            filter: `character_id=eq.${characterId}`,
          },
          refreshSheet,
        )
        .subscribe(),
    ];

    if (raceId) {
      channels.push(
        supabase
          .channel(`live-sheet-race-${raceId}-${characterId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "races",
              filter: `id=eq.${raceId}`,
            },
            refreshSheet,
          )
          .subscribe(),
      );
    }

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        refreshSheet();
      }
    }

    document.addEventListener(
      "visibilitychange",
      refreshWhenVisible,
    );

    return () => {
      disposed = true;

      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
      }

      document.removeEventListener(
        "visibilitychange",
        refreshWhenVisible,
      );

      for (const channel of channels) {
        void supabase.removeChannel(channel);
      }
    };
  }, [characterId, raceId, router]);

  return null;
}
