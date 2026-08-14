"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";
import type { PresenceStatus } from "@/types/game";

type PresenceHeartbeatProps = {
  characterId: string;
  roomId: string;
  initialStatus: PresenceStatus;
};

export default function PresenceHeartbeat({
  characterId,
  roomId,
  initialStatus,
}: PresenceHeartbeatProps) {
  const [status, setStatus] =
    useState(initialStatus);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const roomIdRef =
    useRef(roomId);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  const updatePresence =
    useCallback(
      async (
        nextStatus: PresenceStatus,
      ) => {
        const supabase =
          createClient();

        setSaving(true);
        setError(null);

        const {
          error: presenceError,
        } = await supabase
          .from(
            "character_presence",
          )
          .upsert(
            {
              character_id:
                characterId,
              room_id:
                roomIdRef.current,
              status:
  nextStatus,
manual_status:
  nextStatus,
last_seen_at:
  new Date().toISOString(),
            },
            {
              onConflict:
                "character_id",
            },
          );

        if (presenceError) {
          setError(
            "Presence could not be updated.",
          );

          setSaving(false);

          return false;
        }

        setStatus(nextStatus);
        setSaving(false);

        return true;
      },
      [characterId],
    );

  const handleStatusChange =
    useCallback(
      async (
        nextStatus: PresenceStatus,
      ) => {
        await updatePresence(
          nextStatus,
        );
      },
      [updatePresence],
    );

  /*
   * IMPORTANT:
   *
   * This component no longer:
   * - runs its own heartbeat;
   * - watches tab visibility;
   * - changes Online/Away automatically;
   * - reacts to focus.
   *
   * It now exists ONLY for the manual
   * Online / Away / Busy selector.
   *
   * Automatic presence belongs to the
   * portal-level heartbeat.
   */

  return (
    <div className="border border-[#59432c]/40 bg-[#100c09] p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[8px] uppercase tracking-[0.22em] text-[#876a46]">
            Your presence
          </p>

          <p className="mt-1 text-xs text-[#8f8271]">
            Visible activity status
          </p>
        </div>

        <select
          value={status}
          disabled={saving}
          onChange={(event) => {
            void handleStatusChange(
              event.target
                .value as PresenceStatus,
            );
          }}
          className="border border-[#765937] bg-[#271c12] px-3 py-2 text-xs capitalize text-[#dfc79c] outline-none transition focus:border-[#b28a52] disabled:cursor-wait disabled:opacity-60"
        >
          <option value="online">
            Online
          </option>

          <option value="away">
            Away
          </option>

          <option value="busy">
            Busy
          </option>
        </select>
      </div>

      {error ? (
        <p className="mt-3 text-xs leading-5 text-[#d18b80]">
          {error}
        </p>
      ) : null}
    </div>
  );
}