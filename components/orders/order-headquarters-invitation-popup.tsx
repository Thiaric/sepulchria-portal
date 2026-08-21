"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { respondOrderHeadquartersInvitation } from "@/app/(portal)/orders/headquarters/actions";
import { createClient } from "@/lib/supabase/client";

export function OrderHeadquartersInvitationPopup({
  characterId,
}: {
  characterId: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [invite, setInvite] = useState<any>(null);

  const load = useCallback(async () => {
    if (!characterId) {
      setInvite(null);
      return;
    }

    const { data, error } = await supabase
      .from("order_headquarters_invitations")
      .select(`
        id, custom_message, access_duration_minutes, inviter_character_id,
        headquarters:order_headquarters!order_headquarters_invitations_headquarters_id_fkey(
          room:rooms!order_headquarters_room_id_fkey(name)
        )
      `)
      .eq("recipient_character_id", characterId)
      .eq("status", "pending")
      .eq("delivery_method", "popup")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      if (error) console.error("Order Headquarters invitation:", error.message);
      setInvite(null);
      return;
    }

    const { data: inviter } = await supabase
      .from("characters")
      .select("display_name,first_name,surname")
      .eq("id", data.inviter_character_id)
      .maybeSingle();

    const hq = Array.isArray(data.headquarters)
      ? data.headquarters[0]
      : data.headquarters;

    const room = Array.isArray(hq?.room)
      ? hq.room[0]
      : hq?.room;

    const minutes = data.access_duration_minutes;
    const durationLabel =
      minutes === null
        ? "Permanent access"
        : minutes < 1440
          ? `${minutes / 60} hour${minutes === 60 ? "" : "s"} after acceptance`
          : `${minutes / 1440} day${minutes === 1440 ? "" : "s"} after acceptance`;

    setInvite({
      id: data.id,
      roomName: room?.name ?? "Order Headquarters",
      inviterName:
        inviter?.display_name?.trim() ||
        `${inviter?.first_name ?? ""} ${inviter?.surname ?? ""}`.trim() ||
        "A character",
      customMessage: data.custom_message,
      durationLabel,
    });
  }, [characterId, supabase]);

  useEffect(() => {
    void load();
    if (!characterId) return;

    const channel = supabase
      .channel(`order-hq-invite-${characterId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_headquarters_invitations",
          filter: `recipient_character_id=eq.${characterId}`,
        },
        () => void load(),
      )
      .subscribe();

    const timer = window.setInterval(() => void load(), 5000);

    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [characterId, load, supabase]);

  if (!invite) return null;

  return (
    <div className="fixed inset-0 z-[310] flex items-center justify-center bg-black/60 p-4">
      <section className="w-full max-w-md border border-[rgb(var(--sep-colour-8d6d3e))] bg-[rgb(var(--sep-colour-15100d))] p-6 shadow-2xl">
        <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-9b7a50))]">
          Order Headquarters invitation
        </p>

        <h2 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-ead1a5))]">
          {invite.roomName}
        </h2>

        <p className="mt-3 text-sm leading-6 text-[rgb(var(--sep-colour-a99a84))]">
          <span className="text-[rgb(var(--sep-colour-d9bd91))]">{invite.inviterName}</span>{" "}
          has invited you into this Order Headquarters.
        </p>

        {invite.customMessage ? (
          <p className="mt-3 border-l border-[rgb(var(--sep-colour-80613b))] pl-3 text-xs italic leading-5 text-[rgb(var(--sep-colour-b9aa94))]">
            {invite.customMessage}
          </p>
        ) : null}

        <p className="mt-3 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">
          {invite.durationLabel}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <form action={respondOrderHeadquartersInvitation}>
            <input type="hidden" name="invitationId" value={invite.id} />
            <input type="hidden" name="response" value="refuse" />
            <button
              type="submit"
              className="w-full border border-[rgb(var(--sep-colour-7b443b))] bg-[rgb(var(--sep-colour-2a1513))] px-4 py-3 text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-d7a39a))]"
            >
              Refuse
            </button>
          </form>

          <form action={respondOrderHeadquartersInvitation}>
            <input type="hidden" name="invitationId" value={invite.id} />
            <input type="hidden" name="response" value="accept" />
            <button
              type="submit"
              className="w-full border border-[rgb(var(--sep-colour-668657))] bg-[rgb(var(--sep-colour-172313))] px-4 py-3 text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-b8d8a7))]"
            >
              Accept & enter
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
