"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type HeadquartersRelation =
  | {
      is_active: boolean | null;
    }
  | {
      is_active: boolean | null;
    }[]
  | null;

export function useOrderHeadquartersRoomId() {
  const [
    roomId,
    setRoomId,
  ] = useState<string | null>(null);

  const refresh =
    useCallback(async () => {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        setRoomId(null);
        return;
      }

      const {
        data: character,
        error: characterError,
      } = await supabase
        .from("characters")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (
        characterError ||
        !character
      ) {
        if (characterError) {
          console.error(
            "Unable to identify character for Order Headquarters shortcut:",
            characterError,
          );
        }

        setRoomId(null);
        return;
      }

      const {
        data: memberships,
        error: membershipError,
      } = await supabase
        .from("order_memberships")
        .select("order_id")
        .eq(
          "character_id",
          character.id,
        )
        .limit(1);

      if (membershipError) {
        console.error(
          "Unable to load Order membership for Headquarters shortcut:",
          membershipError,
        );
        setRoomId(null);
        return;
      }

      const orderId =
        memberships?.[0]?.order_id ??
        null;

      if (!orderId) {
        setRoomId(null);
        return;
      }

      const {
        data: headquarters,
        error: headquartersError,
      } = await supabase
        .from("order_headquarters")
        .select(`
          room_id,
          room:rooms!order_headquarters_room_id_fkey(
            is_active
          )
        `)
        .eq(
          "order_id",
          orderId,
        )
        .maybeSingle();

      if (headquartersError) {
        console.error(
          "Unable to load Order Headquarters shortcut:",
          headquartersError,
        );
        setRoomId(null);
        return;
      }

      const roomRelation =
        headquarters?.room as
          HeadquartersRelation;

      const room =
        Array.isArray(roomRelation)
          ? roomRelation[0] ?? null
          : roomRelation;

      setRoomId(
        headquarters?.room_id &&
          room?.is_active === true
          ? headquarters.room_id
          : null,
      );
    }, []);

  useEffect(() => {
    void refresh();

    function handleFocus() {
      void refresh();
    }

    function handleVisibility() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void refresh();
      }
    }

    window.addEventListener(
      "focus",
      handleFocus,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility,
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );
    };
  }, [refresh]);

  return roomId;
}
