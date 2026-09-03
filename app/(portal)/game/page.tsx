import { Suspense, type CSSProperties } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  PRESENCE_ACTIVE_MINUTES,
  ROOM_HISTORY_BATCH_SIZE,
  ROOM_HISTORY_HOURS,
  ROOM_INACTIVITY_RESET_HOURS,
} from "@/lib/game/constants";
import { getStaffSession } from "@/lib/auth/require-staff";
import {
  getPrivateLocationAccess,
} from "@/lib/private-locations/access";
import {
  getOrderHeadquartersManageData,
} from "@/lib/order-headquarters/access";
import {
  OrderHeadquartersManageMenu,
} from "@/components/orders/order-headquarters-manage-menu";
import { createClient } from "@/lib/supabase/server";
import { getCharacterAttributeBreakdown } from "@/lib/characters/get-effective-character-attributes";
import type {
  PresentRoomCharacter,
  RoomMessage,
} from "@/types/game";

import RoomChatForm from "./components/RoomChatForm";
import RoomMessageList from "./components/RoomMessageList";
import RoomRealtime from "./components/RoomRealtime";
import RoomMusicPlayer from "./components/RoomMusicPlayer";
import { getCharacterMusicPayload } from "@/lib/music/get-character-music";
import { OddJobsPanel, type OddJobStateRow } from "./components/OddJobsPanel";
import {
  HouseOfChancesPanel,
  type HouseOfChancesStateRow,
} from "./components/HouseOfChancesPanel";
import {
  BreezeLodgingsPanel,
  type BreezeLodgingStateRow,
} from "./components/BreezeLodgingsPanel";
import {
  GatheringPanel,
  type GatheringStateRow,
} from "./components/GatheringPanel";
import {
  BreezeLodgingGuestsPanel,
} from "./components/BreezeLodgingGuestsPanel";
import {
  getBreezeLodgingManageData,
  getBreezeLodgingStaffOccupants,
} from "@/lib/breeze-lodgings/access";
import { leaveCurrentRoom } from "./actions";

type Props = Record<string, never>;

type Area = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

type RoomRelation = {
  id: string;
  name: string;
  slug: string;
  chat_enabled: boolean;
  description: string | null;
  image_url: string | null;
  background_image_url: string | null;
  area_id: string;
  music_track_id: string | null;
  is_outdoors: boolean;
  areas: Area | Area[] | null;
};

export default function GamePage(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center px-5 text-[rgb(var(--sep-colour-a98b61))]">
          Entering Sepulchria...
        </div>
      }
    >
      <GameContent {...props} />
    </Suspense>
  );
}

function roomAreaIsBreezeBedroom(
  room: RoomRelation,
) {
  return (
    room.slug.startsWith("breeze-gilded-") ||
    room.slug.startsWith("breeze-wayfarer-") ||
    room.slug.startsWith("breeze-hearth-")
  );
}

async function GameContent() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const {
    data: character,
    error: characterError,
  } = await supabase
    .from("characters")
    .select(
      `
        id,
        display_name,
        portrait_url,
        current_room_id,
        status,
        muscles,
        reflexes,
        vigor,
        brains,
        shrewd,
        presence_score
      `,
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (characterError) {
    throw new Error(characterError.message);
  }

  if (!character) {
    redirect("/character/create");
  }

  if (character.status !== "approved") {
    redirect(
      `/character?error=${encodeURIComponent(
        "Your character must be approved by the staff before entering the city.",
      )}`,
    );
  }

  if (!character.current_room_id) {
    return (
      <MissingLocation
        name={character.display_name}
      />
    );
  }

  const {
    data: rawRoom,
    error: roomError,
  } = await supabase
    .from("rooms")
    .select(
  "id, name, slug, chat_enabled, description, image_url, background_image_url, area_id, music_track_id, is_outdoors, areas(id,name,slug,description)",
)
    .eq(
      "id",
      character.current_room_id,
    )
    .maybeSingle();

  if (roomError) {
    throw new Error(roomError.message);
  }

  if (!rawRoom) {
    return (
      <MissingLocation
        name={character.display_name}
      />
    );
  }

  const room = rawRoom as RoomRelation;

  const privateAccess =
    await getPrivateLocationAccess(
      room.id,
      character.id,
    );

  const ownedLocationAtmosphereUrl =
    privateAccess.metadata
      ? room.background_image_url
      : null;

  if (
    privateAccess.isPrivate &&
    !privateAccess.allowed
  ) {
    return (
      <div
        className="h-full min-h-[60vh] bg-[rgb(var(--sep-colour-0d0b0a))]"
        aria-label="Unavailable location"
      />
    );
  }

  const music =
    await getCharacterMusicPayload(
      character.id,
      room.music_track_id,
    );

  const activeSince = new Date(
    Date.now() -
      PRESENCE_ACTIVE_MINUTES *
        60_000,
  ).toISOString();

  const attributeBreakdownPromise =
    getCharacterAttributeBreakdown(
      character.id,
      {
        muscles: character.muscles,
        reflexes: character.reflexes,
        vigor: character.vigor,
        brains: character.brains,
        shrewd: character.shrewd,
        presence_score:
          character.presence_score,
      },
    );

  const ownedGiftRowsPromise =
    supabase
      .from("character_gifts")
      .select(`
        id,
        gift:gifts(
          id,
          name,
          description,
          is_active,
          effect_mode,
          target_mode,
          damage_dice,
          damage_type,
          success_die,
          success_threshold,
          success_attribute,
          duration_minutes,
          cooldown_minutes,
          health_delta,
          max_health_modifier,
          muscles_modifier,
          reflexes_modifier,
          vigour_modifier,
          shrewd_modifier,
          brains_modifier,
          presence_modifier,
          warping_affinity_modifier,
          warps_per_day_modifier
        ),
        activations:gift_activations(
          activated_at,
          expires_at,
          ended_at,
          health_reverted_at
        )
      `)
      .eq(
        "character_id",
        character.id,
      );

  const rawInventoryRowsPromise =
    supabase.rpc(
      "get_public_character_inventory",
      {
        p_character_id:
          character.id,
      },
    );

  const latestMessagePromise =
    supabase
      .from("room_messages")
      .select("created_at")
      .eq("room_id", room.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  const presentResultPromise =
    supabase
      .from("character_presence")
      .select(`
        character_id,
        character:characters!character_presence_character_id_fkey(
          id,
          display_name
        )
      `)
      .eq("room_id", room.id)
      .gte(
        "last_seen_at",
        activeSince,
      );

  const staffSessionPromise =
    getStaffSession();

  const headquartersManageDataPromise =
    getOrderHeadquartersManageData(
      room.id,
      character.id,
    );

  const gatheringPromise =
    supabase.rpc(
      "get_my_gathering_state",
    );

  const oddJobsPromise =
    room.slug === "odd-jobs-bureau"
      ? supabase.rpc(
          "get_my_odd_jobs_state",
        )
      : Promise.resolve({
          data: [],
          error: null,
        });

  const houseOfChancesPromise =
    room.slug === "house-of-chances"
      ? supabase.rpc(
          "get_my_house_of_chances_state",
        )
      : Promise.resolve({
          data: [],
          error: null,
        });

  const breezeLodgingsPromise =
    room.slug === "the-breeze-lodgings"
      ? supabase.rpc(
          "get_my_breeze_lodgings_state",
        )
      : Promise.resolve({
          data: [],
          error: null,
        });

  const breezeManageDataPromise =
    roomAreaIsBreezeBedroom(room)
      ? getBreezeLodgingManageData(
          room.id,
          character.id,
        )
      : Promise.resolve(null);

  const breezeStaffOccupantsPromise =
    room.slug ===
    "the-breeze-lodgings"
      ? getBreezeLodgingStaffOccupants()
      : Promise.resolve([]);

  const [
    attributeBreakdown,
    ownedGiftResult,
    rawInventoryResult,
    latestMessageResult,
    presentResult,
    staffSession,
    headquartersManageData,
    gatheringResult,
    oddJobsResult,
    houseOfChancesResult,
    breezeLodgingsResult,
    breezeManageData,
    breezeStaffOccupants,
  ] = await Promise.all([
    attributeBreakdownPromise,
    ownedGiftRowsPromise,
    rawInventoryRowsPromise,
    latestMessagePromise,
    presentResultPromise,
    staffSessionPromise,
    headquartersManageDataPromise,
    gatheringPromise,
    oddJobsPromise,
    houseOfChancesPromise,
    breezeLodgingsPromise,
    breezeManageDataPromise,
    breezeStaffOccupantsPromise,
  ]);

  const {
    data: ownedGiftRows,
    error: ownedGiftError,
  } = ownedGiftResult;

  const {
    data: rawInventoryRows,
    error: chatInventoryError,
  } = rawInventoryResult;

  const {
    data: latestMessage,
    error: latestMessageError,
  } = latestMessageResult;

  if (ownedGiftError) {
    throw new Error(
      `Unable to load character Feats: ${ownedGiftError.message}`,
    );
  }

  const giftNow = Date.now();

  const chatGifts = (ownedGiftRows ?? [])
    .map((ownership) => {
      const relation = ownership.gift ?? null;
      const gift = Array.isArray(relation)
        ? relation[0] ?? null
        : relation;

      if (!gift || !gift.is_active) {
        return null;
      }

      const activations =
        ownership.activations ?? [];

      const activeActivation =
        activations.find(
          (activation) =>
            activation.ended_at === null &&
            Date.parse(activation.activated_at) <= giftNow &&
            Date.parse(activation.expires_at) > giftNow,
        ) ?? null;

      const latestActivation =
        [...activations]
          .sort(
            (a, b) =>
              Date.parse(b.activated_at) -
              Date.parse(a.activated_at),
          )[0] ?? null;

      const cooldownUntil =
        gift.effect_mode === "temporary" &&
        latestActivation
          ? new Date(
              Date.parse(
                latestActivation.activated_at,
              ) +
                (gift.cooldown_minutes ?? 0) *
                  60 *
                  1000,
            ).toISOString()
          : null;

      return {
        characterGiftId: ownership.id,
        giftId: gift.id,
        name: gift.name,
        description: gift.description ?? "",
        effectMode: gift.effect_mode as
          | "none"
          | "passive"
          | "temporary",
        targetMode:
          (gift.target_mode ?? "self") as
            | "self"
            | "other"
            | "either",
        damageDice: gift.damage_dice ?? null,
        damageType: gift.damage_type ?? null,
        successDie: gift.success_die ?? null,
        successThreshold: gift.success_threshold ?? null,
        successAttribute:
          (gift.success_attribute ?? null) as
            | "muscles"
            | "reflexes"
            | "vigor"
            | "brains"
            | "shrewd"
            | "presence_score"
            | null,
        durationMinutes: gift.duration_minutes,
        cooldownMinutes:
          gift.cooldown_minutes ?? 0,
        healthDelta:
          gift.health_delta ?? 0,
        maxHealthModifier:
          gift.max_health_modifier ?? 0,
        musclesModifier: gift.muscles_modifier ?? 0,
        reflexesModifier: gift.reflexes_modifier ?? 0,
        vigourModifier: gift.vigour_modifier ?? 0,
        shrewdModifier: gift.shrewd_modifier ?? 0,
        brainsModifier: gift.brains_modifier ?? 0,
        presenceModifier: gift.presence_modifier ?? 0,
        warpingAffinityModifier: gift.warping_affinity_modifier ?? 0,
        warpsPerDayModifier: gift.warps_per_day_modifier ?? 0,
        activeUntil:
          activeActivation?.expires_at ?? null,
        cooldownUntil:
          cooldownUntil &&
          Date.parse(cooldownUntil) > giftNow
            ? cooldownUntil
            : null,
      };
    })
    .filter(
      (
        gift,
      ): gift is NonNullable<typeof gift> =>
        gift !== null,
    );

  if (chatInventoryError) {
    throw new Error(
      `Unable to load usable Items for chat: ${chatInventoryError.message}`,
    );
  }

  const chatInventoryRows =
    (rawInventoryRows ?? []) as {
      record_kind: "standard" | "unique";
      record_id: string;
      item_id: string;
      name: string;
      quantity: number;
      is_usable: boolean;
      is_equipped: boolean;
      equipped_slot: string | null;
    }[];

  /*
   * Chat needs:
   * - ordinary usable Items; and
   * - equipped Main Hand / Off Hand Weapons.
   *
   * Weapons do not need the generic is_usable flag in order to attack.
   * The weapon resolver validates the equipped slot, Weapon category and
   * Opposed configuration separately.
   */
  const chatCandidateRows =
    chatInventoryRows.filter(
      (row) =>
        row.is_usable ||
        (
          row.is_equipped &&
          ["main_hand", "off_hand"].includes(
            String(
              row.equipped_slot ?? "",
            ),
          )
        ),
    );

  const chatCandidateItemIds = [
    ...new Set(
      chatCandidateRows.map(
        (row) => row.item_id,
      ),
    ),
  ];

  const [
    usableMastersResult,
    uniqueChargesResult,
    itemCooldownsResult,
  ] = await Promise.all([
    chatCandidateItemIds.length
      ? supabase
          .from("items")
          .select(`
            id,
            name,
            description,
            target_mode,
            max_charges,
            success_die,
            success_threshold,
            resolution_mode,
            counter_options,
            success_attribute,
            damage_dice,
            damage_type,
            cooldown_minutes,
            teaches_recipe_id,
            category:item_categories(slug),
            effects:item_effects(
              trigger_type,
              effect_mode,
              duration_minutes,
              muscles_modifier,
              reflexes_modifier,
              vigour_modifier,
              shrewd_modifier,
              brains_modifier,
              presence_modifier,
              health_delta,
              max_health_modifier,
              warping_affinity_modifier,
              warps_per_day_modifier
            )
          `)
          .in(
            "id",
            chatCandidateItemIds,
          )
      : Promise.resolve({ data: [], error: null }),

    supabase
      .from("character_item_instances")
      .select("id, charges_remaining")
      .eq("owner_character_id", character.id),

    supabase
      .from("character_item_use_cooldowns")
      .select("source_key, ready_at")
      .eq("character_id", character.id),
  ]);

  const chatItemError =
    usableMastersResult.error ??
    uniqueChargesResult.error ??
    itemCooldownsResult.error;

  if (chatItemError) {
    throw new Error(
      `Unable to prepare usable Items for chat: ${chatItemError.message}`,
    );
  }

  const masterById = new Map(
    (usableMastersResult.data ?? []).map(
      (item) => [item.id, item],
    ),
  );

  const chargesByInstance = new Map(
    (uniqueChargesResult.data ?? []).map(
      (instance) => [
        instance.id,
        instance.charges_remaining,
      ],
    ),
  );

  const cooldownByKey = new Map(
    (itemCooldownsResult.data ?? []).map(
      (entry) => [entry.source_key, entry.ready_at],
    ),
  );

  const chatItems = chatCandidateRows
    .map((row) => {
      const master = masterById.get(row.item_id);

      /*
       * Recipe books/patterns are learned from the Character Inventory,
       * not used as an in-location/chat action.
       */
      if (
        !master ||
        master.teaches_recipe_id
      ) {
        return null;
      }

      const sourceKey =
        row.record_kind === "unique"
          ? `unique:${row.record_id}`
          : `standard:${row.item_id}`;

      const categoryRelation =
        master.category ?? null;

      const category =
        Array.isArray(
          categoryRelation,
        )
          ? categoryRelation[0] ?? null
          : categoryRelation;

      const isEquippedHandWeapon =
        category?.slug === "weapon" &&
        row.is_equipped &&
        ["main_hand", "off_hand"].includes(
          String(
            row.equipped_slot ?? "",
          ),
        );

      if (
        !row.is_usable &&
        !isEquippedHandWeapon
      ) {
        return null;
      }

      if (
        category?.slug === "weapon" &&
        !isEquippedHandWeapon
      ) {
        return null;
      }

      return {
        recordKind: row.record_kind,
        recordId: row.record_id,
        itemId: row.item_id,
        name: row.name,
        description: master.description ?? "",
        quantity: row.quantity,
        targetMode:
          (master.target_mode ?? "self") as
            | "self"
            | "other"
            | "either",
        maxCharges: master.max_charges,
        chargesRemaining:
          row.record_kind === "unique"
            ? chargesByInstance.get(row.record_id) ?? null
            : null,
        cooldownReadyAt:
          cooldownByKey.get(sourceKey) ?? null,
        successDie: master.success_die ?? null,
        successThreshold: master.success_threshold ?? null,
        resolutionMode:
          (master.resolution_mode ?? "automatic") as
            | "automatic"
            | "fixed"
            | "opposed",
        counterOptions:
          Array.isArray(master.counter_options)
            ? master.counter_options
            : [],
        successAttribute: master.success_attribute ?? null,
        damageDice: master.damage_dice ?? null,
        damageType: master.damage_type ?? null,
        categorySlug: category?.slug ?? null,
        isEquipped: row.is_equipped ?? false,
        equippedSlot: row.equipped_slot ?? null,
        effects: Array.isArray(master.effects)
          ? master.effects
          : master.effects
            ? [master.effects]
            : [],
      };
    })
    .filter(
      (
        item,
      ): item is NonNullable<typeof item> =>
        item !== null,
    );

  const roomArea =
  Array.isArray(room.areas)
    ? room.areas[0] ?? null
    : room.areas;

  const messageSelect = `
    id,
    message,
    message_type,
    roll_label,
    dice_sides,
    dice_result,
    attribute_key,
    attribute_value,
    roll_total,
    whisper_recipient_character_id,
    created_at,
    character_id,

    character:characters!room_messages_character_id_fkey(
  id,
  first_name,
  display_name,
  portrait_url,
  public_slug,

  race:races!characters_race_id_fkey(
    id,
    name,
    slug,
    icon_url
  ),

  association:associations!characters_association_id_fkey(
    id,
    name,
    slug,
    icon_url
  )
),

    whisperRecipient:characters!room_messages_whisper_recipient_character_id_fkey(
  id,
  first_name,
  display_name,
  portrait_url,
  public_slug,

  race:races!characters_race_id_fkey(
    id,
    name,
    slug,
    icon_url
  ),

  association:associations!characters_association_id_fkey(
    id,
    name,
    slug,
    icon_url
  )
)
  `;

  if (latestMessageError) {
    throw new Error(
      `Unable to load the latest room entry: ${latestMessageError.message}`,
    );
  }

  let visibleMessages:
    RoomMessage[] = [];

  if (latestMessage) {
    const now = Date.now();

    const latestTimestamp =
      Date.parse(
        latestMessage.created_at,
      );

    const inactivityLimit =
      ROOM_INACTIVITY_RESET_HOURS *
      60 *
      60 *
      1000;

    const roomIsStillActive =
      !Number.isNaN(
        latestTimestamp,
      ) &&
      now - latestTimestamp <
        inactivityLimit;

    if (roomIsStillActive) {
      const historyStart =
        new Date(
          now -
            ROOM_HISTORY_HOURS *
              60 *
              60 *
              1000,
        ).toISOString();

      let from = 0;

      while (true) {
        const to =
          from +
          ROOM_HISTORY_BATCH_SIZE -
          1;

        const {
          data: batch,
          error: batchError,
        } = await supabase
          .from("room_messages")
          .select(messageSelect)
          .eq("room_id", room.id)
          .gte(
            "created_at",
            historyStart,
          )
          .order("created_at", {
            ascending: true,
          })
          .range(from, to);

        if (batchError) {
          throw new Error(
            `Unable to load room entries: ${batchError.message}`,
          );
        }

        const typedBatch =
          (batch ??
            []) as unknown as RoomMessage[];

        visibleMessages.push(
          ...typedBatch,
        );

        if (
          typedBatch.length <
          ROOM_HISTORY_BATCH_SIZE
        ) {
          break;
        }

        from +=
          ROOM_HISTORY_BATCH_SIZE;
      }
    }
  }

  if (presentResult.error) {
    throw new Error(
      `Unable to load present characters: ${presentResult.error.message}`,
    );
  }

  const presentCharacters =
    (
      presentResult.data ?? []
    )
      .map((entry) => {
        const relation =
          Array.isArray(
            entry.character,
          )
            ? entry.character[0]
            : entry.character;

        if (
          !relation ||
          relation.id ===
            character.id
        ) {
          return null;
        }

        return {
          id: relation.id,
          display_name:
            relation.display_name,
        };
      })
      .filter(
        (
          entry,
        ): entry is PresentRoomCharacter =>
          entry !== null,
      )
      .sort((first, second) =>
        first.display_name.localeCompare(
          second.display_name,
        ),
      );

  const canUseFate =
    staffSession !== null &&
    [
      "owner",
      "admin",
      "master",
    ].includes(
      staffSession.role,
    );

  const canViewAllWhispers =
    staffSession !== null;

  const {
    data: gatheringData,
    error: gatheringError,
  } = gatheringResult;

  if (gatheringError) {
    throw new Error(
      `Unable to load Gathering: ${gatheringError.message}`,
    );
  }

  const gatheringState =
    ((gatheringData ?? [])[0] ?? null) as
      | GatheringStateRow
      | null;

  const {
    data: oddJobsData,
    error: oddJobsError,
  } = oddJobsResult;

  if (oddJobsError) {
    throw new Error(
      `Unable to load Odd Jobs Bureau: ${oddJobsError.message}`,
    );
  }

  const oddJobs =
    (oddJobsData ?? []) as OddJobStateRow[];

  const {
    data: houseOfChancesData,
    error: houseOfChancesError,
  } = houseOfChancesResult;

  if (houseOfChancesError) {
    throw new Error(
      `Unable to load House of Chances: ${houseOfChancesError.message}`,
    );
  }

  const houseOfChancesState =
    ((houseOfChancesData ?? [])[0] ?? null) as
      | HouseOfChancesStateRow
      | null;

  const {
    data: breezeLodgingsData,
    error: breezeLodgingsError,
  } = breezeLodgingsResult;

  if (breezeLodgingsError) {
    throw new Error(
      `Unable to load The Breeze Lodgings: ${breezeLodgingsError.message}`,
    );
  }

  const breezeLodgingsBase =
    (breezeLodgingsData ?? []) as Omit<
      BreezeLodgingStateRow,
      "image_url" |
      "is_outdoors" |
      "rented_by_name"
    >[];

  const breezeRoomIds =
    breezeLodgingsBase.map(
      (lodging) => lodging.room_id,
    );

  const breezeRoomImageResult =
    breezeRoomIds.length > 0
      ? await supabase
          .from("rooms")
          .select("id, image_url, is_outdoors")
          .in("id", breezeRoomIds)
      : {
          data: [],
          error: null,
        };

  if (breezeRoomImageResult.error) {
    throw new Error(
      `Unable to load Breeze Lodgings room images: ${breezeRoomImageResult.error.message}`,
    );
  }

  const breezeRoomImages =
    new Map(
      (breezeRoomImageResult.data ?? []).map(
        (roomImage) => [
          roomImage.id,
          roomImage,
        ],
      ),
    );

  const breezeRenterNames =
    new Map(
      breezeStaffOccupants.map(
        (occupant) => [
          occupant.roomId,
          occupant.displayName,
        ],
      ),
    );

  const breezeLodgings:
    BreezeLodgingStateRow[] =
    breezeLodgingsBase.map(
      (lodging) => {
        const roomImage =
          breezeRoomImages.get(
            lodging.room_id,
          );

        return {
          ...lodging,
          image_url:
            roomImage?.image_url ?? null,
          is_outdoors:
            roomImage?.is_outdoors ?? false,
          rented_by_name:
            breezeRenterNames.get(
              lodging.room_id,
            ) ?? null,
        };
      },
    );

  return (
  <div
    data-game-location-surface
    data-owned-location-atmosphere={
      ownedLocationAtmosphereUrl
        ? "true"
        : undefined
    }
    className="h-full min-h-0 overflow-hidden p-2 sm:p-3 lg:p-4"
    style={
      ownedLocationAtmosphereUrl
        ? ({
            backgroundImage:
              `linear-gradient(rgba(4,7,13,.58), rgba(4,7,13,.66)), url(${JSON.stringify(
                ownedLocationAtmosphereUrl,
              )})`,
            backgroundSize:
              "cover",
            backgroundPosition:
              "center",
            backgroundRepeat:
              "no-repeat",
          } as CSSProperties)
        : undefined
    }
  >
    <RoomRealtime
      roomId={room.id}
      presentCharacterIds={
        presentCharacters.map(
          (entry) => entry.id,
        )
      }
    />

    <div className="mx-auto flex h-full max-w-80dvh flex-col">
      <RoomMusicPlayer
        locationName={room.name}
        locationTrack={music.locationTrack}
        ownedTracks={music.ownedTracks}
        preferences={music.preferences}
      />

  <article
    data-sep-interaction-fixed="true"
    className="flex min-h-0 flex-1 flex-col overflow-visible border border-[rgb(var(--sep-colour-6a5032))]/50 bg-[rgb(var(--sep-colour-17110d))] lg:overflow-hidden"
  >

    {gatheringState ? (
      <div data-sep-interaction-ignore="true">
        <GatheringPanel state={gatheringState} />
      </div>
    ) : null}

    {room.slug === "house-of-chances" && houseOfChancesState ? (
      <div data-sep-interaction-ignore="true">
        <HouseOfChancesPanel state={houseOfChancesState} />
      </div>
    ) : null}

    {room.slug === "odd-jobs-bureau" ? (
      <div data-sep-interaction-ignore="true">
        <OddJobsPanel jobs={oddJobs} />
      </div>
    ) : null}

    {room.slug === "the-breeze-lodgings" ? (
      <div data-sep-interaction-ignore="true">
        <BreezeLodgingsPanel rooms={breezeLodgings} />
      </div>
    ) : null}

    {breezeManageData ? (
      <div data-sep-interaction-ignore="true">
        <BreezeLodgingGuestsPanel
          data={breezeManageData}
        />
      </div>
    ) : null}

    {room.chat_enabled ? (
      <>
        <div
          data-sep-interaction-ignore="true"
          className="contents"
        >
          <RoomMessageList
            roomId={room.id}
            roomName={room.name}
            messages={visibleMessages}
            viewerCharacterId={
              character.id
            }
            canViewAllWhispers={
              canViewAllWhispers
            }
            privateLocationTheme={null}
          />
        </div>

        <RoomChatForm
          attributes={{
        muscles:
          attributeBreakdown.muscles.effective,
        reflexes:
          attributeBreakdown.reflexes.effective,
        vigor:
          attributeBreakdown.vigor.effective,
        brains:
          attributeBreakdown.brains.effective,
        shrewd:
          attributeBreakdown.shrewd.effective,
        presence_score:
          attributeBreakdown.presence_score.effective,
      }}
      attributeBreakdown={
        attributeBreakdown
      }
      gifts={chatGifts}
      items={chatItems}
      presentCharacters={
        presentCharacters
      }
          canUseFate={canUseFate}
          exportEnabled={room.chat_enabled}
          backHref={
            roomArea
              ? roomArea.slug === "private-locations"
                ? "/private-locations"
                : `/areas/${roomArea.slug}`
              : null
          }
          backLabel={
            roomArea
              ? roomArea.slug === "private-locations"
                ? "Private Locations"
                : roomArea.name
              : null
          }
          canTakeLeave={room.chat_enabled}
          headquartersManageControl={
            headquartersManageData ? (
              <OrderHeadquartersManageMenu
  key={`headquarters-manage-${headquartersManageData.headquartersId}`}
  data={headquartersManageData}
/>
            ) : null
          }
        />
      </>
    ) : null}
  </article>
</div>
  </div>
);
}

function MissingLocation({
  name,
}: {
  name: string;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-5 text-[rgb(var(--sep-colour-e7d5b0))]">
      <section className="max-w-xl border border-[rgb(var(--sep-colour-654b2e))]/50 bg-[rgb(var(--sep-colour-17110d))] p-8 text-center">
        <h1 className="font-serif text-3xl text-[rgb(var(--sep-colour-dec69a))]">
          {name} has no current location
        </h1>

        <p className="mt-4 text-sm leading-7 text-[rgb(var(--sep-colour-9e907d))]">
          This character must be assigned to a room before
          entering the game.
        </p>

        <Link
          href="/"
          className="flex min-w-0 items-center justify-center border border-[rgb(var(--sep-colour-725c3d))] bg-[rgb(var(--sep-colour-21190f))] px-2 py-1.5 text-center text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-d6bb8d))] transition hover:border-[rgb(var(--sep-colour-a17a49))] hover:bg-[rgb(var(--sep-colour-352718))] hover:text-[rgb(var(--sep-colour-f0d6a7))] sm:px-3 sm:text-[9px] sm:tracking-[0.18em] mt-6 inline-block"
        >
          Return to dashboard
        </Link>
      </section>
    </div>
  );
}