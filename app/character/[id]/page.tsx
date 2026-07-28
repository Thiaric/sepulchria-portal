import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Profile } from "../page";
import { startConversation } from "@/app/messages/actions";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const [{ data: character, error }, { data: ownCharacter }] = await Promise.all([
    supabase.from("characters").select("id,display_name,portrait_url,pronouns,date_of_birth,birthplace,origin,occupation,faction,title,physical_description,personality,biography,public_notes").eq("id", id).maybeSingle(),
    supabase.from("characters").select("id").eq("user_id", user.id).maybeSingle(),
  ]);
  if (error) throw new Error(error.message);
  if (!character) notFound();
  return <Profile character={character} messageAction={ownCharacter?.id !== character.id ? <form action={startConversation}><input type="hidden" name="recipientId" value={character.id} /><button className="border border-[#967342] bg-[#3b2b1b] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#f1d9a7]">Send message</button></form> : null} />;
}
