from pathlib import Path
import subprocess
import sys

EXPECTED_HEAD = "4cb24f6"

def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly 1 match, found {count}")
    return text.replace(old, new, 1)

def main():
    head = subprocess.check_output(
        ["git", "rev-parse", "--short=7", "HEAD"],
        text=True,
    ).strip()

    if head != EXPECTED_HEAD:
        raise RuntimeError(
            f"This patch was built for {EXPECTED_HEAD}, but current HEAD is {head}. "
            "No files were changed."
        )

    files = {
        "components/codex/codex-narration-player.tsx",
        "components/codex/public-codex.tsx",
        "lib/codex/get-codex.ts",
        "app/codex-preview/[id]/page.tsx",
        "app/(portal)/admin/codex/[id]/page.tsx",
        "app/(portal)/admin/codex/page.tsx",
        "app/(portal)/admin/codex/actions.ts",
        "lib/privacy/storage-preferences.ts",
        "components/audio/portal-audio-provider.tsx",
        "components/characters/character-order-identity.tsx",
        "components/portal/game-context-panel.tsx",
        "components/portal/active-city-counter.tsx",
        "app/(portal)/game/components/RoomMessageList.tsx",
        "components/messages/message-character-meta.tsx",
        "components/forum/topic-post.tsx",
        "app/(portal)/game/components/NpcControlPanel.tsx",
    }

    changed = {}
    for file in files:
        p = Path(file)
        changed[file] = p.read_text(encoding="utf-8") if p.exists() else ""

    changed["components/codex/codex-narration-player.tsx"] = r'''"use client";

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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [localMuted, setLocalMuted] = useState(false);
  const [portalMuted, setPortalMuted] = useState(false);
  const [volume, setVolume] = useState(0.75);
  const [error, setError] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  useEffect(() => {
    const savedPortalMuted = readPreferenceStorage(PORTAL_MUTED_KEY);
    const savedCodexMuted = readPreferenceStorage(CODEX_MUTED_KEY);
    const savedVolume = readPreferenceStorage(CODEX_VOLUME_KEY);

    setPortalMuted(savedPortalMuted === "1");

    if (savedCodexMuted !== null) {
      setLocalMuted(savedCodexMuted === "1");
    }

    if (savedVolume !== null) {
      const parsed = Number(savedVolume);

      if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
        setVolume(parsed);
      }
    }

    setPreferencesLoaded(true);
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    writePreferenceStorage(CODEX_MUTED_KEY, localMuted ? "1" : "0");
  }, [localMuted, preferencesLoaded]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    writePreferenceStorage(CODEX_VOLUME_KEY, String(volume));
  }, [volume, preferencesLoaded]);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === PORTAL_MUTED_KEY) {
        setPortalMuted(event.newValue === "1");
      }

      if (event.key === CODEX_MUTED_KEY) {
        setLocalMuted(event.newValue === "1");
      }

      if (event.key === CODEX_VOLUME_KEY && event.newValue !== null) {
        const parsed = Number(event.newValue);

        if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
          setVolume(parsed);
        }
      }
    }

    function onPortalMute(event: Event) {
      const detail =
        (event as CustomEvent<{ muted?: boolean }>).detail;

      if (typeof detail?.muted === "boolean") {
        setPortalMuted(detail.muted);
      }
    }

    window.addEventListener("storage", onStorage);
    window.addEventListener(PORTAL_SOUND_EVENT, onPortalMute);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(PORTAL_SOUND_EVENT, onPortalMute);
    };
  }, []);

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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = portalMuted || localMuted;
  }, [portalMuted, localMuted]);

  const togglePlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || error) return;

    if (!audio.paused) {
      audio.pause();
      return;
    }

    try {
      await audio.play();
    } catch {
      setError(true);
      setPlaying(false);
    }
  }, [error]);

  function seek(value: number) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(value)) return;

    audio.currentTime = value;
    setCurrentTime(value);
  }

  const effectivelyMuted = portalMuted || localMuted;

  return (
    <section
      aria-label="Chapter narration"
      className="w-full sm:max-w-[700px] components_codex_codex_narration_player_section"
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => {
          setPlaying(true);
          setError(false);
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrentTime(0);
        }}
        onTimeUpdate={(event) => {
          setCurrentTime(event.currentTarget.currentTime);
        }}
        onLoadedMetadata={(event) => {
          const nextDuration = event.currentTarget.duration;
          setDuration(Number.isFinite(nextDuration) ? nextDuration : 0);
        }}
        onError={() => {
          setError(true);
          setPlaying(false);
        }}
      />

      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={() => void togglePlayback()}
          disabled={error}
          className="h-9 min-w-[74px] shrink-0 border border-[rgb(var(--sep-colour-765937))]/70 bg-[rgb(var(--sep-colour-1b140f))] px-3 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-d4b77f))] transition hover:border-[rgb(var(--sep-colour-9a7445))] hover:text-[rgb(var(--sep-colour-f0d49d))] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={playing ? "Pause chapter reading" : "Read chapter aloud"}
        >
          {playing ? "Pause" : "Read"}
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756957))]">
              Reading
            </span>

            <span className="shrink-0 text-[8px] tabular-nums text-[rgb(var(--sep-colour-776b5c))]">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={duration > 0 ? duration : 0}
            step={0.1}
            value={Math.min(currentTime, duration || 0)}
            onChange={(event) => seek(Number(event.target.value))}
            disabled={duration <= 0 || error}
            aria-label="Chapter reading progress"
            className="block h-1.5 w-full cursor-pointer accent-[rgb(var(--sep-skin-c1,var(--sep-colour-a98a60)))] disabled:cursor-not-allowed disabled:opacity-40"
          />
        </div>

        <button
          type="button"
          onClick={() => setLocalMuted((current) => !current)}
          aria-pressed={localMuted}
          aria-label={localMuted ? "Unmute Codex reading" : "Mute Codex reading"}
          title={
            portalMuted
              ? "Muted by the portal sound control"
              : localMuted
                ? "Unmute Codex reading"
                : "Mute Codex reading"
          }
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center border bg-[rgb(var(--sep-colour-15100d))] transition",
            effectivelyMuted
              ? "border-[rgb(var(--sep-colour-65443b))] text-[rgb(var(--sep-colour-a56f64))]"
              : "border-[rgb(var(--sep-colour-60482e))]/60 text-[rgb(var(--sep-colour-c6a26d))] hover:border-[rgb(var(--sep-colour-987344))] hover:text-[rgb(var(--sep-colour-ead2a5))]",
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
            onChange={(event) => setVolume(Number(event.target.value))}
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
'''

    # Public Codex
    path = "components/codex/public-codex.tsx"
    text = changed[path]
    text = replace_once(
        text,
        'import { RichTextContentClient } from "@/components/editor/rich-text-content-client";',
        'import { RichTextContentClient } from "@/components/editor/rich-text-content-client";\nimport { CodexNarrationPlayer } from "@/components/codex/codex-narration-player";',
        "PublicCodex narration import",
    )
    text = replace_once(
        text,
        '''              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-5 components_codex_public_codex_div_codex_chapter_2">
                <p className="shrink-0 text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-997446))] components_codex_public_codex_p_codex_chapter">
                  Chapter{" "}
                  {
                    ROMAN_NUMERALS[
                      selectedChapter.chapter_number -
                        1
                    ]
                  }
                </p>

                <h2 className="font-serif text-lg leading-tight text-[rgb(var(--sep-colour-ead5ac))] sm:text-3xl components_codex_public_codex_h2_codex_chapter">
                  {
                    selectedChapter.title
                  }
                </h2>
              </div>''',
        '''              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6 components_codex_public_codex_div_codex_chapter_2">
                <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-5">
                  <p className="shrink-0 text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-997446))] components_codex_public_codex_p_codex_chapter">
                    Chapter{" "}
                    {
                      ROMAN_NUMERALS[
                        selectedChapter.chapter_number -
                          1
                      ]
                    }
                  </p>

                  <h2 className="min-w-0 font-serif text-lg leading-tight text-[rgb(var(--sep-colour-ead5ac))] sm:text-3xl components_codex_public_codex_h2_codex_chapter">
                    {
                      selectedChapter.title
                    }
                  </h2>
                </div>

                {selectedChapter.read_audio_url?.trim() ? (
                  <CodexNarrationPlayer
                    key={selectedChapter.id}
                    src={selectedChapter.read_audio_url}
                  />
                ) : null}
              </div>''',
        "PublicCodex header player",
    )
    changed[path] = text

    # Public query/type
    path = "lib/codex/get-codex.ts"
    text = changed[path]
    text = replace_once(
        text,
        '''  body: string;
  sort_order: number;''',
        '''  body: string;
  sort_order: number;
  read_audio_url: string | null;''',
        "PublicCodexChapter type",
    )
    text = replace_once(
        text,
        '''          body,
          sort_order''',
        '''          body,
          sort_order,
          read_audio_url''',
        "getPublicCodexChapters select",
    )
    text = replace_once(
        text,
        '''      sort_order: chapter.sort_order ?? 0,
    }))''',
        '''      sort_order: chapter.sort_order ?? 0,
      read_audio_url:
        chapter.read_audio_url ?? null,
    }))''',
        "getPublicCodexChapters map",
    )
    changed[path] = text

    # Preview
    path = "app/codex-preview/[id]/page.tsx"
    text = changed[path]
    text = replace_once(
        text,
        '''          body,
          sort_order''',
        '''          body,
          sort_order,
          read_audio_url''',
        "Codex preview select",
    )
    text = replace_once(
        text,
        '''    sort_order:
      data.sort_order ?? 0,
  };''',
        '''    sort_order:
      data.sort_order ?? 0,
    read_audio_url:
      data.read_audio_url ?? null,
  };''',
        "Codex preview object",
    )
    changed[path] = text

    # Admin edit page
    path = "app/(portal)/admin/codex/[id]/page.tsx"
    text = changed[path]
    text = replace_once(
        text,
        '''  body: string;
  status: "draft" | "published";''',
        '''  body: string;
  read_audio_url: string | null;
  status: "draft" | "published";''',
        "Admin Codex type",
    )
    text = replace_once(
        text,
        '''          body,
          status,''',
        '''          body,
          read_audio_url,
          status,''',
        "Admin Codex select",
    )
    text = replace_once(
        text,
        '''          <section className="border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-120e0b))] p-4 sm:p-5 admin_codex_id_page_section_section_2">
            <AdminField label="Chapter body">''',
        '''          <section className="border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-120e0b))] p-4 sm:p-5">
            <AdminField label="Read audio URL">
              <input
                name="read_audio_url"
                type="url"
                placeholder="https://.../chapter-reading.mp3"
                defaultValue={chapter.read_audio_url ?? ""}
                className={inputClass}
              />
            </AdminField>

            <p className="mt-2 text-[9px] leading-5 text-[rgb(var(--sep-colour-746958))]">
              Direct browser-playable audio URL for the chapter narration.
            </p>
          </section>

          <section className="border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-120e0b))] p-4 sm:p-5 admin_codex_id_page_section_section_2">
            <AdminField label="Chapter body">''',
        "Admin Codex Read URL field",
    )
    changed[path] = text

    # Admin create page
    path = "app/(portal)/admin/codex/page.tsx"
    text = changed[path]
    text = replace_once(
        text,
        '''            </div>

            <AdminField label="Body">''',
        '''            </div>

            <AdminField label="Read audio URL">
              <input
                name="read_audio_url"
                type="url"
                placeholder="https://.../chapter-reading.mp3"
                className={inputClass}
              />
            </AdminField>

            <AdminField label="Body">''',
        "Create Codex Read URL field",
    )
    changed[path] = text

    # Admin actions
    path = "app/(portal)/admin/codex/actions.ts"
    text = changed[path]
    anchor = '''function cleanSlug(
  value: FormDataEntryValue | null,
) {
  return cleanText(value).toLowerCase();
}
'''
    helper = '''
function cleanAudioUrl(
  value: FormDataEntryValue | null,
): string | null {
  const raw = cleanText(value);

  if (!raw) {
    return null;
  }

  if (raw.startsWith("/")) {
    return raw;
  }

  let parsed: URL;

  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(
      "Read audio URL must be a valid URL.",
    );
  }

  if (
    parsed.protocol !== "https:" &&
    parsed.protocol !== "http:"
  ) {
    throw new Error(
      "Read audio URL must use http or https.",
    );
  }

  if (raw.length > 2000) {
    throw new Error(
      "Read audio URL is too long.",
    );
  }

  return raw;
}
'''
    text = replace_once(text, anchor, anchor + helper, "cleanAudioUrl helper")

    create_body = '''  const body = sanitizeRichHtml(
    cleanText(
      formData.get("body"),
    ),
  );'''
    create_body_new = create_body + '''

  const readAudioUrl =
    cleanAudioUrl(
      formData.get(
        "read_audio_url",
      ),
    );'''
    # This body pattern appears twice. Replace first only.
    if text.count(create_body) != 2:
        raise RuntimeError(f"Codex body parser expected twice, found {text.count(create_body)}")
    text = text.replace(create_body, create_body_new, 1)

    text = replace_once(
        text,
        '''        body,
        status: "draft",''',
        '''        body,
        read_audio_url:
          readAudioUrl,
        status: "draft",''',
        "create insert read_audio_url",
    )

    update_anchor = '''  const sortOrder =
    cleanInteger(
      formData.get("sort_order"),
      chapterNumber,
    );
  const body = sanitizeRichHtml(
    cleanText(
      formData.get("body"),
    ),
  );

  if (!id) {'''
    update_new = '''  const sortOrder =
    cleanInteger(
      formData.get("sort_order"),
      chapterNumber,
    );
  const body = sanitizeRichHtml(
    cleanText(
      formData.get("body"),
    ),
  );

  const readAudioUrl =
    cleanAudioUrl(
      formData.get(
        "read_audio_url",
      ),
    );

  if (!id) {'''
    text = replace_once(text, update_anchor, update_new, "update readAudioUrl")

    text = replace_once(
        text,
        '''        body,
        updated_by:
          staff.userId,''',
        '''        body,
        read_audio_url:
          readAudioUrl,
        updated_by:
          staff.userId,''',
        "update read_audio_url",
    )
    changed[path] = text

    # Storage preferences
    path = "lib/privacy/storage-preferences.ts"
    text = changed[path]
    text = replace_once(
        text,
        '''  "sepulchria-portal-sound-muted",
  "sepulchria-recent-text-colours",''',
        '''  "sepulchria-portal-sound-muted",
  "sepulchria-codex-read-muted",
  "sepulchria-codex-read-volume",
  "sepulchria-recent-text-colours",''',
        "Codex preference keys",
    )
    changed[path] = text

    # Portal audio event
    path = "components/audio/portal-audio-provider.tsx"
    text = changed[path]
    text = replace_once(
        text,
        '''const STORAGE_KEY =
  "sepulchria-portal-sound-muted";
''',
        '''const STORAGE_KEY =
  "sepulchria-portal-sound-muted";

const PORTAL_SOUND_EVENT =
  "sepulchria:portal-sound-muted-changed";
''',
        "Portal sound event const",
    )
    text = replace_once(
        text,
        '''        if (persist) {
          try {
            writePreferenceStorage(
              STORAGE_KEY,
              nextMuted
                ? "1"
                : "0",
            );
          } catch {
            // localStorage can be unavailable.
          }
        }
''',
        '''        if (persist) {
          try {
            writePreferenceStorage(
              STORAGE_KEY,
              nextMuted
                ? "1"
                : "0",
            );
          } catch {
            // localStorage can be unavailable.
          }
        }

        window.dispatchEvent(
          new CustomEvent(
            PORTAL_SOUND_EVENT,
            {
              detail: {
                muted: nextMuted,
              },
            },
          ),
        );
''',
        "Portal sound event dispatch",
    )
    changed[path] = text

    # Character Order identity
    path = "components/characters/character-order-identity.tsx"
    text = changed[path]
    text = replace_once(
        text,
        '''export function CharacterOrderIdentity({
  characterId,
  variant,
}: {
  characterId: string | null | undefined;
  variant: Variant;
}) {''',
        '''export function CharacterOrderIdentity({
  characterId,
  variant,
  isSystem,
}: {
  characterId: string | null | undefined;
  variant: Variant;
  isSystem?: boolean;
}) {''',
        "CharacterOrderIdentity props",
    )
    text = replace_once(
        text,
        '''  const [loaded, setLoaded] =
    useState(false);

  useEffect(() => {''',
        '''  const [loaded, setLoaded] =
    useState(false);

  const [refreshKey, setRefreshKey] =
    useState(0);

  useEffect(() => {
    function handleNpcOrderUpdated(
      event: Event,
    ) {
      const detail =
        (
          event as CustomEvent<{
            characterId?: string;
          }>
        ).detail;

      if (
        characterId &&
        detail?.characterId ===
          characterId
      ) {
        setRefreshKey(
          (current) =>
            current + 1,
        );
      }
    }

    window.addEventListener(
      "sepulchria:npc-order-updated",
      handleNpcOrderUpdated,
    );

    return () => {
      window.removeEventListener(
        "sepulchria:npc-order-updated",
        handleNpcOrderUpdated,
      );
    };
  }, [characterId]);

  useEffect(() => {''',
        "CharacterOrderIdentity refresh listener",
    )
    text = replace_once(
        text,
        '''      if (!relation) {
        const {
          data: npcOrderData,''',
        '''      if (
        !relation &&
        isSystem !== false
      ) {
        const {
          data: npcOrderData,''',
        "CharacterOrderIdentity NPC fallback guard",
    )
    text = replace_once(
        text,
        '''    return () => {
      cancelled = true;
    };
  }, [characterId]);''',
        '''    return () => {
      cancelled = true;
    };
  }, [
    characterId,
    isSystem,
    refreshKey,
  ]);''',
        "CharacterOrderIdentity loadOrder dependencies",
    )
    changed[path] = text

    callsite_replacements = {
        "components/portal/game-context-panel.tsx": (
            '''  <CharacterOrderIdentity
    characterId={person.id}
    variant="mini"
  />''',
            '''  <CharacterOrderIdentity
    characterId={person.id}
    variant="mini"
    isSystem={person.is_system}
  />''',
        ),
        "components/portal/active-city-counter.tsx": (
            '''                              <CharacterOrderIdentity
                                characterId={
                                  person.id
                                }
                                variant="inline"
                              />''',
            '''                              <CharacterOrderIdentity
                                characterId={
                                  person.id
                                }
                                variant="inline"
                                isSystem={
                                  person.is_system
                                }
                              />''',
        ),
        "app/(portal)/game/components/RoomMessageList.tsx": (
            '''      <CharacterOrderIdentity
        characterId={author.id}
        variant="chat"
      />''',
            '''      <CharacterOrderIdentity
        characterId={author.id}
        variant="chat"
        isSystem={isNpc}
      />''',
        ),
        "components/messages/message-character-meta.tsx": (
            '''      <CharacterOrderIdentity
        characterId={characterId}
        variant="message"
      />''',
            '''      <CharacterOrderIdentity
        characterId={characterId}
        variant="message"
        isSystem={false}
      />''',
        ),
        "components/forum/topic-post.tsx": (
            '''      <CharacterOrderIdentity
        characterId={character.id}
        variant="forum"
      />''',
            '''      <CharacterOrderIdentity
        characterId={character.id}
        variant="forum"
        isSystem={false}
      />''',
        ),
    }

    for file, (old, new) in callsite_replacements.items():
        changed[file] = replace_once(
            changed[file],
            old,
            new,
            f"{file} isSystem prop",
        )

    # NPC Order refresh dispatch
    path = "app/(portal)/game/components/NpcControlPanel.tsx"
    text = changed[path]
    text = replace_once(
        text,
        '''      if(result.ok){
        setEditorOpen(false);setCreating(false);
        await refresh();
      }''',
        '''      if(result.ok){
        if(!creating&&selected?.character_id){
          window.dispatchEvent(
            new CustomEvent(
              "sepulchria:npc-order-updated",
              {
                detail:{
                  characterId:selected.character_id,
                },
              },
            ),
          );
        }
        setEditorOpen(false);setCreating(false);
        await refresh();
      }''',
        "NPC Order refresh dispatch",
    )
    changed[path] = text

    required = {
        "components/codex/codex-narration-player.tsx": [
            '"Read"',
            '"Pause"',
            "sepulchria-codex-read-muted",
            "sepulchria-codex-read-volume",
        ],
        "components/codex/public-codex.tsx": [
            "CodexNarrationPlayer",
            "selectedChapter.read_audio_url",
        ],
        "lib/codex/get-codex.ts": [
            "read_audio_url",
        ],
        "app/(portal)/admin/codex/[id]/page.tsx": [
            'name="read_audio_url"',
        ],
        "app/(portal)/admin/codex/actions.ts": [
            "cleanAudioUrl",
            "read_audio_url:",
        ],
        "components/characters/character-order-identity.tsx": [
            "isSystem?: boolean",
            "sepulchria:npc-order-updated",
            "isSystem !== false",
        ],
    }

    for file, tokens in required.items():
        for token in tokens:
            if token not in changed[file]:
                raise RuntimeError(
                    f"Verification failed for {file}: missing {token!r}. "
                    "No files were changed."
                )

    for file, content in changed.items():
        p = Path(file)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content, encoding="utf-8")

    print("Applied Codex narration + Order identity fixes.")
    print("Now run the SQL file, then npm run build.")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"PATCH FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
