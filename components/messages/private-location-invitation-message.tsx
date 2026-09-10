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
      <p className="components_messages_private_location_invitation_message_p_text">
        Private Location invitation
      </p>
    );
  }

  if (state.status !== "pending") {
    return (
      <div className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-black/10 p-3 components_messages_private_location_invitation_message_div_container">
        <p className="font-serif text-base components_messages_private_location_invitation_message_p_text_2">
          {state.roomName}
        </p>

        <p className="mt-1 text-[8px] uppercase tracking-[0.15em] opacity-60 components_messages_private_location_invitation_message_p_text_3">
          Invitation {state.status}
        </p>
      </div>
    );
  }

  return (
    <div className="border border-[rgb(var(--sep-colour-80613c))]/60 bg-black/10 p-3 components_messages_private_location_invitation_message_div_container_2">
      <p className="text-[8px] uppercase tracking-[0.16em] opacity-60 components_messages_private_location_invitation_message_p_text_4">
        Private Location invitation
      </p>

      <p className="mt-1 font-serif text-lg components_messages_private_location_invitation_message_p_text_5">
        {state.roomName}
      </p>

      <div className="mt-3 flex gap-2 components_messages_private_location_invitation_message_div_container_3">
        <form className="components_messages_private_location_invitation_message_form_respond_private_location_invitation"
          action={
            respondPrivateLocationInvitation
          }
        >
          <input className="components_messages_private_location_invitation_message_input_invitation_id"
            type="hidden"
            name="invitationId"
            value={invitationId}
          />
          <input className="components_messages_private_location_invitation_message_input_response"
            type="hidden"
            name="response"
            value="refuse"
          />

          <button
            type="submit"
            className="border border-[rgb(var(--sep-colour-7b443b))] bg-[rgb(var(--sep-colour-2a1513))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d7a39a))] components_messages_private_location_invitation_message_button_refuse"
          >
            Refuse
          </button>
        </form>

        <form className="components_messages_private_location_invitation_message_form_respond_private_location_invitation_2"
          action={
            respondPrivateLocationInvitation
          }
        >
          <input className="components_messages_private_location_invitation_message_input_invitation_id_2"
            type="hidden"
            name="invitationId"
            value={invitationId}
          />
          <input className="components_messages_private_location_invitation_message_input_response_2"
            type="hidden"
            name="response"
            value="accept"
          />

          <button
            type="submit"
            className="border border-[rgb(var(--sep-colour-668657))] bg-[rgb(var(--sep-colour-172313))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-b8d8a7))] components_messages_private_location_invitation_message_button_accept_enter"
          >
            Accept & enter
          </button>
        </form>
      </div>
    </div>
  );
}
