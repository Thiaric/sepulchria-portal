"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  createClient,
} from "@/lib/supabase/client";

import type {
  BreezeLodgingManageData,
} from "@/lib/breeze-lodgings/access";
import {
  inviteBreezeLodgingGuest,
  removeBreezeLodgingGuest,
  withdrawBreezeLodgingInvitation,
} from "../breeze-lodgings-actions";

export function BreezeLodgingGuestsPanel({
  data,
}: {
  data: BreezeLodgingManageData;
}) {
  const router = useRouter();
  const supabase = useMemo(
    () => createClient(),
    [],
  );
  const [query, setQuery] =
    useState("");
  const [pendingId, setPendingId] =
    useState<string | null>(null);
  const [pending, startTransition] =
    useTransition();
  const [message, setMessage] =
    useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const usedGuestSlots =
    data.guests.length +
    data.pendingInvitations.length;

  const guestLimitReached =
    usedGuestSlots >= data.guestLimit;

  useEffect(() => {
    const channel =
      supabase
        .channel(
          `breeze-room-owner-invitations-${data.rentalId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "breeze_lodging_invitations",
            filter:
              `rental_id=eq.${data.rentalId}`,
          },
          () => {
            setMessage(null);
            router.refresh();
          },
        )
        .subscribe();

    return () => {
      void supabase.removeChannel(
        channel,
      );
    };
  }, [
    data.rentalId,
    router,
    supabase,
  ]);

  const filteredCandidates =
    useMemo(() => {
      const normalized =
        query.trim().toLocaleLowerCase();

      if (!normalized) {
        return data.candidates.slice(
          0,
          6,
        );
      }

      return data.candidates
        .filter((character) =>
          character.display_name
            .toLocaleLowerCase()
            .includes(normalized),
        )
        .slice(0, 6);
    }, [data.candidates, query]);

  function invite(
    characterId: string,
  ) {
    if (
      pending ||
      guestLimitReached
    ) return;

    setPendingId(characterId);
    setMessage(null);

    startTransition(async () => {
      const result =
        await inviteBreezeLodgingGuest(
          data.roomId,
          characterId,
        );

      setOk(result.ok);
      setMessage(result.message);
      setPendingId(null);

      if (result.ok) {
        setQuery("");
        router.refresh();
      }
    });
  }

  function withdraw(
    invitationId: string,
  ) {
    if (pending) return;

    setPendingId(invitationId);
    setMessage(null);

    startTransition(async () => {
      const result =
        await withdrawBreezeLodgingInvitation(
          data.roomId,
          invitationId,
        );

      setOk(result.ok);
      setMessage(result.message);
      setPendingId(null);

      if (result.ok) {
        router.refresh();
      }
    });
  }

  function remove(
    characterId: string,
  ) {
    if (pending) return;

    setPendingId(characterId);
    setMessage(null);

    startTransition(async () => {
      const result =
        await removeBreezeLodgingGuest(
          data.roomId,
          characterId,
        );

      setOk(result.ok);
      setMessage(result.message);
      setPendingId(null);

      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <details className="shrink-0 border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-120e0b))]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5">
        <div>
          <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
            {data.roomName}
          </p>
          <h3 className="mt-0.5 font-serif text-[13px] text-[rgb(var(--sep-colour-dec89f))]">
            Room Guests
          </h3>
        </div>

        <div className="text-right">
          <p className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-806b50))]">
            Guests {usedGuestSlots} / {data.guestLimit}
          </p>
          <span className="mt-0.5 block text-[9px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a88d65))]">
            Invite / Withdraw ▾
          </span>
        </div>
      </summary>

      <div className="px-3 pb-3">
        <p className="mb-2 text-[8px] text-[rgb(var(--sep-colour-8f8271))]">
          Invitations last until this rental ends. Invited characters must accept before they can enter.
          {" "}This room allows {data.guestLimit} invitee{data.guestLimit === 1 ? "" : "s"}.
          Pending invitations count toward the limit.
        </p>

        {guestLimitReached ? (
          <p className="mb-2 border border-[rgb(var(--sep-colour-765937))]/45 bg-[rgb(var(--sep-colour-231a12))] px-2 py-1.5 text-[8px] text-[rgb(var(--sep-colour-cab08b))]">
            Guest limit reached. Remove a guest or withdraw a pending invitation before inviting someone else.
          </p>
        ) : null}

        <div className="mt-2 grid gap-2 lg:grid-cols-2">
          <div className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-17110d))] p-2">
            <label className="block">
              <span className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))]">
                Invite someone to the room
              </span>
              <input
                value={query}
                disabled={guestLimitReached}
                onChange={(event) =>
                  setQuery(
                    event.target.value,
                  )
                }
                placeholder="Search approved characters..."
                className="mt-1.5 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0a08))] px-2 py-1.5 text-[9px] text-[rgb(var(--sep-colour-bba98c))] outline-none placeholder:text-[rgb(var(--sep-colour-655c50))] focus:border-[rgb(var(--sep-colour-a17a49))]"
              />
            </label>

            <div className="mt-1.5 max-h-28 space-y-1 overflow-y-auto">
              {filteredCandidates.length ? (
                filteredCandidates.map(
                  (character) => (
                    <div
                      key={character.id}
                      className="flex items-center justify-between gap-2 bg-[rgb(var(--sep-colour-0d0a08))]/45 px-2 py-1.5"
                    >
                      <span className="min-w-0 truncate text-[9px] text-[rgb(var(--sep-colour-c6b496))]">
                        {character.display_name}
                      </span>
                      <button
                        type="button"
                        disabled={
                          pending ||
                          guestLimitReached
                        }
                        onClick={() =>
                          invite(
                            character.id,
                          )
                        }
                        className="shrink-0 border border-[rgb(var(--sep-colour-85653c))] bg-[rgb(var(--sep-colour-342617))] px-2 py-1 text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-efd4a0))] transition hover:bg-[rgb(var(--sep-colour-4a351f))] disabled:opacity-40"
                      >
                        {pending &&
                        pendingId ===
                          character.id
                          ? "Inviting..."
                          : "Invite"}
                      </button>
                    </div>
                  ),
                )
              ) : (
                <p className="px-1 py-2 text-[8px] text-[rgb(var(--sep-colour-756958))]">
                  No matching characters.
                </p>
              )}
            </div>
          </div>

          <div className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-17110d))] p-2">
            <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))]">
              People invited
            </p>

            <div className="mt-1.5 max-h-36 space-y-1 overflow-y-auto">
              {data.pendingInvitations.map(
                (invitation) => (
                  <div
                    key={invitation.invitation_id}
                    className="flex items-center justify-between gap-2 bg-[rgb(var(--sep-colour-0d0a08))]/45 px-2 py-1.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[9px] text-[rgb(var(--sep-colour-c6b496))]">
                        {invitation.display_name}
                      </p>
                      <p className="text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-8f7757))]">
                        Awaiting reply
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        withdraw(
                          invitation.invitation_id,
                        )
                      }
                      className="shrink-0 border border-[rgb(var(--sep-colour-765c3d))] bg-[rgb(var(--sep-colour-231a12))] px-2 py-1 text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-cab08b))] transition hover:bg-[rgb(var(--sep-colour-342617))] disabled:opacity-40"
                    >
                      {pending &&
                      pendingId ===
                        invitation.invitation_id
                        ? "Withdrawing..."
                        : "Withdraw"}
                    </button>
                  </div>
                ),
              )}

              {data.guests.map(
                (guest) => (
                  <div
                    key={guest.id}
                    className="flex items-center justify-between gap-2 bg-[rgb(var(--sep-colour-0d0a08))]/45 px-2 py-1.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[9px] text-[rgb(var(--sep-colour-c6b496))]">
                        {guest.display_name}
                      </p>
                      <p className="text-[7px] uppercase tracking-[0.1em] text-emerald-500">
                        Accepted
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        remove(guest.id)
                      }
                      className="shrink-0 border border-red-900/55 bg-red-950/15 px-2 py-1 text-[7px] uppercase tracking-[0.1em] text-red-300 transition hover:bg-red-950/35 disabled:opacity-40"
                    >
                      {pending &&
                      pendingId ===
                        guest.id
                        ? "Removing..."
                        : "Remove"}
                    </button>
                  </div>
                ),
              )}

              {!data.pendingInvitations.length &&
              !data.guests.length ? (
                <p className="px-1 py-2 text-[8px] text-[rgb(var(--sep-colour-756958))]">
                  Nobody has been invited yet.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {message ? (
          <p
            aria-live="polite"
            className={`mt-2 text-[8px] ${
              ok
                ? "text-emerald-400"
                : "text-red-400"
            }`}
          >
            {message}
          </p>
        ) : null}
      </div>
    </details>
  );
}
