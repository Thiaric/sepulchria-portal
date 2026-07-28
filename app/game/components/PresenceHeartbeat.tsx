"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import type { PresenceStatus } from "@/types/game";
import { heartbeatPresence, updatePresence } from "../actions";

type PresenceHeartbeatProps = {
  initialStatus: PresenceStatus;
};

const HEARTBEAT_INTERVAL_MS = 60_000;

export default function PresenceHeartbeat({
  initialStatus,
}: PresenceHeartbeatProps) {
  const [status, setStatus] = useState<PresenceStatus>(initialStatus);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const statusRef = useRef<PresenceStatus>(initialStatus);

  useEffect(() => {
    statusRef.current = initialStatus;
    setStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    void heartbeatPresence();

    const interval = window.setInterval(() => {
      void heartbeatPresence();
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  function handleStatusChange(nextStatus: PresenceStatus) {
    const previousStatus = statusRef.current;

    statusRef.current = nextStatus;
    setStatus(nextStatus);
    setErrorMessage("");

    startTransition(async () => {
      const result = await updatePresence(nextStatus);

      if (!result.ok) {
        statusRef.current = previousStatus;
        setStatus(previousStatus);
        setErrorMessage(result.message);
        return;
      }

      statusRef.current = result.status;
      setStatus(result.status);
    });
  }

  return (
    <div>
      <label className="block text-[9px] uppercase tracking-[0.2em] text-[#77664e]">
        Presence
        <select
          value={status}
          disabled={isPending}
          onChange={(event) =>
            handleStatusChange(event.target.value as PresenceStatus)
          }
          className="mt-2 w-full border border-[#59432c]/60 bg-[#100c09] px-3 py-2 text-xs text-[#c9b28a] outline-none disabled:cursor-wait disabled:opacity-60"
        >
          <option value="online">Online</option>
          <option value="away">Away</option>
          <option value="busy">Busy</option>
        </select>
      </label>

      {errorMessage ? (
        <p
          aria-live="polite"
          className="mt-2 text-xs leading-5 text-[#d58d82]"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
