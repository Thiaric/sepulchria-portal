"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatRemnants } from "@/lib/economy/currency";
import { getAurethDate } from "@/lib/world/calendar";
import { LocationAtmosphericImage } from "@/components/world/location-atmospheric-image";
import { LocationImageLightbox } from "@/components/world/location-image-lightbox";
import {
  enterBreezeLodging,
  rentBreezeLodging,
} from "../breeze-lodgings-actions";

export type BreezeLodgingStateRow = {
  room_id: string;
  room_name: string;
  room_number: number;
  tier: "gilded" | "wayfarer" | "hearth";
  daily_rate: number;
  is_available: boolean;
  rented_by_me: boolean;
  can_enter: boolean;
  rental_ends_at: string | null;
  my_wallet_balance: number;
  viewer_is_staff: boolean;
  image_url: string | null;
  is_outdoors: boolean;
};

const TIER_LABELS = {
  gilded: "Gilded Chambers",
  wayfarer: "Wayfarer Rooms",
  hearth: "Hearth Rooms",
} as const;

const TIER_DESCRIPTIONS = {
  gilded: "The finest chambers of the house.",
  wayfarer: "Comfortable rooms for travellers.",
  hearth: "Simple rooms with the necessities.",
} as const;

function formatRentalEnd(value: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const aureth =
    getAurethDate(date);

  const time =
    date.toLocaleTimeString(
      "en-GB",
      {
        hour: "2-digit",
        minute: "2-digit",
      },
    );

  const real =
    date.toLocaleString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    );

  return (
    `${aureth.day} ${aureth.monthName} ${aureth.year} ADN, ${time}` +
    ` [${real}]`
  );
}

export function BreezeLodgingsPanel({ rooms }: { rooms: BreezeLodgingStateRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [daysByRoom, setDaysByRoom] = useState<Record<string, number>>({});

  const myRental = rooms.find((room) => room.rented_by_me) ?? null;
  const viewerIsStaff = rooms[0]?.viewer_is_staff ?? false;
  const wallet = Number(rooms[0]?.my_wallet_balance ?? 0);

  const grouped = useMemo(
    () =>
      (["gilded", "wayfarer", "hearth"] as const).map((tier) => ({
        tier,
        rooms: rooms.filter((room) => room.tier === tier),
      })),
    [rooms],
  );

  function playCoinSound() {
    const audio = new Audio("/sounds/coins.mp3");
    audio.volume = 0.45;
    void audio.play().catch(() => {});
  }

  function daysFor(roomId: string) {
    return daysByRoom[roomId] ?? 1;
  }

  function enter(room: BreezeLodgingStateRow) {
    if (pending || !room.can_enter) return;

    setPendingRoomId(room.room_id);
    setMessage(null);

    startTransition(async () => {
      const result =
        await enterBreezeLodging(
          room.room_id,
        );

      setOk(result.ok);
      setMessage(result.message);
      setPendingRoomId(null);

      if (result.ok) {
        router.refresh();
      }
    });
  }

  function rent(room: BreezeLodgingStateRow) {
    if (pending || viewerIsStaff || !room.is_available || myRental) return;

    const days = daysFor(room.room_id);
    setPendingRoomId(room.room_id);
    setMessage(null);

    startTransition(async () => {
      const result = await rentBreezeLodging(room.room_id, days);
      setOk(result.ok);
      setMessage(result.message);
      setPendingRoomId(null);

      if (result.ok) {
        playCoinSound();
        router.refresh();
      }
    });
  }

  if (!rooms.length) return null;

  return (
    <div className="shrink-0 border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-120e0b))]">
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <div>
          <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
            The Breeze Lodgings
          </p>
          <p className="mt-0.5 font-serif text-sm text-[rgb(var(--sep-colour-dec89f))]">
            Rooms for travellers
          </p>
        </div>

        <div className="text-right">
          <p className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))]">
            Wallet
          </p>
          <p className="font-serif text-base text-[rgb(var(--sep-colour-e4c589))]">
            {formatRemnants(wallet)}
          </p>
        </div>
      </div>

      <div className="border-t border-[rgb(var(--sep-colour-59432c))]/30 px-3 py-3">
        {viewerIsStaff ? (
          <p className="mb-0.1">
            
          </p>
        ) : myRental ? (
          <p className="mb-3 border border-emerald-900/45 bg-emerald-950/10 px-3 py-2 text-[9px] text-emerald-400">
            You are staying in {myRental.room_name}
            {formatRentalEnd(myRental.rental_ends_at)
              ? ` until ${formatRentalEnd(myRental.rental_ends_at)}`
              : ""}
            . Only one room may be rented at a time.
          </p>
        ) : (
          <p className="mb-3 text-[9px] leading-4 text-[rgb(var(--sep-colour-8f8271))]">
            Choose an available room and a stay of 1 to 7 days. Payment is made in Remnants and recorded in your Ledger.
          </p>
        )}

        <div className="space-y-4">
          {grouped.map(({ tier, rooms: tierRooms }) => (
            <section key={tier}>
              <div className="mb-2 flex items-end justify-between gap-3">
                <div>
                  <h3 className="font-serif text-[13px] text-[rgb(var(--sep-colour-d9c29a))]">
                    {TIER_LABELS[tier]}
                  </h3>
                  <p className="mt-0.5 text-[8px] text-[rgb(var(--sep-colour-807463))]">
                    {TIER_DESCRIPTIONS[tier]}
                  </p>
                </div>

                <span className="text-[9px] text-[rgb(var(--sep-colour-d8ad69))]">
                  {formatRemnants(tierRooms[0]?.daily_rate ?? 0)}/day
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                {tierRooms.map((room) => {
                  const days = daysFor(room.room_id);
                  const total = room.daily_rate * days;
                  const occupied = !room.is_available;
                  const canEnter =
                    room.can_enter;

                  const disabled =
                    pending ||
                    (!canEnter &&
                      (viewerIsStaff ||
                        occupied ||
                        Boolean(myRental)));

                  return (
                    <article
                      key={room.room_id}
                      className="relative flex min-h-[148px] flex-col overflow-hidden border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-17110d))]"
                    >
                      {room.image_url ? (
                        <>
                          <LocationAtmosphericImage
                            src={room.image_url}
                            alt={room.room_name}
                            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 20vw"
                            objectFit="cover"
                            isOutdoors={room.is_outdoors}
                          />

                          <LocationImageLightbox
                            src={room.image_url}
                            name={room.room_name}
                          />

                          <div className="pointer-events-none absolute inset-0 z-[6] bg-[rgb(var(--sep-colour-0d0a08))]/58" />
                          <div className="pointer-events-none absolute inset-0 z-[7] bg-gradient-to-t from-[rgb(var(--sep-colour-0d0a08))]/92 via-[rgb(var(--sep-colour-0d0a08))]/45 to-[rgb(var(--sep-colour-0d0a08))]/18" />
                        </>
                      ) : null}

                      <div className="pointer-events-none relative z-20 flex min-h-[148px] flex-1 flex-col p-3">
                        <h4 className="font-serif text-[12px] text-[rgb(var(--sep-colour-e8d3ad))] [text-shadow:0_2px_4px_rgba(var(--sep-rgb-0-0-0),0.95)]">
                          {room.room_name}
                        </h4>

                        <p className="mt-1 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-b7a58c))] [text-shadow:0_2px_4px_rgba(var(--sep-rgb-0-0-0),0.95)]">
                          {room.rented_by_me
                            ? "Your room"
                            : occupied
                              ? "Occupied"
                              : "Available"}
                        </p>

                        <div className="pointer-events-auto mt-auto pt-3">
                        {!occupied && !viewerIsStaff && !myRental ? (
                          <label className="block">
                            <span className="mb-1 block text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-806b50))]">
                              Stay
                            </span>
                            <select
                              value={days}
                              onChange={(event) =>
                                setDaysByRoom((current) => ({
                                  ...current,
                                  [room.room_id]: Number(event.target.value),
                                }))
                              }
                              className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0a08))] px-2 py-1.5 text-[9px] text-[rgb(var(--sep-colour-bba98c))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
                            >
                              {Array.from({ length: 7 }, (_, index) => index + 1).map(
                                (value) => (
                                  <option key={value} value={value}>
                                    {value} day{value === 1 ? "" : "s"}
                                  </option>
                                ),
                              )}
                            </select>
                          </label>
                        ) : null}

                        <button
                          type="button"
                          onClick={() =>
                            canEnter
                              ? enter(room)
                              : rent(room)
                          }
                          disabled={disabled}
                          className="mt-2 w-full border border-[rgb(var(--sep-colour-85653c))] bg-[rgb(var(--sep-colour-342617))] px-2 py-1.5 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-efd4a0))] transition hover:bg-[rgb(var(--sep-colour-4a351f))] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {pending && pendingRoomId === room.room_id
                            ? canEnter
                              ? "Entering..."
                              : "Paying..."
                            : canEnter
                              ? "Enter Room"
                              : occupied
                                ? "Occupied"
                                : viewerIsStaff
                                  ? "Available"
                                  : myRental
                                    ? "One room at a time"
                                    : `Pay ${formatRemnants(total)}`}
                        </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {message ? (
          <p
            aria-live="polite"
            className={`mt-3 text-[9px] ${ok ? "text-emerald-400" : "text-red-400"}`}
          >
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
