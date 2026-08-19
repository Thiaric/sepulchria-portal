"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  respondPrivateLocationInvitation,
} from "@/app/(portal)/private-location/actions";
import {
  createClient,
} from "@/lib/supabase/client";

export function PrivateLocationInvitationMessage({
  invitationId,
}: {
  invitationId: string;
}) {
  const supabase =
    useMemo(
      () => createClient(),
      [],
    );

  const [
    state,
    setState,
  ] =
    useState<{
      status: string;
      roomName: string;
    } | null>(null);

  useEffect(() => {
    let cancelled =
      false;

    async function load() {
      const {
        data: invitation,
      } = await supabase
        .from(
          "private_location_invitations",
        )
        .select("status, room_id")
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
            "Private Location",
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

  if (!state) {
    return (
      <p>
        Private Location invitation
      </p>
    );
  }

  if (state.status !== "pending") {
    return (
      <div className="border border-[#60482e]/45 bg-black/10 p-3">
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
    <div className="border border-[#80613c]/60 bg-black/10 p-3">
      <p className="text-[8px] uppercase tracking-[0.16em] opacity-60">
        Private Location invitation
      </p>

      <p className="mt-1 font-serif text-lg">
        {state.roomName}
      </p>

      <div className="mt-3 flex gap-2">
        <form
          action={
            respondPrivateLocationInvitation
          }
        >
          <input
            type="hidden"
            name="invitationId"
            value={invitationId}
          />
          <input
            type="hidden"
            name="response"
            value="refuse"
          />

          <button
            type="submit"
            className="border border-[#7b443b] bg-[#2a1513] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[#d7a39a]"
          >
            Refuse
          </button>
        </form>

        <form
          action={
            respondPrivateLocationInvitation
          }
        >
          <input
            type="hidden"
            name="invitationId"
            value={invitationId}
          />
          <input
            type="hidden"
            name="response"
            value="accept"
          />

          <button
            type="submit"
            className="border border-[#668657] bg-[#172313] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[#b8d8a7]"
          >
            Accept & enter
          </button>
        </form>
      </div>
    </div>
  );
}
