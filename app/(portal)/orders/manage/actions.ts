"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrderHead } from "@/lib/orders/require-order-manager";
import { createClient } from "@/lib/supabase/server";

const req=(f:FormData,n:string)=>{const v=f.get(n);if(typeof v!=="string"||!v.trim())throw new Error(`${n} is required.`);return v.trim()};
const opt=(f:FormData,n:string)=>{const v=f.get(n);return typeof v==="string"&&v.trim()?v.trim():null};
function back(id:string,t:"success"|"error",m:string):never{const p=new URLSearchParams();p.set(t,m);redirect(`/orders/manage?${p}#order-${id}`)}
async function level(s:any,o:string,l:string){const {data,error}=await s.from("order_levels").select("level").eq("id",l).eq("order_id",o).maybeSingle();if(error||!data)throw new Error("Invalid level.");return data.level}
async function job(s:any,l:string,j:string|null){if(!j)return;const {data,error}=await s.from("order_jobs").select("id").eq("id",j).eq("order_level_id",l).maybeSingle();if(error||!data)throw new Error("Job does not belong to that level.")}
const refresh=()=>{revalidatePath("/orders/manage");revalidatePath("/admin/orders")};

export async function headAddMember(f:FormData){
 const o=req(f,"orderId"); try{const h=await requireOrderHead(o),c=req(f,"characterId"),l=req(f,"levelId"),j=opt(f,"jobId"),s=await createClient();
 if(await level(s,o,l)>=5)throw new Error("Only staff can appoint a Level 5 Head.");await job(s,l,j);
 const {error}=await s.from("order_memberships").insert({order_id:o,character_id:c,order_level_id:l,order_job_id:j,added_by:h.userId});if(error)throw new Error(error.message);refresh();back(o,"success","Member added.");
 }catch(e){back(o,"error",e instanceof Error?e.message:"Unable to add member.");}
}
export async function headUpdateMember(f:FormData){
 const o=req(f,"orderId");try{const h=await requireOrderHead(o),m=req(f,"membershipId"),l=req(f,"levelId"),j=opt(f,"jobId"),s=await createClient();
 const {data:t,error}=await s.from("order_memberships").select("character_id,level:order_levels!order_memberships_order_level_id_fkey(level)").eq("id",m).eq("order_id",o).maybeSingle();
 const r=Array.isArray(t?.level)?t?.level[0]:t?.level;if(error||!t)throw new Error("Membership not found.");if(t.character_id===h.characterId||r?.level===5)throw new Error("The Head cannot alter their own membership.");
 if(await level(s,o,l)>=5)throw new Error("Only staff can appoint a Level 5 Head.");await job(s,l,j);
 const {error:u}=await s.from("order_memberships").update({order_level_id:l,order_job_id:j}).eq("id",m).eq("order_id",o);if(u)throw new Error(u.message);refresh();back(o,"success","Member updated.");
 }catch(e){back(o,"error",e instanceof Error?e.message:"Unable to update member.");}
}
export async function headRemoveMember(f:FormData){
 const o=req(f,"orderId");try{const h=await requireOrderHead(o),m=req(f,"membershipId"),s=await createClient();
 const {data:t,error}=await s.from("order_memberships").select("character_id,level:order_levels!order_memberships_order_level_id_fkey(level)").eq("id",m).eq("order_id",o).maybeSingle();
 const r=Array.isArray(t?.level)?t?.level[0]:t?.level;if(error||!t)throw new Error("Membership not found.");if(t.character_id===h.characterId||r?.level===5)throw new Error("The Head cannot remove themselves.");
 const {error:d}=await s.from("order_memberships").delete().eq("id",m).eq("order_id",o);if(d)throw new Error(d.message);refresh();back(o,"success","Member removed.");
 }catch(e){back(o,"error",e instanceof Error?e.message:"Unable to remove member.");}
}
