"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFormStatus } from "react-dom";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  CHAT_MAX_LENGTH,
  PRESENCE_ACTIVE_MINUTES,
} from "@/lib/game/constants";
import {
  SpellingTextareaOverlay,
  useSpellingIssues,
} from "@/components/editor/writing-assistant";
import { ItemExchangePanel } from "./ItemExchangePanel";
import { createClient } from "@/lib/supabase/client";
import { SanctionRestrictionNotice, useSanctionCapability } from "@/components/sanctions/sanction-capability-ui";
import type {
  ActionState,
  CharacterAttributeKey,
  CharacterAttributes,
  PresentRoomCharacter,
} from "@/types/game";
import {
  activateRoomGift,
  useRoomGift,
  useRoomItem,
  sendRoomAttributeCheck,
  sendRoomDiceRoll,
  sendRoomMessage,
  leaveCurrentRoom,
} from "../actions";
import {
  startAttributeOpposedAction,
  startUnarmedAttack,
  startWeaponOpposedAttack,
} from "../opposed-actions";
import { PendingOpposedActions } from "./PendingOpposedActions";
import { PendingShapeResponses } from "./PendingShapeResponses";
import { CharacterDeathGate } from "./CharacterDeathGate";
import { WarpingPanel } from "./WarpingPanel";
import { NpcControlPanel } from "./NpcControlPanel";
import { CharacterConditionsEditor } from "@/components/characters/character-conditions-editor";
import {
  loadRoomCombatData,
  loadRoomFeats,
  loadRoomItems,
} from "../deferred-actions";

const initialState: ActionState = {
  ok: false,
  message: "",
};

const DICE_OPTIONS = [
  4,
  6,
  8,
  10,
  12,
  20,
  100,
] as const;

type CheckOption = {
  value: string;
  label: string;
  attribute: CharacterAttributeKey;
};

const CHECK_OPTIONS: CheckOption[] = [
  { value: "use_muscles", label: "Use your Muscles", attribute: "muscles" },
  { value: "use_reflexes", label: "Use your Reflexes", attribute: "reflexes" },
  { value: "use_brains", label: "Use your Brains", attribute: "brains" },
  { value: "use_shrewd", label: "Use your Shrewd", attribute: "shrewd" },
  { value: "use_presence", label: "Use your Presence", attribute: "presence_score" },

  { value: "dodge", label: "Dodge", attribute: "reflexes" },
  { value: "defend", label: "Defend", attribute: "vigor" },
  { value: "resist_vigour", label: "Resist (Physical)", attribute: "vigor" },
  { value: "resist_shrewd", label: "Resist (Shrewd)", attribute: "shrewd" },
  { value: "resist_brains", label: "Resist (Brains)", attribute: "brains" },
  { value: "resist_presence", label: "Resist (Presence)", attribute: "presence_score" },
];

const ATTRIBUTE_LABELS: Record<
  CharacterAttributeKey,
  string
> = {
  muscles: "Muscles",
  reflexes: "Reflexes",
  vigor: "Vigour",
  brains: "Brains",
  shrewd: "Shrewd",
  presence_score: "Presence",
};

type AttributeBreakdownEntry = {
  base: number | null;
  gifts: number;
  adjustedBase: number | null;
  ancestry: number;
  order: number;
  effective: number | null;
};

type ChatItem = {
  recordKind: "standard" | "unique";
  recordId: string;
  itemId: string;
  name: string;
  description: string;
  quantity: number;
  targetMode: "self" | "other" | "either";
  maxCharges: number | null;
  chargesRemaining: number | null;
  cooldownReadyAt: string | null;
  successDie?: number | null;
  successThreshold?: number | null;
  resolutionMode?: "automatic" | "fixed" | "opposed";
  counterOptions?: string[];
  successAttribute?: CharacterAttributeKey | null;
  damageDice?: string | null;
  damageType?: string | null;
  categorySlug?: string | null;
  isEquipped?: boolean;
  equippedSlot?: string | null;
  effects: {
    trigger_type: string;
    effect_mode: string;
    duration_minutes: number | null;
    muscles_modifier: number;
    reflexes_modifier: number;
    vigour_modifier: number;
    shrewd_modifier: number;
    brains_modifier: number;
    presence_modifier: number;
    health_delta: number;
    max_health_modifier: number;
    warping_affinity_modifier: number;
    warps_per_day_modifier: number;
  }[];
};

type ChatGift = {
  characterGiftId: string;
  giftId: string;
  name: string;
  description: string;
  effectMode:
    | "none"
    | "passive"
    | "temporary";
  targetMode: "self" | "other" | "either";
  damageDice: string | null;
  damageType: string | null;
  successDie: number | null;
  successThreshold: number | null;
  successAttribute: CharacterAttributeKey | null;
  durationMinutes: number | null;
  cooldownMinutes: number;
  healthDelta: number;
  maxHealthModifier: number;
  musclesModifier: number;
  reflexesModifier: number;
  vigourModifier: number;
  shrewdModifier: number;
  brainsModifier: number;
  presenceModifier: number;
  warpingAffinityModifier: number;
  warpsPerDayModifier: number;
  activeUntil: string | null;
  cooldownUntil: string | null;
};

type AttributeBreakdown = Record<
  CharacterAttributeKey,
  AttributeBreakdownEntry
>;

function formatSigned(
  value: number,
): string {
  return value >= 0
    ? `+${value}`
    : String(value);
}

export default function RoomChatForm({
  roomId,
  viewerCharacterId,
  viewerDisplayName,
  presentCharacters: initialPresentCharacters,
  canUseFate,
  exportEnabled,
  backHref,
  backLabel,
  canTakeLeave,
  headquartersManageControl,
}: {
  roomId: string;
  viewerCharacterId: string;
  viewerDisplayName: string;
  presentCharacters: PresentRoomCharacter[];
  canUseFate: boolean;
  exportEnabled: boolean;
  backHref: string | null;
  backLabel: string | null;
  canTakeLeave: boolean;
  headquartersManageControl?: ReactNode;
}) {
  const router = useRouter();

  const presenceSupabase =
    useMemo(
      () => createClient(),
      [],
    );

  const [
    presentCharacters,
    setPresentCharacters,
  ] = useState<PresentRoomCharacter[]>(
    () =>
      initialPresentCharacters.filter(
        (entry) =>
          entry.id !==
          viewerCharacterId,
      ),
  );

  useEffect(() => {
    setPresentCharacters(
      initialPresentCharacters.filter(
        (entry) =>
          entry.id !==
          viewerCharacterId,
      ),
    );
  }, [
    initialPresentCharacters,
    viewerCharacterId,
  ]);

  useEffect(() => {
    let active = true;
    let refreshTimer:
      | number
      | null = null;

    async function refreshPresentCharacters() {
      const activeSince =
        new Date(
          Date.now() -
            PRESENCE_ACTIVE_MINUTES *
              60_000,
        ).toISOString();

      const {
        data,
        error,
      } = await presenceSupabase
        .from("character_presence")
        .select(`
          character_id,
          character:characters!character_presence_character_id_fkey(
            id,
            display_name
          )
        `)
        .eq(
          "room_id",
          roomId,
        )
        .gte(
          "last_seen_at",
          activeSince,
        );

      if (
        !active ||
        error
      ) {
        if (
          active &&
          error
        ) {
          console.error(
            "Unable to refresh room presence:",
            error.message,
          );
        }

        return;
      }

      const next =
        (data ?? [])
          .map((row) => {
            const relation =
              Array.isArray(
                row.character,
              )
                ? row.character[0]
                : row.character;

            if (!relation) {
              return null;
            }

            return {
              id:
                String(
                  relation.id,
                ),
              display_name:
                String(
                  relation.display_name,
                ),
            } satisfies PresentRoomCharacter;
          })
          .filter(
            (
              entry,
            ): entry is PresentRoomCharacter =>
              entry !== null &&
              entry.id !==
                viewerCharacterId,
          );

      setPresentCharacters(
        (current) => {
          if (
            current.length ===
              next.length &&
            current.every(
              (entry, index) =>
                entry.id ===
                  next[index]?.id &&
                entry.display_name ===
                  next[index]
                    ?.display_name,
            )
          ) {
            return current;
          }

          return next;
        },
      );
    }

    function handlePresenceChanged(
      event: Event,
    ) {
      const detail =
        (
          event as CustomEvent<{
            roomId?: string;
          }>
        ).detail;

      if (
        detail?.roomId !==
        roomId
      ) {
        return;
      }

      if (refreshTimer) {
        window.clearTimeout(
          refreshTimer,
        );
      }

      refreshTimer =
        window.setTimeout(
          () => {
            refreshTimer = null;
            void refreshPresentCharacters();
          },
          80,
        );
    }

    window.addEventListener(
      "sepulchria:room-presence-changed",
      handlePresenceChanged,
    );

    return () => {
      active = false;

      if (refreshTimer) {
        window.clearTimeout(
          refreshTimer,
        );
      }

      window.removeEventListener(
        "sepulchria:room-presence-changed",
        handlePresenceChanged,
      );
    };
  }, [
    presenceSupabase,
    roomId,
    viewerCharacterId,
  ]);

  const [attributes, setAttributes] = useState<CharacterAttributes>({
    muscles: null,
    reflexes: null,
    vigor: null,
    brains: null,
    shrewd: null,
    presence_score: null,
  });

  const [attributeBreakdown, setAttributeBreakdown] =
    useState<AttributeBreakdown>({
      muscles: { base: null, gifts: 0, adjustedBase: null, ancestry: 0, order: 0, effective: null },
      reflexes: { base: null, gifts: 0, adjustedBase: null, ancestry: 0, order: 0, effective: null },
      vigor: { base: null, gifts: 0, adjustedBase: null, ancestry: 0, order: 0, effective: null },
      brains: { base: null, gifts: 0, adjustedBase: null, ancestry: 0, order: 0, effective: null },
      shrewd: { base: null, gifts: 0, adjustedBase: null, ancestry: 0, order: 0, effective: null },
      presence_score: { base: null, gifts: 0, adjustedBase: null, ancestry: 0, order: 0, effective: null },
    });

  const [gifts, setGifts] = useState<ChatGift[]>([]);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [combatDataLoaded, setCombatDataLoaded] = useState(false);
  const [itemsLoaded, setItemsLoaded] = useState(false);
  const [featsLoaded, setFeatsLoaded] = useState(false);
  const [utilityLoadingMode, setUtilityLoadingMode] =
    useState<"attributes" | "feat" | "items" | null>(null);
  const [utilityLoadError, setUtilityLoadError] = useState<string | null>(null);

  const gameChatRestriction=useSanctionCapability("game_chat");

  const exchangeSupabase =
    useMemo(
      () => createClient(),
      [],
    );

  const searchParams =
    useSearchParams();

  const [
    messageState,
    messageAction,
  ] = useActionState(
    sendRoomMessage,
    initialState,
  );

  const [diceState, diceAction] =
    useActionState(
      sendRoomDiceRoll,
      initialState,
    );

  const [checkState, checkAction] =
    useActionState(
      sendRoomAttributeCheck,
      initialState,
    );

  const [opposedAttributeState, opposedAttributeAction] =
    useActionState(
      startAttributeOpposedAction,
      initialState,
    );

  const [unarmedState, unarmedAction] =
    useActionState(
      startUnarmedAttack,
      initialState,
    );

  const [weaponState, weaponAction] =
    useActionState(
      startWeaponOpposedAttack,
      initialState,
    );

  const [giftState, giftAction] =
    useActionState(
      activateRoomGift,
      initialState,
    );

  const [
    giftUseState,
    giftUseAction,
  ] = useActionState(
    useRoomGift,
    initialState,
  );

  const [utilityMode, setUtilityMode] =
    useState<
      | "whisper"
      | "dice"
      | "attributes"
      | "feat"
      | "items"
      | "exchange"
      | "warping"
      | "conditions"
      | "npc"
      | null
    >(null);

  const requestedExchangeId =
    searchParams.get("exchange");

  useEffect(() => {
    if (!requestedExchangeId) {
      return;
    }

    let active = true;

    function clearExchangeQuery() {
      const url =
        new URL(window.location.href);

      url.searchParams.delete(
        "exchange",
      );

      window.history.replaceState(
        window.history.state,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
    }

    async function openRequestedExchange() {
      const {
        data: characterId,
        error: characterError,
      } = await exchangeSupabase.rpc(
        "my_character_id",
      );

      if (
        !active ||
        characterError ||
        !characterId
      ) {
        clearExchangeQuery();
        return;
      }

      const myCharacterId =
        String(characterId);

      const {
        data: requestedTrade,
        error: tradeError,
      } = await exchangeSupabase
        .from("item_trades")
        .select(
          "id, character_one_id, character_two_id, status",
        )
        .eq(
          "id",
          requestedExchangeId,
        )
        .eq("status", "open")
        .maybeSingle();

      if (
        !active ||
        tradeError ||
        !requestedTrade
      ) {
        clearExchangeQuery();
        return;
      }

      const isParticipant =
        requestedTrade.character_one_id ===
          myCharacterId ||
        requestedTrade.character_two_id ===
          myCharacterId;

      if (!isParticipant) {
        clearExchangeQuery();
        return;
      }

      const partnerId =
        requestedTrade.character_one_id ===
        myCharacterId
          ? requestedTrade.character_two_id
          : requestedTrade.character_one_id;

      const partnerStillHere =
        presentCharacters.some(
          (entry) =>
            entry.id === partnerId,
        );

      if (partnerStillHere) {
        setUtilityMode("exchange");
      }

      clearExchangeQuery();
    }

    void openRequestedExchange();

    return () => {
      active = false;
    };
  }, [
    exchangeSupabase,
    presentCharacters,
    requestedExchangeId,
  ]);

  const [itemState, itemAction] =
    useActionState(
      useRoomItem,
      initialState,
    );

  const regularItems = useMemo(
    () =>
      items.filter(
        (item) => item.categorySlug !== "weapon",
      ),
    [items],
  );

  const weaponItems = useMemo(
    () =>
      items.filter(
        (item) =>
          item.categorySlug === "weapon" &&
          item.isEquipped === true &&
          ["main_hand", "off_hand"].includes(
            String(item.equippedSlot ?? ""),
          ),
      ),
    [items],
  );

  const [selectedItemKey, setSelectedItemKey] =
    useState("");

  const [itemTargetId, setItemTargetId] =
    useState("");

  const selectedItem = useMemo(
    () =>
      regularItems.find(
        (item) =>
          `${item.recordKind}:${item.recordId}` ===
          selectedItemKey,
      ) ??
      regularItems[0] ??
      null,
    [regularItems, selectedItemKey],
  );

  const [selectedWeaponKey, setSelectedWeaponKey] =
    useState("");

  const [weaponTargetId, setWeaponTargetId] =
    useState("");
  const [weaponExternalTarget, setWeaponExternalTarget] =
    useState("");

  const [attributeTargetId, setAttributeTargetId] =
    useState("");
  const [attributeExternalTarget, setAttributeExternalTarget] =
    useState("");

  const [unarmedTargetId, setUnarmedTargetId] =
    useState("");
  const [unarmedExternalTarget, setUnarmedExternalTarget] =
    useState("");

  const selectedWeapon = useMemo(
    () =>
      weaponItems.find(
        (item) =>
          `${item.recordKind}:${item.recordId}` ===
          selectedWeaponKey,
      ) ??
      weaponItems[0] ??
      null,
    [weaponItems, selectedWeaponKey],
  );

  useEffect(() => {
    if (
      selectedItemKey &&
      regularItems.some(
        (item) =>
          `${item.recordKind}:${item.recordId}` ===
          selectedItemKey,
      )
    ) {
      return;
    }

    setSelectedItemKey(
      regularItems[0]
        ? `${regularItems[0].recordKind}:${regularItems[0].recordId}`
        : "",
    );
  }, [regularItems, selectedItemKey]);

  useEffect(() => {
    if (
      selectedWeaponKey &&
      weaponItems.some(
        (item) =>
          `${item.recordKind}:${item.recordId}` ===
          selectedWeaponKey,
      )
    ) {
      return;
    }

    setSelectedWeaponKey(
      weaponItems[0]
        ? `${weaponItems[0].recordKind}:${weaponItems[0].recordId}`
        : "",
    );
  }, [weaponItems, selectedWeaponKey]);

  useEffect(() => {
    setItemTargetId("");
  }, [selectedItemKey]);

  useEffect(() => {
    setWeaponTargetId("");
  }, [selectedWeaponKey]);

  useEffect(() => {
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
  ]);

  const [selectedGiftId, setSelectedGiftId] =
    useState(
      gifts[0]?.characterGiftId ?? "",
    );

  const selectedGift = useMemo(
    () =>
      gifts.find(
        (gift) =>
          gift.characterGiftId ===
          selectedGiftId,
      ) ??
      gifts[0] ??
      null,
    [gifts, selectedGiftId],
  );

  const [giftTargetId, setGiftTargetId] =
    useState("");

  useEffect(() => {
    setGiftTargetId("");
  }, [selectedGiftId]);

  const selectedGiftIsActive =
    selectedGift?.effectMode === "temporary" &&
    Boolean(selectedGift.activeUntil);

  const selectedGiftIsOnCooldown =
    selectedGift?.effectMode === "temporary" &&
    !selectedGiftIsActive &&
    Boolean(selectedGift?.cooldownUntil);

  function giftCooldownLabel(cooldownUntil: string) {
    const remainingMs = Math.max(
      0,
      Date.parse(cooldownUntil) - Date.now(),
    );

    const hours = Math.floor(
      remainingMs / (60 * 60 * 1000),
    );

    const minutes = Math.ceil(
      (remainingMs % (60 * 60 * 1000)) /
        (60 * 1000),
    );

    return `${hours ? `${hours}h ` : ""}${minutes}m`;
  }

  const [value, setValue] =
    useState("");

  const [
    whisperRecipientId,
    setWhisperRecipientId,
  ] = useState("");

  const [
  ignoredSpellingWords,
  setIgnoredSpellingWords,
] = useState<string[]>([]);

  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  const messageFormRef =
  useRef<HTMLFormElement>(null);

  const submittedMessageModeRef =
    useRef<
      "whisper" | "chat" | null
    >(null);

  const [
    textareaScrollTop,
    setTextareaScrollTop,
  ] = useState(0);

  const [textareaRows, setTextareaRows] =
    useState<1 | 2 | 3 | 4>(2);

  const textareaHeight =
    textareaRows * 20 + 16;

  const spellingIssues =
  useSpellingIssues(value);

const visibleSpellingIssues =
  spellingIssues.filter(
    (issue) =>
      !ignoredSpellingWords.includes(
        issue.word.toLocaleLowerCase(
          "en-GB",
        ),
      ),
  );

  const [
  spellingMenu,
  setSpellingMenu,
] = useState<{
  word: string;
  start: number;
  end: number;
  suggestions: string[];
  x: number;
  y: number;
} | null>(null);

  const nonceInputRef =
    useRef<HTMLInputElement>(null);

  const [messageNonce, setMessageNonce] =
    useState(
      () => crypto.randomUUID(),
    );

  const [diceNonce, setDiceNonce] =
    useState(
      () => crypto.randomUUID(),
    );

  const [checkNonce, setCheckNonce] =
    useState(
      () => crypto.randomUUID(),
    );

  const attributesComplete =
    useMemo(
      () =>
        Object.values(
          attributes,
        ).every(
          (score) =>
            Number.isInteger(score) &&
            Number(score) >= 1,
        ),
      [attributes],
    );

  useEffect(() => {
    if (
      !messageState.ok ||
      !messageState.submittedAt
    ) {
      return;
    }

    const submittedMode =
      submittedMessageModeRef.current;

    submittedMessageModeRef.current =
      null;

    // The sent text was already cleared optimistically on submit.
    // Do not clear again here: the player may already be writing
    // their next action while the previous server request finishes.
    setMessageNonce(
      crypto.randomUUID(),
    );

    if (
      submittedMode ===
      "whisper"
    ) {
      setUtilityMode(null);

      /*
       * Closing Whisper replaces its textarea with the normal chat
       * textarea. Wait for that render before restoring keyboard focus.
       */
      window.requestAnimationFrame(
        () => {
          window.requestAnimationFrame(
            () => {
              textareaRef.current?.focus();
            },
          );
        },
      );

      return;
    }

    textareaRef.current?.focus();
  }, [
    messageState.ok,
    messageState.submittedAt,
  ]);

  useEffect(() => {
    if (
      diceState.ok &&
      diceState.submittedAt
    ) {
      setDiceNonce(
        crypto.randomUUID(),
      );
    }
  }, [
    diceState.ok,
    diceState.submittedAt,
  ]);

  useEffect(() => {
    if (
      checkState.ok &&
      checkState.submittedAt
    ) {
      setCheckNonce(
        crypto.randomUUID(),
      );
    }
  }, [
    checkState.ok,
    checkState.submittedAt,
  ]);

  useEffect(() => {
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
  ]);

  function clearMessageComposerAfterSubmit() {
  const wasWhisper =
    utilityMode === "whisper";

  submittedMessageModeRef.current =
    wasWhisper
      ? "whisper"
      : "chat";

  if (wasWhisper) {
    // Close immediately on Send Action / Enter.
    setUtilityMode(null);
  }

  window.requestAnimationFrame(() => {
    setValue("");
    setWhisperRecipientId("");
    setSpellingMenu(null);
    setTextareaScrollTop(0);

    if (wasWhisper) {
      window.requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }
  });
}

  function handleMessageChange(
    nextValue: string,
  ) {
    setValue(nextValue);

    if (!whisperRecipientId) {
      return;
    }

    const recipient =
      presentCharacters.find(
        (entry) =>
          entry.id ===
          whisperRecipientId,
      );

    if (!recipient) {
      setWhisperRecipientId("");
      return;
    }

    const marker =
      `@${recipient.display_name}@`;

    if (
      !nextValue.startsWith(
        marker,
      )
    ) {
      setWhisperRecipientId("");
    }
  }

  function selectWhisperRecipient(
    characterId: string,
  ) {
    setWhisperRecipientId(
      characterId,
    );

    const withoutExistingMarker =
      value.replace(
        /^@[^@\r\n]+@\s*/,
        "",
      );

    if (!characterId) {
      setValue(
        withoutExistingMarker,
      );

      textareaRef.current?.focus();
      return;
    }

    const recipient =
      presentCharacters.find(
        (entry) =>
          entry.id === characterId,
      );

    if (!recipient) {
      return;
    }

    setValue(
      `@${recipient.display_name}@ ${
        withoutExistingMarker
      }`,
    );

    requestAnimationFrame(() => {
      const textarea =
        textareaRef.current;

      if (!textarea) {
        return;
      }

      textarea.focus();

      const position =
        textarea.value.length;

      textarea.setSelectionRange(
        position,
        position,
      );
    });
  }

  const utilityMessage =
    itemState.message ||
    giftUseState.message ||
    giftState.message ||
    checkState.message ||
    diceState.message;

  const utilityOk =
    itemState.message
      ? itemState.ok
      : giftUseState.message
        ? giftUseState.ok
      : giftState.message
        ? giftState.ok
        : checkState.message
          ? checkState.ok
          : diceState.ok;

  const hasCompleteWhisperMarker =
  /^@[^@\r\n]+@/.test(
    value,
  );

const hideMissingCharacterError =
  messageState.message ===
    "Character not at this Location" &&
  !hasCompleteWhisperMarker;

const visibleStatusMessage =
  hideMissingCharacterError
    ? utilityMessage
    : messageState.message ||
      utilityMessage;

const visibleStatusOk =
  hideMissingCharacterError
    ? utilityOk
    : messageState.message
      ? messageState.ok
      : utilityOk;

const [
  transientStatusMessage,
  setTransientStatusMessage,
] = useState<string | null>(null);

const [
  transientStatusOk,
  setTransientStatusOk,
] = useState(false);

useEffect(() => {
  if (!visibleStatusMessage) {
    setTransientStatusMessage(null);
    return;
  }

  setTransientStatusMessage(
    visibleStatusMessage,
  );

  setTransientStatusOk(
    visibleStatusOk,
  );

  const timeout =
    window.setTimeout(() => {
      setTransientStatusMessage(null);
    }, 3000);

  return () => {
    window.clearTimeout(timeout);
  };
}, [
  visibleStatusMessage,
  visibleStatusOk,
]);

 function getWordAtPosition(
  position: number,
) {
  if (!value) {
    return null;
  }

  const isWordCharacter = (
    character: string,
  ) =>
    /[\p{L}’'-]/u.test(
      character,
    );

  let start = Math.min(
    position,
    value.length,
  );

  let end = start;

  if (
    start === value.length ||
    !isWordCharacter(
      value[start] ?? "",
    )
  ) {
    start -= 1;
    end = start + 1;
  }

  if (start < 0) {
    return null;
  }

  while (
    start > 0 &&
    isWordCharacter(
      value[start - 1],
    )
  ) {
    start -= 1;
  }

  while (
    end < value.length &&
    isWordCharacter(
      value[end],
    )
  ) {
    end += 1;
  }

  const word =
    value.slice(
      start,
      end,
    );

  if (!word) {
    return null;
  }

  return {
    word,
    start,
    end,
  };
}

function handleSpellingClick(
  event: React.MouseEvent<HTMLTextAreaElement>,
) {
  const textarea =
    event.currentTarget;

  /*
   * Let the browser first put the caret
   * where the user clicked.
   */
  window.requestAnimationFrame(() => {
    const position =
      textarea.selectionStart;

    const result =
      getWordAtPosition(
        position,
      );

    if (!result) {
      setSpellingMenu(null);
      return;
    }

    const issue =
  visibleSpellingIssues.find(
        (candidate) =>
          candidate.word.localeCompare(
            result.word,
            "en-GB",
            {
              sensitivity:
                "accent",
            },
          ) === 0,
      );

    if (!issue) {
      setSpellingMenu(null);
      return;
    }

    setSpellingMenu({
      word: result.word,
      start: result.start,
      end: result.end,
      suggestions:
        issue.suggestions,
      x: Math.min(
        event.clientX,
        window.innerWidth - 230,
      ),
      y: Math.min(
        event.clientY + 16,
        window.innerHeight - 320,
      ),
    });
  });
}

function preserveWordCase(
  original: string,
  replacement: string,
) {
  if (
    original ===
    original.toUpperCase()
  ) {
    return replacement.toUpperCase();
  }

  if (
    original[0] ===
    original[0]?.toUpperCase()
  ) {
    return (
      replacement
        .charAt(0)
        .toUpperCase() +
      replacement.slice(1)
    );
  }

  return replacement;
}

function applySpellingSuggestion(
  suggestion: string,
) {
  if (!spellingMenu) {
    return;
  }

  const replacement =
    preserveWordCase(
      spellingMenu.word,
      suggestion,
    );

  const nextValue =
    value.slice(
      0,
      spellingMenu.start,
    ) +
    replacement +
    value.slice(
      spellingMenu.end,
    );

  const caretPosition =
    spellingMenu.start +
    replacement.length;

  setValue(nextValue);
  setSpellingMenu(null);

  window.requestAnimationFrame(() => {
    const textarea =
      textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.focus();

    textarea.setSelectionRange(
      caretPosition,
      caretPosition,
    );
  });
}  

function ignoreSpellingWord() {
  if (!spellingMenu) {
    return;
  }

  const word =
    spellingMenu.word.toLocaleLowerCase(
      "en-GB",
    );

  setIgnoredSpellingWords(
    (current) =>
      current.includes(word)
        ? current
        : [...current, word],
  );

  setSpellingMenu(null);

  textareaRef.current?.focus();
}

  const utilityButtonClass =
    "border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-21190f))] px-2.5 py-1.5 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-d6bb8d))] transition hover:border-[rgb(var(--sep-colour-a17a49))] hover:bg-[rgb(var(--sep-colour-2b2014))] disabled:cursor-not-allowed disabled:opacity-40";

  const utilityButtonActiveClass =
    "border border-[rgb(var(--sep-colour-a17a49))] bg-[rgb(var(--sep-colour-3a2919))] px-2.5 py-1.5 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-f0d6a7))]";


  function toggleUtility(
    mode:
      | "whisper"
      | "dice"
      | "attributes"
      | "feat"
      | "items"
      | "exchange"
      | "warping"
      | "conditions"
      | "npc",
  ) {
    if (utilityLoadingMode) return;

    if (utilityMode === mode) {
      setUtilityMode(null);
      return;
    }

    setUtilityLoadError(null);

    if (mode === "attributes" && !combatDataLoaded) {
      setUtilityLoadingMode("attributes");
      void loadRoomCombatData()
        .then((result) => {
          setAttributes(result.attributes);
          setAttributeBreakdown(result.attributeBreakdown as AttributeBreakdown);
          setItems(result.items as ChatItem[]);
          setCombatDataLoaded(true);
          setItemsLoaded(true);
          setUtilityMode("attributes");
        })
        .catch((error) => {
          setUtilityLoadError(
            error instanceof Error ? error.message : "Unable to load combat data.",
          );
        })
        .finally(() => setUtilityLoadingMode(null));
      return;
    }

    if (mode === "items" && !itemsLoaded) {
      setUtilityLoadingMode("items");
      void loadRoomItems()
        .then((result) => {
          setItems(result as ChatItem[]);
          setItemsLoaded(true);
          setUtilityMode("items");
        })
        .catch((error) => {
          setUtilityLoadError(
            error instanceof Error ? error.message : "Unable to load Items.",
          );
        })
        .finally(() => setUtilityLoadingMode(null));
      return;
    }

    if (mode === "feat" && !featsLoaded) {
      setUtilityLoadingMode("feat");
      void loadRoomFeats()
        .then((result) => {
          setGifts(result as ChatGift[]);
          setFeatsLoaded(true);
          setUtilityMode("feat");
        })
        .catch((error) => {
          setUtilityLoadError(
            error instanceof Error ? error.message : "Unable to load Feats.",
          );
        })
        .finally(() => setUtilityLoadingMode(null));
      return;
    }

    setUtilityMode(mode);
  }

  if (gameChatRestriction.blocked) {
    return (
      <div className="shrink-0 border-t border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-17110d))] p-4 sm:p-5 game_components_roomchatform_div_container">
        <SanctionRestrictionNotice
          message={gameChatRestriction.message}
        />
      </div>
    );
  }

  return (
    <div
  data-room-chat-composer
  className="shrink-0 border-t border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-17110d))] p-2 sm:px-3 sm:py-2 game_components_roomchatform_div_container_2"
>
      <PendingOpposedActions />
      <PendingShapeResponses />
      <CharacterDeathGate characterId={viewerCharacterId} />
      <div className="mb-2 flex justify-end game_components_roomchatform_div_container_3">
        
      </div>
      {utilityMode === null ? (
        <form className="game_components_roomchatform_form_message_action"
          action={messageAction}
          ref={messageFormRef}
          onSubmit={clearMessageComposerAfterSubmit}
        >
          <input className="game_components_roomchatform_input_client_nonce"
            ref={nonceInputRef}
            type="hidden"
            name="client_nonce"
            value={messageNonce ?? ""}
            readOnly
          />

          <input className="game_components_roomchatform_input_whisper_recipient_id"
            type="hidden"
            name="whisper_recipient_id"
            value=""
            readOnly
          />

          <div
            className="relative overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0f0c09))] transition focus-within:border-[rgb(var(--sep-colour-927047))] game_components_roomchatform_div_container_4"
            style={{ height: `${textareaHeight}px` }}
          >
            <textarea
              ref={textareaRef}
              name="message"
              required
              maxLength={CHAT_MAX_LENGTH}
              value={value}
              lang="en-GB"
              onClick={handleSpellingClick}
              onKeyDown={(event) => {
                if (
                  event.key !== "Enter" ||
                  event.shiftKey ||
                  event.nativeEvent.isComposing
                ) {
                  return;
                }

                event.preventDefault();

                if (!value.trim()) {
                  return;
                }

                messageFormRef.current?.requestSubmit();
              }}
              onScroll={(event) =>
                setTextareaScrollTop(
                  event.currentTarget.scrollTop,
                )
              }
              onChange={(event) =>
                setValue(event.target.value)
              }
              
              placeholder={`Speech outside brackets; actions, movement and descriptions inside < > or ( ) or [ ] or { }. Out-of-character messages must be preceded by //.${canUseFate ? " Fate actions start with ^." : ""}`}
              className="relative z-10 h-full w-full resize-none border-0 bg-transparent px-3 py-2 text-[13px] leading-5 text-[rgb(var(--sep-colour-d0bea1))] outline-none placeholder:text-[rgb(var(--sep-colour-5f574d))] game_components_roomchatform_textarea_message"
            />

            <SpellingTextareaOverlay
              text={value}
              issues={visibleSpellingIssues}
              scrollTop={textareaScrollTop}
            />
          </div>

          {spellingMenu ? (
            <div
              className="fixed z-[9999] w-[220px] border border-[rgb(var(--sep-colour-60482e))]/70 bg-[rgb(var(--sep-colour-100c09))] p-2 shadow-[0_12px_30px_rgba(var(--sep-rgb-0-0-0),0.65)] game_components_roomchatform_div_container_5"
              style={{
                left: spellingMenu.x,
                top: spellingMenu.y,
              }}
            >
              <p className="border-b border-[rgb(var(--sep-colour-59432c))]/40 px-2 pb-2 text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806c52))] game_components_roomchatform_p_text">
                Spelling
              </p>

              {spellingMenu.suggestions.length > 0 ? (
                <div className="mt-1 max-h-52 overflow-y-auto game_components_roomchatform_div_container_6">
                  {spellingMenu.suggestions.map(
                    (suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          applySpellingSuggestion(
                            suggestion,
                          );
                        }}
                        className="block w-full px-2 py-1.5 text-left text-xs text-[rgb(var(--sep-colour-cdb894))] transition hover:bg-[rgb(var(--sep-colour-2a1d12))] hover:text-[rgb(var(--sep-colour-f0d3a2))] game_components_roomchatform_button_action"
                      >
                        {preserveWordCase(
                          spellingMenu.word,
                          suggestion,
                        )}
                      </button>
                    ),
                  )}
                </div>
              ) : (
                <p className="px-2 py-2 text-[10px] italic text-[rgb(var(--sep-colour-706557))] game_components_roomchatform_p_text_2">
                  No suggestions found.
                </p>
              )}

              <div className="mt-2 border-t border-[rgb(var(--sep-colour-60482e))]/35 pt-2 game_components_roomchatform_div_container_7">
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    ignoreSpellingWord();
                  }}
                  className="w-full border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-2 py-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a08c70))] transition hover:border-[rgb(var(--sep-colour-87663b))] hover:text-[rgb(var(--sep-colour-d4bb91))] game_components_roomchatform_button_ignore_once"
                >
                  Ignore once
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pb-2 md:pb-0 game_components_roomchatform_div_container_8">
            <div className="flex min-w-0 items-center gap-2 game_components_roomchatform_div_container_9">
              <label className="flex shrink-0 items-center gap-1 text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-685d50))] game_components_roomchatform_label_label">
                <span className="game_components_roomchatform_span_text">Rows</span>
                <select
                  value={textareaRows}
                  onChange={(event) =>
                    setTextareaRows(Number(event.target.value) as 1 | 2 | 3 | 4)
                  }
                  className="h-5 border border-[rgb(var(--sep-colour-5f4930))] bg-[rgb(var(--sep-colour-100c09))] px-1 text-[8px] text-[rgb(var(--sep-colour-bda77f))] outline-none game_components_roomchatform_select_textarea_rows"
                  aria-label="Textarea rows"
                >
                  {[1, 2, 3, 4].map((rows) => (
                    <option className="game_components_roomchatform_option_option" key={rows} value={rows}>{rows}</option>
                  ))}
                </select>
              </label>

              <p className="shrink-0 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-685d50))] game_components_roomchatform_p_text_3">
                {value.length.toLocaleString(
                  "en-GB",
                )}{" "}
                /{" "}
                {CHAT_MAX_LENGTH.toLocaleString(
                  "en-GB",
                )}
              </p>

              {transientStatusMessage ? (
                <p
                  aria-live="polite"
                  className={[((`min-w-0 truncate text-xs ${
                    transientStatusOk
                      ? "text-[rgb(var(--sep-colour-9bb58c))]"
                      : "text-[rgb(var(--sep-colour-d58d82))]"
                  }`)), "game_components_roomchatform_p_text_4"].filter(Boolean).join(" ")}
                  title={transientStatusMessage}
                >
                  {transientStatusMessage}
                </p>
              ) : null}
            </div>

                        <div className="relative -top-1.5 game_components_roomchatform_div_container_10">
              <SubmitButton
                disabled={!value.trim()}
                onPrepare={() => {
                  if (nonceInputRef.current) {
                    nonceInputRef.current.value =
                      messageNonce;
                  }
                }}
              />
            </div>
          </div>
        </form>
       ) : utilityMode === "npc" ? (
        <div className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] p-3 game_components_roomchatform_div_container_11">
          <UtilityPanelHeader
            title="NPC Control"
            description="Create, manage and speak as NPCs. Your staff identity is retained only for internal audit."
            onClose={() => setUtilityMode(null)}
          />
          <NpcControlPanel roomId={roomId} />
        </div>
      ) : utilityMode === "conditions" ? (
        <div className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] p-3 game_components_roomchatform_div_container_12">
          <UtilityPanelHeader
            title="Conditions"
            description="Add or remove visible Conditions. Staff may select another Character currently in this Location."
            onClose={() => setUtilityMode(null)}
          />

          <CharacterConditionsEditor
            scope="location"
            characterId={viewerCharacterId}
            characterName={viewerDisplayName}
            selectableCharacters={
              canUseFate
                ? presentCharacters
                : []
            }
          />
        </div>
      ) : utilityMode === "whisper" ? (
        <form
          action={messageAction}
          ref={messageFormRef}
          onSubmit={clearMessageComposerAfterSubmit}
          className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] p-3 game_components_roomchatform_form_message_action_2"
        >
          <UtilityPanelHeader
            title="Whisper"
            description="Send a private in-room message to another character currently present."
            onClose={() => setUtilityMode(null)}
          />

          <input className="game_components_roomchatform_input_client_nonce_2"
            ref={nonceInputRef}
            type="hidden"
            name="client_nonce"
            value={messageNonce ?? ""}
            readOnly
          />

          <input className="game_components_roomchatform_input_whisper_recipient_id_2"
            type="hidden"
            name="whisper_recipient_id"
            value={whisperRecipientId ?? ""}
            readOnly
          />

          <label className="block game_components_roomchatform_label_label_2">
            <span className="mb-1.5 block text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))] game_components_roomchatform_span_text_2">
              Whisper to
            </span>

            <select
              value={whisperRecipientId}
              onChange={(event) =>
                selectWhisperRecipient(
                  event.target.value,
                )
              }
              className="w-full border border-[rgb(var(--sep-colour-654c31))] bg-[rgb(var(--sep-colour-0f0c09))] px-3 py-2.5 text-[10px] text-[rgb(var(--sep-colour-d8c29b))] outline-none focus:border-[rgb(var(--sep-colour-a17a45))] game_components_roomchatform_select_select"
            >
              <option className="game_components_roomchatform_option_option_2" value="">
                Choose character...
              </option>
              {presentCharacters.map((entry) => (
                <option className="game_components_roomchatform_option_option_3"
                  key={entry.id}
                  value={entry.id}
                >
                  {entry.display_name}
                </option>
              ))}
            </select>
          </label>

          <div
            className="mt-3 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0f0c09))] game_components_roomchatform_div_container_13"
            style={{ height: `${textareaHeight}px` }}
          >
            <textarea
              ref={textareaRef}
              name="message"
              required
              maxLength={CHAT_MAX_LENGTH}
              value={value}
              onKeyDown={(event) => {
  if (
    event.key !== "Enter" ||
    event.shiftKey ||
    event.nativeEvent.isComposing
  ) {
    return;
  }

  event.preventDefault();

  if (
    !whisperRecipientId ||
    !value.trim()
  ) {
    return;
  }

  messageFormRef.current?.requestSubmit();
}}
              onChange={(event) =>
                handleMessageChange(
                  event.target.value,
                )
              }
              placeholder={
                whisperRecipientId
                  ? "Write your whisper..."
                  : "Choose a character first..."
              }
              className="h-full w-full resize-none border-0 bg-transparent px-4 py-3 text-sm leading-6 text-[rgb(var(--sep-colour-d0bea1))] outline-none placeholder:text-[rgb(var(--sep-colour-5f574d))] game_components_roomchatform_textarea_message_2"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 game_components_roomchatform_div_container_14">
            <p
              className={[((`text-xs ${
                messageState.ok
                  ? "text-[rgb(var(--sep-colour-9bb58c))]"
                  : "text-[rgb(var(--sep-colour-d58d82))]"
              }`)), "game_components_roomchatform_p_text_5"].filter(Boolean).join(" ")}
            >
              {messageState.message}
            </p>

            <SubmitButton
              disabled={
                !whisperRecipientId ||
                !value.trim()
              }
              onPrepare={() => {
                if (nonceInputRef.current) {
                  nonceInputRef.current.value =
                    messageNonce;
                }
              }}
            />
          </div>
        </form>
      ) : utilityMode === "dice" ? (
        <form
          action={diceAction}
          className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] p-3 game_components_roomchatform_form_dice_action"
        >
          <UtilityPanelHeader
            title="Roll Dice"
            description="Choose a die and make an authoritative room roll."
            onClose={() => setUtilityMode(null)}
          />

          <input className="game_components_roomchatform_input_client_nonce_3"
            type="hidden"
            name="client_nonce"
            value={diceNonce ?? ""}
            readOnly
          />

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end game_components_roomchatform_div_container_15">
            <label className="game_components_roomchatform_label_label_3">
              <span className="mb-1.5 block text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))] game_components_roomchatform_span_text_3">
                Die
              </span>
              <select
                name="dice_sides"
                defaultValue="20"
                className="w-full border border-[rgb(var(--sep-colour-654c31))] bg-[rgb(var(--sep-colour-0f0c09))] px-3 py-2.5 text-[10px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-d8c29b))] outline-none focus:border-[rgb(var(--sep-colour-a17a45))] game_components_roomchatform_select_dice_sides"
              >
                {DICE_OPTIONS.map((sides) => (
                  <option className="game_components_roomchatform_option_option_4"
                    key={sides}
                    value={sides}
                  >
                    d{sides}
                  </option>
                ))}
              </select>
            </label>

            <RollButton
              label="Roll Dice"
              formAction={diceAction}
              onPrepare={() => undefined}
            />
          </div>

          {diceState.message ? (
            <p
              className={[((`mt-3 text-xs ${
                diceState.ok
                  ? "text-[rgb(var(--sep-colour-9bb58c))]"
                  : "text-[rgb(var(--sep-colour-d58d82))]"
              }`)), "game_components_roomchatform_p_text_6"].filter(Boolean).join(" ")}
            >
              {diceState.message}
            </p>
          ) : null}
        </form>
      ) : utilityMode === "attributes" ? (
        <div className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] p-3 game_components_roomchatform_div_container_16">
          <UtilityPanelHeader
            title="Atk / Def / Dodge / Resist / Use Attribute"
            description="Attack or act now; if you target another Character, their valid counter decides the result. Text targets are resolved by Fate."
            onClose={() => setUtilityMode(null)}
          />

          {selectedWeapon ? (
            <form
              action={weaponAction}
              className="mb-3 border border-[rgb(var(--sep-colour-6a5032))]/45 bg-[rgb(var(--sep-colour-15100d))] p-3 game_components_roomchatform_form_weapon_action"
            >
              <p className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-9a7d55))] game_components_roomchatform_p_text_7">
                Equipped Weapon Attack
              </p>

              <div className="mt-2 grid gap-2 md:grid-cols-2 game_components_roomchatform_div_container_17">
                <label className="game_components_roomchatform_label_label_4">
                  <span className="mb-1 block text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-806b50))] game_components_roomchatform_span_text_4">
                    Weapon
                  </span>
                  <select
                    value={selectedWeaponKey}
                    onChange={(event) =>
                      setSelectedWeaponKey(event.target.value)
                    }
                    className="w-full border border-[rgb(var(--sep-colour-654c31))] bg-[rgb(var(--sep-colour-0f0c09))] px-3 py-2.5 text-[10px] text-[rgb(var(--sep-colour-d8c29b))] outline-none focus:border-[rgb(var(--sep-colour-a17a45))] game_components_roomchatform_select_select_2"
                  >
                    {weaponItems.map((item) => (
                      <option className="game_components_roomchatform_option_option_5"
                        key={`${item.recordKind}:${item.recordId}`}
                        value={`${item.recordKind}:${item.recordId}`}
                      >
                        {item.name}
                        {item.equippedSlot
                          ? ` - ${
                              item.equippedSlot === "main_hand"
                                ? "Main Hand"
                                : "Off Hand"
                            }`
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="game_components_roomchatform_label_label_5">
                  <span className="mb-1 block text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-806b50))] game_components_roomchatform_span_text_5">
                    Character target
                  </span>
                  <select
                    value={weaponTargetId}
                    onChange={(event) => {
                      setWeaponTargetId(event.target.value);
                      if (event.target.value) {
                        setWeaponExternalTarget("");
                      }
                    }}
                    className="w-full border border-[rgb(var(--sep-colour-654c31))] bg-[rgb(var(--sep-colour-0f0c09))] px-3 py-2.5 text-[10px] text-[rgb(var(--sep-colour-d8c29b))] outline-none focus:border-[rgb(var(--sep-colour-a17a45))] game_components_roomchatform_select_select_3"
                  >
                    <option className="game_components_roomchatform_option_option_6" value="">No Character target</option>
                    {presentCharacters.map((entry) => (
                      <option className="game_components_roomchatform_option_option_7" key={entry.id} value={entry.id}>
                        {entry.display_name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="mt-2 block game_components_roomchatform_label_label_6">
                <span className="mb-1 block text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-806b50))] game_components_roomchatform_span_text_6">
                  Or other target
                </span>
                <input
                  type="text"
                  value={weaponExternalTarget}
                  onChange={(event) => {
                    setWeaponExternalTarget(event.target.value);
                    if (event.target.value) {
                      setWeaponTargetId("");
                    }
                  }}
                  placeholder="door, Monster A, guard..."
                  className="w-full border border-[rgb(var(--sep-colour-654c31))] bg-[rgb(var(--sep-colour-0f0c09))] px-3 py-2.5 text-[10px] text-[rgb(var(--sep-colour-d8c29b))] outline-none focus:border-[rgb(var(--sep-colour-a17a45))] game_components_roomchatform_input_door_monster_guard"
                />
              </label>

              <div className="mt-2 flex flex-wrap gap-1.5 text-[8px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-a98b61))] game_components_roomchatform_div_container_18">
                <span className="border border-[rgb(var(--sep-colour-59432c))]/40 px-2 py-1 game_components_roomchatform_span_text_7">
                  Attack Roll{" "}
                  {selectedWeapon.successDie
                    ? `d${selectedWeapon.successDie}${
                        selectedWeapon.successAttribute
                          ? ` + ${ATTRIBUTE_LABELS[selectedWeapon.successAttribute]}`
                          : ""
                      }`
                    : "d20"}
                </span>
                <span className="border border-[rgb(var(--sep-colour-59432c))]/40 px-2 py-1 game_components_roomchatform_span_text_8">
                  Damage{" "}
                  {selectedWeapon.damageDice ?? "None"}
                  {selectedWeapon.successAttribute
                    ? ` + ${ATTRIBUTE_LABELS[selectedWeapon.successAttribute]}`
                    : ""}
                  {selectedWeapon.damageType
                    ? ` ${selectedWeapon.damageType}`
                    : ""}
                </span>
                <span className="border border-[rgb(var(--sep-colour-59432c))]/40 px-2 py-1 game_components_roomchatform_span_text_9">
                  Counter:{" "}
                  {selectedWeapon.counterOptions?.length
                    ? selectedWeapon.counterOptions
                        .map((counter) => {
                          const labels: Record<string, string> = {
                            dodge: "Dodge",
                            defend: "Defend",
                            resist_vigour: "Resist Vigour",
                            resist_shrewd: "Resist Shrewd",
                            resist_brains: "Resist Brains",
                            resist_presence: "Resist Presence",
                          };
                          return labels[counter] ?? counter;
                        })
                        .join(" / ")
                    : "None configured"}
                </span>
              </div>

              <input className="game_components_roomchatform_input_item_record_kind"
                type="hidden"
                name="item_record_kind"
                value={selectedWeapon.recordKind}
                readOnly
              />
              <input className="game_components_roomchatform_input_item_record_id"
                type="hidden"
                name="item_record_id"
                value={selectedWeapon.recordId}
                readOnly
              />
              <input className="game_components_roomchatform_input_field"
                type="hidden"
                name="opposed_target_character_id"
                value={weaponTargetId}
                readOnly
              />
              <input className="game_components_roomchatform_input_field_2"
                type="hidden"
                name="opposed_external_target"
                value={weaponExternalTarget}
                readOnly
              />

              <div className="mt-3 flex items-center justify-between gap-3 game_components_roomchatform_div_container_19">
                <p className={[((`text-xs ${weaponState.ok ? "text-[rgb(var(--sep-colour-9bb58c))]" : "text-[rgb(var(--sep-colour-d58d82))]"}`)), "game_components_roomchatform_p_text_8"].filter(Boolean).join(" ")}>
                  {weaponState.message}
                </p>
                <button
                  type="submit"
                  disabled={!weaponTargetId && !weaponExternalTarget.trim()}
                  className="border border-[rgb(var(--sep-colour-85653c))] bg-[rgb(var(--sep-colour-342617))] px-5 py-2.5 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd4a0))] transition hover:bg-[rgb(var(--sep-colour-4a351f))] disabled:cursor-not-allowed disabled:opacity-40 game_components_roomchatform_button_attack"
                >
                  Attack
                </button>
              </div>
            </form>
          ) : (
            <p className="mb-3 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2 text-[9px] text-[rgb(var(--sep-colour-817565))] game_components_roomchatform_p_text_9">
              No Weapon is equipped in Main Hand or Off Hand.
            </p>
          )}

          <div className="grid gap-3 lg:grid-cols-2 game_components_roomchatform_div_container_20">
            <form
              action={unarmedAction}
              className="border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-15100d))] p-3 game_components_roomchatform_form_unarmed_action"
            >
              <p className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-9a7d55))] game_components_roomchatform_p_text_10">
                Unarmed Attack
              </p>
              <p className="mt-1 text-[9px] text-[rgb(var(--sep-colour-817565))] game_components_roomchatform_p_text_11">
                d20 + Muscles. If Dodge / Defend is lower: 1 + Muscles Damage.
              </p>

              <select
                value={unarmedTargetId}
                onChange={(event) => {
                  setUnarmedTargetId(event.target.value);
                  if (event.target.value) {
                    setUnarmedExternalTarget("");
                  }
                }}
                className="mt-2 w-full border border-[rgb(var(--sep-colour-654c31))] bg-[rgb(var(--sep-colour-0f0c09))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-d8c29b))] game_components_roomchatform_select_select_4"
              >
                <option className="game_components_roomchatform_option_option_8" value="">No Character target</option>
                {presentCharacters.map((entry) => (
                  <option className="game_components_roomchatform_option_option_9" key={entry.id} value={entry.id}>
                    {entry.display_name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={unarmedExternalTarget}
                onChange={(event) => {
                  setUnarmedExternalTarget(event.target.value);
                  if (event.target.value) {
                    setUnarmedTargetId("");
                  }
                }}
                placeholder="Other target: door, Monster A..."
                className="mt-2 w-full border border-[rgb(var(--sep-colour-654c31))] bg-[rgb(var(--sep-colour-0f0c09))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-d8c29b))] game_components_roomchatform_input_field_3"
              />

              <input className="game_components_roomchatform_input_field_4" type="hidden" name="opposed_target_character_id" value={unarmedTargetId} readOnly />
              <input className="game_components_roomchatform_input_field_5" type="hidden" name="opposed_external_target" value={unarmedExternalTarget} readOnly />

              <button
                type="submit"
                className="mt-2 border border-[rgb(var(--sep-colour-85653c))] bg-[rgb(var(--sep-colour-342617))] px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-efd4a0))] game_components_roomchatform_button_unarmed_attack"
              >
                Unarmed Attack
              </button>

              {unarmedState.message ? (
                <p className={[((`mt-2 text-xs ${unarmedState.ok ? "text-[rgb(var(--sep-colour-9bb58c))]" : "text-[rgb(var(--sep-colour-d58d82))]"}`)), "game_components_roomchatform_p_text_12"].filter(Boolean).join(" ")}>
                  {unarmedState.message}
                </p>
              ) : null}
            </form>

            <form
              action={opposedAttributeAction}
              className="border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-15100d))] p-3 game_components_roomchatform_form_opposed_attribute_action"
            >
              <p className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-9a7d55))] game_components_roomchatform_p_text_13">
                Attribute Action
              </p>

              <select
                name="opposed_action"
                defaultValue="use_muscles"
                className="mt-2 w-full border border-[rgb(var(--sep-colour-654c31))] bg-[rgb(var(--sep-colour-0f0c09))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-d8c29b))] game_components_roomchatform_select_opposed_action"
              >
                {CHECK_OPTIONS.map((option) => (
                  <option className="game_components_roomchatform_option_option_10" key={option.value} value={option.value}>
                    {option.label} — {ATTRIBUTE_LABELS[option.attribute]}: {formatSigned(Number(attributes[option.attribute] ?? 0))}
                  </option>
                ))}
              </select>

              <select
                value={attributeTargetId}
                onChange={(event) => {
                  setAttributeTargetId(event.target.value);
                  if (event.target.value) {
                    setAttributeExternalTarget("");
                  }
                }}
                className="mt-2 w-full border border-[rgb(var(--sep-colour-654c31))] bg-[rgb(var(--sep-colour-0f0c09))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-d8c29b))] game_components_roomchatform_select_select_5"
              >
                <option className="game_components_roomchatform_option_option_11" value="">No Character target</option>
                {presentCharacters.map((entry) => (
                  <option className="game_components_roomchatform_option_option_12" key={entry.id} value={entry.id}>
                    {entry.display_name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={attributeExternalTarget}
                onChange={(event) => {
                  setAttributeExternalTarget(event.target.value);
                  if (event.target.value) {
                    setAttributeTargetId("");
                  }
                }}
                placeholder="Other target: lock, crowd, Monster A..."
                className="mt-2 w-full border border-[rgb(var(--sep-colour-654c31))] bg-[rgb(var(--sep-colour-0f0c09))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-d8c29b))] game_components_roomchatform_input_field_6"
              />

              <input className="game_components_roomchatform_input_field_7" type="hidden" name="opposed_target_character_id" value={attributeTargetId} readOnly />
              <input className="game_components_roomchatform_input_field_8" type="hidden" name="opposed_external_target" value={attributeExternalTarget} readOnly />

              <button
                type="submit"
                className="mt-2 border border-[rgb(var(--sep-colour-85653c))] bg-[rgb(var(--sep-colour-342617))] px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-efd4a0))] game_components_roomchatform_button_roll_action"
              >
                Roll Action
              </button>

              {opposedAttributeState.message ? (
                <p className={[((`mt-2 text-xs ${opposedAttributeState.ok ? "text-[rgb(var(--sep-colour-9bb58c))]" : "text-[rgb(var(--sep-colour-d58d82))]"}`)), "game_components_roomchatform_p_text_14"].filter(Boolean).join(" ")}>
                  {opposedAttributeState.message}
                </p>
              ) : null}
            </form>
          </div>
        </div>
      ) : utilityMode === "feat" ? (
        <form className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] p-3 game_components_roomchatform_form_form">
          <UtilityPanelHeader
            title="Use Feat"
            description="Choose one of your Feats and use or activate it from the room."
            onClose={() => setUtilityMode(null)}
          />

          {selectedGift ? (
            <>
              <input className="game_components_roomchatform_input_character_gift_id"
                type="hidden"
                name="character_gift_id"
                value={
                  selectedGift.characterGiftId ??
                  ""
                }
                readOnly
              />

              <input className="game_components_roomchatform_input_field_9"
                type="hidden"
                name="gift_target_character_id"
                value={giftTargetId}
                readOnly
              />

              <label className="block game_components_roomchatform_label_label_7">
                <span className="mb-1.5 block text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))] game_components_roomchatform_span_text_10">
                  Feat
                </span>
                <select
                  value={
                    selectedGift.characterGiftId
                  }
                  onChange={(event) =>
                    setSelectedGiftId(
                      event.target.value,
                    )
                  }
                  className="w-full border border-[rgb(var(--sep-colour-654c31))] bg-[rgb(var(--sep-colour-0f0c09))] px-3 py-2.5 text-[10px] text-[rgb(var(--sep-colour-d8c29b))] outline-none focus:border-[rgb(var(--sep-colour-a17a45))] game_components_roomchatform_select_select_6"
                >
                  {gifts.map((gift) => (
                    <option className="game_components_roomchatform_option_option_13"
                      key={
                        gift.characterGiftId
                      }
                      value={
                        gift.characterGiftId
                      }
                    >
                      {gift.name}
                    </option>
                  ))}
                </select>
              </label>

              {selectedGift.targetMode !== "self" ? (
                <label className="mt-3 block game_components_roomchatform_label_label_8">
                  <span className="mb-1.5 block text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))] game_components_roomchatform_span_text_11">
                    Target character
                  </span>
                  <select
                    value={giftTargetId}
                    onChange={(event) =>
                      setGiftTargetId(event.target.value)
                    }
                    className="w-full border border-[rgb(var(--sep-colour-654c31))] bg-[rgb(var(--sep-colour-0f0c09))] px-3 py-2.5 text-[10px] text-[rgb(var(--sep-colour-d8c29b))] outline-none focus:border-[rgb(var(--sep-colour-a17a45))] game_components_roomchatform_select_select_7"
                  >
                    {selectedGift.targetMode === "either" ? (
                      <option className="game_components_roomchatform_option_option_14" value="">Self</option>
                    ) : (
                      <option className="game_components_roomchatform_option_option_15" value="">Choose character...</option>
                    )}
                    {presentCharacters.map((entry) => (
                      <option className="game_components_roomchatform_option_option_16" key={entry.id} value={entry.id}>
                        {entry.display_name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div className="mt-3 border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-15100d))] p-3 game_components_roomchatform_div_container_21">
                <p className="font-serif text-base text-[rgb(var(--sep-colour-dec89f))] game_components_roomchatform_p_text_15">
                  {selectedGift.name}
                </p>
                {selectedGift.description ? (
                  <p className="mt-1 text-[10px] leading-5 text-[rgb(var(--sep-colour-817565))] game_components_roomchatform_p_text_16">
                    {
                      selectedGift.description
                    }
                  </p>
                ) : null}
                <p className="mt-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-c5a36f))] game_components_roomchatform_p_text_17">
                  Success:{" "}
                  {selectedGift.effectMode === "passive"
                    ? "No roll - Passive Feat"
                    : selectedGift.successDie
                      ? `d${selectedGift.successDie}${
                          selectedGift.successAttribute
                            ? ` + ${ATTRIBUTE_LABELS[selectedGift.successAttribute]}`
                            : ""
                        } >= ${selectedGift.successThreshold}`
                      : "Automatic"}
                </p>

                {(selectedGift.healthDelta !== 0 ||
                  selectedGift.maxHealthModifier !== 0) ? (
                  <p className="mt-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-aa8c61))] game_components_roomchatform_p_text_18">
                    {selectedGift.healthDelta !== 0
                      ? `Health ${formatSigned(selectedGift.healthDelta)}`
                      : ""}
                    {selectedGift.healthDelta !== 0 &&
                    selectedGift.maxHealthModifier !== 0
                      ? " · "
                      : ""}
                    {selectedGift.maxHealthModifier !== 0
                      ? `Max Health ${formatSigned(selectedGift.maxHealthModifier)}`
                      : ""}
                  </p>
                ) : null}

                {(selectedGift.damageDice ||
                  selectedGift.musclesModifier ||
                  selectedGift.reflexesModifier ||
                  selectedGift.vigourModifier ||
                  selectedGift.shrewdModifier ||
                  selectedGift.brainsModifier ||
                  selectedGift.presenceModifier ||
                  selectedGift.warpingAffinityModifier ||
                  selectedGift.warpsPerDayModifier) ? (
                  <p className="mt-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-aa8c61))] game_components_roomchatform_p_text_19">
                    {selectedGift.damageDice
                      ? `Damage ${selectedGift.damageDice}${selectedGift.damageType ? ` ${selectedGift.damageType}` : ""}`
                      : ""}
                    {[
                      ["Muscles", selectedGift.musclesModifier],
                      ["Reflexes", selectedGift.reflexesModifier],
                      ["Vigour", selectedGift.vigourModifier],
                      ["Shrewd", selectedGift.shrewdModifier],
                      ["Brains", selectedGift.brainsModifier],
                      ["Presence", selectedGift.presenceModifier],
                      ["Affinity", selectedGift.warpingAffinityModifier],
                      ["Shapes/day", selectedGift.warpsPerDayModifier],
                    ]
                      .filter(([, value]) => Number(value) !== 0)
                      .map(([label, value]) => `${label} ${formatSigned(Number(value))}`)
                      .join(" · ")}
                  </p>
                ) : null}

                <p className="mt-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8b7657))] game_components_roomchatform_p_text_20">
                  {selectedGift.effectMode ===
                  "passive"
                    ? "Passive effect is already active - you can show this Feat in chat"
                    : selectedGift.effectMode ===
                          "temporary" &&
                        selectedGift.activeUntil
                      ? `Active until ${new Date(
                          selectedGift.activeUntil,
                        ).toLocaleTimeString(
                          "en-GB",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}`
                      : selectedGift.effectMode ===
                          "temporary"
                        ? `Duration: ${
                            selectedGift.durationMinutes === 0
                              ? "Instantaneous"
                              : `${selectedGift.durationMinutes ?? "?"} min`
                          } · Cooldown: ${
                            selectedGift.cooldownMinutes === 0
                              ? "None"
                              : `${selectedGift.cooldownMinutes} min`
                          }`
                        : "No automatic Attribute effect"}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 game_components_roomchatform_div_container_22">
                <p
                  className={[((`text-xs ${
                    giftUseState.message
                      ? giftUseState.ok
                        ? "text-[rgb(var(--sep-colour-9bb58c))]"
                        : "text-[rgb(var(--sep-colour-d58d82))]"
                      : giftState.message
                        ? giftState.ok
                          ? "text-[rgb(var(--sep-colour-9bb58c))]"
                          : "text-[rgb(var(--sep-colour-d58d82))]"
                        : "text-[rgb(var(--sep-colour-756958))]"
                  }`)), "game_components_roomchatform_p_text_21"].filter(Boolean).join(" ")}
                >
                  {giftUseState.message ||
                    giftState.message}
                </p>

                {selectedGift.effectMode === "passive" ? (
                  <button
                    type="submit"
                    formAction={giftUseAction}
                    formNoValidate
                    className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-21190f))] px-4 py-2.5 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d6bb8d))] transition hover:border-[rgb(var(--sep-colour-a17a49))] game_components_roomchatform_button_show_feat"
                  >
                    Show Feat
                  </button>
                ) : selectedGift.effectMode ===
                "temporary" ? (
                  selectedGiftIsActive ? (
                    <button
                      type="button"
                      disabled
                      className="cursor-not-allowed border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-17120e))] px-4 py-2.5 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))] opacity-60 game_components_roomchatform_button_active"
                    >
                      Active
                    </button>
                  ) : selectedGiftIsOnCooldown &&
                    selectedGift.cooldownUntil ? (
                    <button
                      type="button"
                      disabled
                      className="cursor-not-allowed border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-17120e))] px-4 py-2.5 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))] opacity-60 game_components_roomchatform_button_cooldown"
                    >
                      Cooldown{" "}
                      {giftCooldownLabel(
                        selectedGift.cooldownUntil,
                      )}
                    </button>
                  ) : (
                    <button
                      type="submit"
                      formAction={giftAction}
                      formNoValidate
                      disabled={
                        selectedGift.targetMode === "other" &&
                        !giftTargetId
                      }
                      className="border border-[rgb(var(--sep-colour-85653c))] bg-[rgb(var(--sep-colour-342617))] px-4 py-2.5 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-efd4a0))] transition hover:bg-[rgb(var(--sep-colour-4a351f))] game_components_roomchatform_button_activate_feat"
                    >
                      Activate Feat
                    </button>
                  )
                ) : (
                  <button
                    type="submit"
                    formAction={giftUseAction}
                    formNoValidate
                    disabled={
                      selectedGift.targetMode === "other" &&
                      !giftTargetId
                    }
                    className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-21190f))] px-4 py-2.5 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d6bb8d))] transition hover:border-[rgb(var(--sep-colour-a17a49))] game_components_roomchatform_button_use_feat"
                  >
                    Use Feat
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm italic text-[rgb(var(--sep-colour-756958))] game_components_roomchatform_p_text_22">
              You have no Feats available.
            </p>
          )}
        </form>
      ) : utilityMode === "warping" ? (
        <WarpingPanel
          presentCharacters={presentCharacters}
          onBack={() => setUtilityMode(null)}
        />
      ) : utilityMode === "exchange" ? (
        <ItemExchangePanel
          presentCharacters={presentCharacters}
          onClose={() => setUtilityMode(null)}
        />
      ) : (
        <form
          action={itemAction}
          className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] p-3 game_components_roomchatform_form_item_action"
        >
          <UtilityPanelHeader
            title="Use Item"
            description="Choose a usable Item and its valid target."
            onClose={() => setUtilityMode(null)}
          />

          {selectedItem ? (
            <>
              <input className="game_components_roomchatform_input_item_record_kind_2"
                type="hidden"
                name="item_record_kind"
                value={
                  selectedItem.recordKind ??
                  ""
                }
                readOnly
              />
              <input className="game_components_roomchatform_input_item_record_id_2"
                type="hidden"
                name="item_record_id"
                value={
                  selectedItem.recordId ?? ""
                }
                readOnly
              />
              <input className="game_components_roomchatform_input_field_10"
                type="hidden"
                name="item_target_character_id"
                value={itemTargetId ?? ""}
                readOnly
              />

              <div className="grid gap-3 md:grid-cols-2 game_components_roomchatform_div_container_23">
                <label className="game_components_roomchatform_label_label_9">
                  <span className="mb-1.5 block text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))] game_components_roomchatform_span_text_12">
                    Item
                  </span>
                  <select
                    value={selectedItemKey}
                    onChange={(event) =>
                      setSelectedItemKey(
                        event.target.value,
                      )
                    }
                    className="w-full border border-[rgb(var(--sep-colour-654c31))] bg-[rgb(var(--sep-colour-0f0c09))] px-3 py-2.5 text-[10px] text-[rgb(var(--sep-colour-d8c29b))] outline-none focus:border-[rgb(var(--sep-colour-a17a45))] game_components_roomchatform_select_select_8"
                  >
                    {regularItems.map((item) => (
                      <option className="game_components_roomchatform_option_option_17"
                        key={`${item.recordKind}:${item.recordId}`}
                        value={`${item.recordKind}:${item.recordId}`}
                      >
                        {item.name}
                        {item.quantity > 1
                          ? ` ×${item.quantity}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="game_components_roomchatform_label_label_10">
                  <span className="mb-1.5 block text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))] game_components_roomchatform_span_text_13">
                    Target
                  </span>
                  <select
                    value={itemTargetId}
                    onChange={(event) =>
                      setItemTargetId(
                        event.target.value,
                      )
                    }
                    disabled={
                      selectedItem.targetMode ===
                      "self"
                    }
                    className="w-full border border-[rgb(var(--sep-colour-654c31))] bg-[rgb(var(--sep-colour-0f0c09))] px-3 py-2.5 text-[10px] text-[rgb(var(--sep-colour-d8c29b))] outline-none focus:border-[rgb(var(--sep-colour-a17a45))] disabled:opacity-55 game_components_roomchatform_select_select_9"
                  >
                    {selectedItem.targetMode !==
                    "other" ? (
                      <option className="game_components_roomchatform_option_option_18" value="">
                        Self
                      </option>
                    ) : (
                      <option className="game_components_roomchatform_option_option_19" value="">
                        Choose character...
                      </option>
                    )}

                    {selectedItem.targetMode !==
                    "self"
                      ? presentCharacters.map(
                          (entry) => (
                            <option className="game_components_roomchatform_option_option_20"
                              key={entry.id}
                              value={entry.id}
                            >
                              {
                                entry.display_name
                              }
                            </option>
                          ),
                        )
                      : null}
                  </select>
                </label>
              </div>

              <div className="mt-3 border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-15100d))] p-3 game_components_roomchatform_div_container_24">
                <p className="font-serif text-base text-[rgb(var(--sep-colour-dec89f))] game_components_roomchatform_p_text_23">
                  {selectedItem.name}
                </p>

                {selectedItem.description ? (
                  <p className="mt-1 text-[10px] leading-5 text-[rgb(var(--sep-colour-8f8271))] game_components_roomchatform_p_text_24">
                    {
                      selectedItem.description
                    }
                  </p>
                ) : null}

                <div className="mt-2 flex flex-wrap gap-2 text-[8px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-9b8768))] game_components_roomchatform_div_container_25">
                  {selectedItem.effects
                    .filter(
                      (effect) =>
                        effect.trigger_type ===
                        "use",
                    )
                    .map((effect, index) => {
                      const parts: string[] = [];

                      if (effect.health_delta) {
                        parts.push(
                          `Health ${
                            effect.health_delta >
                            0
                              ? "+"
                              : ""
                          }${
                            effect.health_delta
                          }`,
                        );
                      }

                      const mods = [
                        [
                          "Muscles",
                          effect.muscles_modifier,
                        ],
                        [
                          "Reflexes",
                          effect.reflexes_modifier,
                        ],
                        [
                          "Vigour",
                          effect.vigour_modifier,
                        ],
                        [
                          "Shrewd",
                          effect.shrewd_modifier,
                        ],
                        [
                          "Brains",
                          effect.brains_modifier,
                        ],
                        [
                          "Presence",
                          effect.presence_modifier,
                        ],
                        ["Affinity", effect.warping_affinity_modifier],
                        ["Shapes/day", effect.warps_per_day_modifier],
                      ] as const;

                      for (const [
                        label,
                        modifier,
                      ] of mods) {
                        if (modifier) {
                          parts.push(
                            `${label} ${
                              modifier > 0
                                ? "+"
                                : ""
                            }${modifier}`,
                          );
                        }
                      }

                      if (
                        effect.effect_mode ===
                          "temporary" &&
                        effect.duration_minutes
                      ) {
                        parts.push(
                          `${effect.duration_minutes} min`,
                        );
                      }

                      return (
                        <span
                          key={index}
                          className="border border-[rgb(var(--sep-colour-60482e))]/40 px-2 py-1 game_components_roomchatform_span_text_14"
                        >
                          {parts.join(" · ") ||
                            "Use effect"}
                        </span>
                      );
                    })}
                </div>

                {selectedItem.cooldownReadyAt &&
                Date.parse(
                  selectedItem.cooldownReadyAt,
                ) > Date.now() ? (
                  <p className="mt-2 text-[8px] uppercase tracking-[0.12em] text-amber-400 game_components_roomchatform_p_text_25">
                    On cooldown
                  </p>
                ) : null}

                {selectedItem.maxCharges !==
                null ? (
                  <p className="mt-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8f7c61))] game_components_roomchatform_p_text_26">
                    {selectedItem.chargesRemaining ??
                      selectedItem.maxCharges}
                    {" / "}
                    {
                      selectedItem.maxCharges
                    }{" "}
                    charges
                  </p>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 game_components_roomchatform_div_container_26">
                <p
                  aria-live="polite"
                  className={[((`text-xs ${
                    itemState.ok
                      ? "text-[rgb(var(--sep-colour-9bb58c))]"
                      : "text-[rgb(var(--sep-colour-d58d82))]"
                  }`)), "game_components_roomchatform_p_text_27"].filter(Boolean).join(" ")}
                >
                  {itemState.message}
                </p>

                <button
                  type="submit"
                  disabled={
                    Boolean(
                      selectedItem.cooldownReadyAt &&
                        Date.parse(
                          selectedItem.cooldownReadyAt,
                        ) > Date.now(),
                    ) ||
                    (selectedItem.targetMode ===
                      "other" &&
                      !itemTargetId)
                  }
                  className="border border-[rgb(var(--sep-colour-85653c))] bg-[rgb(var(--sep-colour-342617))] px-5 py-2.5 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd4a0))] transition hover:bg-[rgb(var(--sep-colour-4a351f))] disabled:cursor-not-allowed disabled:opacity-40 game_components_roomchatform_button_use_item"
                >
                  Use Item
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm italic text-[rgb(var(--sep-colour-756958))] game_components_roomchatform_p_text_28">
              You have no usable non-Weapon Items.
            </p>
          )}
        </form>
      )}
      {utilityMode === null && (utilityLoadingMode || utilityLoadError) ? (
        <p
          aria-live="polite"
          className={[((`mb-1 text-center text-[8px] ${
            utilityLoadError
              ? "text-[rgb(var(--sep-colour-d58d82))]"
              : "text-[rgb(var(--sep-colour-a98b61))]"
          }`)), "game_components_roomchatform_p_text_29"].filter(Boolean).join(" ")}
        >
          {utilityLoadError
            ? utilityLoadError
            : utilityLoadingMode === "attributes"
              ? "Loading combat data..."
              : utilityLoadingMode === "feat"
                ? "Loading Feats..."
                : "Loading Items..."}
        </p>
      ) : null}
      {utilityMode === null ? (
      <div className="-mt-8 mx-[92px] flex flex-wrap justify-center gap-1 border-0 pt-0 max-lg:mx-0 max-lg:mt-2 max-lg:border-t max-lg:border-[rgb(var(--sep-colour-59432c))]/30 max-lg:pt-2 game_components_roomchatform_div_container_27">
        {canUseFate ? (
          <button
            type="button"
            onClick={() => toggleUtility("npc")}
            className={[((utilityMode === "npc" ? utilityButtonActiveClass : utilityButtonClass)), "game_components_roomchatform_button_npcs"].filter(Boolean).join(" ")}
          >
            NPCs
          </button>
        ) : null}

        <button
  type="button"
  onClick={() =>
    toggleUtility("conditions")
  }
  className={[((utilityMode === "conditions"
      ? utilityButtonActiveClass
      : utilityButtonClass)), "game_components_roomchatform_button_conditions"].filter(Boolean).join(" ")}
>
  Conditions
</button>

<button
          type="button"
          onClick={() =>
            toggleUtility("whisper")
          }
          disabled={
            presentCharacters.length === 0
          }
          className={[((utilityMode === "whisper"
              ? utilityButtonActiveClass
              : utilityButtonClass)), "game_components_roomchatform_button_whisper"].filter(Boolean).join(" ")}
        >
          Whisper
        </button>

        <button
          type="button"
          onClick={() =>
            toggleUtility("dice")
          }
          className={[((utilityMode === "dice"
              ? utilityButtonActiveClass
              : utilityButtonClass)), "game_components_roomchatform_button_roll_dice"].filter(Boolean).join(" ")}
        >
          Roll Dice
        </button>

        <button
          type="button"
          onClick={() =>
            toggleUtility("attributes")
          }
          className={[((utilityMode === "attributes"
              ? utilityButtonActiveClass
              : utilityButtonClass)), "game_components_roomchatform_button_atk_use_attributes"].filter(Boolean).join(" ")}
        >
          ATK / Use Attributes
        </button>

        <button
          type="button"
          onClick={() =>
            toggleUtility("feat")
          }
          className={[((utilityMode === "feat"
              ? utilityButtonActiveClass
              : utilityButtonClass)), "game_components_roomchatform_button_use_feat_2"].filter(Boolean).join(" ")}
        >
          Use Feat
        </button>

        <button
          type="button"
          onClick={() => toggleUtility("warping")}
          className={[((utilityMode === "warping"
              ? utilityButtonActiveClass
              : utilityButtonClass)), "game_components_roomchatform_button_warping"].filter(Boolean).join(" ")}
        >
          Warping
        </button>

        <button
          type="button"
          onClick={() =>
            toggleUtility("items")
          }
          className={[((utilityMode === "items"
              ? utilityButtonActiveClass
              : utilityButtonClass)), "game_components_roomchatform_button_use_items"].filter(Boolean).join(" ")}
        >
          Use Items
        </button>

        <button
          type="button"
          onClick={() =>
            toggleUtility("exchange")
          }
          disabled={
            presentCharacters.length === 0
          }
          title="Item Exchange"
          className={[((utilityMode === "exchange"
              ? utilityButtonActiveClass
              : utilityButtonClass)), "game_components_roomchatform_button_item_exchange"].filter(Boolean).join(" ")}
        >
          Item Exchange
        </button>

        {headquartersManageControl}

        {exportEnabled ? (
          <Link
            href="/game/export"
            title="Download current game session"
            aria-label="Download current game session"
            className="flex h-6 w-6 items-center justify-center border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-21190f))] text-[11px] text-[rgb(var(--sep-colour-d6bb8d))] transition hover:border-[rgb(var(--sep-colour-a17a49))] hover:text-[rgb(var(--sep-colour-f0d6a7))]"
          >
            <span className="game_components_roomchatform_span_text_15" aria-hidden="true">⇩</span>
          </Link>
        ) : null}

        {backHref ? (
          <Link
            href={backHref}
            title={`Back to ${backLabel ?? "area"}`}
            aria-label={`Back to ${backLabel ?? "area"}`}
            className="flex h-6 w-6 items-center justify-center border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-21190f))] p-1"
          >
            <img src="/icons/play.png" alt="" aria-hidden="true" className="h-full w-full object-contain game_components_roomchatform_img_image" />
          </Link>
        ) : null}

        {canTakeLeave ? (
          <form className="game_components_roomchatform_form_form_2" action={leaveCurrentRoom}>
            <button
              type="submit"
              title="Take Leave"
              aria-label="Take Leave"
              className="flex h-6 w-6 items-center justify-center border border-[rgb(var(--sep-colour-8f3f36))] bg-[rgb(var(--sep-colour-351714))] text-[11px] text-[rgb(var(--sep-colour-e6a097))] transition hover:border-[rgb(var(--sep-colour-c65a4d))] hover:text-[rgb(var(--sep-colour-ffd0c9))] game_components_roomchatform_button_take_leave"
            >
              <span className="game_components_roomchatform_span_take_leave" aria-hidden="true">↪</span>
            </button>
          </form>
        ) : null}
      </div>
      ) : null}

      
    </div>
  );
}


function UtilityPanelHeader({
  title,
  description,
  onClose,
}: {
  title: string;
  description: string;
  onClose: () => void;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-3 border-b border-[rgb(var(--sep-colour-59432c))]/30 pb-3 game_components_roomchatform_div_container_28">
      <div className="game_components_roomchatform_div_container_29">
        <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] game_components_roomchatform_p_text_30">
          Chat Utility
        </p>
        <h3 className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-dec89f))] game_components_roomchatform_h3_heading">
          {title}
        </h3>
        <p className="mt-1 text-[9px] text-[rgb(var(--sep-colour-817565))] game_components_roomchatform_p_text_31">
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a08c70))] transition hover:border-[rgb(var(--sep-colour-87663b))] hover:text-[rgb(var(--sep-colour-d4bb91))] game_components_roomchatform_button_back_chat"
      >
        Back to Chat
      </button>
    </div>
  );
}

function SubmitButton({
  disabled,
  onPrepare,
}: {
  disabled: boolean;
  onPrepare: () => void;
}) {
  const { pending } =
    useFormStatus();

  return (
    <button
      type="submit"
      onClick={onPrepare}
      disabled={disabled || pending}
      className="border border-[rgb(var(--sep-colour-85653c))] bg-[rgb(var(--sep-colour-342617))] px-3 py-1.5 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-efd4a0))] transition hover:bg-[rgb(var(--sep-colour-4a351f))] disabled:cursor-not-allowed disabled:opacity-40 game_components_roomchatform_button_prepare"
    >
      {pending
        ? "Sending..."
        : "Send action"}
    </button>
  );
}

function RollButton({
  label,
  disabled = false,
  formAction,
  onPrepare,
}: {
  label: string;
  disabled?: boolean;
  formAction:
    | string
    | ((
        formData: FormData,
      ) => void | Promise<void>);
  onPrepare: () => void;
}) {
  const { pending } =
    useFormStatus();

    

  return (
    <button
      type="submit"
      onClick={onPrepare}
      formAction={formAction}
      formNoValidate
      disabled={disabled || pending}
      className="shrink-0 border border-[rgb(var(--sep-colour-85653c))] bg-[rgb(var(--sep-colour-342617))] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd4a0))] transition hover:bg-[rgb(var(--sep-colour-4a351f))] disabled:cursor-not-allowed disabled:opacity-40 game_components_roomchatform_button_prepare_2"
    >
      {pending
        ? "Rolling..."
        : label}
    </button>
  );
}
