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
import { OddJobsPanel, type OddJobStateRow } from "./components/OddJobsPanel";
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
  area_id: string;
  is_outdoors: boolean;
  areas: Area | Area[] | null;
};

export default function GamePage(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center px-5 text-[#a98b61]">
          Entering Sepulchria...
        </div>
      }
    >
      <GameContent {...props} />
    </Suspense>
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
  "id, name, slug, chat_enabled, description, image_url, area_id, is_outdoors, areas(id,name,slug,description)",
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

  const privateLocation =
    privateAccess.metadata
      ? {
          background_colour:
            privateAccess.metadata
              .backgroundColour,
          speech_colour:
            privateAccess.metadata
              .speechColour,
          action_colour:
            privateAccess.metadata
              .actionColour,
          system_colour:
            privateAccess.metadata
              .systemColour,
          whisper_background_colour:
            privateAccess.metadata
              .whisperBackgroundColour,
          whisper_text_colour:
            privateAccess.metadata
              .whisperTextColour,
          offgame_background_colour:
            privateAccess.metadata
              .offgameBackgroundColour,
          offgame_text_colour:
            privateAccess.metadata
              .offgameTextColour,
        }
      : null;

  if (
    privateAccess.isPrivate &&
    !privateAccess.allowed
  ) {
    return (
      <div
        className="h-full min-h-[60vh] bg-[#0d0b0a]"
        aria-label="Unavailable location"
      />
    );
  }

  const attributeBreakdown =
    await getCharacterAttributeBreakdown(
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

  const {
    data: ownedGiftRows,
    error: ownedGiftError,
  } = await supabase
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
        presence_modifier
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

  const {
    data: rawInventoryRows,
    error: chatInventoryError,
  } = await supabase.rpc(
    "get_public_character_inventory",
    { p_character_id: character.id },
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

  const usableRows =
    chatInventoryRows.filter((row) => row.is_usable);

  const usableItemIds = [
    ...new Set(usableRows.map((row) => row.item_id)),
  ];

  const [
    usableMastersResult,
    uniqueChargesResult,
    itemCooldownsResult,
  ] = await Promise.all([
    usableItemIds.length
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
              max_health_modifier
            )
          `)
          .in("id", usableItemIds)
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

  const chatItems = usableRows
    .map((row) => {
      const master = masterById.get(row.item_id);
      if (!master) return null;

      const sourceKey =
        row.record_kind === "unique"
          ? `unique:${row.record_id}`
          : `standard:${row.item_id}`;

      const categoryRelation = master.category ?? null;
      const category = Array.isArray(categoryRelation)
        ? categoryRelation[0] ?? null
        : categoryRelation;

      if (
        category?.slug === "weapon" &&
        (
          !row.is_equipped ||
          !["main_hand", "off_hand"].includes(
            String(row.equipped_slot ?? ""),
          )
        )
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

  const {
    data: latestMessage,
    error: latestMessageError,
  } = await supabase
    .from("room_messages")
    .select("created_at")
    .eq("room_id", room.id)
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

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

  const activeSince = new Date(
    Date.now() -
      PRESENCE_ACTIVE_MINUTES *
        60_000,
  ).toISOString();

  const [
    presentResult,
    staffSession,
  ] = await Promise.all([
    supabase
      .from(
        "character_presence",
      )
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
      ),

    getStaffSession(),
  ]);

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

  const headquartersManageData =
    await getOrderHeadquartersManageData(
      room.id,
      character.id,
    );

  let oddJobs: OddJobStateRow[] = [];

  if (room.slug === "odd-jobs-bureau") {
    const { data: oddJobsData, error: oddJobsError } =
      await supabase.rpc("get_my_odd_jobs_state");

    if (oddJobsError) {
      throw new Error(`Unable to load Odd Jobs Bureau: ${oddJobsError.message}`);
    }

    oddJobs = (oddJobsData ?? []) as OddJobStateRow[];
  }

  return (
  <div
  className={
    room.slug === "odd-jobs-bureau"
  ? "min-h-full overflow-visible p-2 sm:p-3 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:p-4"
  : privateLocation
    ? "private-location-theme h-full min-h-0 overflow-hidden p-2 sm:p-3 lg:p-4"
    : "h-full min-h-0 overflow-hidden p-2 sm:p-3 lg:p-4"
  }
  style={
    privateLocation
      ? ({
          "--private-location-bg":
            privateLocation.background_colour,
        } as CSSProperties)
      : undefined
  }
>
    {privateLocation ? (
      <style>{`
        .private-location-theme #room-chronicle {
          background: var(--private-location-bg);
        }
      `}</style>
    ) : null}
    <RoomRealtime roomId={room.id} />

    <div
  className={
    room.slug === "odd-jobs-bureau"
      ? "mx-auto flex min-h-full max-w-80dvh flex-col"
      : "mx-auto flex h-full max-w-80dvh flex-col"
  }
>
  <div className="mb-2 flex shrink-0 items-center justify-between gap-3 border border-[#62492e]/45 bg-[#15100d] px-3 py-2">
    <div className="min-w-0">
      

      <p className="mt-1 truncate font-serif text-lg text-[#dec69a]">
        {room.name}
      </p>
    </div>

    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:flex-wrap sm:items-center sm:justify-end">

  {headquartersManageData ? (
    <OrderHeadquartersManageMenu
      data={headquartersManageData}
    />
  ) : null}

  {room.chat_enabled ? (
    <Link
      href="/game/export"
      title="Export the current game session as a file"
      className="flex min-w-0 items-center justify-center border border-[#725c3d] bg-[#21190f] px-2 py-1.5 text-center text-[8px] uppercase tracking-[0.12em] text-[#d6bb8d] transition hover:border-[#a17a49] hover:bg-[#352718] hover:text-[#f0d6a7] sm:px-3 sm:text-[9px] sm:tracking-[0.18em]"
    >
      Export role
    </Link>
  ) : null}

  {roomArea ? (
    <Link
      href={
        roomArea.slug ===
        "private-locations"
          ? "/private-locations"
          : `/areas/${roomArea.slug}`
      }
      title={
        roomArea.slug ===
        "private-locations"
          ? "Return to Private Locations"
          : "Return to the area page"
      }
      className="flex min-w-0 items-center justify-center border border-[#725c3d] bg-[#21190f] px-2 py-1.5 text-center text-[8px] uppercase tracking-[0.12em] text-[#d6bb8d] transition hover:border-[#a17a49] hover:bg-[#352718] hover:text-[#f0d6a7] sm:px-3 sm:text-[9px] sm:tracking-[0.18em]"
    >
      ← Back to{" "}
      {roomArea.slug ===
      "private-locations"
        ? "Private Locations"
        : roomArea.name}
    </Link>
  ) : null}

  {room.chat_enabled ? (
    <form
      action={leaveCurrentRoom}
      className="col-span-2 sm:col-auto"
    >
      <button
        type="submit"
        title="Leave this location and return to the city, your presence won't be counted in locations, only in the portal"
        className="w-full border border-[#8f3f36] bg-[#351714] px-2 py-1.5 text-[8px] uppercase tracking-[0.12em] text-[#e6a097] transition hover:border-[#c65a4d] hover:bg-[#4b1d19] hover:text-[#ffd0c9] sm:w-auto sm:px-3 sm:text-[9px] sm:tracking-[0.18em]"
      >
        Take Leave
      </button>
    </form>
  ) : null}

</div>
  </div>

  <article
  className={
    room.slug === "odd-jobs-bureau"
      ? "flex shrink-0 flex-col overflow-visible border border-[#6a5032]/50 bg-[#17110d]"
      : "flex min-h-0 flex-1 flex-col overflow-visible border border-[#6a5032]/50 bg-[#17110d] lg:overflow-hidden"
  }
>
    {room.slug === "odd-jobs-bureau" ? (
      <OddJobsPanel jobs={oddJobs} />
    ) : null}

    {room.chat_enabled ? (
      <>
        <RoomMessageList
          roomId={room.id}
          messages={visibleMessages}
          viewerCharacterId={
            character.id
          }
          canViewAllWhispers={
            canViewAllWhispers
          }
          privateLocationTheme={
            privateLocation
              ? {
                  backgroundColour:
                    privateLocation.background_colour,
                  speechColour:
                    privateLocation.speech_colour,
                  actionColour:
                    privateLocation.action_colour,
                  systemColour:
                    privateLocation.system_colour,
                  whisperBackgroundColour:
                    privateLocation.whisper_background_colour,
                  whisperTextColour:
                    privateLocation.whisper_text_colour,
                  offgameBackgroundColour:
                    privateLocation.offgame_background_colour,
                  offgameTextColour:
                    privateLocation.offgame_text_colour,
                }
              : null
          }
        />

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
    <div className="flex min-h-[60vh] items-center justify-center p-5 text-[#e7d5b0]">
      <section className="max-w-xl border border-[#654b2e]/50 bg-[#17110d] p-8 text-center">
        <h1 className="font-serif text-3xl text-[#dec69a]">
          {name} has no current location
        </h1>

        <p className="mt-4 text-sm leading-7 text-[#9e907d]">
          This character must be assigned to a room before
          entering the game.
        </p>

        <Link
          href="/"
          className="mt-6 inline-block text-[#efd4a0] transition hover:text-white"
        >
          Return to dashboard
        </Link>
      </section>
    </div>
  );
}