import { Suspense, type CSSProperties } from "react";
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
  OrderHeadquartersPanel,
} from "@/components/orders/order-headquarters-panel";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  type HouseOfChancesInfoRow,
} from "./components/HouseOfChancesPanel";
import {
  BreezeLodgingsPanel,
  type BreezeLodgingStateRow,
} from "./components/BreezeLodgingsPanel";
import {
  GatheringPanel,
  type GatheringStateRow,
  type GatheringInfoRow,
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
        <div className="flex min-h-[60vh] items-center justify-center px-5 text-[rgb(var(--sep-colour-a98b61))] game_page_div_container">
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
  redirect("/?map=sepulchria");
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
  redirect("/?map=sepulchria");
}

  const room = rawRoom as RoomRelation;
  const gameAdmin = createAdminClient();

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
        className="h-full min-h-[60vh] bg-[rgb(var(--sep-colour-0d0b0a))] game_page_div_unavailable_location"
        aria-label="Unavailable location"
      />
    );
  }

  const musicPromise =
    getCharacterMusicPayload(
      character.id,
      room.music_track_id,
    );

  const activeSince = new Date(
    Date.now() -
      PRESENCE_ACTIVE_MINUTES *
        60_000,
  ).toISOString();

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
          display_name,
          is_system
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

  const gatheringInfoPromise =
    gameAdmin
      .from("gathering_locations")
      .select(`
        id,
        nothing_chance,
        rewards:gathering_rewards(
          id,reward_type,item_id,quantity_min,quantity_max,
          remnants_min,remnants_max,weight,is_active,sort_order,
          item:items(name)
        )
      `)
      .eq("room_id", room.id)
      .eq("is_active", true)
      .maybeSingle();

  const houseRulesInfoPromise =
    room.slug === "house-of-chances"
      ? gameAdmin
          .from("house_of_chances_prize_rules")
          .select("id,name,priority,sort_order,match_type,roll_1_min,roll_1_max,roll_2_min,roll_2_max,roll_3_min,roll_3_max,total_min,total_max")
          .eq("is_active", true)
          .order("priority", { ascending: false })
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null });

  const houseRewardsInfoPromise =
    room.slug === "house-of-chances"
      ? gameAdmin
          .from("house_of_chances_rule_rewards")
          .select("id,rule_id,reward_type,remnants_amount,item_id,quantity,sort_order,item:items(name)")
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null });

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
    music,
    latestMessageResult,
    presentResult,
    staffSession,
    headquartersManageData,
    gatheringResult,
    gatheringInfoResult,
    houseRulesInfoResult,
    houseRewardsInfoResult,
    oddJobsResult,
    houseOfChancesResult,
    breezeLodgingsResult,
    breezeManageData,
    breezeStaffOccupants,
  ] = await Promise.all([
    musicPromise,
    latestMessagePromise,
    presentResultPromise,
    staffSessionPromise,
    headquartersManageDataPromise,
    gatheringPromise,
    gatheringInfoPromise,
    houseRulesInfoPromise,
    houseRewardsInfoPromise,
    oddJobsPromise,
    houseOfChancesPromise,
    breezeLodgingsPromise,
    breezeManageDataPromise,
    breezeStaffOccupantsPromise,
  ]);

  const {
    data: latestMessage,
    error: latestMessageError,
  } = latestMessageResult;

  const roomArea =
  Array.isArray(room.areas)
    ? room.areas[0] ?? null
    : room.areas;

  const messageSelect = `
    id,
    message,
    message_type,
    fate_image_url,
    roll_label,
    dice_sides,
    dice_result,
    attribute_key,
    attribute_value,
    roll_total,
    whisper_recipient_character_id,
    condition_snapshot,
    speaker_type,
    npc_id,
    npc_snapshot,
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
          is_system:
            relation.is_system === true,
        };
      })
      .filter(
        (
          entry,
        ): entry is NonNullable<typeof entry> =>
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

  const gatheringInfo: GatheringInfoRow[] = (() => {
    if (gatheringInfoResult.error || !gatheringInfoResult.data) return [];

    const location = gatheringInfoResult.data as any;
    const nothingChance = Math.max(0, Math.min(100, Number(location.nothing_chance ?? 0)));
    const rewards = (Array.isArray(location.rewards) ? location.rewards : [])
      .filter((reward:any) => reward.is_active === true)
      .sort((a:any,b:any) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
    const totalWeight = rewards.reduce((sum:number,reward:any) => sum + Math.max(0,Number(reward.weight ?? 0)),0);
    const rewardPool = Math.max(0,100-nothingChance);

    const rows: GatheringInfoRow[] = rewards.map((reward:any) => {
      const item = Array.isArray(reward.item) ? reward.item[0] ?? null : reward.item ?? null;
      const chance = totalWeight > 0 ? rewardPool * (Math.max(0,Number(reward.weight ?? 0)) / totalWeight) : 0;

      if (reward.reward_type === "remnants") {
        const min = Number(reward.remnants_min ?? 0);
        const max = Number(reward.remnants_max ?? min);
        return {
          id:String(reward.id),
          label:min===max ? `${min.toLocaleString("en-GB")} Remnants` : `${min.toLocaleString("en-GB")}–${max.toLocaleString("en-GB")} Remnants`,
          detail:null,
          chance_percent:chance,
        };
      }

      const min = Number(reward.quantity_min ?? 1);
      const max = Number(reward.quantity_max ?? min);
      return {
        id:String(reward.id),
        label:item?.name ?? "Unknown Item",
        detail:min===max ? `Quantity ${min}` : `Quantity ${min}–${max}`,
        chance_percent:chance,
      };
    });

    if (nothingChance > 0) {
      rows.push({
        id:"nothing",
        label:"Nothing useful",
        detail:null,
        chance_percent:nothingChance,
        is_nothing:true,
      });
    }

    return rows;
  })();

  const {
    data: oddJobsData,
    error: oddJobsError,
  } = oddJobsResult;

  if (oddJobsError) {
    throw new Error(
      `Unable to load Odd Jobs Bureau: ${oddJobsError.message}`,
    );
  }

  const oddJobsBase =
    (oddJobsData ?? []) as Omit<
      OddJobStateRow,
      "image_url"
    >[];

  const oddJobIds =
    oddJobsBase.map((job) => job.job_id);

  const oddJobImagesResult =
    oddJobIds.length > 0
      ? await supabase
          .from("odd_jobs")
          .select("id, image_url")
          .in("id", oddJobIds)
      : { data: [], error: null };

  if (oddJobImagesResult.error) {
    throw new Error(
      `Unable to load Odd Job images: ${oddJobImagesResult.error.message}`,
    );
  }

  const oddJobImageById =
    new Map<string, string | null>(
      (oddJobImagesResult.data ?? []).map(
        (job) => [
          String(job.id),
          job.image_url ? String(job.image_url) : null,
        ],
      ),
    );

  const oddJobs: OddJobStateRow[] =
    oddJobsBase.map((job) => ({
      ...job,
      image_url:
        oddJobImageById.get(job.job_id) ?? null,
    }));

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

  const houseOfChancesInfo: HouseOfChancesInfoRow[] = (() => {
    if (houseRulesInfoResult.error || houseRewardsInfoResult.error) return [];

    const rules = (houseRulesInfoResult.data ?? []) as any[];
    const rewards = (houseRewardsInfoResult.data ?? []) as any[];

    const condition = (rule:any) => {
      if (rule.match_type === "exact") return `Exactly ${rule.roll_1_min} / ${rule.roll_2_min} / ${rule.roll_3_min}`;
      if (rule.match_type === "all_equal") {
        const ranged = rule.roll_1_min !== null || rule.roll_1_max !== null;
        return ranged ? `All three equal (${rule.roll_1_min ?? 1}–${rule.roll_1_max ?? 100})` : "All three equal";
      }
      if (rule.match_type === "all_in_range") return `All three between ${rule.roll_1_min} and ${rule.roll_1_max}`;
      if (rule.match_type === "total_range") return `Total between ${rule.total_min} and ${rule.total_max}`;
      return `R1 ${rule.roll_1_min}–${rule.roll_1_max} · R2 ${rule.roll_2_min}–${rule.roll_2_max} · R3 ${rule.roll_3_min}–${rule.roll_3_max}`;
    };

    return rules.map((rule:any) => ({
      id:String(rule.id),
      name:String(rule.name),
      condition:condition(rule),
      rewards:rewards
        .filter((reward:any) => reward.rule_id === rule.id)
        .map((reward:any) => {
          if (reward.reward_type === "remnants") {
            return `${Number(reward.remnants_amount ?? 0).toLocaleString("en-GB")} Remnants`;
          }
          const item = Array.isArray(reward.item) ? reward.item[0] ?? null : reward.item ?? null;
          return `${item?.name ?? "Unknown Item"} × ${Number(reward.quantity ?? 1)}`;
        }),
    }));
  })();

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
    className="h-full min-h-0 overflow-hidden game_page_div_container_2"
    style={
  ownedLocationAtmosphereUrl
    ? ({
        "--sep-location-owned-atmosphere":
          `url(${JSON.stringify(ownedLocationAtmosphereUrl)})`,
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

    <div className="mx-auto flex h-full max-w-80dvh flex-col game_page_div_container_3">
      <RoomMusicPlayer
        locationName={room.name}
        locationTrack={music.locationTrack}
        ownedTracks={music.ownedTracks}
        preferences={music.preferences}
      />

  <article
    data-sep-interaction-fixed="true"
    className="flex min-h-0 flex-1 flex-col overflow-visible border border-[rgb(var(--sep-colour-6a5032))]/50 bg-[rgb(var(--sep-colour-17110d))] lg:overflow-hidden game_page_article_article"
  >

    {headquartersManageData ? (
      <div className="game_page_div_container_4" data-sep-interaction-ignore="true">
        <OrderHeadquartersPanel
          key={`headquarters-panel-${headquartersManageData.headquartersId}`}
          data={headquartersManageData}
        />
      </div>
    ) : null}

    {gatheringState ? (
      <div className="game_page_div_container_5" data-sep-interaction-ignore="true">
        <GatheringPanel
          state={gatheringState}
          info={gatheringInfo}
        />
      </div>
    ) : null}

    {room.slug === "house-of-chances" && houseOfChancesState ? (
      <div className="game_page_div_container_6" data-sep-interaction-ignore="true">
        <HouseOfChancesPanel
          state={houseOfChancesState}
          info={houseOfChancesInfo}
        />
      </div>
    ) : null}

    {room.slug === "odd-jobs-bureau" ? (
      <div className="game_page_div_container_7" data-sep-interaction-ignore="true">
        <OddJobsPanel jobs={oddJobs} />
      </div>
    ) : null}

    {room.slug === "the-breeze-lodgings" ? (
      <div className="game_page_div_container_8" data-sep-interaction-ignore="true">
        <BreezeLodgingsPanel rooms={breezeLodgings} />
      </div>
    ) : null}

    {breezeManageData ? (
      <div className="game_page_div_container_9" data-sep-interaction-ignore="true">
        <BreezeLodgingGuestsPanel
          data={breezeManageData}
        />
      </div>
    ) : null}

    {room.chat_enabled ? (
      <>
        <div
          data-sep-interaction-ignore="true"
          className="contents game_page_div_container_10"
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
      roomId={room.id}
      viewerCharacterId={character.id}
      viewerDisplayName={character.display_name}
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
        />
      </>
    ) : null}
  </article>
</div>
  </div>
);
}

