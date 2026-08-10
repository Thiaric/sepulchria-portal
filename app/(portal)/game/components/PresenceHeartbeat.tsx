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

/*
 * A character is not automatically marked Away just because
 * the player changes browser tab/window.
 *
 * They must remain away from the game tab for 15 minutes.
 */
const AUTO_AWAY_AFTER_MS =
  15 * 60_000;

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
    useState<PresenceStatus>(
      initialStatus,
    );

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

  /*
   * This stores the status explicitly chosen by the player.
   *
   * Automatic Away must never overwrite this permanently:
   * - manual Busy stays Busy;
   * - manual Away stays Away;
   * - manual Online may temporarily become Away after
   *   15 minutes outside the game tab and returns to Online
   *   when the player comes back.
   */
  const manualStatusRef =
    useRef<PresenceStatus>(
      initialStatus,
    );

  const autoAwayTimerRef =
    useRef<number | null>(
      null,
    );

  const hiddenSinceRef =
    useRef<number | null>(
      document.visibilityState ===
        "hidden"
        ? Date.now()
        : null,
    );

  const autoAwayAppliedRef =
    useRef(false);

  useEffect(() => {
    roomIdRef.current =
      roomId;
  }, [roomId]);

  useEffect(() => {
    statusRef.current =
      status;
  }, [status]);

  const updatePresence =
    useCallback(
      async (
        nextStatus:
          PresenceStatus,
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
          error:
            presenceError,
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

  const clearAutoAwayTimer =
    useCallback(() => {
      if (
        autoAwayTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          autoAwayTimerRef.current,
        );

        autoAwayTimerRef.current =
          null;
      }
    }, []);

  const applyAutomaticAway =
    useCallback(async () => {
      /*
       * Busy and manually selected Away are intentional player
       * statuses and must never be replaced by automatic logic.
       */
      if (
        manualStatusRef.current !==
        "online"
      ) {
        return;
      }

      if (
        autoAwayAppliedRef.current
      ) {
        return;
      }

      const success =
        await updatePresence(
          "away",
        );

      if (success) {
        autoAwayAppliedRef.current =
          true;
      }
    }, [updatePresence]);

  const scheduleAutomaticAway =
    useCallback(() => {
      clearAutoAwayTimer();

      /*
       * Only Online may become automatically Away.
       * Manual Away / Busy remain untouched.
       */
      if (
        manualStatusRef.current !==
        "online"
      ) {
        return;
      }

      const hiddenSince =
        hiddenSinceRef.current ??
        Date.now();

      hiddenSinceRef.current =
        hiddenSince;

      const elapsed =
        Date.now() -
        hiddenSince;

      const remaining =
        AUTO_AWAY_AFTER_MS -
        elapsed;

      if (remaining <= 0) {
        void applyAutomaticAway();
        return;
      }

      autoAwayTimerRef.current =
        window.setTimeout(
          () => {
            autoAwayTimerRef.current =
              null;

            void applyAutomaticAway();
          },
          remaining,
        );
    }, [
      applyAutomaticAway,
      clearAutoAwayTimer,
    ]);

  const restoreManualStatus =
    useCallback(async () => {
      clearAutoAwayTimer();

      hiddenSinceRef.current =
        null;

      /*
       * If Online was changed to Away automatically, restore
       * the player's actual manual status when they return.
       */
      if (
        autoAwayAppliedRef.current
      ) {
        autoAwayAppliedRef.current =
          false;

        await updatePresence(
          manualStatusRef.current,
        );

        return;
      }

      /*
       * If no automatic Away occurred, a normal heartbeat is
       * enough. This avoids unnecessarily rewriting the status.
       */
      await updatePresence(
        manualStatusRef.current,
      );
    }, [
      clearAutoAwayTimer,
      updatePresence,
    ]);

  const handleStatusChange =
    useCallback(
      async (
        nextStatus:
          PresenceStatus,
      ) => {
        clearAutoAwayTimer();

        manualStatusRef.current =
          nextStatus;

        autoAwayAppliedRef.current =
          false;

        const success =
          await updatePresence(
            nextStatus,
            {
              showSavingState:
                true,
            },
          );

        /*
         * If the player explicitly selects Online while the game
         * tab is hidden, start a fresh 15-minute inactivity timer.
         */
        if (
          success &&
          nextStatus ===
            "online" &&
          document.visibilityState ===
            "hidden"
        ) {
          hiddenSinceRef.current =
            Date.now();

          scheduleAutomaticAway();
        }
      },
      [
        clearAutoAwayTimer,
        scheduleAutomaticAway,
        updatePresence,
      ],
    );

  /*
   * Regular in-game heartbeat.
   *
   * It keeps presence fresh but preserves whatever status is
   * currently active, including an automatically applied Away.
   */
  useEffect(() => {
    void updatePresence(
      statusRef.current,
    );

    const heartbeat =
      window.setInterval(
        () => {
          void updatePresence(
            statusRef.current,
          );
        },
        HEARTBEAT_INTERVAL_MS,
      );

    return () => {
      window.clearInterval(
        heartbeat,
      );
    };
  }, [
    roomId,
    updatePresence,
  ]);

  /*
   * Visibility no longer means "Away immediately".
   *
   * Hidden:
   *   start the 15-minute timer.
   *
   * Visible:
   *   cancel the timer and restore the player's manual status
   *   if automatic Away had actually been applied.
   */
  useEffect(() => {
    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "hidden"
      ) {
        if (
          hiddenSinceRef.current ===
          null
        ) {
          hiddenSinceRef.current =
            Date.now();
        }

        scheduleAutomaticAway();
        return;
      }

      void restoreManualStatus();
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    /*
     * If this component mounted while already hidden, begin
     * counting from mount rather than marking Away immediately.
     */
    if (
      document.visibilityState ===
      "hidden"
    ) {
      scheduleAutomaticAway();
    }

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      clearAutoAwayTimer();
    };
  }, [
    clearAutoAwayTimer,
    restoreManualStatus,
    scheduleAutomaticAway,
  ]);

  /*
   * Focus is only a safety net. It does not force Online over
   * a manually selected Away or Busy status.
   */
  useEffect(() => {
    function handleFocus() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void restoreManualStatus();
      }
    }

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
  }, [restoreManualStatus]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] uppercase tracking-[0.26em] text-[#876a46]">
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
