"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { RichTextContentClient } from "@/components/editor/rich-text-content-client";
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
    useState<string | null>(null);

  const [room, setRoom] =
    useState<RoomDetails | null>(
      null,
    );

  const loadRoom = useCallback(
    async () => {
      setLoading(true);
      setError(null);

      const supabase = createClient();

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
        setError(roomError.message);
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
    },
    [roomId],
  );

  const openModal = () => {
    setOpen(true);

    if (!room && !loading) {
      void loadRoom();
    }
  };

  const closeModal = useCallback(
    () => {
      setOpen(false);
    },
    [],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

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
  }, [closeModal, open]);

  const area =
    normaliseRelation(room?.area ?? null);

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        aria-label="Open room information"
        title="Room information"
        className="border border-[#60482e]/55 bg-[#1d160f] px-2.5 py-2 text-[8px] uppercase tracking-[0.16em] text-[#c59a5a] transition hover:border-[#977242] hover:text-[#ebcc91]"
      >
        Info
      </button>

      {open ? (
        <div
          role="presentation"
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm sm:p-6"
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
            className="relative max-h-[90dvh] w-full max-w-3xl overflow-y-auto border border-[#80603a]/70 bg-[#120d0a] shadow-[0_30px_100px_rgba(0,0,0,0.8)]"
          >
            <button
              type="button"
              onClick={closeModal}
              aria-label="Close room information"
              className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center border border-[#765937]/70 bg-[#120d0a]/90 text-lg text-[#c9aa79] transition hover:border-[#a17a49] hover:text-[#f0d3a4]"
            >
              ×
            </button>

            {loading ? (
              <RoomInfoLoading />
            ) : error ? (
              <div className="p-7 sm:p-9">
                <p className="text-[9px] uppercase tracking-[0.28em] text-[#9d704b]">
                  Room information
                </p>

                <h2
                  id="room-info-title"
                  className="mt-3 font-serif text-3xl text-[#e4c99b]"
                >
                  Unable to load room
                </h2>

                <p className="mt-5 border border-[#743d35] bg-[#2a1512] p-4 text-sm leading-6 text-[#d8a49a]">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    void loadRoom();
                  }}
                  className="mt-5 border border-[#765937] bg-[#271c12] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[#dfc79c] transition hover:bg-[#3b2919]"
                >
                  Try again
                </button>
              </div>
            ) : room ? (
              <>
                <div className="relative min-h-56 overflow-hidden border-b border-[#60482e]/45 bg-[#090706] sm:min-h-72">
                  {room.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={room.image_url}
                      alt={room.name}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(130,86,42,0.22),_transparent_60%),linear-gradient(to_bottom,_#17110d,_#090706)]" />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-[#120d0a] via-[#120d0a]/35 to-black/15" />

                  <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                    <p className="text-[8px] uppercase tracking-[0.28em] text-[#c49a61]">
                      {area?.name ??
                        "Sepulchria"}
                    </p>

                    <h2
                      id="room-info-title"
                      className="mt-2 max-w-2xl font-serif text-4xl text-[#f0d7aa] drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] sm:text-5xl"
                    >
                      {room.name}
                    </h2>
                  </div>
                </div>

                <div className="p-6 sm:p-8">
                  <div>
                    <div>
                      <p className="text-[8px] uppercase tracking-[0.25em] text-[#8c704b]">
                        About this location
                      </p>

                      {room.description?.trim() ? (
                        <RichTextContentClient
                          body={room.description}
                          className="mt-2 text-[15px] leading-7 text-[#b9aa96]"
                        />
                      ) : (
                        <p className="mt-2 text-[15px] leading-7 text-[#b9aa96]">
                          No description has been recorded for this room yet.
                        </p>
                      )}
                    </div>

                    
                  </div>

                  {area?.description ? (
                    <section className="mt-7 border-t border-[#59432c]/40 pt-6">
                      <p className="text-[8px] uppercase tracking-[0.25em] text-[#8c704b]">
                        About the area
                      </p>

                      <RichTextContentClient
                        body={area.description}
                        className="mt-3 text-sm leading-7 text-[#968875]"
                      />
                    </section>
                  ) : null}
                </div>
              </>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}

function RoomDetailRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`py-3 ${
        last
          ? ""
          : "border-b border-[#59432c]/35"
      }`}
    >
      <p className="text-[7px] uppercase tracking-[0.2em] text-[#756957]">
        {label}
      </p>

      <p className="mt-1 break-words text-xs text-[#c9b99e]">
        {value}
      </p>
    </div>
  );
}

function RoomInfoLoading() {
  return (
    <>
      <div className="h-64 animate-pulse bg-[#221810]" />

      <div className="p-7 sm:p-8">
        <div className="h-3 w-28 animate-pulse bg-[#332419]" />
        <div className="mt-4 h-10 w-2/3 animate-pulse bg-[#332419]" />

        <div className="mt-8 space-y-3">
          <div className="h-4 animate-pulse bg-[#251b14]" />
          <div className="h-4 animate-pulse bg-[#251b14]" />
          <div className="h-4 w-4/5 animate-pulse bg-[#251b14]" />
        </div>
      </div>
    </>
  );
}

function normaliseRelation<T>(
  value: T | T[] | null,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}
