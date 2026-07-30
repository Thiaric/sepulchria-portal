"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type RoomRealtimeProps = {
  roomId: string;
};

export default function RoomRealtime({
  roomId,
}: RoomRealtimeProps) {
  const router = useRouter();

  const refreshTimer =
    useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

  useEffect(() => {
    const supabase = createClient();

    const refreshSoon = () => {
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current);
      }

      refreshTimer.current = setTimeout(() => {
        router.refresh();
      }, 250);
    };

    const channel = supabase
      .channel(`room-presence-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "character_presence",
          filter: `room_id=eq.${roomId}`,
        },
        refreshSoon,
      )
      .subscribe();

    return () => {
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current);
      }

      void supabase.removeChannel(channel);
    };
  }, [roomId, router]);

  return null;
}