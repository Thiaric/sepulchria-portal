"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { usePortalAudio } from "@/components/audio/portal-audio-provider";

type CharacterMusicPlayerProps = {
  src: string;
};

/*
 * Keep a registry of every CharacterMusicPlayer audio element.
 *
 * This matters during Next.js client navigation: if a previous character
 * route is temporarily retained/cached, we can still stop or mute its audio.
 */
const characterMusicRegistry =
  new Set<HTMLAudioElement>();

function stopAudioElement(
  audio: HTMLAudioElement,
  reset = false,
) {
  try {
    audio.pause();

    if (reset) {
      audio.currentTime = 0;
    }
  } catch {
    // Ignore browser media cleanup errors.
  }
}

function stopOtherCharacterMusic(
  current: HTMLAudioElement,
) {
  characterMusicRegistry.forEach(
    (audio) => {
      if (audio !== current) {
        stopAudioElement(
          audio,
          true,
        );
      }
    },
  );
}

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
}: CharacterMusicPlayerProps) {
  const audioRef =
    useRef<HTMLAudioElement | null>(
      null,
    );

  const playerRef =
    useRef<HTMLElement | null>(
      null,
    );

  const autoplayCancelledRef =
    useRef(false);

  const autoplayFinishedRef =
    useRef(false);

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

  /*
   * Callback ref gives us deterministic cleanup when React removes/replaces
   * the <audio> node. We stop it BEFORE dropping our reference.
   */
  const setAudioElement =
    useCallback(
      (
        next:
          | HTMLAudioElement
          | null,
      ) => {
        const previous =
          audioRef.current;

        if (
          previous &&
          previous !== next
        ) {
          stopAudioElement(
            previous,
            true,
          );

          characterMusicRegistry.delete(
            previous,
          );

          /*
           * Remove the media source as an extra guard against a detached
           * element continuing to stream after client-side navigation.
           */
          previous.removeAttribute(
            "src",
          );

          try {
            previous.load();
          } catch {
            // Ignore cleanup errors.
          }
        }

        audioRef.current =
          next;

        if (next) {
          characterMusicRegistry.add(
            next,
          );
        }
      },
      [],
    );

  /*
   * Volume belongs to this player.
   */
  useEffect(() => {
    const audio =
      audioRef.current;

    if (!audio) {
      return;
    }

    audio.volume = volume;
  }, [volume]);

  /*
   * Global portal mute is authoritative.
   *
   * Apply it to EVERY registered CharacterMusicPlayer, including any stale
   * player temporarily retained by Next.js.
   */
  useEffect(() => {
    characterMusicRegistry.forEach(
      (audio) => {
        const ownLocalMute =
          audio.dataset
            .localMuted ===
          "true";

        audio.muted =
          portalMuted ||
          ownLocalMute;
      },
    );
  }, [portalMuted]);

  /*
   * Local mute applies to this track and is also stored on the DOM element so
   * the global portal mute can preserve it.
   */
  useEffect(() => {
    const audio =
      audioRef.current;

    if (!audio) {
      return;
    }

    audio.dataset.localMuted =
      localMuted
        ? "true"
        : "false";

    audio.muted =
      portalMuted ||
      localMuted;
  }, [
    portalMuted,
    localMuted,
  ]);

  /*
   * Reset whenever the character music source changes.
   */
  useEffect(() => {
    const audio =
      audioRef.current;

    if (!audio) {
      return;
    }

    autoplayCancelledRef.current =
      false;

    autoplayFinishedRef.current =
      false;

    stopAudioElement(
      audio,
      true,
    );

    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(false);

    audio.src = src;
    audio.load();

    return () => {
      autoplayCancelledRef.current =
        true;

      stopAudioElement(
        audio,
        true,
      );

      characterMusicRegistry.delete(
        audio,
      );

      audio.removeAttribute(
        "src",
      );

      try {
        audio.load();
      } catch {
        // Ignore cleanup errors.
      }
    };
  }, [src]);

  /*
   * Controlled autoplay.
   *
   * IMPORTANT: there is deliberately NO `autoPlay` attribute on <audio>.
   * Native autoplay was able to start independently of our React controls
   * during cached/client navigation.
   *
   * We try once immediately. If the browser blocks audible autoplay, the
   * first interaction OUTSIDE the player can unlock it. Any interaction
   * INSIDE the player permanently cancels fallback autoplay and leaves the
   * viewer in control.
   */
  useEffect(() => {
    let listenersInstalled =
      false;

    function removeListeners() {
      if (!listenersInstalled) {
        return;
      }

      window.removeEventListener(
        "pointerdown",
        handleUnlock,
        true,
      );

      window.removeEventListener(
        "keydown",
        handleUnlock,
        true,
      );

      listenersInstalled =
        false;
    }

    async function tryPlay() {
      const audio =
        audioRef.current;

      if (
        !audio ||
        autoplayCancelledRef.current ||
        autoplayFinishedRef.current
      ) {
        return false;
      }

      /*
       * Only one character theme may ever play at a time.
       */
      stopOtherCharacterMusic(
        audio,
      );

      try {
        await audio.play();

        autoplayFinishedRef.current =
          true;

        removeListeners();

        return true;
      } catch {
        return false;
      }
    }

    function handleUnlock(
      event: Event,
    ) {
      if (
        autoplayCancelledRef.current ||
        autoplayFinishedRef.current
      ) {
        removeListeners();
        return;
      }

      const player =
        playerRef.current;

      if (
        event.target instanceof
          Node &&
        player?.contains(
          event.target,
        )
      ) {
        autoplayCancelledRef.current =
          true;

        removeListeners();
        return;
      }

      void tryPlay();
    }

    void tryPlay().then(
      (started) => {
        if (
          started ||
          autoplayCancelledRef.current
        ) {
          return;
        }

        window.addEventListener(
          "pointerdown",
          handleUnlock,
          true,
        );

        window.addEventListener(
          "keydown",
          handleUnlock,
          true,
        );

        listenersInstalled =
          true;
      },
    );

    return () => {
      autoplayCancelledRef.current =
        true;

      removeListeners();

      const audio =
        audioRef.current;

      if (audio) {
        stopAudioElement(
          audio,
          true,
        );
      }
    };
  }, [src]);

  async function togglePlayback() {
    const audio =
      audioRef.current;

    if (!audio || error) {
      return;
    }

    autoplayCancelledRef.current =
      true;

    if (!audio.paused) {
      stopAudioElement(audio);
      return;
    }

    /*
     * If the viewer manually presses Play, stop every other character theme.
     */
    stopOtherCharacterMusic(
      audio,
    );

    try {
      await audio.play();
    } catch {
      setError(true);
      setPlaying(false);
    }
  }

  function toggleLocalMute() {
    autoplayCancelledRef.current =
      true;

    setLocalMuted(
      (current) =>
        !current,
    );
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

    autoplayCancelledRef.current =
      true;

    audio.currentTime =
      value;

    setCurrentTime(value);
  }

  function changeVolume(
    value: number,
  ) {
    autoplayCancelledRef.current =
      true;

    setVolume(value);
  }

  return (
    <section
      ref={playerRef}
      className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-120e0b))] px-4 py-3 sm:px-5"
    >
      <audio
        ref={setAudioElement}
        preload="auto"
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
        onPlay={(event) => {
          /*
           * A last safety net: whenever THIS element begins playback,
           * kill every other registered character theme.
           */
          stopOtherCharacterMusic(
            event.currentTarget,
          );

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
          /*
           * During cleanup we intentionally clear `src`; don't show a player
           * error for an element that is being removed.
           */
          if (
            audioRef.current
          ) {
            setError(true);
          }

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
          className="flex h-9 w-9 shrink-0 items-center justify-center border border-[rgb(var(--sep-colour-765937))]/70 bg-[rgb(var(--sep-colour-1b140f))] text-sm text-[rgb(var(--sep-colour-d4b77f))] transition hover:border-[rgb(var(--sep-colour-9a7445))] hover:text-[rgb(var(--sep-colour-f0d49d))] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {playing
            ? "Ⅱ"
            : "▶"}
        </button>

        <div className="min-w-[150px] flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[7px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
                Music
              </p>
            </div>

            <span className="shrink-0 text-[9px] tabular-nums text-[rgb(var(--sep-colour-776b5c))]">
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
            className="mt-2 h-1.5 w-full cursor-pointer accent-[rgb(var(--sep-colour-a77b43))] disabled:cursor-not-allowed disabled:opacity-40"
          />
        </div>

        <button
          type="button"
          onClick={
            toggleLocalMute
          }
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
          className={`flex h-9 w-9 shrink-0 items-center justify-center border bg-[rgb(var(--sep-colour-15100d))] text-xs transition ${
            portalMuted ||
            localMuted
              ? "border-[rgb(var(--sep-colour-65443b))] text-[rgb(var(--sep-colour-a56f64))]"
              : "border-[rgb(var(--sep-colour-60482e))]/60 text-[rgb(var(--sep-colour-c6a26d))] hover:border-[rgb(var(--sep-colour-987344))] hover:text-[rgb(var(--sep-colour-ead2a5))]"
          }`}
        >
          {portalMuted ||
          localMuted
            ? "×♫"
            : "♫"}
        </button>

        <label className="hidden w-24 shrink-0 items-center gap-2 sm:flex">
          <span className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-6f6253))]">
            Vol
          </span>

          <input
            type="range"
            min={0}
            max={1}
            step="0.05"
            value={volume}
            onChange={(event) => {
              changeVolume(
                Number(
                  event.target
                    .value,
                ),
              );
            }}
            aria-label="Character music volume"
            className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[rgb(var(--sep-colour-a77b43))]"
          />
        </label>
      </div>

      {portalMuted ? (
        <p className="mt-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-7d655d))]">
          Muted by the portal sound control
        </p>
      ) : null}

      {error ? (
        <p className="mt-2 text-xs text-[rgb(var(--sep-colour-b47c70))]">
          This music link could not be played. Use a direct browser-playable audio URL.
        </p>
      ) : null}
    </section>
  );
}
