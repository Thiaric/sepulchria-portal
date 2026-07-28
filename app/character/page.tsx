import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: c, error } = await supabase.from("characters").select("*").eq("user_id", user.id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!c) redirect("/character/create");
  return <Profile character={c} own />;
}

export function Profile({ character: c, own = false, messageAction = null }: { character: Record<string, any>; own?: boolean; messageAction?: React.ReactNode }) {
  const items = [["Pronouns", c.pronouns], ["Born", c.date_of_birth], ["Birthplace", c.birthplace], ["Origin", c.origin], ["Occupation", c.occupation], ["Faction", c.faction], ["Title", c.title]];
  const sections = [["Physical description", c.physical_description], ["Personality", c.personality], ["Biography", c.biography], ["Public notes", c.public_notes]];
  return <main className="min-h-screen bg-[#100d0b] px-5 py-10 text-[#e7d5b0]"><div className="mx-auto max-w-5xl"><div className="flex items-center justify-between gap-4"><Link href={own ? "/" : "/game"} className="text-[#b8945d]">← Return</Link><div className="flex items-center gap-3">{messageAction}{own && <Link href="/character/edit" className="text-[#efd4a0]">Edit character</Link>}</div></div><section className="mt-8 grid gap-8 border border-[#654b2e]/50 bg-[#17110d] p-7 sm:grid-cols-[260px_1fr]"><div>{c.portrait_url ? <img src={c.portrait_url} alt={`Portrait of ${c.display_name}`} className="aspect-[3/4] w-full object-cover" /> : <div className="flex aspect-[3/4] items-center justify-center bg-[#0d0a08] text-5xl">?</div>}</div><div><p className="text-[10px] uppercase tracking-[0.3em] text-[#876a46]">Character profile</p><h1 className="mt-3 font-serif text-5xl text-[#ecd9b2]">{c.display_name}</h1><div className="mt-8 grid gap-px bg-[#4f3b28]/35 sm:grid-cols-2">{items.map(([label,value]) => <div key={label} className="bg-[#17110d] p-4"><p className="text-[9px] uppercase tracking-[0.25em] text-[#796448]">{label}</p><p className="mt-2 text-sm text-[#cab89b]">{value || "Not recorded"}</p></div>)}</div></div></section><div className="mt-6 space-y-6">{sections.map(([title,value]) => <article key={title} className="border border-[#6b5032]/50 bg-[#17110d] p-7"><h2 className="font-serif text-3xl text-[#dfc79c]">{title}</h2><p className="mt-5 whitespace-pre-line text-sm leading-8 text-[#b0a18d]">{value || "No information has been added yet."}</p></article>)}</div></div></main>;
}
