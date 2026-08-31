"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";

import type {
  CharacterMusicPayload,
  PlayableMusicTrack,
} from "@/lib/music/get-character-music";

type Props = CharacterMusicPayload & {
  locationName: string;
};

type CurrentMusicResponse = {
  locationName: string | null;
  music: CharacterMusicPayload | null;
};

const LIVE_CHECK_MS = 4_000;

function positionKey(trackId: string) {
  return `sepulchria:location-music-position:${trackId}`;
}

export default function RoomMusicPlayer({
  locationName: initialLocationName,
  locationTrack: initialLocationTrack,
  ownedTracks: initialOwnedTracks,
  preferences,
}: Props) {
  const audioRef =
    useRef<HTMLAudioElement | null>(
      null,
    );

  const fadeTimerRef =
    useRef<number | null>(null);

  const lastSavedSecondRef =
    useRef(-1);

  const sourceLoadingRef =
    useRef(false);

  const pendingResumeRef =
    useRef(0);

  const [locationName, setLocationName] =
    useState(initialLocationName);

  const [
    locationTrack,
    setLocationTrack,
  ] = useState<PlayableMusicTrack | null>(
    initialLocationTrack,
  );

  const [ownedTracks, setOwnedTracks] =
    useState(initialOwnedTracks);

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

  const [playing, setPlaying] =
    useState(false);

  const [currentTime, setCurrentTime] =
    useState(0);

  const [duration, setDuration] =
    useState(0);

  const [
    needsGesture,
    setNeedsGesture,
  ] = useState(false);

  const [expanded, setExpanded] =
    useState(false);

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

  /*
   * Personal music is an override for a location
   * that has music. No location track = silence.
   */
  const activeTrack:
    | PlayableMusicTrack
    | null = locationTrack
      ? effectivePersonal
        ? selectedOwned
        : locationTrack
      : null;

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
    try {
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
    } catch {
      // A transient navigation/dev-server
      // interruption can safely retry later.
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

  function savePosition(
    trackId: string | null,
    currentTime?: number,
  ) {
    if (
      !trackId ||
      typeof window === "undefined"
    ) {
      return;
    }

    const value =
      currentTime ??
      audioRef.current?.currentTime ??
      0;

    if (
      !Number.isFinite(value) ||
      value < 0
    ) {
      return;
    }

    try {
      window.localStorage.setItem(
        positionKey(trackId),
        String(value),
      );
    } catch {
      // Storage can be unavailable in
      // restricted browser modes.
    }
  }

  function readPosition(
    trackId: string,
  ) {
    try {
      const raw =
        window.localStorage.getItem(
          positionKey(trackId),
        );

      const saved = Number(raw);

      return Number.isFinite(saved) &&
        saved > 0
        ? saved
        : 0;
    } catch {
      return 0;
    }
  }

  function restorePosition(
    audio: HTMLAudioElement,
    trackId: string,
  ) {
    const saved =
      pendingResumeRef.current ||
      readPosition(trackId);

    if (
      saved > 0 &&
      Number.isFinite(audio.duration) &&
      audio.duration > 0
    ) {
      const restored =
        Math.min(
          saved,
          Math.max(
            0,
            audio.duration - 0.25,
          ),
        );

      audio.currentTime = restored;
      setCurrentTime(restored);
    }

    pendingResumeRef.current = 0;
    sourceLoadingRef.current = false;
  }

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    const track = activeTrack;

    clearFade();

    if (!track) {
      audio.pause();
      setPlaying(false);
      audio.removeAttribute("src");
      audio.load();
      return;
    }

    lastSavedSecondRef.current = -1;
    pendingResumeRef.current =
      readPosition(track.id);
    sourceLoadingRef.current = true;
    setCurrentTime(
      pendingResumeRef.current,
    );
    setDuration(0);

    audio.pause();
    audio.src = track.url;
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

    return () => {
      savePosition(
        track.id,
        audio.currentTime,
      );
      clearFade();
    };
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
          // Dedicated Play remains.
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

  /*
   * Keep the location assignment live. When
   * staff removes/disables music, stop it and
   * remove this UI without a page refresh.
   */
  useEffect(() => {
    let cancelled = false;

    async function refreshCurrentMusic() {
      try {
        const known =
          locationTrack?.id ?? "";

        const response = await fetch(
          `/api/music/current?known=${encodeURIComponent(
            known,
          )}`,
          {
            cache: "no-store",
          },
        );

        if (
          !response.ok ||
          cancelled
        ) {
          return;
        }

        const data =
          (await response.json()) as CurrentMusicResponse;

        if (cancelled) return;

        if (!data.music?.locationTrack) {
          const audio =
            audioRef.current;

          if (audio) {
            savePosition(
              activeTrack?.id ?? null,
              audio.currentTime,
            );
            audio.pause();
          }

          setPlaying(false);
          setExpanded(false);
          setLocationTrack(null);
          return;
        }

        if (data.locationName) {
          setLocationName(
            data.locationName,
          );
        }

        const incoming =
          data.music.locationTrack;

        setLocationTrack(
          (current) => {
            if (
              current?.id ===
                incoming.id &&
              !incoming.url
            ) {
              return {
                ...current,
                name: incoming.name,
              };
            }

            return incoming.url
              ? incoming
              : current;
          },
        );

        if (
          data.music.ownedTracks
            .length > 0
        ) {
          setOwnedTracks(
            data.music.ownedTracks,
          );
        }
      } catch {
        // Temporary network loss should not
        // stop already-authorised playback.
      }
    }

    void refreshCurrentMusic();

    const timer =
      window.setInterval(
        () => {
          if (
            document.visibilityState ===
            "visible"
          ) {
            void refreshCurrentMusic();
          }
        },
        LIVE_CHECK_MS,
      );

    const handleFocus = () => {
      void refreshCurrentMusic();
    };

    window.addEventListener(
      "focus",
      handleFocus,
    );

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener(
        "focus",
        handleFocus,
      );
    };
  }, [
    locationTrack?.id,
    activeTrack?.id,
  ]);

  useEffect(
    () => () => {
      clearFade();
      const audio = audioRef.current;

      if (audio) {
        savePosition(
          activeTrack?.id ?? null,
          audio.currentTime,
        );
        audio.pause();
      }
    },
    [activeTrack?.id],
  );

  async function togglePlayback() {
    const audio = audioRef.current;

    if (!audio || !activeTrack) {
      return;
    }

    if (!audio.paused) {
      savePosition(
        activeTrack.id,
        audio.currentTime,
      );
      audio.pause();
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

  function seek(
    value: number,
  ) {
    const audio = audioRef.current;

    if (
      !audio ||
      !Number.isFinite(value)
    ) {
      return;
    }

    const next = Math.max(
      0,
      Math.min(
        value,
        duration || value,
      ),
    );

    audio.currentTime = next;
    setCurrentTime(next);

    if (activeTrack) {
      savePosition(
        activeTrack.id,
        next,
      );
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

  if (!locationTrack) {
    return (
      <audio
        ref={audioRef}
        className="hidden"
      />
    );
  }

  const panel = (
    <section
      data-sep-interaction-ignore="true"
      className="mb-3 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))]"
    >
      <div className="flex h-10 items-center">
        <button
          type="button"
          onClick={() =>
            setExpanded(
              (current) => !current,
            )
          }
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-2 px-3 text-left"
        >
          <span className="text-[10px] text-[rgb(var(--sep-colour-a68b67))]">
            ♫
          </span>

          <span className="min-w-0 flex-1 truncate text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-876a46))]">
            {activeTrack?.name ??
              "Location Music"}
          </span>

          {playing ? (
            <span
              className="flex h-4 shrink-0 items-end gap-[1px]"
              aria-hidden="true"
            >
              <span className="h-1.5 w-px animate-pulse bg-[rgb(var(--sep-colour-a68b67))]/70" />
              <span className="h-2.5 w-px animate-pulse bg-[rgb(var(--sep-colour-a68b67))]/80 [animation-delay:160ms]" />
              <span className="h-1 w-px animate-pulse bg-[rgb(var(--sep-colour-a68b67))]/60 [animation-delay:320ms]" />
            </span>
          ) : null}

          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-[rgb(var(--sep-colour-756957))] transition-transform ${
              expanded
                ? "rotate-180"
                : ""
            }`}
          />
        </button>

        <button
          type="button"
          onClick={() =>
            void togglePlayback()
          }
          aria-label={
            playing
              ? "Pause location music"
              : "Play location music"
          }
          title={
            playing
              ? "Pause"
              : "Play"
          }
          className="flex h-10 w-10 shrink-0 items-center justify-center border-l border-[rgb(var(--sep-colour-59432c))]/40 text-[rgb(var(--sep-colour-c6a26d))] transition hover:bg-[rgb(var(--sep-colour-17110d))] hover:text-[rgb(var(--sep-colour-ead2a5))]"
        >
          {playing ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </button>

        <button
          type="button"
          onClick={toggleMute}
          aria-pressed={muted}
          aria-label={
            muted
              ? "Unmute location music"
              : "Mute location music"
          }
          title={
            muted
              ? "Unmute"
              : "Mute"
          }
          className={`flex h-10 w-10 shrink-0 items-center justify-center border-l transition ${
            muted
              ? "border-red-900/70 bg-red-950/35 text-red-400 hover:border-red-700/80 hover:text-red-300"
              : "border-[rgb(var(--sep-colour-59432c))]/40 text-[rgb(var(--sep-colour-c6a26d))] hover:bg-[rgb(var(--sep-colour-17110d))] hover:text-[rgb(var(--sep-colour-ead2a5))]"
          }`}
        >
          {muted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </button>
      </div>

      {expanded ? (
        <div className="border-t border-[rgb(var(--sep-colour-59432c))]/30 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[7px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-756957))]">
                Location Music
              </p>
              <p className="mt-1 truncate font-serif text-[13px] text-[rgb(var(--sep-colour-d6bd91))]">
                {activeTrack?.name}
              </p>
              <p className="mt-1 truncate text-[8px] text-[rgb(var(--sep-colour-756957))]">
                {effectivePersonal
                  ? "My Music"
                  : locationName}
              </p>
            </div>

            {needsGesture ? (
              <button
                type="button"
                onClick={() =>
                  void togglePlayback()
                }
                className="flex h-8 w-8 shrink-0 items-center justify-center border border-[rgb(var(--sep-colour-80613b))]/70 text-[rgb(var(--sep-colour-d8bf91))]"
                aria-label="Play location music"
              >
                <Play className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          {personalAvailable ? (
            <div className="mt-3 space-y-2">
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
                className="w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-0d0907))] px-2.5 py-2 text-[9px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-d4bea0))] outline-none focus:border-[rgb(var(--sep-colour-80613b))]"
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
                  className="w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-0d0907))] px-2.5 py-2 text-[9px] text-[rgb(var(--sep-colour-d4bea0))] outline-none focus:border-[rgb(var(--sep-colour-80613b))]"
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

          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between gap-2 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756957))]">
              <span>Progress</span>
              <span className="tabular-nums">
                {Math.floor(currentTime / 60)}:{String(
                  Math.floor(currentTime % 60),
                ).padStart(2, "0")}
                {" / "}
                {Math.floor(duration / 60)}:{String(
                  Math.floor(duration % 60),
                ).padStart(2, "0")}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={duration > 0 ? duration : 0}
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
              disabled={duration <= 0}
              aria-label="Music progress"
              className="block h-1.5 w-full cursor-pointer accent-[rgb(var(--sep-colour-a77b43))] disabled:cursor-not-allowed disabled:opacity-40"
            />
          </div>

          <label className="mt-3 block">
            <span className="mb-1.5 block text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-756957))]">
              Volume
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
              className="block h-1.5 w-full cursor-pointer accent-[rgb(var(--sep-colour-a77b43))]"
            />
          </label>
        </div>
      ) : null}
    </section>
  );

  return (
    <>
      <audio
        ref={audioRef}
        preload="auto"
        className="hidden"
        onLoadedMetadata={(event) => {
          const loadedDuration =
            event.currentTarget.duration;

          setDuration(
            Number.isFinite(
              loadedDuration,
            )
              ? loadedDuration
              : 0,
          );

          if (activeTrack) {
            restorePosition(
              event.currentTarget,
              activeTrack.id,
            );
          } else {
            sourceLoadingRef.current =
              false;
          }
        }}
        onPlay={() => {
          setPlaying(true);
          setNeedsGesture(false);
        }}
        onPause={(event) => {
          setPlaying(false);

          if (
            activeTrack &&
            !sourceLoadingRef.current
          ) {
            savePosition(
              activeTrack.id,
              event.currentTarget
                .currentTime,
            );
          }
        }}
        onTimeUpdate={(event) => {
          const time =
            event.currentTarget
              .currentTime;

          setCurrentTime(time);

          if (!activeTrack) return;

          const second =
            Math.floor(time);

          if (
            second -
              lastSavedSecondRef.current >=
            2
          ) {
            lastSavedSecondRef.current =
              second;

            savePosition(
              activeTrack.id,
              time,
            );
          }
        }}
      />

      {portalTarget
        ? createPortal(
            panel,
            portalTarget,
          )
        : null}
    </>
  );
}
