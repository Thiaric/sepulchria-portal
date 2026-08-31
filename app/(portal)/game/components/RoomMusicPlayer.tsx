"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  CharacterMusicPayload,
  PlayableMusicTrack,
} from "@/lib/music/get-character-music";

type Props = CharacterMusicPayload & {
  locationName: string;
};

export default function RoomMusicPlayer({
  locationName,
  locationTrack,
  ownedTracks,
  preferences,
}: Props) {
  const audioRef =
    useRef<HTMLAudioElement | null>(
      null,
    );

  const fadeTimerRef =
    useRef<number | null>(null);

  const [usePersonal, setUsePersonal] =
    useState(
      preferences.usePersonalMusic,
    );

  const [
    selectedTrackId,
    setSelectedTrackId,
  ] = useState(
    preferences.selectedTrackId,
  );

  const [volume, setVolume] =
    useState(preferences.volume);

  const [muted, setMuted] =
    useState(preferences.muted);

  const [
    needsGesture,
    setNeedsGesture,
  ] = useState(false);

  const selectedOwned =
    useMemo(
      () =>
        ownedTracks.find(
          (track) =>
            track.id ===
            selectedTrackId,
        ) ?? null,
      [
        ownedTracks,
        selectedTrackId,
      ],
    );

  const personalAvailable =
    ownedTracks.length > 0;

  const effectivePersonal =
    usePersonal &&
    personalAvailable &&
    selectedOwned !== null;

  const activeTrack:
    | PlayableMusicTrack
    | null = effectivePersonal
      ? selectedOwned
      : locationTrack;

  async function persist(
    next: {
      usePersonalMusic?: boolean;
      selectedTrackId?:
        | string
        | null;
      volume?: number;
      muted?: boolean;
    },
  ) {
    const response = await fetch(
      "/api/music/preferences",
      {
        method: "PATCH",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          usePersonalMusic:
            next.usePersonalMusic ??
            usePersonal,
          selectedTrackId:
            next.selectedTrackId !==
            undefined
              ? next.selectedTrackId
              : selectedTrackId,
          volume:
            next.volume ?? volume,
          muted:
            next.muted ?? muted,
        }),
      },
    );

    if (!response.ok) {
      const data =
        (await response.json()) as {
          error?: string;
        };

      console.error(
        data.error ??
          "Unable to save music preferences.",
      );
    }
  }

  function clearFade() {
    if (
      fadeTimerRef.current !== null
    ) {
      window.clearInterval(
        fadeTimerRef.current,
      );
      fadeTimerRef.current = null;
    }
  }

  function fadeTo(
    target: number,
  ) {
    const audio = audioRef.current;

    if (!audio) return;

    clearFade();

    const start = audio.volume;
    const started = Date.now();
    const duration = 420;

    fadeTimerRef.current =
      window.setInterval(() => {
        const progress = Math.min(
          1,
          (Date.now() - started) /
            duration,
        );

        audio.volume =
          start +
          (target - start) *
            progress;

        if (progress >= 1) {
          clearFade();
        }
      }, 25);
  }

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    clearFade();

    if (!activeTrack) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      return;
    }

    audio.pause();
    audio.src = activeTrack.url;
    audio.loop = true;
    audio.muted = muted;
    audio.volume = 0;
    audio.load();

    void audio
      .play()
      .then(() => {
        setNeedsGesture(false);
        fadeTo(
          muted ? 0 : volume,
        );
      })
      .catch(() => {
        audio.volume = volume;
        setNeedsGesture(true);
      });

    return clearFade;
  }, [activeTrack?.id]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    audio.muted = muted;

    if (
      fadeTimerRef.current === null
    ) {
      audio.volume = volume;
    }
  }, [muted, volume]);

  useEffect(
    () => () => {
      clearFade();
      const audio = audioRef.current;
      audio?.pause();
    },
    [],
  );

  if (
    !locationTrack &&
    ownedTracks.length === 0
  ) {
    return null;
  }

  async function startPlayback() {
    const audio = audioRef.current;

    if (!audio || !activeTrack) {
      return;
    }

    try {
      audio.volume = volume;
      await audio.play();
      setNeedsGesture(false);
    } catch {
      setNeedsGesture(true);
    }
  }

  function chooseMode(
    personal: boolean,
  ) {
    if (
      personal &&
      ownedTracks.length === 0
    ) {
      return;
    }

    let nextSelected =
      selectedTrackId;

    if (
      personal &&
      !selectedOwned
    ) {
      nextSelected =
        ownedTracks[0]?.id ?? null;
      setSelectedTrackId(
        nextSelected,
      );
    }

    setUsePersonal(personal);

    void persist({
      usePersonalMusic: personal,
      selectedTrackId:
        nextSelected,
    });
  }

  function chooseTrack(
    trackId: string,
  ) {
    setSelectedTrackId(trackId);
    setUsePersonal(true);

    void persist({
      usePersonalMusic: true,
      selectedTrackId: trackId,
    });
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);

    void persist({
      muted: next,
    });
  }

  return (
    <details
      data-sep-interaction-ignore="true"
      className="mb-2 shrink-0 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))]"
    >
      <audio
        ref={audioRef}
        preload="auto"
      />

      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-bca27b))] [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 truncate">
          ♫{" "}
          {activeTrack?.name ??
            "Music"}
        </span>

        <span className="shrink-0 text-[7px] text-[rgb(var(--sep-colour-756957))]">
          {effectivePersonal
            ? "My Music"
            : "Location Music"}
        </span>
      </summary>

      <div className="grid gap-3 border-t border-[rgb(var(--sep-colour-60482e))]/30 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <p className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))]">
            {locationName}
          </p>

          <p className="mt-1 truncate font-serif text-sm text-[rgb(var(--sep-colour-d8bf91))]">
            {activeTrack?.name ??
              "No track selected"}
          </p>

          {personalAvailable ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <select
                value={
                  effectivePersonal
                    ? "personal"
                    : "location"
                }
                onChange={(event) =>
                  chooseMode(
                    event.target
                      .value ===
                      "personal",
                  )
                }
                className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-0d0907))] px-2.5 py-2 text-[10px] text-[rgb(var(--sep-colour-d4bea0))]"
              >
                <option value="location">
                  Location Music
                </option>
                <option value="personal">
                  My Music
                </option>
              </select>

              {effectivePersonal ? (
                <select
                  value={
                    selectedOwned?.id ??
                    ownedTracks[0]?.id ??
                    ""
                  }
                  onChange={(event) =>
                    chooseTrack(
                      event.target.value,
                    )
                  }
                  className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-0d0907))] px-2.5 py-2 text-[10px] text-[rgb(var(--sep-colour-d4bea0))]"
                >
                  {ownedTracks.map(
                    (track) => (
                      <option
                        key={track.id}
                        value={track.id}
                      >
                        {track.name}
                      </option>
                    ),
                  )}
                </select>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2 sm:justify-end">
          {needsGesture &&
          activeTrack ? (
            <button
              type="button"
              onClick={() =>
                void startPlayback()
              }
              className="border border-[rgb(var(--sep-colour-80613b))] px-2.5 py-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-d8bf91))]"
            >
              Play
            </button>
          ) : null}

          <button
            type="button"
            onClick={toggleMute}
            className="border border-[rgb(var(--sep-colour-80613b))] px-2.5 py-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-d8bf91))]"
          >
            {muted
              ? "Unmute"
              : "Mute"}
          </button>

          <label className="flex items-center gap-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-806b50))]">
            Volume
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(event) =>
                setVolume(
                  Number(
                    event.target.value,
                  ),
                )
              }
              onPointerUp={() =>
                void persist({
                  volume,
                })
              }
              onKeyUp={() =>
                void persist({
                  volume,
                })
              }
              className="w-24"
            />
          </label>
        </div>
      </div>
    </details>
  );
}
