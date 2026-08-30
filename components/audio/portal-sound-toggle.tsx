"use client";

import {
  Volume2,
  VolumeX,
} from "lucide-react";

import { usePortalAudio } from "@/components/audio/portal-audio-provider";

export function PortalSoundToggle() {
  const {
    muted,
    toggleMuted,
  } = usePortalAudio();

  return (
    <button
      type="button"
      onClick={toggleMuted}
      aria-pressed={muted}
      aria-label={
        muted
          ? "Turn portal sound on"
          : "Mute all portal sound"
      }
      title={
        muted
          ? "Sound off — click to enable all portal sounds"
          : "Sound on — click to mute all portal sounds"
      }
      className={`flex h-8 w-8 items-center justify-center border transition sm:h-9 sm:w-9 2xl:h-10 2xl:w-10 ${
        muted
          ? "border-[rgb(var(--sep-colour-65443b))] bg-[rgb(var(--sep-colour-211310))] text-[rgb(var(--sep-colour-a56f64))] hover:border-[rgb(var(--sep-colour-925d51))] hover:text-[rgb(var(--sep-colour-d89586))]"
          : "border-[rgb(var(--sep-colour-614b31))] bg-[rgb(var(--sep-colour-17120f))] text-[rgb(var(--sep-colour-c69b5c))] hover:border-[rgb(var(--sep-colour-977242))] hover:text-[rgb(var(--sep-colour-efd6a3))]"
      }`}
    >
      {muted ? (
        <VolumeX className="pointer-events-none h-5 w-5" />
      ) : (
        <Volume2 className="pointer-events-none h-5 w-5" />
      )}
    </button>
  );
}
