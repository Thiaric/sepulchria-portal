from __future__ import annotations

import subprocess
from pathlib import Path

EXPECTED_HEAD = "9ccb7276461f9079c466c34831204866f33535d2"

ROOT = Path.cwd()
ROOM_CHAT = ROOT / "app/(portal)/game/components/RoomChatForm.tsx"
MECHANICAL_FEAT = ROOT / "app/(portal)/game/components/MechanicalFeatPanel.tsx"
WARPING_PANEL = ROOT / "app/(portal)/game/components/WarpingPanel.tsx"


def fail(message: str) -> None:
    raise SystemExit(f"STOP: {message}")


def exact_replace(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail(f"{label}: expected exact snippet once, found {count}. No files were changed.")
    return text.replace(old, new, 1)


head = subprocess.check_output(
    ["git", "rev-parse", "HEAD"],
    cwd=ROOT,
    text=True,
).strip()

if head != EXPECTED_HEAD:
    fail(
        "This patch was built for exact HEAD "
        f"{EXPECTED_HEAD}, but your current HEAD is {head}. "
        "No files were changed."
    )

for path in (ROOM_CHAT, MECHANICAL_FEAT, WARPING_PANEL):
    if not path.is_file():
        fail(f"Missing expected file: {path}. No files were changed.")

room = ROOM_CHAT.read_text(encoding="utf-8")
feat = MECHANICAL_FEAT.read_text(encoding="utf-8")
warp = WARPING_PANEL.read_text(encoding="utf-8")

# ---------------------------------------------------------------------------
# Validate and prepare EVERY change before writing anything.
# ---------------------------------------------------------------------------

room_new = room

room_new = exact_replace(
    room_new,
    '''import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";''',
    '''import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";''',
    "RoomChatForm React import",
)

room_new = exact_replace(
    room_new,
    '''  const [utilityLoadError, setUtilityLoadError] = useState<string | null>(null);

  const gameChatRestriction=useSanctionCapability("game_chat");''',
    '''  const [utilityLoadError, setUtilityLoadError] = useState<string | null>(null);

  const refreshRoomItems = useCallback(async () => {
    try {
      const result = await loadRoomItems();
      setItems(result as ChatItem[]);
      setItemsLoaded(true);
    } catch (error) {
      setUtilityLoadError(
        error instanceof Error
          ? error.message
          : "Unable to refresh Items.",
      );
    } finally {
      router.refresh();
    }
  }, [router]);

  const refreshRoomFeats = useCallback(async () => {
    try {
      const result = await loadRoomFeats();
      setGifts(result as ChatGift[]);
      setFeatsLoaded(true);
    } catch (error) {
      setUtilityLoadError(
        error instanceof Error
          ? error.message
          : "Unable to refresh Feats.",
      );
    } finally {
      router.refresh();
    }
  }, [router]);

  const gameChatRestriction=useSanctionCapability("game_chat");''',
    "RoomChatForm explicit Item/Feat refresh helpers",
)

room_new = exact_replace(
    room_new,
    '''  useEffect(() => {
    if (
      itemState.ok &&
      itemState.submittedAt
    ) {
      router.refresh();
    }
  }, [
    itemState.ok,
    itemState.submittedAt,
    router,
  ]);''',
    '''  useEffect(() => {
    if (
      itemState.ok &&
      itemState.submittedAt
    ) {
      void refreshRoomItems();
    }
  }, [
    itemState.ok,
    itemState.submittedAt,
    refreshRoomItems,
  ]);''',
    "RoomChatForm Item-success refresh",
)

room_new = exact_replace(
    room_new,
    '''  useEffect(() => {
    if (
      giftState.ok &&
      giftState.submittedAt
    ) {
      router.refresh();
    }
  }, [
    giftState.ok,
    giftState.submittedAt,
    router,
  ]);

  useEffect(() => {
    if (
      giftUseState.ok &&
      giftUseState.submittedAt
    ) {
      router.refresh();
    }
  }, [
    giftUseState.ok,
    giftUseState.submittedAt,
    router,
  ]);''',
    '''  useEffect(() => {
    if (
      giftState.ok &&
      giftState.submittedAt
    ) {
      void refreshRoomFeats();
    }
  }, [
    giftState.ok,
    giftState.submittedAt,
    refreshRoomFeats,
  ]);

  useEffect(() => {
    if (
      giftUseState.ok &&
      giftUseState.submittedAt
    ) {
      void refreshRoomFeats();
    }
  }, [
    giftUseState.ok,
    giftUseState.submittedAt,
    refreshRoomFeats,
  ]);''',
    "RoomChatForm legacy Feat-success refresh",
)

room_new = exact_replace(
    room_new,
    '''                  <MechanicalFeatPanel
                    gift={selectedGift}
                    viewerCharacterId={viewerCharacterId}
                    presentCharacters={ordinaryTargetCharacters}
                  />''',
    '''                  <MechanicalFeatPanel
                    gift={selectedGift}
                    viewerCharacterId={viewerCharacterId}
                    presentCharacters={ordinaryTargetCharacters}
                    onResolved={refreshRoomFeats}
                  />''',
    "RoomChatForm advanced Feat refresh callback",
)

feat_new = feat

feat_new = exact_replace(
    feat_new,
    '''export function MechanicalFeatPanel({
  gift,
  viewerCharacterId,
  presentCharacters,
}: {
  gift: Gift;
  viewerCharacterId: string;
  presentCharacters: PresentCharacter[];
}) {''',
    '''export function MechanicalFeatPanel({
  gift,
  viewerCharacterId,
  presentCharacters,
  onResolved,
}: {
  gift: Gift;
  viewerCharacterId: string;
  presentCharacters: PresentCharacter[];
  onResolved?: () => void | Promise<void>;
}) {''',
    "MechanicalFeatPanel callback prop",
)

feat_new = exact_replace(
    feat_new,
    '''  useEffect(() => {
    if (state.ok && state.submittedAt) router.refresh();
  }, [router, state.ok, state.submittedAt]);''',
    '''  useEffect(() => {
    if (!state.ok || !state.submittedAt) return;

    if (onResolved) {
      void onResolved();
      return;
    }

    router.refresh();
  }, [onResolved, router, state.ok, state.submittedAt]);''',
    "MechanicalFeatPanel successful-use refresh",
)

warp_new = warp

warp_new = exact_replace(
    warp_new,
    '''      if (s.is_dispel) {
        const de =
          dispelEffects.find(
            (e: any) =>
              e.id ===
              selectedDispelEffect,
          );

        if (de) {
          const dispelTargetName =
            dispelTarget === me.data.id
              ? "Self"
              : presentCharacters.find(c => c.id === dispelTarget)?.display_name ??
                presentCharacters.find(c => c.id === dispelTarget)?.displayName ??
                "Unknown";

          parts.push(
            `Dispels [${de.shape_name} - Level ${de.shape_level} from ${dispelTargetName}]`,
          );
        }
      }

      const castText =''',
    '''      if (s.is_dispel) {
        const de =
          dispelEffects.find(
            (e: any) =>
              e.id ===
              selectedDispelEffect,
          );

        if (de) {
          const dispelTargetName =
            dispelTarget === me.data.id
              ? "Self"
              : presentCharacters.find(c => c.id === dispelTarget)?.display_name ??
                presentCharacters.find(c => c.id === dispelTarget)?.displayName ??
                "Unknown";

          parts.push(
            `Dispels [${de.shape_name} - Level ${de.shape_level} from ${dispelTargetName}]`,
          );
        }
      }

      /*
       * Automatic/self Shape mechanics are resolved before the room message
       * is posted. Include that returned result so rolled Healing/Damage and
       * applied effects are visible in chat instead of showing only the dice
       * expression (for example "Healing [2d6]").
       */
      if (immediateResolutionMessage) {
        parts.push(
          immediateResolutionMessage,
        );
      }

      const castText =''',
    "WarpingPanel automatic Shape result in room message",
)

# Sanity checks after transformations, still before writes.
if room_new == room:
    fail("RoomChatForm produced no change.")
if feat_new == feat:
    fail("MechanicalFeatPanel produced no change.")
if warp_new == warp:
    fail("WarpingPanel produced no change.")

if "void refreshRoomItems();" not in room_new:
    fail("Item refresh helper was not wired.")
if room_new.count("void refreshRoomFeats();") != 2:
    fail("Expected exactly two legacy Feat refresh calls.")
if "onResolved={refreshRoomFeats}" not in room_new:
    fail("Advanced Feat refresh callback was not wired.")
if "if (immediateResolutionMessage)" not in warp_new:
    fail("Automatic Shape result was not added.")

# ---------------------------------------------------------------------------
# All validation succeeded. Only now write files.
# ---------------------------------------------------------------------------

ROOM_CHAT.write_text(room_new, encoding="utf-8")
MECHANICAL_FEAT.write_text(feat_new, encoding="utf-8")
WARPING_PANEL.write_text(warp_new, encoding="utf-8")

print("Patched successfully:")
print(" - app/(portal)/game/components/RoomChatForm.tsx")
print(" - app/(portal)/game/components/MechanicalFeatPanel.tsx")
print(" - app/(portal)/game/components/WarpingPanel.tsx")
print()
print("What changed:")
print(" - successful Item uses immediately reload Item quantity/charges/cooldown state")
print(" - legacy and Shape-style Feat uses immediately reload Feat active/cooldown state")
print(" - automatic/self Shapes now include the actual resolved Healing/Damage/effect result in chat")
print()
print("Now run:")
print("  npm run build")
print("  git diff --check")
print('  git diff -- "app/(portal)/game/components/RoomChatForm.tsx" "app/(portal)/game/components/MechanicalFeatPanel.tsx" "app/(portal)/game/components/WarpingPanel.tsx"')
