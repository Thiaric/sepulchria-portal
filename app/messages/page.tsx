import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toggleArchive } from "./actions";

type Props = { searchParams: Promise<{ archived?: string }> };

type ParticipantRow = {
  conversation_id: string;
  archived_at: string | null;
  last_read_at: string;
  conversation: { id: string; updated_at: string } | { id: string; updated_at: string }[] | null;
};

export default async function MessagesPage({ searchParams }: Props) {
  const { archived } = await searchParams;
  const showArchived = archived === "1";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: character } = await supabase.from("characters").select("id,display_name").eq("user_id", user.id).maybeSingle();
  if (!character) redirect("/character/create");

  let query = supabase.from("direct_conversation_participants")
    .select("conversation_id,archived_at,last_read_at,conversation:direct_conversations(id,updated_at)")
    .eq("character_id", character.id);
  query = showArchived ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  const { data: rows = [], error } = await query;
  if (error) throw new Error(error.message);

  const conversations = await Promise.all((rows as ParticipantRow[]).map(async (row) => {
    const conversation = Array.isArray(row.conversation) ? row.conversation[0] : row.conversation;
    if (!conversation) return null;
    const [{ data: otherParticipant }, { data: lastMessage }, { count: unreadCount }] = await Promise.all([
      supabase.from("direct_conversation_participants").select("character:characters(id,display_name,portrait_url)").eq("conversation_id", row.conversation_id).neq("character_id", character.id).maybeSingle(),
      supabase.from("direct_messages").select("body,created_at,sender_character_id").eq("conversation_id", row.conversation_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("direct_messages").select("id", { count: "exact", head: true }).eq("conversation_id", row.conversation_id).neq("sender_character_id", character.id).gt("created_at", row.last_read_at),
    ]);
    const relation = otherParticipant?.character;
    const other = Array.isArray(relation) ? relation[0] : relation;
    return { id: row.conversation_id, updated_at: conversation.updated_at, archived_at: row.archived_at, other, lastMessage, unreadCount: unreadCount ?? 0 };
  }));

  const valid = conversations.filter(Boolean).sort((a, b) => Date.parse(b!.updated_at) - Date.parse(a!.updated_at));

  return (
    <main className="min-h-screen bg-[#100d0b] text-[#e7d5b0]">
      <header className="border-b border-[#654b2e]/40 bg-[#0c0a08]/90"><div className="mx-auto flex min-h-20 max-w-[1200px] items-center justify-between px-5"><Link href="/" className="font-serif text-2xl tracking-[0.22em] text-[#d9bd82]">SEPULCHRIA</Link><Link href="/game" className="text-xs uppercase tracking-[0.2em] text-[#a98b61]">Return to game</Link></div></header>
      <div className="mx-auto max-w-[1200px] px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#654b2e]/40 pb-6"><div><p className="text-[10px] uppercase tracking-[0.32em] text-[#927047]">Private correspondence</p><h1 className="mt-2 font-serif text-4xl text-[#ecd9b2]">Messages</h1></div><div className="flex gap-2"><Link href="/messages" className={`border px-4 py-2 text-xs uppercase tracking-[0.18em] ${!showArchived ? "border-[#967342] bg-[#3b2b1b]" : "border-[#59432c]"}`}>Inbox</Link><Link href="/messages?archived=1" className={`border px-4 py-2 text-xs uppercase tracking-[0.18em] ${showArchived ? "border-[#967342] bg-[#3b2b1b]" : "border-[#59432c]"}`}>Archived</Link></div></div>
        <div className="mt-6 space-y-3">
          {valid.map((item) => item && (
            <article key={item.id} className="flex flex-col gap-4 border border-[#60482e]/45 bg-[#15100d] p-5 sm:flex-row sm:items-center">
              <Link href={`/messages/${item.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                <div className="h-14 w-14 shrink-0 overflow-hidden border border-[#60482e] bg-[#0d0a08]">{item.other?.portrait_url ? <img src={item.other.portrait_url} alt="" className="h-full w-full object-cover" /> : null}</div>
                <div className="min-w-0"><div className="flex items-center gap-3"><h2 className="truncate font-serif text-xl text-[#dec69a]">{item.other?.display_name ?? "Unknown character"}</h2>{item.unreadCount > 0 ? <span className="rounded-full bg-[#8b3c32] px-2 py-1 text-[10px] font-bold">{item.unreadCount}</span> : null}</div><p className="mt-2 truncate text-sm text-[#9f907c]">{item.lastMessage?.body ?? "No messages yet."}</p></div>
              </Link>
              <form action={toggleArchive}><input type="hidden" name="conversationId" value={item.id} /><input type="hidden" name="archive" value={showArchived ? "false" : "true"} /><button className="border border-[#59432c] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#a98b61]">{showArchived ? "Restore" : "Archive"}</button></form>
            </article>
          ))}
          {valid.length === 0 ? <p className="border border-[#60482e]/45 bg-[#15100d] p-8 text-center text-sm text-[#8f8271]">No conversations here yet.</p> : null}
        </div>
      </div>
    </main>
  );
}
