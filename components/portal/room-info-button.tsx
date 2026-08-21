"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { RichTextContentClient } from "@/components/editor/rich-text-content-client";
import { LocationAtmosphericImage } from "@/components/world/location-atmospheric-image";
import { createClient } from "@/lib/supabase/client";

type AreaRelation = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

type RoomDetails = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number | null;
  is_outdoors: boolean;
  area:
    | AreaRelation
    | AreaRelation[]
    | null;
};

type RoomInfoButtonProps = {
  roomId: string;
};

export function RoomInfoButton({
  roomId,
}: RoomInfoButtonProps) {
  const [open, setOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(
      null,
    );

  const [room, setRoom] =
    useState<RoomDetails | null>(
      null,
    );

  const loadRoom =
    useCallback(async () => {
      setLoading(true);
      setError(null);

      const supabase =
        createClient();

      const {
        data,
        error: roomError,
      } = await supabase
        .from("rooms")
        .select(`
          id,
          name,
          slug,
          description,
          image_url,
sort_order,
is_outdoors,
area:areas!rooms_area_id_fkey(
            id,
            name,
            slug,
            description
          )
        `)
        .eq("id", roomId)
        .maybeSingle();

      if (roomError) {
        setError(
          roomError.message,
        );
        setLoading(false);
        return;
      }

      if (!data) {
        setError(
          "This room could not be found.",
        );
        setLoading(false);
        return;
      }

      setRoom(
        data as unknown as RoomDetails,
      );

      setLoading(false);
    }, [roomId]);

  const closeModal =
    useCallback(() => {
      setOpen(false);
    }, []);

  function openModal() {
  setOpen(true);

  if (!loading) {
    void loadRoom();
  }
}

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key === "Escape"
      ) {
        closeModal();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    closeModal,
    open,
  ]);

  const area =
    normaliseRelation(
      room?.area ?? null,
    );

  const modal = open ? (
    <div
      role="presentation"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          closeModal();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="room-info-title"
        className="relative max-h-[90dvh] w-full max-w-3xl overflow-y-auto border border-[rgb(var(--sep-colour-80603a))]/70 bg-[rgb(var(--sep-colour-120d0a))] shadow-[0_30px_100px_rgba(var(--sep-rgb-0-0-0),0.8)]"
      >
        <button
          type="button"
          onClick={closeModal}
          aria-label="Close room information"
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center border border-[rgb(var(--sep-colour-765937))]/70 bg-[rgb(var(--sep-colour-120d0a))]/90 text-lg text-[rgb(var(--sep-colour-c9aa79))] transition hover:border-[rgb(var(--sep-colour-a17a49))] hover:text-[rgb(var(--sep-colour-f0d3a4))]"
        >
          ×
        </button>

        {loading ? (
          <RoomInfoLoading />
        ) : error ? (
          <div className="p-7 sm:p-9">
            <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-9d704b))]">
              Room information
            </p>

            <h2
              id="room-info-title"
              className="mt-3 font-serif text-3xl text-[rgb(var(--sep-colour-e4c99b))]"
            >
              Unable to load room
            </h2>

            <p className="mt-5 border border-[rgb(var(--sep-colour-743d35))] bg-[rgb(var(--sep-colour-2a1512))] p-4 text-sm leading-6 text-[rgb(var(--sep-colour-d8a49a))]">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                void loadRoom()
              }
              className="mt-5 border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-271c12))] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-dfc79c))] transition hover:bg-[rgb(var(--sep-colour-3b2919))]"
            >
              Try again
            </button>
          </div>
        ) : room ? (
          <>
            <div className="relative min-h-56 overflow-hidden border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-090706))] sm:min-h-72">
              {room.image_url ? (
                <LocationAtmosphericImage
  src={room.image_url}
  alt={room.name}
  sizes="(max-width: 768px) 100vw, 48rem"
  objectFit="cover"
  isOutdoors={room.is_outdoors}
/>
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(var(--sep-rgb-130-86-42),0.22),_transparent_60%),linear-gradient(to_bottom,_#17110d,_#090706)]" />
              )}

              <div className="absolute inset-0 z-[6] bg-gradient-to-t from-[rgb(var(--sep-colour-120d0a))] via-[rgb(var(--sep-colour-120d0a))]/35 to-black/15" />

              <div className="absolute inset-x-0 bottom-0 z-10 p-6 sm:p-8">
                <p className="text-[8px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-c49a61))]">
                  {area?.name ??
                    "Sepulchria"}
                </p>

                <h2
                  id="room-info-title"
                  className="mt-2 max-w-2xl font-serif text-4xl text-[rgb(var(--sep-colour-f0d7aa))] drop-shadow-[0_2px_6px_rgba(var(--sep-rgb-0-0-0),0.85)] sm:text-5xl"
                >
                  {room.name}
                </h2>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <p className="text-[8px] uppercase tracking-[0.25em] text-[rgb(var(--sep-colour-8c704b))]">
                About this location
              </p>

              {room.description?.trim() ? (
                <RichTextContentClient
                  body={
                    room.description
                  }
                  className="mt-2 text-[15px] leading-7 text-[rgb(var(--sep-colour-b9aa96))]"
                />
              ) : (
                <p className="mt-2 text-[15px] leading-7 text-[rgb(var(--sep-colour-b9aa96))]">
                  No description has been recorded for this room yet.
                </p>
              )}

              {area?.description ? (
                <section className="mt-7 border-t border-[rgb(var(--sep-colour-59432c))]/40 pt-6">
                  <p className="text-[8px] uppercase tracking-[0.25em] text-[rgb(var(--sep-colour-8c704b))]">
                    About the area
                  </p>

                  <RichTextContentClient
                    body={
                      area.description
                    }
                    className="mt-3 text-sm leading-7 text-[rgb(var(--sep-colour-968875))]"
                  />
                </section>
              ) : null}
            </div>
          </>
        ) : null}
      </section>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        aria-label="Open room information"
        title="Room information"
        className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-1d160f))] px-2.5 py-2 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-c59a5a))] transition hover:border-[rgb(var(--sep-colour-977242))] hover:text-[rgb(var(--sep-colour-ebcc91))]"
      >
        Info
      </button>

      {modal
        ? createPortal(
            modal,
            document.body,
          )
        : null}
    </>
  );
}

function RoomInfoLoading() {
  return (
    <>
      <div className="h-64 animate-pulse bg-[rgb(var(--sep-colour-221810))]" />

      <div className="p-7 sm:p-8">
        <div className="h-3 w-28 animate-pulse bg-[rgb(var(--sep-colour-332419))]" />
        <div className="mt-4 h-10 w-2/3 animate-pulse bg-[rgb(var(--sep-colour-332419))]" />

        <div className="mt-8 space-y-3">
          <div className="h-4 animate-pulse bg-[rgb(var(--sep-colour-251b14))]" />
          <div className="h-4 animate-pulse bg-[rgb(var(--sep-colour-251b14))]" />
          <div className="h-4 w-4/5 animate-pulse bg-[rgb(var(--sep-colour-251b14))]" />
        </div>
      </div>
    </>
  );
}

function normaliseRelation<T>(
  value:
    | T
    | T[]
    | null,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}
