"use client";

import {
  useCallback,
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

type Invite = {
  id: string;
  roomName: string;
  inviterName: string;
};

export function PrivateLocationInvitationPopup({
  characterId,
}: {
  characterId: string | null;
}) {
  const supabase =
    useMemo(
      () => createClient(),
      [],
    );

  const [
    invite,
    setInvite,
  ] =
    useState<Invite | null>(
      null,
    );

  const load =
    useCallback(
      async () => {
        if (!characterId) {
          setInvite(null);
          return;
        }

        const {
          data: invitation,
          error,
        } = await supabase
          .from(
            "private_location_invitations",
          )
          .select(
            "id, room_id, inviter_character_id",
          )
          .eq(
            "recipient_character_id",
            characterId,
          )
          .eq("status", "pending")
          .eq(
            "delivery_method",
            "popup",
          )
          .order(
            "created_at",
            { ascending: true },
          )
          .limit(1)
          .maybeSingle();

        if (error || !invitation) {
          if (error) {
            console.error(
              "Private Location invitation:",
              error.message,
            );
          }

          setInvite(null);
          return;
        }

        const [
          roomResult,
          inviterResult,
        ] = await Promise.all([
          supabase
            .from("rooms")
            .select("name")
            .eq(
              "id",
              invitation.room_id,
            )
            .maybeSingle(),

          supabase
            .from("characters")
            .select(
              "display_name, first_name, surname",
            )
            .eq(
              "id",
              invitation.inviter_character_id,
            )
            .maybeSingle(),
        ]);

        const inviter =
          inviterResult.data;

        setInvite({
          id: invitation.id,
          roomName:
            roomResult.data?.name ??
            "a Private Location",
          inviterName:
            inviter?.display_name?.trim() ||
            `${inviter?.first_name ?? ""} ${inviter?.surname ?? ""}`.trim() ||
            "A character",
        });
      },
      [
        characterId,
        supabase,
      ],
    );

  useEffect(() => {
    void load();

    if (!characterId) {
      return;
    }

    const channel =
      supabase
        .channel(
          `private-location-invite-${characterId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "private_location_invitations",
            filter:
              `recipient_character_id=eq.${characterId}`,
          },
          () => {
            void load();
          },
        )
        .subscribe();

    const timer =
      window.setInterval(
        () => {
          void load();
        },
        5000,
      );

    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(
        channel,
      );
    };
  }, [
    characterId,
    load,
    supabase,
  ]);

  if (!invite) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4">
      <section className="w-full max-w-md border border-[rgb(var(--sep-colour-8d6d3e))] bg-[rgb(var(--sep-colour-15100d))] p-6 shadow-2xl">
        <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-9b7a50))]">
          Private Location invitation
        </p>

        <h2 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-ead1a5))]">
          {invite.roomName}
        </h2>

        <p className="mt-3 text-sm leading-6 text-[rgb(var(--sep-colour-a99a84))]">
          <span className="text-[rgb(var(--sep-colour-d9bd91))]">
            {invite.inviterName}
          </span>{" "}
          has invited your character into this private location.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <form
            action={
              respondPrivateLocationInvitation
            }
          >
            <input
              type="hidden"
              name="invitationId"
              value={invite.id}
            />
            <input
              type="hidden"
              name="response"
              value="refuse"
            />

            <button
              type="submit"
              className="w-full border border-[rgb(var(--sep-colour-7b443b))] bg-[rgb(var(--sep-colour-2a1513))] px-4 py-3 text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-d7a39a))]"
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
              value={invite.id}
            />
            <input
              type="hidden"
              name="response"
              value="accept"
            />

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
