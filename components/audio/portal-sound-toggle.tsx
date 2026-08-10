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
          ? "border-[#65443b] bg-[#211310] text-[#a56f64] hover:border-[#925d51] hover:text-[#d89586]"
          : "border-[#614b31] bg-[#17120f] text-[#c69b5c] hover:border-[#977242] hover:text-[#efd6a3]"
      }`}
    >
      {muted ? (
        <VolumeX className="h-3.5 w-3.5 2xl:h-4 2xl:w-4" />
      ) : (
        <Volume2 className="h-3.5 w-3.5 2xl:h-4 2xl:w-4" />
      )}
    </button>
  );
}
