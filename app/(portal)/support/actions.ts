"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSupportIdentity } from "@/lib/support/current-support-user";

const CATEGORIES=["support","technical","account","bug","rules","payment"] as const;
function read(v: FormDataEntryValue | null,max:number){return typeof v==="string"?v.trim().slice(0,max):"";}

export async function createSupportTicket(formData: FormData){
  const identity=await requireSupportIdentity();
  const subject=read(formData.get("subject"),180);
  const body=read(formData.get("body"),10000);
  const category=read(formData.get("category"),40);
  if(!CATEGORIES.includes(category as any)) throw new Error("Invalid ticket category.");
  if(!subject) throw new Error("A subject is required.");
  if(!body) throw new Error("Please describe what you need help with.");
  const admin=createAdminClient();
  const {data:ticket,error}=await admin.from("tickets").insert({category,status:"open",priority:"normal",subject,opened_by_user_id:identity.userId,opened_by_character_id:identity.characterId}).select("id, public_reference").single();
  if(error||!ticket) throw new Error(`Unable to create ticket: ${error?.message ?? "unknown error"}`);
  const {error:messageError}=await admin.from("ticket_messages").insert({ticket_id:ticket.id,author_user_id:identity.userId,author_character_id:identity.characterId,visibility:"player",body});
  if(messageError) throw new Error(`Ticket created but first message failed: ${messageError.message}`);
  const {error:eventError}=await admin.from("ticket_events").insert({ticket_id:ticket.id,actor_user_id:identity.userId,actor_character_id:identity.characterId,event_type:"ticket_created",details:{category,source:"player_support"}});
  if(eventError) throw new Error(`Ticket created but audit event failed: ${eventError.message}`);
  revalidatePath("/support");
  redirect(`/support/${ticket.public_reference}`);
}

export async function replyToSupportTicket(formData: FormData){
  const identity=await requireSupportIdentity();
  const ticketId=read(formData.get("ticketId"),80);
  const reference=read(formData.get("reference"),40);
  const body=read(formData.get("body"),10000);
  if(!ticketId||!reference||!body) throw new Error("The reply is incomplete.");
  const admin=createAdminClient();
  const {data:ticket,error}=await admin.from("tickets").select("id,status").eq("id",ticketId).eq("opened_by_user_id",identity.userId).maybeSingle();
  if(error||!ticket) throw new Error("This ticket is unavailable.");
  if(ticket.status==="closed") throw new Error("Closed tickets cannot receive new replies.");
  const {error:messageError}=await admin.from("ticket_messages").insert({ticket_id:ticket.id,author_user_id:identity.userId,author_character_id:identity.characterId,visibility:"player",body});
  if(messageError) throw new Error(messageError.message);
  const nextStatus=ticket.status==="resolved"?"open":"waiting_on_staff";
  const {error:updateError}=await admin.from("tickets").update({status:nextStatus}).eq("id",ticket.id);
  if(updateError) throw new Error(updateError.message);
  const {error:eventError}=await admin.from("ticket_events").insert({ticket_id:ticket.id,actor_user_id:identity.userId,actor_character_id:identity.characterId,event_type:"player_replied",details:{}});
  if(eventError) throw new Error(eventError.message);
  revalidatePath("/support"); revalidatePath(`/support/${reference}`);
}
