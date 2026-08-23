import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getTicketUnreadCounts({
  admin,userId,ticketIds,audience,
}:{
  admin:SupabaseClient; userId:string; ticketIds:string[]; audience:"player"|"staff";
}):Promise<Map<string,number>>{
  const counts=new Map<string,number>();
  if(!ticketIds.length)return counts;
  const eventTypes=audience==="staff"
    ?["ticket_created","player_replied","staff_replied"]
    :["staff_replied","ticket_state_changed"];
  const [events,reads]=await Promise.all([
    admin.from("ticket_events").select("ticket_id,actor_user_id,event_type,created_at").in("ticket_id",ticketIds).in("event_type",eventTypes),
    admin.from("ticket_notification_reads").select("ticket_id,last_read_at").eq("user_id",userId).in("ticket_id",ticketIds),
  ]);
  if(events.error)throw new Error(events.error.message);
  if(reads.error)throw new Error(reads.error.message);
  const readMap=new Map((reads.data??[]).map(r=>[r.ticket_id,new Date(r.last_read_at).getTime()]));
  for(const e of events.data??[]){
    if(e.actor_user_id===userId)continue;
    if(new Date(e.created_at).getTime()<=(readMap.get(e.ticket_id)??0))continue;
    counts.set(e.ticket_id,(counts.get(e.ticket_id)??0)+1);
  }
  return counts;
}
