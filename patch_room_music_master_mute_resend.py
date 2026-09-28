from pathlib import Path

path = Path(r"app/(portal)/game/components/RoomMusicPlayer.tsx")

if not path.exists():
    raise SystemExit(f"File not found: {path}")

text = path.read_text(encoding="utf-8")

replacements = [
    (
'''import type {
  CharacterMusicPayload,
  PlayableMusicTrack,
} from "@/lib/music/get-character-music";
''',
'''import type {
  CharacterMusicPayload,
  PlayableMusicTrack,
} from "@/lib/music/get-character-music";
import { usePortalAudio } from "@/components/audio/portal-audio-provider";
'''
    ),
    (
'''export default function RoomMusicPlayer({
  locationName: initialLocationName,
  locationTrack: initialLocationTrack,
  ownedTracks: initialOwnedTracks,
  preferences,
}: Props) {
  const audioRef =
''',
'''export default function RoomMusicPlayer({
  locationName: initialLocationName,
  locationTrack: initialLocationTrack,
  ownedTracks: initialOwnedTracks,
  preferences,
}: Props) {
  const {
    muted: portalMuted,
  } = usePortalAudio();

  const audioRef =
'''
    ),
    (
'''  const [muted, setMuted] =
    useState(preferences.muted);

  const [playing, setPlaying] =
''',
'''  const [muted, setMuted] =
    useState(preferences.muted);

  /*
   * Portal mute is the master switch.
   * `muted` remains the Character's own Location Music preference,
   * while `effectiveMuted` is the actual playback state.
   *
   * The two settings never overwrite each other:
   * - Portal muted + Location unmuted => silent
   * - Portal unmuted + Location muted => silent
   * - both unmuted => audible
   */
  const effectiveMuted =
    portalMuted || muted;

  const [playing, setPlaying] =
'''
    ),
    (
'''    audio.loop = true;
    audio.muted = muted;
    audio.volume = 0;
''',
'''    audio.loop = true;
    audio.muted = effectiveMuted;
    audio.volume = 0;
'''
    ),
    (
'''        fadeTo(
          muted ? 0 : volume,
        );
''',
'''        fadeTo(
          effectiveMuted ? 0 : volume,
        );
'''
    ),
    (
'''    audio.muted = muted;

    if (
      fadeTimerRef.current === null
    ) {
      audio.volume = volume;
    }
  }, [muted, volume]);
''',
'''    audio.muted = effectiveMuted;

    if (
      fadeTimerRef.current === null
    ) {
      audio.volume = volume;
    }
  }, [effectiveMuted, volume]);
'''
    ),
    (
'''          fadeTo(
            muted ? 0 : volume,
          );
''',
'''          fadeTo(
            effectiveMuted ? 0 : volume,
          );
'''
    ),
    (
'''  }, [
    needsGesture,
    activeTrack?.id,
    muted,
    volume,
  ]);
''',
'''  }, [
    needsGesture,
    activeTrack?.id,
    effectiveMuted,
    volume,
  ]);
'''
    ),
    (
'''          title={
            muted
              ? "Unmute"
              : "Mute"
          }
''',
'''          title={
            portalMuted
              ? muted
                ? "Portal audio is muted · Location Music is also muted"
                : "Portal audio is muted · Location Music will resume when Portal audio is unmuted"
              : muted
                ? "Unmute"
                : "Mute"
          }
'''
    ),
    (
'''        </button>
      </div>

      {expanded ? (
''',
'''        </button>
      </div>

      {portalMuted ? (
        <p className="border-t border-[rgb(var(--sep-colour-59432c))]/30 px-3 py-1.5 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-7d655d))]">
          Muted by the portal sound control
        </p>
      ) : null}

      {expanded ? (
'''
    ),
]

for old, new in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"Baseline mismatch: expected exactly 1 occurrence, found {count}.\n"
            f"Could not safely patch this file.\n\nSnippet:\n{old[:300]}"
        )
    text = text.replace(old, new, 1)

required = [
    'import { usePortalAudio } from "@/components/audio/portal-audio-provider";',
    'muted: portalMuted',
    'const effectiveMuted =',
    'portalMuted || muted',
    'audio.muted = effectiveMuted;',
    'effectiveMuted ? 0 : volume',
    'Muted by the portal sound control',
]

for needle in required:
    if needle not in text:
        raise SystemExit(f"Validation failed: missing {needle!r}")

if 'muted: next,' not in text:
    raise SystemExit("Validation failed: local Location Music mute persistence was disturbed.")

path.write_text(text, encoding="utf-8")
print(f"Patched successfully: {path}")
print("Portal mute is now the master override; Location Music mute remains an independent saved preference.")
