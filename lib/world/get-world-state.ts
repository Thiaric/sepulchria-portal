import "server-only";
import {createClient} from "@/lib/supabase/server";import {DEFAULT_WORLD_STATE,type WorldState} from "@/lib/world/types";
export async function getWorldState():Promise<WorldState>{const s=await createClient();const{data,error}=await s.from("world_state").select("id, game_datetime, automatic_time, time_scale, weather, weather_intensity, temperature_c, updated_at").eq("id","aureth").maybeSingle();return error||!data?DEFAULT_WORLD_STATE:data as WorldState}
