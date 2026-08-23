"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin, requireStaff } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

const TYPES=[
  "warning","communication_restriction","forum_restriction",
  "game_chat_restriction","feature_restriction",
  "temporary_suspension","permanent_ban",
] as const;
type SanctionType=(typeof TYPES)[number];

function read(fd:FormData,key:string,max=10000){
  const v=fd.get(key);
  return typeof v==="string"?v.trim().slice(0,max):"";
}
function uuid(fd:FormData,key:string){
  const v=read(fd,key,80);
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v))
    throw new Error(`Invalid ${key}.`);
  return v;
}
function sanctionType(fd:FormData):SanctionType{
  const v=read(fd,"sanctionType",80);
  if(!TYPES.includes(v as SanctionType)) throw new Error("Invalid sanction type.");
  return v as SanctionType;
}

export async function issueSanction(fd:FormData){
  const staff=await requireStaff();
  const type=sanctionType(fd);

  if(
    (type==="temporary_suspension"||type==="permanent_ban") &&
    staff.role!=="owner" && staff.role!=="admin"
  ) throw new Error("Only an administrator can issue a suspension or permanent ban.");

  const ticketId=uuid(fd,"ticketId");
  const targetUserId=uuid(fd,"targetUserId");
  const targetCharacterRaw=read(fd,"targetCharacterId",80);
  const targetCharacterId=targetCharacterRaw?uuid(fd,"targetCharacterId"):null;
  const targetName=read(fd,"targetName",200)||null;
  const reasonCode=read(fd,"reasonCode",120);
  const playerReason=read(fd,"playerReason",5000);
  const internalRationale=read(fd,"internalRationale",10000)||null;
  const expiresRaw=read(fd,"expiresAt",100);

  if(!reasonCode||!playerReason) throw new Error("Reason code and player-facing reason are required.");

  const temporary=[
    "communication_restriction","forum_restriction",
    "game_chat_restriction","feature_restriction",
    "temporary_suspension",
  ].includes(type);

  let expiresAt:string|null=null;
  if(temporary){
    if(!expiresRaw) throw new Error("An expiry date and time is required for this sanction.");
    const d=new Date(expiresRaw);
    if(Number.isNaN(d.getTime())||d<=new Date()) throw new Error("The sanction expiry must be in the future.");
    expiresAt=d.toISOString();
  }

  const admin=createAdminClient();
  const {data:ticket,error:ticketError}=await admin
    .from("tickets")
    .select("id,public_reference,category")
    .eq("id",ticketId)
    .maybeSingle();
  if(ticketError||!ticket) throw new Error(ticketError?.message??"Ticket not found.");

  const {data:targetStaff,error:staffError}=await admin
    .from("staff_members").select("role").eq("user_id",targetUserId).maybeSingle();
  if(staffError) throw new Error(staffError.message);
  if(targetStaff) throw new Error("Staff accounts cannot be sanctioned through the standard player sanction workflow.");

  if(targetCharacterId){
    const {data:character,error}=await admin
      .from("characters").select("id,user_id,is_system").eq("id",targetCharacterId).maybeSingle();
    if(error||!character) throw new Error(error?.message??"Target character not found.");
    if(character.user_id!==targetUserId) throw new Error("The selected character does not belong to the target account.");
    if(character.is_system===true) throw new Error("System characters cannot receive sanctions.");
  }

  const {data:dup,error:dupError}=await admin
    .from("sanctions").select("id")
    .eq("target_user_id",targetUserId)
    .eq("sanction_type",type)
    .in("status",["scheduled","active"]).limit(1);
  if(dupError) throw new Error(dupError.message);
  if((dup??[]).length) throw new Error("This account already has an active or scheduled sanction of this type.");

  const now=new Date().toISOString();
  const {data:sanction,error}=await admin.from("sanctions").insert({
    ticket_id:ticket.id,
    target_user_id:targetUserId,
    target_character_id:targetCharacterId,
    target_name_snapshot:targetName,
    sanction_type:type,
    status:"active",
    reason_code:reasonCode,
    player_reason:playerReason,
    internal_rationale:internalRationale,
    metadata:{ticket_reference:ticket.public_reference,ticket_category:ticket.category},
    issued_by_user_id:staff.userId,
    starts_at:now,
    expires_at:expiresAt,
    issued_at:now,
  }).select("id").single();

  if(error||!sanction) throw new Error(error?.message??"Unable to create sanction.");

  const [audit,ticketAudit]=await Promise.all([
    admin.from("sanction_events").insert({
      sanction_id:sanction.id,actor_user_id:staff.userId,event_type:"issued",
      details:{sanction_type:type,target_user_id:targetUserId,target_character_id:targetCharacterId,expires_at:expiresAt,ticket_reference:ticket.public_reference},
    }),
    admin.from("ticket_events").insert({
      ticket_id:ticket.id,actor_user_id:staff.userId,event_type:"sanction_issued",
      details:{sanction_id:sanction.id,sanction_type:type,target_name:targetName,expires_at:expiresAt},
    }),
  ]);

  if(audit.error||ticketAudit.error){
    await admin.from("sanctions").delete().eq("id",sanction.id);
    throw new Error(audit.error?.message??ticketAudit.error?.message??"Unable to record sanction audit history.");
  }

  revalidatePath("/admin/sanctions");
  revalidatePath(`/admin/tickets/${ticket.public_reference}`);
  redirect(`/admin/sanctions/${sanction.id}`);
}

export async function revokeSanction(fd:FormData){
  const staff=await requireAdmin();
  const sanctionId=uuid(fd,"sanctionId");
  const reason=read(fd,"revocationReason",5000);
  if(read(fd,"confirmation",30)!=="REVOKE") throw new Error('Type "REVOKE" to confirm revocation.');
  if(!reason) throw new Error("A revocation reason is required.");

  const admin=createAdminClient();
  const {data:s,error}=await admin.from("sanctions").select("id,ticket_id,status").eq("id",sanctionId).maybeSingle();
  if(error||!s) throw new Error(error?.message??"Sanction not found.");
  if(s.status==="revoked") throw new Error("This sanction is already revoked.");

  const now=new Date().toISOString();
  const {error:updateError}=await admin.from("sanctions").update({
    status:"revoked",revoked_by_user_id:staff.userId,revoked_at:now,revocation_reason:reason,
  }).eq("id",s.id);
  if(updateError) throw new Error(updateError.message);

  const {error:auditError}=await admin.from("sanction_events").insert({
    sanction_id:s.id,actor_user_id:staff.userId,event_type:"revoked",details:{reason},
  });
  if(auditError) throw new Error(auditError.message);

  if(s.ticket_id){
    await admin.from("ticket_events").insert({
      ticket_id:s.ticket_id,actor_user_id:staff.userId,event_type:"sanction_revoked",
      details:{sanction_id:s.id,reason},
    });
  }

  revalidatePath("/admin/sanctions");
  revalidatePath(`/admin/sanctions/${s.id}`);
}
