import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MessageComposer from "../components/MessageComposer";
import ConversationRealtime from "./components/ConversationRealtime";
import { toggleArchive, toggleBlock } from "../actions";
import type { DirectMessage } from "@/types/messages";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: character } = await supabase.from("characters").select("id").eq("user_id", user.id).maybeSingle();
  if (!character) redirect("/character/create");
  const { data: membership } = await supabase.from("direct_conversation_participants").select("conversation_id").eq("conversation_id", id).eq("character_id", character.id).maybeSingle();
  if (!membership) notFound();

  const [{ data: otherParticipant }, { data: rawMessages = [], error: messagesError }] = await Promise.all([
    supabase.from("direct_conversation_participants").select("character:characters(id,display_name,portrait_url)").eq("conversation_id", id).neq("character_id", character.id).maybeSingle(),
    supabase.from("direct_messages").select("id,body,created_at,sender_character_id,sender:characters!direct_messages_sender_character_id_fkey(id,display_name,portrait_url)").eq("conversation_id", id).order("created_at", { ascending: true }).limit(200),
  ]);
  if (messagesError) throw new Error(messagesError.message);
  const relation = otherParticipant?.character;
  const other = Array.isArray(relation) ? relation[0] : relation;
  if (!other) notFound();
  const { data: blockedByMe } = await supabase.from("character_blocks").select("blocked_character_id").eq("blocker_character_id", character.id).eq("blocked_character_id", other.id).maybeSingle();
  const { data: blockedMe } = await supabase.from("character_blocks").select("blocker_character_id").eq("blocker_character_id", other.id).eq("blocked_character_id", character.id).maybeSingle();
  const blocked = Boolean(blockedByMe || blockedMe);

  return (
    <main className="min-h-screen bg-[#100d0b] text-[#e7d5b0]">
      <ConversationRealtime conversationId={id} />
      <header className="border-b border-[#654b2e]/40 bg-[#0c0a08]/90"><div className="mx-auto flex min-h-20 max-w-[1000px] items-center justify-between px-5"><Link href="/messages" className="text-xs uppercase tracking-[0.2em] text-[#a98b61]">← Messages</Link><Link href="/" className="font-serif text-xl tracking-[0.22em] text-[#d9bd82]">SEPULCHRIA</Link></div></header>
      <div className="mx-auto max-w-[1000px] px-5 py-8">
        <section className="border border-[#60482e]/45 bg-[#15100d]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#59432c]/40 p-5 sm:p-6"><Link href={`/character/${other.id}`} className="flex items-center gap-4"><div className="h-14 w-14 overflow-hidden border border-[#60482e] bg-[#0d0a08]">{other.portrait_url ? <img src={other.portrait_url} alt="" className="h-full w-full object-cover" /> : null}</div><div><p className="text-[9px] uppercase tracking-[0.25em] text-[#826b4d]">Conversation with</p><h1 className="mt-1 font-serif text-2xl text-[#dec69a]">{other.display_name}</h1></div></Link><div className="flex gap-2"><form action={toggleArchive}><input type="hidden" name="conversationId" value={id} /><input type="hidden" name="archive" value="true" /><button className="border border-[#59432c] px-3 py-2 text-[10px] uppercase tracking-[0.18em]">Archive</button></form><form action={toggleBlock}><input type="hidden" name="characterId" value={other.id} /><input type="hidden" name="block" value={blockedByMe ? "false" : "true"} /><button className="border border-[#7b4035] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#d99b8e]">{blockedByMe ? "Unblock" : "Block"}</button></form></div></div>
          <div className="max-h-[58vh] space-y-4 overflow-y-auto p-5 sm:p-6">
            {((rawMessages ?? []) as DirectMessage[]).map((message) => { const sender = Array.isArray(message.sender) ? message.sender[0] : message.sender; const own = message.sender_character_id === character.id; return <article key={message.id} className={`max-w-[82%] border p-4 ${own ? "ml-auto border-[#80613c] bg-[#2c2117]" : "border-[#514233] bg-[#100c09]"}`}><div className="flex items-center justify-between gap-4"><p className="font-serif text-sm text-[#d8bf91]">{sender?.display_name ?? "Unknown"}</p><time className="text-[9px] uppercase tracking-[0.16em] text-[#776b5c]">{new Date(message.created_at).toLocaleString("en-GB")}</time></div><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#c7b79d]">{message.body}</p></article>; })}
            {(rawMessages ?? []).length === 0 ? <p className="py-12 text-center text-sm text-[#8f8271]">Begin the conversation.</p> : null}
          </div>
          {blocked ? <p className="border-t border-[#59432c]/40 p-6 text-center text-sm text-[#c78f7e]">Messaging is disabled for this conversation.</p> : <MessageComposer conversationId={id} />}
        </section>
      </div>
    </main>
  );
}
