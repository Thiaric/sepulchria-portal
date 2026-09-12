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
  rented_by_name: string | null;
  image_url: string | null;
  is_outdoors: boolean;
};

const TIER_LABELS = {
  gilded: "Gilded Chambers",
  wayfarer: "Wayfarer Rooms",
  hearth: "Hearth Rooms",
} as const;

const TIER_DESCRIPTIONS = {
  gilded: "The finest chambers of the house. Up to 3 Guests.",
  wayfarer: "Comfortable rooms for travellers. Up to 2 Guests.",
  hearth: "Simple rooms with the necessities. Up to 1 Guest.",
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
    <details
      data-sep-interaction-ignore="true"
      className="group shrink-0 border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-0d0907))] game_components_breezelodgingspanel_details_details"
    >
      <summary
        className="sticky top-0 z-30 flex cursor-pointer list-none items-center justify-between gap-3 border-b border-[rgb(var(--sep-colour-59432c))]/30 bg-[linear-gradient(90deg,rgb(var(--sep-colour-100c09)),rgb(var(--sep-colour-17110d)),rgb(var(--sep-colour-100c09)))] px-3 py-2 [&::-webkit-details-marker]:hidden game_components_breezelodgingspanel_summary_summary"
      >
        <div className="game_components_breezelodgingspanel_div_container">
          <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] game_components_breezelodgingspanel_p_text">
            The Breeze Lodgings
          </p>
          <p className="mt-0.5 font-serif text-sm text-[rgb(var(--sep-colour-dec89f))] game_components_breezelodgingspanel_p_text_2">
            Rooms for travellers
          </p>
        </div>

        <div className="flex items-center gap-4 game_components_breezelodgingspanel_div_container_2">
          <div className="text-right game_components_breezelodgingspanel_div_container_3">
            <p className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))] game_components_breezelodgingspanel_p_text_3">
              You Have
            </p>
            <p className="font-serif text-base text-[rgb(var(--sep-colour-e4c589))] game_components_breezelodgingspanel_p_text_4">
              {formatRemnants(wallet)}
            </p>
          </div>

          <span className="text-[9px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a88d65))] game_components_breezelodgingspanel_span_text">
            <span className="group-open:hidden game_components_breezelodgingspanel_span_text_2">View Rooms ▾</span>
            <span className="hidden group-open:inline game_components_breezelodgingspanel_span_text_3">Hide Rooms ▴</span>
          </span>
        </div>
      </summary>

      <div className="max-h-[58vh] overflow-y-auto border-t border-[rgb(var(--sep-colour-59432c))]/30 px-3 py-3 game_components_breezelodgingspanel_div_container_4">
        {viewerIsStaff ? (
          <p className="mb-0.1 game_components_breezelodgingspanel_p_text_5">
            
          </p>
        ) : myRental ? (
          <p className="mb-3 border border-emerald-900/45 bg-emerald-950/10 px-3 py-2 text-[9px] text-emerald-400 game_components_breezelodgingspanel_p_text_6">
            You are staying in {myRental.room_name}
            {formatRentalEnd(myRental.rental_ends_at)
              ? ` until ${formatRentalEnd(myRental.rental_ends_at)}`
              : ""}
            . Only one room may be rented at a time.
          </p>
        ) : (
          <p className="mb-3 text-[9px] leading-4 text-[rgb(var(--sep-colour-8f8271))] game_components_breezelodgingspanel_p_text_7">
            Choose an available room and a stay of 1 to 7 days. Payment is made in Remnants and recorded in your Ledger.
          </p>
        )}

        <div className="space-y-4 game_components_breezelodgingspanel_div_container_5">
          {grouped.map(({ tier, rooms: tierRooms }) => (
            <section className="game_components_breezelodgingspanel_section_section" key={tier}>
              <div className="mb-2 flex items-end justify-between gap-3 game_components_breezelodgingspanel_div_container_6">
                <div className="game_components_breezelodgingspanel_div_container_7">
                  <h3 className="font-serif text-[13px] text-[rgb(var(--sep-colour-d9c29a))] game_components_breezelodgingspanel_h3_heading">
                    {TIER_LABELS[tier]}
                  </h3>
                  <p className="mt-0.5 text-[8px] text-[rgb(var(--sep-colour-807463))] game_components_breezelodgingspanel_p_text_8">
                    {TIER_DESCRIPTIONS[tier]}
                  </p>
                </div>

                <span className="text-[9px] text-[rgb(var(--sep-colour-d8ad69))] game_components_breezelodgingspanel_span_text_4">
                  {formatRemnants(tierRooms[0]?.daily_rate ?? 0)}/day
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5 game_components_breezelodgingspanel_div_container_8">
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
                      className="relative flex min-h-[148px] flex-col overflow-hidden border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-17110d))] game_components_breezelodgingspanel_article_article"
                    >
                      {room.image_url ? (
  <>
    <div
      className="pointer-events-none absolute inset-0 z-0 game_components_breezelodgingspanel_div_container_9"
      style={{
        backgroundImage: `
          linear-gradient(
            rgb(var(--sep-colour-100d0b) / 58%),
            rgb(var(--sep-colour-100d0b) / 58%)
          ),
          url("${room.image_url}")
        `,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    />

    <LocationImageLightbox
      src={room.image_url}
      name={room.room_name}
    />
  </>
) : null}

                      <div className="pointer-events-none relative z-20 flex min-h-[148px] flex-1 flex-col p-3 game_components_breezelodgingspanel_div_container_11">
                        <h4 className="font-serif text-[12px] text-[#f0dfbd] game_components_breezelodgingspanel_h4_heading">
                          {room.room_name}
                        </h4>

                        <p className="mt-1 text-[8px] uppercase tracking-[0.12em] text-[#c9b99d] game_components_breezelodgingspanel_p_text_9">
                          {room.rented_by_me
                            ? "Your room"
                            : occupied
                              ? viewerIsStaff &&
                                room.rented_by_name
                                ? `Occupied by ${room.rented_by_name}`
                                : "Occupied"
                              : "Available"}
                        </p>

                        <div className="pointer-events-auto mt-auto pt-3 game_components_breezelodgingspanel_div_container_12">
                        {!occupied && !viewerIsStaff && !myRental ? (
                          <label className="block game_components_breezelodgingspanel_label_label">
                            <span className="mb-1 block text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-806b50))] game_components_breezelodgingspanel_span_text_5">
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
                              className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0a08))] px-2 py-1.5 text-[9px] text-[rgb(var(--sep-colour-bba98c))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] game_components_breezelodgingspanel_select_select"
                            >
                              {Array.from({ length: 7 }, (_, index) => index + 1).map(
                                (value) => (
                                  <option className="game_components_breezelodgingspanel_option_option" key={value} value={value}>
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
                          className="mt-2 w-full border border-[rgb(var(--sep-colour-85653c))] bg-[rgb(var(--sep-colour-342617))] px-2 py-1.5 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-efd4a0))] transition hover:bg-[rgb(var(--sep-colour-4a351f))] disabled:cursor-not-allowed disabled:opacity-40 game_components_breezelodgingspanel_button_action"
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
            className={[((`mt-3 text-[9px] ${ok ? "text-emerald-400" : "text-red-400"}`)), "game_components_breezelodgingspanel_p_text_10"].filter(Boolean).join(" ")}
          >
            {message}
          </p>
        ) : null}
      </div>
    </details>
  );
}
