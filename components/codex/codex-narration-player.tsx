"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Volume2,
  VolumeX,
} from "lucide-react";

import {
  readPreferenceStorage,
  writePreferenceStorage,
} from "@/lib/privacy/storage-preferences";

const PORTAL_MUTED_KEY =
  "sepulchria-portal-sound-muted";

const CODEX_MUTED_KEY =
  "sepulchria-codex-read-muted";

const CODEX_VOLUME_KEY =
  "sepulchria-codex-read-volume";

const CODEX_PLAYING_KEY =
  "sepulchria-codex-read-playing";

const PORTAL_SOUND_EVENT =
  "sepulchria:portal-sound-muted-changed";

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return "0:00";
  }

  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function CodexNarrationPlayer({
  src,
}: {
  src: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [playing, setPlaying] = useState(false);
  const [shouldAutoplay, setShouldAutoplay] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [localMuted, setLocalMuted] = useState(false);
  const [portalMuted, setPortalMuted] = useState(false);
  const [volume, setVolume] = useState(0.75);
  const [error, setError] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] =
    useState(false);

  useEffect(() => {
    const savedPortalMuted =
      readPreferenceStorage(PORTAL_MUTED_KEY);

    const savedCodexMuted =
      readPreferenceStorage(CODEX_MUTED_KEY);

    const savedVolume =
      readPreferenceStorage(CODEX_VOLUME_KEY);

    const savedPlaying =
      readPreferenceStorage(CODEX_PLAYING_KEY);

    setPortalMuted(savedPortalMuted === "1");

    if (savedCodexMuted !== null) {
      setLocalMuted(savedCodexMuted === "1");
    }

    if (savedVolume !== null) {
      const parsed = Number(savedVolume);

      if (
        Number.isFinite(parsed) &&
        parsed >= 0 &&
        parsed <= 1
      ) {
        setVolume(parsed);
      }
    }

    if (savedPlaying !== null) {
      setShouldAutoplay(savedPlaying === "1");
    }

    setPreferencesLoaded(true);
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;

    writePreferenceStorage(
      CODEX_MUTED_KEY,
      localMuted ? "1" : "0",
    );
  }, [localMuted, preferencesLoaded]);

  useEffect(() => {
    if (!preferencesLoaded) return;

    writePreferenceStorage(
      CODEX_VOLUME_KEY,
      String(volume),
    );
  }, [volume, preferencesLoaded]);

  useEffect(() => {
    if (!preferencesLoaded) return;

    writePreferenceStorage(
      CODEX_PLAYING_KEY,
      shouldAutoplay ? "1" : "0",
    );
  }, [shouldAutoplay, preferencesLoaded]);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === PORTAL_MUTED_KEY) {
        setPortalMuted(event.newValue === "1");
      }

      if (event.key === CODEX_MUTED_KEY) {
        setLocalMuted(event.newValue === "1");
      }

      if (
        event.key === CODEX_VOLUME_KEY &&
        event.newValue !== null
      ) {
        const parsed = Number(event.newValue);

        if (
          Number.isFinite(parsed) &&
          parsed >= 0 &&
          parsed <= 1
        ) {
          setVolume(parsed);
        }
      }

      if (
        event.key === CODEX_PLAYING_KEY &&
        event.newValue !== null
      ) {
        setShouldAutoplay(event.newValue === "1");
      }
    }

    function onPortalMute(event: Event) {
      const detail =
        (
          event as CustomEvent<{
            muted?: boolean;
          }>
        ).detail;

      if (typeof detail?.muted === "boolean") {
        setPortalMuted(detail.muted);
      }
    }

    window.addEventListener(
      "storage",
      onStorage,
    );

    window.addEventListener(
      PORTAL_SOUND_EVENT,
      onPortalMute,
    );

    return () => {
      window.removeEventListener(
        "storage",
        onStorage,
      );

      window.removeEventListener(
        PORTAL_SOUND_EVENT,
        onPortalMute,
      );
    };
  }, []);

  /*
   * Reset only when the chapter/audio source changes.
   * This must NOT depend on shouldAutoplay,
   * otherwise pressing Pause would rewind the audio.
   */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();

    try {
      audio.currentTime = 0;
    } catch {
      //
    }

    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(false);

    audio.load();
  }, [src]);

  /*
   * Attempt autoplay separately.
   *
   * This means changing shouldAutoplay no longer
   * resets currentTime.
   */
  useEffect(() => {
    const audio = audioRef.current;

    if (
      !audio ||
      !preferencesLoaded ||
      !shouldAutoplay
    ) {
      return;
    }

    void audio.play().catch(() => {
      // Browser blocked autoplay.
      // User can still press Read manually.
    });
  }, [
    src,
    shouldAutoplay,
    preferencesLoaded,
  ]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted =
      portalMuted || localMuted;
  }, [
    portalMuted,
    localMuted,
  ]);

  const togglePlayback =
    useCallback(async () => {
      const audio = audioRef.current;

      if (!audio || error) return;

      if (!audio.paused) {
        setShouldAutoplay(false);
        audio.pause();
        return;
      }

      try {
        setShouldAutoplay(true);
        await audio.play();
      } catch {
        setShouldAutoplay(false);
        setError(true);
        setPlaying(false);
      }
    }, [error]);

  function seek(value: number) {
    const audio = audioRef.current;

    if (
      !audio ||
      !Number.isFinite(value)
    ) {
      return;
    }

    audio.currentTime = value;
    setCurrentTime(value);
  }

  const effectivelyMuted =
    portalMuted || localMuted;

  return (
    <section
      aria-label="Chapter narration"
      className="w-20% sm:max-w-[700px] components_codex_codex_narration_player_section"
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
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
          setShouldAutoplay(false);
        }}
        onTimeUpdate={(event) => {
          setCurrentTime(
            event.currentTarget.currentTime,
          );
        }}
        onLoadedMetadata={(event) => {
          const nextDuration =
            event.currentTarget.duration;

          setDuration(
            Number.isFinite(nextDuration)
              ? nextDuration
              : 0,
          );
        }}
        onError={() => {
          setError(true);
          setPlaying(false);
        }}
      />

      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={() =>
            void togglePlayback()
          }
          disabled={error}
          className="h-9 min-w-[74px] shrink-0 border border-[rgb(var(--sep-colour-765937))]/70 bg-[rgb(var(--sep-colour-1b140f))] px-3 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-d4b77f))] transition hover:border-[rgb(var(--sep-colour-9a7445))] hover:text-[rgb(var(--sep-colour-f0d49d))] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={
            playing
              ? "Pause chapter reading"
              : "Read chapter aloud"
          }
        >
          {playing
            ? "Pause"
            : "Read"}
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756957))]">
              Reading
            </span>

            <span className="shrink-0 text-[8px] tabular-nums text-[rgb(var(--sep-colour-776b5c))]">
              {formatTime(currentTime)}
              {" / "}
              {formatTime(duration)}
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
            step={0.1}
            value={Math.min(
              currentTime,
              duration || 0,
            )}
            onChange={(event) =>
              seek(
                Number(
                  event.target.value,
                ),
              )
            }
            disabled={
              duration <= 0 || error
            }
            aria-label="Chapter reading progress"
            className="block h-1.5 w-full cursor-pointer accent-[rgb(var(--sep-skin-c1,var(--sep-colour-a98a60)))] disabled:cursor-not-allowed disabled:opacity-40"
          />
        </div>

        <button
          type="button"
          onClick={() =>
            setLocalMuted(
              (current) =>
                !current,
            )
          }
          aria-pressed={
            localMuted
          }
          aria-label={
            localMuted
              ? "Unmute Codex reading"
              : "Mute Codex reading"
          }
          title={
            portalMuted
              ? "Muted by the portal sound control"
              : localMuted
                ? "Unmute Codex reading"
                : "Mute Codex reading"
          }
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center border transition",
            effectivelyMuted
              ? "border-red-700 bg-red-950/40 text-red-400 hover:border-red-500 hover:text-red-300"
              : "border-[rgb(var(--sep-colour-60482e))]/60 bg-[rgb(var(--sep-colour-15100d))] text-[rgb(var(--sep-colour-c6a26d))] hover:border-[rgb(var(--sep-colour-987344))] hover:text-[rgb(var(--sep-colour-ead2a5))]",
          ].join(" ")}
        >
          {effectivelyMuted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </button>

        <label className="hidden w-28 shrink-0 items-center gap-2 lg:flex">
          <span className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756957))]">
            Vol
          </span>

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
            aria-label="Codex reading volume"
            className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[rgb(var(--sep-skin-c1,var(--sep-colour-a98a60)))]"
          />
        </label>
      </div>

      {portalMuted ? (
        <p className="mt-1.5 text-right text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-7d655d))]">
          Muted by portal sound
        </p>
      ) : null}

      {error ? (
        <p className="mt-1.5 text-right text-[9px] text-[rgb(var(--sep-colour-b47c70))]">
          This chapter reading could not be played.
        </p>
      ) : null}
    </section>
  );
}