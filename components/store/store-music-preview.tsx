"use client";

import { useEffect, useRef, useState } from "react";

const PREVIEW_SECONDS = 10;

export function StoreMusicPreview({
  src,
  title,
}: {
  src: string;
  title: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const stop = (reset = true) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    if (reset) {
      audio.currentTime = 0;
      setElapsed(0);
    }
    setPlaying(false);
  };

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      stop();
      return;
    }

    audio.currentTime = 0;
    setElapsed(0);

    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };

  return (
    <div className="w-full border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-15100d))] p-3">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onTimeUpdate={(event) => {
          const current = event.currentTarget.currentTime;
          const bounded = Math.min(PREVIEW_SECONDS, current);
          setElapsed(bounded);

          if (current >= PREVIEW_SECONDS) {
            stop();
          }
        }}
        onEnded={() => stop()}
      />

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-756958))]">
            10 second preview
          </p>
          <p className="mt-1 truncate text-[9px] text-[rgb(var(--sep-colour-a99b89))]">
            {title}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void toggle()}
          className="shrink-0 border border-[rgb(var(--sep-colour-80613b))]/60 bg-[rgb(var(--sep-colour-21170f))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-dfc79c))] transition hover:border-[rgb(var(--sep-colour-a17a49))]"
        >
          {playing ? "Stop" : "▶ Preview"}
        </button>
      </div>

      <div className="mt-2 h-px overflow-hidden bg-[rgb(var(--sep-colour-4f3d29))]">
        <div
          className="h-full bg-[rgb(var(--sep-colour-a17a49))] transition-[width] duration-100"
          style={{
            width: `${Math.min(100, (elapsed / PREVIEW_SECONDS) * 100)}%`,
          }}
        />
      </div>
    </div>
  );
}
