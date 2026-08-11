"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type PortalSoundKind =
  | "room-message"
  | "private-message"
  | "chat-pop";

type PortalAudioContextValue = {
  muted: boolean;
  toggleMuted: () => void;
  playPortalSound: (
    kind?: PortalSoundKind,
  ) => void;
};

const STORAGE_KEY =
  "sepulchria-portal-sound-muted";

const PIGEON_SOUND_URL =
  "/sounds/private-message-pigeon.mp3";

const PortalAudioContext =
  createContext<PortalAudioContextValue | null>(
    null,
  );

export function PortalAudioProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [muted, setMuted] =
    useState(false);

  const mutedRef =
    useRef(false);

  /*
   * Keep the existing WebAudio route for the short beep.
   * This is the same sound path used by the working Location notification.
   */
  const audioContextRef =
    useRef<AudioContext | null>(
      null,
    );

  const masterGainRef =
    useRef<GainNode | null>(
      null,
    );

  /*
   * The pigeon is now a REAL audio asset, not an oscillator imitation.
   */
  const pigeonAudioRef =
    useRef<HTMLAudioElement | null>(
      null,
    );

  const ensureAudioContext =
    useCallback(() => {
      if (
        !audioContextRef.current
      ) {
        const context =
          new window.AudioContext();

        const master =
          context.createGain();

        master.gain.value =
          mutedRef.current
            ? 0
            : 1;

        master.connect(
          context.destination,
        );

        audioContextRef.current =
          context;

        masterGainRef.current =
          master;
      }

      return audioContextRef.current;
    }, []);

  const ensurePigeonAudio =
    useCallback(() => {
      if (
        !pigeonAudioRef.current
      ) {
        const audio =
          new Audio(
            PIGEON_SOUND_URL,
          );

        audio.preload = "auto";
        audio.volume = 0.72;
        audio.muted =
          mutedRef.current;

        pigeonAudioRef.current =
          audio;
      }

      return pigeonAudioRef.current;
    }, []);

  useEffect(() => {
    let initialMuted = false;

    try {
      initialMuted =
        window.localStorage.getItem(
          STORAGE_KEY,
        ) === "1";
    } catch {
      // localStorage can be unavailable.
    }

    mutedRef.current =
      initialMuted;

    setMuted(initialMuted);

    const pigeon =
      ensurePigeonAudio();

    pigeon.muted =
      initialMuted;

    const context =
      ensureAudioContext();

    const master =
      masterGainRef.current;

    if (master) {
      master.gain.setValueAtTime(
        initialMuted ? 0 : 1,
        context.currentTime,
      );
    }
  }, [
    ensureAudioContext,
    ensurePigeonAudio,
  ]);

  useEffect(() => {
    /*
     * Prime both audio systems on a normal user interaction.
     * Browsers generally require one gesture before notification audio
     * can be played programmatically.
     */
    const unlockAudio =
      () => {
        if (
          mutedRef.current
        ) {
          return;
        }

        const context =
          ensureAudioContext();

        if (
          context.state ===
          "suspended"
        ) {
          void context.resume();
        }

        const pigeon =
          ensurePigeonAudio();

        pigeon.load();
      };

    window.addEventListener(
      "pointerdown",
      unlockAudio,
      true,
    );

    window.addEventListener(
      "keydown",
      unlockAudio,
      true,
    );

    return () => {
      window.removeEventListener(
        "pointerdown",
        unlockAudio,
        true,
      );

      window.removeEventListener(
        "keydown",
        unlockAudio,
        true,
      );
    };
  }, [
    ensureAudioContext,
    ensurePigeonAudio,
  ]);

  useEffect(() => {
    /*
     * Future Character Sheet music will also obey the same global switch.
     */
    const applyToHtmlAudio =
      (
        parent: ParentNode,
      ) => {
        parent
          .querySelectorAll?.(
            "audio",
          )
          .forEach(
            (audio) => {
              audio.muted =
                mutedRef.current;
            },
          );
      };

    applyToHtmlAudio(document);

    const observer =
      new MutationObserver(
        (records) => {
          for (
            const record of records
          ) {
            for (
              const node of
              record.addedNodes
            ) {
              if (
                !(
                  node instanceof
                  Element
                )
              ) {
                continue;
              }

              if (
                node instanceof
                HTMLAudioElement
              ) {
                node.muted =
                  mutedRef.current;
              }

              applyToHtmlAudio(
                node,
              );
            }
          }
        },
      );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true,
      },
    );

    return () => {
      observer.disconnect();
    };
  }, []);

  const applyMuteImmediately =
    useCallback(
      (
        nextMuted: boolean,
        persist = true,
      ) => {
        /*
         * Synchronous ref first: every sound source sees the new setting
         * immediately in the SAME click.
         */
        mutedRef.current =
          nextMuted;

        setMuted(nextMuted);

        if (persist) {
          try {
            window.localStorage.setItem(
              STORAGE_KEY,
              nextMuted
                ? "1"
                : "0",
            );
          } catch {
            // localStorage can be unavailable.
          }
        }

        /*
         * Live mute for the WebAudio beep WITHOUT suspending the context.
         * Suspending/resuming the context was the source of previous
         * notification regressions.
         */
        const context =
          ensureAudioContext();

        const master =
          masterGainRef.current;

        if (master) {
          master.gain.cancelScheduledValues(
            context.currentTime,
          );

          master.gain.setValueAtTime(
            nextMuted ? 0 : 1,
            context.currentTime,
          );
        }

        /*
         * Live mute for the real pigeon file.
         */
        const pigeon =
          ensurePigeonAudio();

        pigeon.muted =
          nextMuted;

        if (
          nextMuted &&
          !pigeon.paused
        ) {
          pigeon.pause();
          pigeon.currentTime = 0;
        }

        /*
         * Future HTML <audio> (character music etc.)
         */
        document
          .querySelectorAll("audio")
          .forEach(
            (audio) => {
              audio.muted =
                nextMuted;
            },
          );
      },
      [
        ensureAudioContext,
        ensurePigeonAudio,
      ],
    );

  useEffect(() => {
    const onStorage =
      (
        event: StorageEvent,
      ) => {
        if (
          event.key !==
          STORAGE_KEY
        ) {
          return;
        }

        applyMuteImmediately(
          event.newValue ===
            "1",
          false,
        );
      };

    window.addEventListener(
      "storage",
      onStorage,
    );

    return () => {
      window.removeEventListener(
        "storage",
        onStorage,
      );
    };
  }, [applyMuteImmediately]);

  const toggleMuted =
    useCallback(() => {
      applyMuteImmediately(
        !mutedRef.current,
      );
    }, [applyMuteImmediately]);

  const playBeep =
    useCallback(() => {
      if (
        mutedRef.current
      ) {
        return;
      }

      const context =
        ensureAudioContext();

      const master =
        masterGainRef.current;

      if (!master) {
        return;
      }

      const play =
        () => {
          if (
            mutedRef.current ||
            context.state !==
              "running"
          ) {
            return;
          }

          const start =
            context.currentTime +
            0.01;

          const notes = [
            {
              frequency: 523.25,
              offset: 0,
              duration: 0.09,
              volume: 0.038,
            },
            {
              frequency: 659.25,
              offset: 0.09,
              duration: 0.12,
              volume: 0.03,
            },
          ];

          for (
            const note of notes
          ) {
            const oscillator =
              context.createOscillator();

            const gain =
              context.createGain();

            oscillator.type =
              "sine";

            oscillator.frequency.setValueAtTime(
              note.frequency,
              start +
                note.offset,
            );

            gain.gain.setValueAtTime(
              0.0001,
              start +
                note.offset,
            );

            gain.gain.exponentialRampToValueAtTime(
              note.volume,
              start +
                note.offset +
                0.015,
            );

            gain.gain.exponentialRampToValueAtTime(
              0.0001,
              start +
                note.offset +
                note.duration,
            );

            oscillator.connect(
              gain,
            );

            gain.connect(
              master,
            );

            oscillator.start(
              start +
                note.offset,
            );

            oscillator.stop(
              start +
                note.offset +
                note.duration +
                0.02,
            );
          }
        };

      if (
        context.state ===
        "running"
      ) {
        play();
        return;
      }

      if (
        context.state ===
        "suspended"
      ) {
        void context
          .resume()
          .then(play)
          .catch(() => {
            // Browser still requires user interaction.
          });
      }
    }, [ensureAudioContext]);

  const playPop =
  useCallback(() => {
    if (mutedRef.current) {
      return;
    }

    const context =
      ensureAudioContext();

    const master =
      masterGainRef.current;

    if (!master) {
      return;
    }

    const play = () => {
      if (
        mutedRef.current ||
        context.state !== "running"
      ) {
        return;
      }

      const start =
        context.currentTime + 0.01;

      const oscillator =
        context.createOscillator();

      const gain =
        context.createGain();

      oscillator.type = "sine";

      oscillator.frequency.setValueAtTime(
        380,
        start,
      );

      oscillator.frequency.exponentialRampToValueAtTime(
        170,
        start + 0.09,
      );

      gain.gain.setValueAtTime(
        0.0001,
        start,
      );

      gain.gain.exponentialRampToValueAtTime(
        0.055,
        start + 0.008,
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        start + 0.11,
      );

      oscillator.connect(gain);
      gain.connect(master);

      oscillator.start(start);
      oscillator.stop(
        start + 0.12,
      );
    };

    if (
      context.state === "running"
    ) {
      play();
      return;
    }

    if (
      context.state === "suspended"
    ) {
      void context
        .resume()
        .then(play)
        .catch(() => {
          // Browser still requires user interaction.
        });
    }
  }, [ensureAudioContext]);

  const playPigeon =
    useCallback(() => {
      if (
        mutedRef.current
      ) {
        return;
      }

      const pigeon =
        ensurePigeonAudio();

      pigeon.muted = false;
      pigeon.currentTime = 0;

      void pigeon
        .play()
        .catch((error) => {
          console.warn(
            "Private-message pigeon sound could not play:",
            error,
          );
        });
    }, [ensurePigeonAudio]);

  const playPortalSound =
  useCallback(
    (
      kind:
        PortalSoundKind =
          "room-message",
    ) => {
      if (
        kind ===
        "private-message"
      ) {
        playPigeon();
        return;
      }

      if (
        kind ===
        "chat-pop"
      ) {
        playPop();
        return;
      }

      playBeep();
    },
    [
      playBeep,
      playPigeon,
      playPop,
    ],
  );

  const value =
    useMemo(
      () => ({
        muted,
        toggleMuted,
        playPortalSound,
      }),
      [
        muted,
        toggleMuted,
        playPortalSound,
      ],
    );

  return (
    <PortalAudioContext.Provider
      value={value}
    >
      {children}
    </PortalAudioContext.Provider>
  );
}

export function usePortalAudio() {
  const value =
    useContext(
      PortalAudioContext,
    );

  if (!value) {
    throw new Error(
      "PortalAudioProvider is missing.",
    );
  }

  return value;
}
