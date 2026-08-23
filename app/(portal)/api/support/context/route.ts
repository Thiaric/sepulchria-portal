import {NextRequest,NextResponse} from "next/server";
import {getTicketUnreadCounts} from "@/lib/support/ticket-unread";
import {createAdminClient} from "@/lib/supabase/admin";
import {createClient} from "@/lib/supabase/server";
const ROLES=["owner","admin","moderator","master"];
function text(type:string,d:any,actor:string){if(type==="ticket_created")return `${actor} opened the ticket`;if(type==="player_replied"||type==="staff_replied")return `${actor} replied`;if(type==="internal_note_added")return `${actor} added an internal note`;if(type==="staff_assigned")return `${actor} assigned the ticket`;if(type==="ticket_state_changed")return `${actor} changed the ticket${d?.status?` to ${String(d.status).replaceAll("_"," ")}`:""}${d?.priority?` · ${d.priority} priority`:""}`;return `${actor} updated the ticket`;}
export async function GET(req:NextRequest){
 const sb=await createClient();const{data:{user}}=await sb.auth.getUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const a=createAdminClient(),isAdmin=req.nextUrl.searchParams.get("admin")==="1",ref=req.nextUrl.searchParams.get("reference");
 if(isAdmin){const{data:s}=await a.from("staff_members").select("role").eq("user_id",user.id).maybeSingle();if(!s||!ROLES.includes(s.role))return NextResponse.json({error:"Forbidden"},{status:403});}
 let q=a.from("tickets").select("id,public_reference,status,priority,subject,assigned_staff_user_id,opened_by_user_id,updated_at").order("updated_at",{ascending:false}).limit(250);if(!isAdmin)q=q.eq("opened_by_user_id",user.id);
 const{data:tickets,error}=await q;if(error)return NextResponse.json({error:error.message},{status:500});
 if(ref){const t=(tickets??[]).find(x=>x.public_reference===ref);if(!t)return NextResponse.json({error:"Not found"},{status:404});let eq=a.from("ticket_events").select("id,actor_user_id,event_type,details,created_at").eq("ticket_id",t.id).order("created_at",{ascending:false}).limit(100);if(!isAdmin)eq=eq.neq("event_type","internal_note_added");const{data:e,error:ee}=await eq;if(ee)return NextResponse.json({error:ee.message},{status:500});const u=[...new Set((e??[]).map(x=>x.actor_user_id).filter(Boolean))];const{data:c}=u.length?await a.from("characters").select("user_id,display_name,first_name,surname").in("user_id",u):{data:[] as any[]};const names=new Map((c??[]).map(x=>[x.user_id,x.display_name||`${x.first_name??""} ${x.surname??""}`.trim()]));return NextResponse.json({events:(e??[]).map(x=>({...x,text:text(x.event_type,x.details,names.get(x.actor_user_id)??(x.actor_user_id===t.opened_by_user_id?"Player":"Staff"))}))});}
 const ids=(tickets??[]).map(x=>x.id);
 const [messages,unread]=await Promise.all([ids.length?a.from("ticket_messages").select("ticket_id,body").in("ticket_id",ids):Promise.resolve({data:[] as any[],error:null}),getTicketUnreadCounts({admin:a,userId:user.id,ticketIds:ids,audience:isAdmin?"staff":"player"})]);
 if(messages.error)return NextResponse.json({error:messages.error.message},{status:500});
 const bodies=new Map<string,string[]>();for(const x of messages.data??[]){const z=bodies.get(x.ticket_id)??[];z.push(String(x.body??""));bodies.set(x.ticket_id,z);}
 return NextResponse.json({tickets:(tickets??[]).map(x=>({...x,search_body:(bodies.get(x.id)??[]).join("\n"),unread_activity_count:unread.get(x.id)??0}))});
}
