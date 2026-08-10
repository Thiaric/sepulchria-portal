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
  | "private-message";

type PortalAudioContextValue = {
  muted: boolean;
  toggleMuted: () => void;
  playPortalSound: (
    kind?: PortalSoundKind,
  ) => void;
};

const STORAGE_KEY =
  "sepulchria-portal-sound-muted";

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

  const audioContextRef =
    useRef<AudioContext | null>(
      null,
    );

  const masterGainRef =
    useRef<GainNode | null>(
      null,
    );

  const getAudioContext =
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

  const applyMute =
    useCallback(
      async (
        nextMuted: boolean,
        persist = true,
      ) => {
        /*
         * The ref changes synchronously before anything else.
         * Every notification source therefore sees the new value immediately.
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

        document
          .querySelectorAll("audio")
          .forEach(
            (audio) => {
              audio.muted =
                nextMuted;
            },
          );

        const context =
          getAudioContext();

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

        if (nextMuted) {
          if (
            context.state ===
            "running"
          ) {
            try {
              await context.suspend();
            } catch {
              // Ignore browser-specific suspend failure.
            }
          }

          return;
        }

        if (
          context.state ===
          "suspended"
        ) {
          try {
            await context.resume();
          } catch {
            // A browser may still require a user gesture.
          }
        }
      },
      [getAudioContext],
    );

  useEffect(() => {
    let initialMuted =
      false;

    try {
      initialMuted =
        window.localStorage.getItem(
          STORAGE_KEY,
        ) === "1";
    } catch {
      // localStorage can be unavailable.
    }

    void applyMute(
      initialMuted,
      false,
    );
  }, [applyMute]);

  useEffect(() => {
    const unlock =
      () => {
        if (
          mutedRef.current
        ) {
          return;
        }

        const context =
          getAudioContext();

        if (
          context.state ===
          "suspended"
        ) {
          void context.resume();
        }
      };

    window.addEventListener(
      "pointerdown",
      unlock,
      true,
    );

    window.addEventListener(
      "keydown",
      unlock,
      true,
    );

    return () => {
      window.removeEventListener(
        "pointerdown",
        unlock,
        true,
      );

      window.removeEventListener(
        "keydown",
        unlock,
        true,
      );
    };
  }, [getAudioContext]);

  useEffect(() => {
    const observer =
      new MutationObserver(
        (records) => {
          for (
            const record of
            records
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

              node
                .querySelectorAll?.(
                  "audio",
                )
                .forEach(
                  (audio) => {
                    audio.muted =
                      mutedRef.current;
                  },
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

        void applyMute(
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
  }, [applyMute]);

  const toggleMuted =
    useCallback(() => {
      void applyMute(
        !mutedRef.current,
      );
    }, [applyMute]);

  const playPortalSound =
    useCallback(
      (
        kind:
          PortalSoundKind =
            "room-message",
      ) => {
        if (
          mutedRef.current
        ) {
          return;
        }

        const context =
          getAudioContext();

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

            if (
              kind ===
              "private-message"
            ) {
              /*
               * Clearly audible, short double pigeon-like coo.
               */
              const coos = [
                {
                  offset: 0,
                  duration: 0.36,
                  from: 430,
                  to: 300,
                  volume: 0.16,
                },
                {
                  offset: 0.38,
                  duration: 0.44,
                  from: 390,
                  to: 265,
                  volume: 0.14,
                },
              ];

              for (
                const coo of
                coos
              ) {
                const base =
                  context.createOscillator();

                const overtone =
                  context.createOscillator();

                const baseGain =
                  context.createGain();

                const overtoneGain =
                  context.createGain();

                const begin =
                  start +
                  coo.offset;

                const end =
                  begin +
                  coo.duration;

                base.type =
                  "sine";

                overtone.type =
                  "triangle";

                base.frequency.setValueAtTime(
                  coo.from,
                  begin,
                );

                base.frequency.exponentialRampToValueAtTime(
                  coo.to,
                  end,
                );

                overtone.frequency.setValueAtTime(
                  coo.from *
                    1.96,
                  begin,
                );

                overtone.frequency.exponentialRampToValueAtTime(
                  coo.to *
                    1.9,
                  end,
                );

                baseGain.gain.setValueAtTime(
                  0.0001,
                  begin,
                );

                baseGain.gain.exponentialRampToValueAtTime(
                  coo.volume,
                  begin + 0.045,
                );

                baseGain.gain.exponentialRampToValueAtTime(
                  coo.volume *
                    0.5,
                  begin +
                    coo.duration *
                      0.6,
                );

                baseGain.gain.exponentialRampToValueAtTime(
                  0.0001,
                  end,
                );

                overtoneGain.gain.setValueAtTime(
                  0.0001,
                  begin,
                );

                overtoneGain.gain.exponentialRampToValueAtTime(
                  coo.volume *
                    0.12,
                  begin + 0.06,
                );

                overtoneGain.gain.exponentialRampToValueAtTime(
                  0.0001,
                  end,
                );

                base.connect(
                  baseGain,
                );

                overtone.connect(
                  overtoneGain,
                );

                baseGain.connect(
                  master,
                );

                overtoneGain.connect(
                  master,
                );

                base.start(begin);
                overtone.start(
                  begin,
                );

                base.stop(
                  end + 0.02,
                );

                overtone.stop(
                  end + 0.02,
                );
              }

              return;
            }

            const notes = [
              {
                frequency:
                  523.25,
                offset: 0,
                duration: 0.09,
                volume: 0.038,
              },
              {
                frequency:
                  659.25,
                offset: 0.09,
                duration: 0.12,
                volume: 0.03,
              },
            ];

            for (
              const note of
              notes
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
              // Browser still needs a user gesture.
            });
        }
      },
      [getAudioContext],
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
