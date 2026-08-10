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
  setMuted: (
    muted: boolean,
  ) => void;
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
  const [muted, setMutedState] =
    useState(false);

  const audioContextRef =
    useRef<AudioContext | null>(
      null,
    );

  const masterGainRef =
    useRef<GainNode | null>(
      null,
    );

  const mutedRef =
    useRef(false);

  useEffect(() => {
    mutedRef.current =
      muted;
  }, [muted]);

  useEffect(() => {
    try {
      if (
        window.localStorage.getItem(
          STORAGE_KEY,
        ) === "1"
      ) {
        setMutedState(true);
      }
    } catch {
      // localStorage can be unavailable.
    }
  }, []);

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

  useEffect(() => {
    function unlockAudio() {
      const context =
        ensureAudioContext();

      if (
        context.state ===
        "suspended"
      ) {
        void context.resume();
      }
    }

    window.addEventListener(
      "pointerdown",
      unlockAudio,
      {
        capture: true,
        once: true,
      },
    );

    window.addEventListener(
      "keydown",
      unlockAudio,
      {
        capture: true,
        once: true,
      },
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
  }, [ensureAudioContext]);

  useEffect(() => {
    const master =
      masterGainRef.current;

    if (master) {
      master.gain.setValueAtTime(
        muted ? 0 : 1,
        master.context
          .currentTime,
      );
    }

    const applyMute = (
      parent: ParentNode,
    ) => {
      parent
        .querySelectorAll?.(
          "audio",
        )
        .forEach(
          (element) => {
            if (
              element instanceof
              HTMLAudioElement
            ) {
              element.muted =
                muted;
            }
          },
        );
    };

    applyMute(document);

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
                  muted;
              }

              applyMute(node);
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
  }, [muted]);

  useEffect(() => {
    function handleStorage(
      event: StorageEvent,
    ) {
      if (
        event.key ===
        STORAGE_KEY
      ) {
        setMutedState(
          event.newValue ===
          "1",
        );
      }
    }

    window.addEventListener(
      "storage",
      handleStorage,
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage,
      );
    };
  }, []);

  const setMuted =
    useCallback(
      (
        nextMuted: boolean,
      ) => {
        mutedRef.current =
          nextMuted;

        setMutedState(
          nextMuted,
        );

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

        const context =
          ensureAudioContext();

        if (
          context.state ===
          "suspended"
        ) {
          void context.resume();
        }
      },
      [ensureAudioContext],
    );

  const toggleMuted =
    useCallback(() => {
      setMuted(
        !mutedRef.current,
      );
    }, [setMuted]);

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
          ensureAudioContext();

        const master =
          masterGainRef.current;

        if (
          !master ||
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
           * Short, soft double coo for a NEW unread private message.
           * No external audio asset is required.
           */
          const coos = [
            {
              offset: 0,
              duration: 0.3,
              startFrequency:
                320,
              endFrequency:
                238,
              volume: 0.085,
            },
            {
              offset: 0.31,
              duration: 0.36,
              startFrequency:
                292,
              endFrequency:
                215,
              volume: 0.073,
            },
          ];

          for (
            const coo of
            coos
          ) {
            const oscillator =
              context.createOscillator();

            const overtone =
              context.createOscillator();

            const gain =
              context.createGain();

            const overtoneGain =
              context.createGain();

            const cooStart =
              start +
              coo.offset;

            const cooEnd =
              cooStart +
              coo.duration;

            oscillator.type =
              "sine";

            overtone.type =
              "sine";

            oscillator.frequency.setValueAtTime(
              coo.startFrequency,
              cooStart,
            );

            oscillator.frequency.exponentialRampToValueAtTime(
              coo.endFrequency,
              cooEnd,
            );

            overtone.frequency.setValueAtTime(
              coo.startFrequency *
                2.01,
              cooStart,
            );

            overtone.frequency.exponentialRampToValueAtTime(
              coo.endFrequency *
                1.96,
              cooEnd,
            );

            gain.gain.setValueAtTime(
              0.0001,
              cooStart,
            );

            gain.gain.exponentialRampToValueAtTime(
              coo.volume,
              cooStart +
                0.045,
            );

            gain.gain.exponentialRampToValueAtTime(
              coo.volume *
                0.45,
              cooStart +
                coo.duration *
                  0.6,
            );

            gain.gain.exponentialRampToValueAtTime(
              0.0001,
              cooEnd,
            );

            overtoneGain.gain.setValueAtTime(
              0.0001,
              cooStart,
            );

            overtoneGain.gain.exponentialRampToValueAtTime(
              coo.volume *
                0.14,
              cooStart +
                0.06,
            );

            overtoneGain.gain.exponentialRampToValueAtTime(
              0.0001,
              cooEnd,
            );

            oscillator.connect(
              gain,
            );

            overtone.connect(
              overtoneGain,
            );

            gain.connect(master);

            overtoneGain.connect(
              master,
            );

            oscillator.start(
              cooStart,
            );

            overtone.start(
              cooStart,
            );

            oscillator.stop(
              cooEnd + 0.02,
            );

            overtone.stop(
              cooEnd + 0.02,
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

          gain.connect(master);

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
      },
      [ensureAudioContext],
    );

  const value =
    useMemo(
      () => ({
        muted,
        setMuted,
        toggleMuted,
        playPortalSound,
      }),
      [
        muted,
        setMuted,
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
