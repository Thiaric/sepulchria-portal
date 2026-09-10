"use client";

import { useEffect, useMemo, useState } from "react";
import { respondOrderHeadquartersInvitation } from "@/app/(portal)/orders/headquarters/actions";
import { createClient } from "@/lib/supabase/client";

export function OrderHeadquartersInvitationMessage({
  invitationId,
}: {
  invitationId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from("order_headquarters_invitations")
        .select(`
          status, custom_message,
          headquarters:order_headquarters!order_headquarters_invitations_headquarters_id_fkey(
            room:rooms!order_headquarters_room_id_fkey(name)
          )
        `)
        .eq("id", invitationId)
        .maybeSingle();

      if (cancelled || !data) return;

      const hq = Array.isArray(data.headquarters) ? data.headquarters[0] : data.headquarters;
      const room = Array.isArray(hq?.room) ? hq.room[0] : hq?.room;

      setState({
        status: data.status,
        customMessage: data.custom_message,
        roomName: room?.name ?? "Order Headquarters",
      });
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [invitationId, supabase]);

  if (!state) return <p className="components_messages_order_headquarters_invitation_message_p_text">Order Headquarters invitation</p>;

  if (state.status !== "pending") {
    return (
      <div className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-black/10 p-3 components_messages_order_headquarters_invitation_message_div_container">
        <p className="font-serif text-base components_messages_order_headquarters_invitation_message_p_text_2">{state.roomName}</p>
        <p className="mt-1 text-[8px] uppercase tracking-[0.15em] opacity-60 components_messages_order_headquarters_invitation_message_p_text_3">
          Invitation {state.status}
        </p>
      </div>
    );
  }

  return (
    <div className="border border-[rgb(var(--sep-colour-80613c))]/60 bg-black/10 p-3 components_messages_order_headquarters_invitation_message_div_container_2">
      <p className="text-[8px] uppercase tracking-[0.16em] opacity-60 components_messages_order_headquarters_invitation_message_p_text_4">
        Order Headquarters invitation
      </p>

      <p className="mt-1 font-serif text-lg components_messages_order_headquarters_invitation_message_p_text_5">{state.roomName}</p>

      {state.customMessage ? (
        <p className="mt-2 text-xs italic leading-5 opacity-75 components_messages_order_headquarters_invitation_message_p_text_6">
          {state.customMessage}
        </p>
      ) : null}

      <div className="mt-3 flex gap-2 components_messages_order_headquarters_invitation_message_div_container_3">
        <form className="components_messages_order_headquarters_invitation_message_form_respond_order_headquarters_invitation" action={respondOrderHeadquartersInvitation}>
          <input className="components_messages_order_headquarters_invitation_message_input_invitation_id" type="hidden" name="invitationId" value={invitationId} />
          <input className="components_messages_order_headquarters_invitation_message_input_response" type="hidden" name="response" value="refuse" />
          <button
            type="submit"
            className="border border-[rgb(var(--sep-colour-7b443b))] bg-[rgb(var(--sep-colour-2a1513))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d7a39a))] components_messages_order_headquarters_invitation_message_button_refuse"
          >
            Refuse
          </button>
        </form>

        <form className="components_messages_order_headquarters_invitation_message_form_respond_order_headquarters_invitation_2" action={respondOrderHeadquartersInvitation}>
          <input className="components_messages_order_headquarters_invitation_message_input_invitation_id_2" type="hidden" name="invitationId" value={invitationId} />
          <input className="components_messages_order_headquarters_invitation_message_input_response_2" type="hidden" name="response" value="accept" />
          <button
            type="submit"
            className="border border-[rgb(var(--sep-colour-668657))] bg-[rgb(var(--sep-colour-172313))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-b8d8a7))] components_messages_order_headquarters_invitation_message_button_accept_enter"
          >
            Accept & enter
          </button>
        </form>
      </div>
    </div>
  );
}
