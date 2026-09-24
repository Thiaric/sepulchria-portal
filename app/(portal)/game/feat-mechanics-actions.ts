"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStaffSession } from "@/lib/auth/require-staff";

import {
  prepareDispelEffect,
  resolveImmediateShapeCast,
  resolveImmediateShapeCastForNpc,
} from "./warping-actions";

export type MechanicalFeatActionState = {
  ok: boolean;
  message: string;
  submittedAt?: number;
};

function one<T>(
  value: T | T[] | null | undefined,
): T | null {
  return Array.isArray(value)
    ? value[0] ?? null
    : value ?? null;
}

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function parseJson<T>(value: string, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function useMechanicalFeat(
  _previous: MechanicalFeatActionState,
  formData: FormData,
): Promise<MechanicalFeatActionState> {
  const admin = createAdminClient();
  let activationId: string | null = null;
  let castId: string | null = null;

  try {
    const characterGiftId = field(formData, "character_gift_id");
    if (!characterGiftId) throw new Error("Choose a Feat.");

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) throw new Error("Authentication required.");

    const npcActorId=field(formData,"npc_actor_character_id");

    let character:any=null;

    if(npcActorId){
      const staff=await getStaffSession();

      if(!staff||!["owner","admin","master"].includes(staff.role)){
        throw new Error("NPC Feats require Master/Admin/Owner access.");
      }

      const npcLink=await admin
        .from("npcs")
        .select("id,character_id,current_room_id,is_active,is_location_active")
        .eq("character_id",npcActorId)
        .eq("is_active",true)
        .eq("is_location_active",true)
        .maybeSingle();

      if(npcLink.error||!npcLink.data){
        throw new Error(npcLink.error?.message??"NPC not found.");
      }

      const npcCharacter=await admin
        .from("characters")
        .select("id,display_name,current_room_id,status,is_system,life_state")
        .eq("id",npcActorId)
        .eq("is_system",true)
        .maybeSingle();

      if(npcCharacter.error||!npcCharacter.data){
        throw new Error(npcCharacter.error?.message??"NPC Character not found.");
      }

      if(npcCharacter.data.status!=="approved"){
        throw new Error("This NPC cannot use Feats.");
      }

      if(npcCharacter.data.current_room_id!==npcLink.data.current_room_id){
        throw new Error("NPC Location is out of sync.");
      }

      character=npcCharacter.data;
    }else{
      const characterResult=await admin
        .from("characters")
        .select("id,display_name,current_room_id,status,is_system,life_state")
        .eq("user_id",user.id)
        .maybeSingle();

      if(characterResult.error||!characterResult.data){
        throw new Error(characterResult.error?.message??"Character not found.");
      }

      if(characterResult.data.status!=="approved"||characterResult.data.is_system){
        throw new Error("This Character cannot use Feats.");
      }

      character=characterResult.data;
    }

    if (character.life_state !== "alive") {
      throw new Error("Only living Characters can activate Feats.");
    }

    if (!character.current_room_id) {
      throw new Error("Enter a Location before using a Feat.");
    }

    const {
      data: ownership,
      error: ownershipError,
    } = await admin
      .from("character_gifts")
      .select(`
        id,
        character_id,
        gift:gifts(
          id,
          name,
          description,
          is_active,
          effect_mode,
          cooldown_minutes,
          mechanics:shapes!shapes_feat_id_fkey(*)
        )
      `)
      .eq("id", characterGiftId)
      .eq("character_id", character.id)
      .maybeSingle();

    if (ownershipError || !ownership) {
      throw new Error(ownershipError?.message ?? "Feat ownership not found.");
    }

    const gift = one<any>(ownership.gift as any);
    const mechanics = one<any>(gift?.mechanics as any);

    if (!gift || !gift.is_active) {
      throw new Error("That Feat is not currently active.");
    }

    if (gift.effect_mode === "passive") {
      throw new Error(
        "Passive Feats do not use the Shape-style activation engine.",
      );
    }

    if (!mechanics) {
      throw new Error("This Feat has no Shape-style mechanical profile.");
    }

    const cooldownMinutes = Math.max(
      0,
      Number(gift.cooldown_minutes ?? 0),
    );

    if (cooldownMinutes > 0) {
      const since = new Date(
        Date.now() - cooldownMinutes * 60_000,
      ).toISOString();

      const { data: recent, error: cooldownError } = await admin
        .from("gift_activations")
        .select("activated_at")
        .eq("character_gift_id", characterGiftId)
        .gte("activated_at", since)
        .order("activated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cooldownError) throw new Error(cooldownError.message);

      if (recent) {
        const availableAt =
          Date.parse(recent.activated_at) + cooldownMinutes * 60_000;
        const remaining = Math.max(
          1,
          Math.ceil((availableAt - Date.now()) / 60_000),
        );
        throw new Error(
          `${gift.name} is on cooldown for another ${remaining} minute${
            remaining === 1 ? "" : "s"
          }.`,
        );
      }
    }

    const rawTargets = parseJson<string[]>(
      field(formData, "mechanics_target_ids"),
      [],
    )
      .map(String)
      .filter(Boolean);

    const effectChoices = parseJson<
      Record<string, "beneficial" | "harmful">
    >(field(formData, "mechanics_effect_choices"), {});

    let targetIds = [...new Set(rawTargets)];
    const targetMode = String(mechanics.target_mode ?? "self");

    if (targetMode === "self") {
      targetIds = [character.id];
    }

    if (targetMode === "either" && targetIds.length === 0) {
      targetIds = [character.id];
    }

    if (
      targetMode === "other" &&
      (targetIds.length === 0 || targetIds.includes(character.id))
    ) {
      throw new Error("Choose another Character to target.");
    }

    const maxTargets =
      mechanics.target_scope === "multiple"
        ? Math.max(1, Number(mechanics.max_targets ?? 1))
        : 1;

    if (targetIds.length > maxTargets) {
      throw new Error(
        `This Feat can target at most ${maxTargets} Character${
          maxTargets === 1 ? "" : "s"
        }.`,
      );
    }

    const otherIds = targetIds.filter((id) => id !== character.id);
    const targetNames = new Map<string, string>([[character.id, "Self"]]);

    if (otherIds.length) {
      const activeSince = new Date(Date.now() - 5 * 60_000).toISOString();

      const {
        data: presenceRows,
        error: presenceError,
      } = await admin
        .from("character_presence")
        .select("character_id")
        .eq("room_id", character.current_room_id)
        .in("character_id", otherIds)
        .gte("last_seen_at", activeSince);

      if (presenceError) throw new Error(presenceError.message);

      const present = new Set(
        (presenceRows ?? []).map((row) => String(row.character_id)),
      );

      if (otherIds.some((id) => !present.has(id))) {
        throw new Error(
          "One or more selected targets are no longer present in this Location.",
        );
      }

      const {
        data: targetRows,
        error: targetError,
      } = await admin
        .from("characters")
        .select("id,display_name,current_room_id,status,is_system")
        .in("id", otherIds);

      if (targetError) throw new Error(targetError.message);

      const systemTargetIds =
        (targetRows ?? [])
          .filter((target) => target.is_system)
          .map((target) => String(target.id));

      const activeNpcTargetIds = new Set<string>();

      if (systemTargetIds.length > 0) {
        const {
          data: npcTargets,
          error: npcTargetsError,
        } = await admin
          .from("npcs")
          .select("character_id")
          .in("character_id", systemTargetIds)
          .eq("is_active", true)
          .eq("is_location_active", true)
          .eq("current_room_id", character.current_room_id);

        if (npcTargetsError) {
          throw new Error(npcTargetsError.message);
        }

        for (const npc of npcTargets ?? []) {
          if (npc.character_id) {
            activeNpcTargetIds.add(String(npc.character_id));
          }
        }
      }

      for (const target of targetRows ?? []) {
        if (
          target.current_room_id !== character.current_room_id ||
          target.status !== "approved" ||
          (
            target.is_system &&
            !activeNpcTargetIds.has(String(target.id))
          )
        ) {
          throw new Error(
            "One or more selected targets cannot currently be targeted.",
          );
        }
        targetNames.set(target.id, target.display_name);
      }
    }

    const activation = await admin
      .from("gift_activations")
      .insert({
        character_gift_id: characterGiftId,
        activated_by: user.id,
        target_character_id: targetIds[0] ?? character.id,
      })
      .select("id")
      .single();

    if (activation.error || !activation.data) {
      throw new Error(
        activation.error?.message ?? "Unable to start Feat cooldown.",
      );
    }

    activationId = activation.data.id;

    const cast = await admin
      .from("shape_casts")
      .insert({
        caster_character_id: character.id,
        shape_id: mechanics.id,
        room_id: character.current_room_id,
        written_target: null,
      })
      .select("id")
      .single();

    if (cast.error || !cast.data) {
      throw new Error(cast.error?.message ?? "Unable to create Feat resolution.");
    }

    castId = cast.data.id;

    const targetRows = targetIds.map((id) => ({
      cast_id: cast.data.id,
      target_character_id: id,
      target_kind: id === character.id ? "self" : "character",
      outcome: "pending",
      resolved_at: null,
      other_effect_choice:
        mechanics.other_alternative_enabled && id !== character.id
          ? effectChoices[id] ?? "beneficial"
          : null,
    }));

    const targetInsert = await admin
      .from("shape_cast_targets")
      .insert(targetRows);

    if (targetInsert.error) throw new Error(targetInsert.error.message);

    const immediate = npcActorId
      ? await resolveImmediateShapeCastForNpc(cast.data.id,character.id)
      : await resolveImmediateShapeCast(cast.data.id);
    if (!immediate.ok) {
      throw new Error(
        immediate.message || "Feat mechanics could not be resolved.",
      );
    }

    const pending = await admin
      .from("shape_cast_targets")
      .select("id", { count: "exact", head: true })
      .eq("cast_id", cast.data.id)
      .eq("outcome", "pending");

    if (pending.error) throw new Error(pending.error.message);

    const targetLabel = targetIds
      .map((id) => targetNames.get(id) ?? "Target")
      .join(" / ");

    const messageParts = [
      `◆ used "${gift.name}" on ${targetLabel}`,
      String(gift.description ?? "").trim() || "No description",
      (pending.count ?? 0) > 0 ? "Awaiting Save" : "Resolved",
      immediate.message,
    ].filter(Boolean);

    const messageClient =
      npcActorId
        ? admin
        : supabase;

    const messageInsert = await messageClient
      .from("room_messages")
      .insert({
        room_id: character.current_room_id,
        character_id: character.id,
        message: messageParts.join(" · "),
        message_type: "action",
        client_nonce: crypto.randomUUID(),
      });

    if (messageInsert.error) throw new Error(messageInsert.error.message);

    // Shape-style persistent effects live in character_shape_effects.
    // End the legacy activation immediately so it records cooldown only.
    await admin
      .from("gift_activations")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", activationId);

    revalidatePath("/game");
    revalidatePath("/character");
    revalidatePath("/characters");

    return {
      ok: true,
      message:
        (pending.count ?? 0) > 0
          ? `${gift.name} used. Waiting for target response.`
          : `${gift.name} resolved.`,
      submittedAt: Date.now(),
    };
  } catch (error) {
    if (castId) {
      await admin.from("shape_casts").delete().eq("id", castId);
    }
    if (activationId) {
      await admin.from("gift_activations").delete().eq("id", activationId);
    }

    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unable to use Feat.",
      submittedAt: Date.now(),
    };
  }
}
