"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { usePortalAudio } from "@/components/audio/portal-audio-provider";

type CharacterMusicPlayerProps = {
  src: string;
  label?: string;
};

function formatTime(value: number) {
  if (
    !Number.isFinite(value) ||
    value < 0
  ) {
    return "0:00";
  }

  const minutes = Math.floor(
    value / 60,
  );

  const seconds = Math.floor(
    value % 60,
  );

  return `${minutes}:${String(
    seconds,
  ).padStart(2, "0")}`;
}

export function CharacterMusicPlayer({
  src,
  label = "Character Theme",
}: CharacterMusicPlayerProps) {
  const audioRef =
    useRef<HTMLAudioElement | null>(
      null,
    );

  const { muted: portalMuted } =
    usePortalAudio();

  const [playing, setPlaying] =
    useState(false);

  const [currentTime, setCurrentTime] =
    useState(0);

  const [duration, setDuration] =
    useState(0);

  const [localMuted, setLocalMuted] =
    useState(false);

  const [volume, setVolume] =
    useState(0.65);

  const [error, setError] =
    useState(false);

  useEffect(() => {
    const audio =
      audioRef.current;

    if (!audio) {
      return;
    }

    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio =
      audioRef.current;

    if (!audio) {
      return;
    }

    audio.muted =
      portalMuted ||
      localMuted;

    audio.dataset.localMuted =
      localMuted
        ? "true"
        : "false";
  }, [
    portalMuted,
    localMuted,
  ]);

  useEffect(() => {
    const audio =
      audioRef.current;

    if (!audio) {
      return;
    }

    audio.pause();
    audio.currentTime = 0;

    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(false);

    audio.load();
  }, [src]);

  useEffect(() => {
  let unlocked = false;

  async function tryAutoplay() {
    const element =
      audioRef.current;

    if (!element) {
      return false;
    }

    if (!element.paused) {
      return true;
    }

    try {
      await element.play();
      return true;
    } catch {
      return false;
    }
  }

  function removeUnlockListeners() {
    window.removeEventListener(
      "pointerdown",
      unlockAutoplay,
      true,
    );

    window.removeEventListener(
      "keydown",
      unlockAutoplay,
      true,
    );
  }

  async function unlockAutoplay() {
    if (unlocked) {
      return;
    }

    const started =
      await tryAutoplay();

    if (started) {
      unlocked = true;

      removeUnlockListeners();
    }
  }

  void tryAutoplay().then(
    (started) => {
      if (started) {
        unlocked = true;
        return;
      }

      window.addEventListener(
        "pointerdown",
        unlockAutoplay,
        true,
      );

      window.addEventListener(
        "keydown",
        unlockAutoplay,
        true,
      );
    },
  );

  return () => {
    removeUnlockListeners();
  };
}, [src]);

  async function togglePlayback() {
    const audio =
      audioRef.current;

    if (!audio || error) {
      return;
    }

    if (!audio.paused) {
      audio.pause();
      return;
    }

    try {
      await audio.play();
    } catch {
      setError(true);
      setPlaying(false);
    }
  }

  function seek(value: number) {
    const audio =
      audioRef.current;

    if (
      !audio ||
      !Number.isFinite(value)
    ) {
      return;
    }

    audio.currentTime = value;

    setCurrentTime(value);
  }

  return (
    <section className="border border-[#60482e]/45 bg-[#120e0b] px-4 py-3 sm:px-5">
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        autoPlay
        muted={
          portalMuted ||
          localMuted
        }
        data-character-music="true"
        data-local-muted={
          localMuted
            ? "true"
            : "false"
        }
        onPlay={() => {
          setPlaying(true);
          setError(false);
        }}
        onPause={() => {
          setPlaying(false);
        }}
        onEnded={() => {
          setPlaying(false);
          setCurrentTime(0);
        }}
        onTimeUpdate={(event) => {
          setCurrentTime(
            event.currentTarget
              .currentTime,
          );
        }}
        onLoadedMetadata={(
          event,
        ) => {
          const loadedDuration =
            event.currentTarget
              .duration;

          setDuration(
            Number.isFinite(
              loadedDuration,
            )
              ? loadedDuration
              : 0,
          );
        }}
        onError={() => {
          setError(true);
          setPlaying(false);
        }}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            void togglePlayback();
          }}
          disabled={error}
          aria-label={
            playing
              ? "Pause character music"
              : "Play character music"
          }
          title={
            playing
              ? "Pause"
              : "Play"
          }
          className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#765937]/70 bg-[#1b140f] text-sm text-[#d4b77f] transition hover:border-[#9a7445] hover:text-[#f0d49d] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {playing
            ? "Ⅱ"
            : "▶"}
        </button>

        <div className="min-w-[150px] flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[7px] uppercase tracking-[0.22em] text-[#806b50]">
                Music
              </p>

              <p className="truncate font-serif text-sm text-[#d9c096]">
                {label}
              </p>
            </div>

            <span className="shrink-0 text-[9px] tabular-nums text-[#776b5c]">
              {formatTime(
                currentTime,
              )}
              {" / "}
              {formatTime(
                duration,
              )}
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={
              duration > 0
                ? duration
                : 0
            }
            step="0.1"
            value={Math.min(
              currentTime,
              duration || 0,
            )}
            onChange={(event) => {
              seek(
                Number(
                  event.target
                    .value,
                ),
              );
            }}
            disabled={
              error ||
              duration <= 0
            }
            aria-label="Seek character music"
            className="mt-2 h-1.5 w-full cursor-pointer accent-[#a77b43] disabled:cursor-not-allowed disabled:opacity-40"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            setLocalMuted(
              (current) =>
                !current,
            );
          }}
          aria-pressed={
            localMuted
          }
          aria-label={
            localMuted
              ? "Unmute character music"
              : "Mute character music"
          }
          title={
            portalMuted
              ? "Portal audio is muted"
              : localMuted
                ? "Unmute this track"
                : "Mute this track"
          }
          className={`flex h-9 w-9 shrink-0 items-center justify-center border bg-[#15100d] text-xs transition ${
            portalMuted ||
            localMuted
              ? "border-[#65443b] text-[#a56f64]"
              : "border-[#60482e]/60 text-[#c6a26d] hover:border-[#987344] hover:text-[#ead2a5]"
          }`}
        >
          {portalMuted ||
          localMuted
            ? "×♫"
            : "♫"}
        </button>

        <label className="hidden w-24 shrink-0 items-center gap-2 sm:flex">
          <span className="text-[8px] uppercase tracking-[0.12em] text-[#6f6253]">
            Vol
          </span>

          <input
            type="range"
            min={0}
            max={1}
            step="0.05"
            value={volume}
            onChange={(event) => {
              setVolume(
                Number(
                  event.target
                    .value,
                ),
              );
            }}
            aria-label="Character music volume"
            className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[#a77b43]"
          />
        </label>
      </div>

      {portalMuted ? (
        <p className="mt-2 text-[8px] uppercase tracking-[0.14em] text-[#7d655d]">
          Muted by the portal sound control
        </p>
      ) : null}

      {error ? (
        <p className="mt-2 text-xs text-[#b47c70]">
          This music link could not be played. Use a direct browser-playable audio URL.
        </p>
      ) : null}
    </section>
  );
}