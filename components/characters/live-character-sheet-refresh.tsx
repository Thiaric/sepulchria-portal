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

  // Browser setTimeout returns a numeric id.
  const refreshTimerRef =
    useRef<number | null>(null);

  useEffect(() => {
    const supabase =
      createClient();

    let disposed = false;

    function refreshSheet() {
      if (disposed) {
        return;
      }

      if (
        refreshTimerRef.current !== null
      ) {
        window.clearTimeout(
          refreshTimerRef.current,
        );
      }

      refreshTimerRef.current =
        window.setTimeout(
          () => {
            if (!disposed) {
              router.refresh();
            }
          },
          150,
        );
    }

    const channels = [
      supabase
        .channel(
          `live-sheet-character-${characterId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "characters",
            filter:
              `id=eq.${characterId}`,
          },
          refreshSheet,
        )
        .subscribe(),

      supabase
        .channel(
          `live-sheet-membership-${characterId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "order_memberships",
            filter:
              `character_id=eq.${characterId}`,
          },
          refreshSheet,
        )
        .subscribe(),

      supabase
        .channel(
          `live-sheet-order-levels-${characterId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "order_levels",
          },
          refreshSheet,
        )
        .subscribe(),

      supabase
        .channel(
          `live-sheet-order-jobs-${characterId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "order_jobs",
          },
          refreshSheet,
        )
        .subscribe(),

      supabase
        .channel(
          `live-sheet-orders-${characterId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
          },
          refreshSheet,
        )
        .subscribe(),

      supabase
        .channel(
          `live-sheet-associations-${characterId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "associations",
          },
          refreshSheet,
        )
        .subscribe(),

      supabase
        .channel(
          `live-sheet-character-gifts-${characterId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "character_gifts",
            filter:
              `character_id=eq.${characterId}`,
          },
          refreshSheet,
        )
        .subscribe(),

      supabase
        .channel(
          `live-sheet-gifts-${characterId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "gifts",
          },
          refreshSheet,
        )
        .subscribe(),

      supabase
        .channel(
          `live-sheet-gift-activations-${characterId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "gift_activations",
          },
          refreshSheet,
        )
        .subscribe(),
    ];

    if (raceId) {
      channels.push(
        supabase
          .channel(
            `live-sheet-race-${raceId}-${characterId}`,
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "races",
              filter:
                `id=eq.${raceId}`,
            },
            refreshSheet,
          )
          .subscribe(),
      );
    }

    const fallbackInterval =
      window.setInterval(
        () => {
          if (!disposed) {
            router.refresh();
          }
        },
        10000,
      );

    function refreshWhenVisible() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        refreshSheet();
      }
    }

    document.addEventListener(
      "visibilitychange",
      refreshWhenVisible,
    );

    return () => {
      disposed = true;

      window.clearInterval(
        fallbackInterval,
      );

      if (
        refreshTimerRef.current !== null
      ) {
        window.clearTimeout(
          refreshTimerRef.current,
        );
      }

      document.removeEventListener(
        "visibilitychange",
        refreshWhenVisible,
      );

      for (
        const channel of channels
      ) {
        void supabase.removeChannel(
          channel,
        );
      }
    };
  }, [
    characterId,
    raceId,
    router,
  ]);

  return null;
}