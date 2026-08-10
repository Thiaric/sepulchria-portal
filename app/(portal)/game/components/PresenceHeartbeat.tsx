"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";
import type { PresenceStatus } from "@/types/game";

const HEARTBEAT_INTERVAL_MS = 45_000;

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

  const statusRef =
    useRef<PresenceStatus>(
      initialStatus,
    );

  const roomIdRef =
    useRef(roomId);

  const manualStatusRef =
    useRef<PresenceStatus>(
      initialStatus,
    );

  const hiddenSinceRef =
    useRef<number | null>(null);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    hiddenSinceRef.current =
      document.visibilityState ===
      "hidden"
        ? Date.now()
        : null;
  }, []);

  const updatePresence =
    useCallback(
      async (
        nextStatus: PresenceStatus,
        options?: {
          showSavingState?: boolean;
        },
      ) => {
        const supabase =
          createClient();

        if (
          options?.showSavingState
        ) {
          setSaving(true);
        }

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
              status: nextStatus,
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

          if (
            options?.showSavingState
          ) {
            setSaving(false);
          }

          return false;
        }

        statusRef.current =
          nextStatus;

        setStatus(nextStatus);

        if (
          options?.showSavingState
        ) {
          setSaving(false);
        }

        return true;
      },
      [characterId],
    );

  const handleStatusChange =
    useCallback(
      async (
        nextStatus: PresenceStatus,
      ) => {
        manualStatusRef.current =
          nextStatus;

        await updatePresence(
          nextStatus,
          {
            showSavingState: true,
          },
        );
      },
      [updatePresence],
    );

  useEffect(() => {
    void updatePresence(
      initialStatus,
    );

    const heartbeat =
      window.setInterval(() => {
        void updatePresence(
          statusRef.current,
        );
      }, HEARTBEAT_INTERVAL_MS);

    return () => {
      window.clearInterval(
        heartbeat,
      );
    };
  }, [
    initialStatus,
    roomId,
    updatePresence,
  ]);

  useEffect(() => {
    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          "hidden"
        ) {
          hiddenSinceRef.current =
            Date.now();

          if (
            statusRef.current !==
            "busy"
          ) {
            void updatePresence(
              "away",
            );
          }

          return;
        }

        hiddenSinceRef.current =
          null;

        const restoredStatus =
          manualStatusRef.current ===
          "busy"
            ? "busy"
            : "online";

        void updatePresence(
          restoredStatus,
        );
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [updatePresence]);

  useEffect(() => {
    const handleFocus = () => {
      if (
        document.visibilityState ===
          "visible" &&
        statusRef.current !==
          "busy"
      ) {
        hiddenSinceRef.current =
          null;

        void updatePresence(
          "online",
        );
      }
    };

    window.addEventListener(
      "focus",
      handleFocus,
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus,
      );
    };
  }, [updatePresence]);

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