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

  if (!state) return <p>Order Headquarters invitation</p>;

  if (state.status !== "pending") {
    return (
      <div className="border border-[#60482e]/45 bg-black/10 p-3">
        <p className="font-serif text-base">{state.roomName}</p>
        <p className="mt-1 text-[8px] uppercase tracking-[0.15em] opacity-60">
          Invitation {state.status}
        </p>
      </div>
    );
  }

  return (
    <div className="border border-[#80613c]/60 bg-black/10 p-3">
      <p className="text-[8px] uppercase tracking-[0.16em] opacity-60">
        Order Headquarters invitation
      </p>

      <p className="mt-1 font-serif text-lg">{state.roomName}</p>

      {state.customMessage ? (
        <p className="mt-2 text-xs italic leading-5 opacity-75">
          {state.customMessage}
        </p>
      ) : null}

      <div className="mt-3 flex gap-2">
        <form action={respondOrderHeadquartersInvitation}>
          <input type="hidden" name="invitationId" value={invitationId} />
          <input type="hidden" name="response" value="refuse" />
          <button
            type="submit"
            className="border border-[#7b443b] bg-[#2a1513] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[#d7a39a]"
          >
            Refuse
          </button>
        </form>

        <form action={respondOrderHeadquartersInvitation}>
          <input type="hidden" name="invitationId" value={invitationId} />
          <input type="hidden" name="response" value="accept" />
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
