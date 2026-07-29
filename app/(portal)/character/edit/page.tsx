import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CharacterForm from "../CharacterForm";
import { updateCharacter } from "./actions";

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: character } = await supabase.from("characters").select("*").eq("user_id", user.id).maybeSingle();
  if (!character) redirect("/character/create");
  return <main className="min-h-screen bg-[#100d0b] px-5 py-10 text-[#e7d5b0]"><div className="mx-auto max-w-6xl"><Link href="/character" className="text-[#b8945d]">← Cancel editing</Link><h1 className="my-8 font-serif text-5xl text-[#ecd9b2]">Edit {character.display_name}</h1>{error && <p className="mb-6 border border-[#8c463d] bg-[#2a1513] p-4 text-[#e4b4aa]">{error}</p>}<CharacterForm action={updateCharacter} character={character} submitLabel="Save changes" /></div></main>;
}
