"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import {
  respondBreezeLodgingInvitation,
} from "@/app/(portal)/game/breeze-lodgings-actions";
import {
  createClient,
} from "@/lib/supabase/client";

export function BreezeLodgingInvitationMessage({
  invitationId,
}: {
  invitationId: string;
}) {
  const router = useRouter();
  const supabase =
    useMemo(
      () => createClient(),
      [],
    );

  const [state, setState] =
    useState<{
      status: string;
      roomName: string;
    } | null>(null);

  const [message, setMessage] =
    useState<string | null>(null);
  const [pending, startTransition] =
    useTransition();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const {
        data: invitation,
      } = await supabase
        .from(
          "breeze_lodging_invitations",
        )
        .select(
          "status, room_id",
        )
        .eq("id", invitationId)
        .maybeSingle();

      if (
        cancelled ||
        !invitation
      ) {
        return;
      }

      const {
        data: room,
      } = await supabase
        .from("rooms")
        .select("name")
        .eq(
          "id",
          invitation.room_id,
        )
        .maybeSingle();

      if (!cancelled) {
        setState({
          status:
            invitation.status,
          roomName:
            room?.name ??
            "The Breeze Lodgings",
        });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    invitationId,
    supabase,
  ]);

  function respond(
    response:
      | "accept"
      | "refuse",
  ) {
    if (pending) return;

    setMessage(null);

    startTransition(async () => {
      const result =
        await respondBreezeLodgingInvitation(
          invitationId,
          response,
        );

      setMessage(result.message);

      if (result.ok) {
        setState((current) =>
          current
            ? {
                ...current,
                status:
                  response === "accept"
                    ? "accepted"
                    : "refused",
              }
            : current,
        );

        if (result.enter) {
          router.push("/game");
          router.refresh();
        }
      }
    });
  }

  if (!state) {
    return (
      <p>
        Breeze Lodgings invitation
      </p>
    );
  }

  if (state.status !== "pending") {
    return (
      <div className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-black/10 p-3">
        <p className="font-serif text-base">
          {state.roomName}
        </p>

        <p className="mt-1 text-[8px] uppercase tracking-[0.15em] opacity-60">
          Invitation {state.status}
        </p>
      </div>
    );
  }

  return (
    <div className="border border-[rgb(var(--sep-colour-80613c))]/60 bg-black/10 p-3">
      <p className="text-[8px] uppercase tracking-[0.16em] opacity-60">
        The Breeze Lodgings
      </p>

      <p className="mt-1 font-serif text-lg">
        {state.roomName}
      </p>

      <p className="mt-1 text-[9px] opacity-70">
        You have been invited to enter this room.
      </p>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            respond("refuse")
          }
          className="border border-[rgb(var(--sep-colour-7b443b))] bg-[rgb(var(--sep-colour-2a1513))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d7a39a))] disabled:opacity-40"
        >
          Refuse
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() =>
            respond("accept")
          }
          className="border border-[rgb(var(--sep-colour-668657))] bg-[rgb(var(--sep-colour-172313))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-b8d8a7))] disabled:opacity-40"
        >
          Accept & enter
        </button>
      </div>

      {message ? (
        <p className="mt-2 text-[8px] opacity-75">
          {message}
        </p>
      ) : null}
    </div>
  );
}
