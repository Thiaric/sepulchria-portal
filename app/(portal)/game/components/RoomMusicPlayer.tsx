"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

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

  const [
    portalTarget,
    setPortalTarget,
  ] = useState<HTMLElement | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    let attempts = 0;

    const findTarget = () => {
      if (cancelled) return;

      const target =
        document.getElementById(
          "game-music-context-slot",
        );

      if (target) {
        setPortalTarget(target);
        return;
      }

      attempts += 1;

      if (attempts < 60) {
        frame =
          window.requestAnimationFrame(
            findTarget,
          );
      }
    };

    findTarget();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(
        frame,
      );
    };
  }, []);

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

  useEffect(() => {
    if (
      !needsGesture ||
      !activeTrack
    ) {
      return;
    }

    const resume = () => {
      const audio = audioRef.current;

      if (!audio) return;

      void audio
        .play()
        .then(() => {
          setNeedsGesture(false);
          fadeTo(
            muted ? 0 : volume,
          );
        })
        .catch(() => {
          // The visible Play control
          // remains available.
        });
    };

    document.addEventListener(
      "pointerdown",
      resume,
      {
        capture: true,
        once: true,
      },
    );

    document.addEventListener(
      "keydown",
      resume,
      {
        capture: true,
        once: true,
      },
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        resume,
        true,
      );
      document.removeEventListener(
        "keydown",
        resume,
        true,
      );
    };
  }, [
    needsGesture,
    activeTrack?.id,
    muted,
    volume,
  ]);

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

  const panel = (
    <section
      data-sep-interaction-ignore="true"
      className="mb-4 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-876a46))]">
            Location Music
          </p>
          <h3 className="mt-0.5 truncate font-serif text-lg text-[rgb(var(--sep-colour-d6bd91))]">
            {activeTrack?.name ?? "Silence"}
          </h3>
        </div>

        {activeTrack ? (
          <div
            className="flex h-6 shrink-0 items-end gap-[2px] border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-15100d))] px-2 py-1"
            aria-hidden="true"
          >
            <span className="h-2 w-[2px] animate-pulse bg-[rgb(var(--sep-colour-a68b67))]/70" />
            <span className="h-3 w-[2px] animate-pulse bg-[rgb(var(--sep-colour-a68b67))]/85 [animation-delay:140ms]" />
            <span className="h-1.5 w-[2px] animate-pulse bg-[rgb(var(--sep-colour-a68b67))]/60 [animation-delay:280ms]" />
            <span className="h-2.5 w-[2px] animate-pulse bg-[rgb(var(--sep-colour-a68b67))]/75 [animation-delay:420ms]" />
          </div>
        ) : null}
      </div>

      <p className="mt-2 text-[9px] text-[rgb(var(--sep-colour-756957))]">
        {effectivePersonal
          ? "Your selected personal track"
          : locationName}
      </p>

      {personalAvailable ? (
        <div className="mt-3 space-y-2">
          <select
            value={effectivePersonal ? "personal" : "location"}
            onChange={(event) =>
              chooseMode(
                event.target.value === "personal",
              )
            }
            className="w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-0d0907))] px-2.5 py-2 text-[10px] text-[rgb(var(--sep-colour-d4bea0))] outline-none focus:border-[rgb(var(--sep-colour-80613b))]"
          >
            <option value="location">Location Music</option>
            <option value="personal">My Music</option>
          </select>

          {effectivePersonal ? (
            <select
              value={
                selectedOwned?.id ??
                ownedTracks[0]?.id ??
                ""
              }
              onChange={(event) =>
                chooseTrack(event.target.value)
              }
              className="w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-0d0907))] px-2.5 py-2 text-[10px] text-[rgb(var(--sep-colour-d4bea0))] outline-none focus:border-[rgb(var(--sep-colour-80613b))]"
            >
              {ownedTracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex items-center gap-2 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-3">
        {needsGesture && activeTrack ? (
          <button
            type="button"
            onClick={() => void startPlayback()}
            className="border border-[rgb(var(--sep-colour-80613b))]/70 bg-[rgb(var(--sep-colour-17110d))] px-2.5 py-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-d8bf91))]"
          >
            Play
          </button>
        ) : null}

        <button
          type="button"
          onClick={toggleMute}
          className="border border-[rgb(var(--sep-colour-80613b))]/70 bg-[rgb(var(--sep-colour-17110d))] px-2.5 py-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-d8bf91))]"
        >
          {muted ? "Unmute" : "Mute"}
        </button>

        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756957))]">
            Volume
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(event) =>
              setVolume(Number(event.target.value))
            }
            onPointerUp={() => void persist({ volume })}
            onKeyUp={() => void persist({ volume })}
            className="block w-full"
          />
        </label>
      </div>
    </section>
  );

  return (
    <>
      <audio ref={audioRef} preload="auto" className="hidden" />
      {portalTarget
        ? createPortal(panel, portalTarget)
        : null}
    </>
  );
}
