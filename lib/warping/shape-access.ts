import "server-only";

import { getEffectiveCharacterAttributes } from "@/lib/characters/get-effective-character-attributes";
import { createClient } from "@/lib/supabase/server";

export async function getCharacterShapeAccess(characterId:string,shapeId:string){
  const db=await createClient();

  const [characterResult,shapeResult,assignmentResult]=await Promise.all([
    db.from("characters")
      .select("id,muscles,reflexes,vigor,brains,shrewd,presence_score,warping_affinity,warps_per_day")
      .eq("id",characterId)
      .single(),
    db.from("shapes")
      .select("id,level,min_muscles,min_reflexes,min_vigour,min_brains,min_shrewd,min_presence,is_active")
      .eq("id",shapeId)
      .single(),
    db.from("character_shapes")
      .select("level_override,acquisition_source")
      .eq("character_id",characterId)
      .eq("shape_id",shapeId),
  ]);

  if(characterResult.error||!characterResult.data){
    throw new Error(characterResult.error?.message??"Character not found.");
  }
  if(shapeResult.error||!shapeResult.data){
    throw new Error(shapeResult.error?.message??"Shape not found.");
  }

  const character=characterResult.data;
  const shape=shapeResult.data;
  const assignments=assignmentResult.data??[];

  const orderGranted=assignments.some(
    assignment=>assignment.acquisition_source==="order",
  );

  const manualLevelOverride=assignments.some(
    assignment=>
      assignment.acquisition_source==="staff" &&
      assignment.level_override===true,
  );

  const reasons:string[]=[];

  if(!shape.is_active)reasons.push("Shape is inactive");
  if(!assignments.length)reasons.push("Shape is not assigned");

  if(
    !orderGranted &&
    !manualLevelOverride &&
    Number(shape.level)>Number(character.warping_affinity)
  ){
    reasons.push(`Requires Affinity ${shape.level}`);
  }

  if(!orderGranted){
    const effective=await getEffectiveCharacterAttributes(
      characterId,
      {
        muscles:character.muscles,
        reflexes:character.reflexes,
        vigor:character.vigor,
        brains:character.brains,
        shrewd:character.shrewd,
        presence_score:character.presence_score,
      },
    );

    const requirements=[
      ["min_muscles","Muscles","muscles"],
      ["min_reflexes","Reflexes","reflexes"],
      ["min_vigour","Vigour","vigor"],
      ["min_brains","Brains","brains"],
      ["min_shrewd","Shrewd","shrewd"],
      ["min_presence","Presence","presence_score"],
    ] as const;

    for(const [field,label,key] of requirements){
      const minimum=Number(shape[field]??0);
      if(minimum&&Number(effective[key]??0)<minimum){
        reasons.push(`Requires ${label} ${minimum}`);
      }
    }
  }

  const boundaryResult=await db.rpc("warping_reset_boundary");
  if(boundaryResult.error)throw new Error(boundaryResult.error.message);

  const castCount=await db
    .from("shape_casts")
    .select("id",{count:"exact",head:true})
    .eq("caster_character_id",characterId)
    .gte("created_at",boundaryResult.data);

  if(castCount.error)throw new Error(castCount.error.message);

  const warpsUsed=castCount.count??0;
  const warpsPerDay=Number(character.warps_per_day??3);
  const warpsRemaining=Math.max(0,warpsPerDay-warpsUsed);

  if(warpsRemaining<=0)reasons.push("No Warps remaining");

  return {
    allowed:reasons.length===0,
    reasons,
    affinity:Number(character.warping_affinity??1),
    warpsPerDay,
    warpsUsed,
    warpsRemaining,
    orderGranted,
    override:manualLevelOverride,
  };
}
