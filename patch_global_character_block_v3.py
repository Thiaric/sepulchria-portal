#!/usr/bin/env python3
# Sepulchria Global Character Block patch
# Baseline inspected: 1e576eacc7ae91cee5b78f4771f45e03546b8035
# LOCAL ONLY: this script never commits, branches, pushes, deploys, or writes to GitHub.

from __future__ import annotations
import argparse, difflib, subprocess, sys
from pathlib import Path

BASELINE = "1e576eacc7ae91cee5b78f4771f45e03546b8035"

def head():
    try:
        return subprocess.check_output(["git","rev-parse","HEAD"], text=True).strip()
    except Exception:
        return None

def dirty():
    try:
        return bool(subprocess.check_output(["git","status","--porcelain"], text=True).strip())
    except Exception:
        return False

def read(p):
    if not p.exists():
        raise SystemExit(f"ERROR: missing expected file: {p}")
    return p.read_text(encoding="utf-8")

def once(text, old, new, label):
    n = text.count(old)
    optional_absent = {
        "remove PM block import",
        "remove PM blockedByMe variable",
        "remove PM block UI",
    }
    if n == 0 and label in optional_absent:
        return text
    if n != 1:
        raise SystemExit(f"ERROR: {label}: expected anchor once, found {n}. Nothing written.")
    return text.replace(old, new, 1)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--allow-different-head", action="store_true")
    a = ap.parse_args()

    root = Path.cwd()
    if not (root/"package.json").exists():
        raise SystemExit("Run this from the sepulchria-portal repository root.")

    h = head()
    if h and h != BASELINE and not a.allow_different_head:
        raise SystemExit(
            f"HEAD is {h}; this patch was built against {BASELINE}. "
            "Use --allow-different-head only if you intentionally have later local commits."
        )
    if dirty() and not a.dry_run:
        raise SystemExit("Working tree is not clean. Commit/stash first, or use --dry-run.")

    changes = {}

    def edit(rel, fn):
        p = root/rel
        old = read(p)
        new = fn(old)
        if new != old:
            changes[p] = (old,new)

    def add(rel, new):
        p = root/rel
        old = p.read_text(encoding="utf-8") if p.exists() else ""
        changes[p] = (old,new)

    # 1) Dedicated GLOBAL block action.
    add("app/(portal)/characters/block-actions.ts", r'''"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("Missing Supabase server credentials.");
  return createAdminClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function toggleGlobalCharacterBlock(formData: FormData) {
  const targetCharacterId = String(formData.get("targetCharacterId") ?? "").trim();
  const block = String(formData.get("block") ?? "false") === "true";
  if (!targetCharacterId) throw new Error("Missing character.");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: actor, error: actorError } = await supabase
    .from("characters").select("id").eq("user_id", user.id).maybeSingle();
  if (actorError) throw new Error(actorError.message);
  if (!actor) redirect("/character/create");
  if (actor.id === targetCharacterId) throw new Error("You cannot block yourself.");

  const admin = adminClient();
  const { data: target, error: targetError } = await admin
    .from("characters")
    .select("id, public_slug, is_system")
    .eq("id", targetCharacterId)
    .maybeSingle();

  if (targetError) throw new Error(targetError.message);
  if (!target || target.is_system) throw new Error("That character cannot be blocked.");

  if (block) {
    const { error } = await admin.from("character_blocks").upsert(
      {
        blocker_character_id: actor.id,
        blocked_character_id: targetCharacterId,
      },
      { onConflict: "blocker_character_id,blocked_character_id" },
    );
    if (error) throw new Error(error.message);

    const { error: friendError } = await admin
      .from("character_friend_entries")
      .delete()
      .or([
        `and(owner_character_id.eq.${actor.id},target_character_id.eq.${targetCharacterId})`,
        `and(owner_character_id.eq.${targetCharacterId},target_character_id.eq.${actor.id})`,
      ].join(","));
    if (friendError) throw new Error(friendError.message);
  } else {
    const { error } = await admin.from("character_blocks")
      .delete()
      .eq("blocker_character_id", actor.id)
      .eq("blocked_character_id", targetCharacterId);
    if (error) throw new Error(error.message);
  }

  for (const path of ["/characters","/friends","/messages","/forum","/game","/admin/communication-logs"]) {
    revalidatePath(path);
  }
  if (target.public_slug) revalidatePath(`/characters/${target.public_slug}`);
}
''')

    # 2) Character profile page knows mutual block state.
    def profile_page(t):
        t = once(t,
'''  let canUseFriendList = false;
  let isInFriendList = false;
''',
'''  let canUseFriendList = false;
  let isInFriendList = false;
  let blockedByViewer = false;
  let blockedViewer = false;
''', "profile state")

        t = once(t,
'''    canUseFriendList =
      await hasCharacterFeature(
        activeCharacter.id,
        "friend_list",
      );

    if (canUseFriendList) {
''',
'''    const { data: blockRows, error: blockError } = await supabase
      .from("character_blocks")
      .select("blocker_character_id, blocked_character_id")
      .or([
        `and(blocker_character_id.eq.${activeCharacter.id},blocked_character_id.eq.${character.id})`,
        `and(blocker_character_id.eq.${character.id},blocked_character_id.eq.${activeCharacter.id})`,
      ].join(","));

    if (blockError) throw new Error(`Unable to check block state: ${blockError.message}`);

    blockedByViewer = (blockRows ?? []).some((row) =>
      row.blocker_character_id === activeCharacter.id &&
      row.blocked_character_id === character.id
    );
    blockedViewer = (blockRows ?? []).some((row) =>
      row.blocker_character_id === character.id &&
      row.blocked_character_id === activeCharacter.id
    );

    canUseFriendList =
      !blockedByViewer &&
      !blockedViewer &&
      (await hasCharacterFeature(activeCharacter.id, "friend_list"));

    if (canUseFriendList) {
''', "profile block lookup")

        t = once(t,
'''        canMessage={
          Boolean(activeCharacter) &&
          activeCharacter?.id !== character.id
        }
''',
'''        canMessage={
          Boolean(activeCharacter) &&
          activeCharacter?.id !== character.id &&
          !blockedByViewer &&
          !blockedViewer
        }
        canBlock={
          Boolean(activeCharacter) &&
          activeCharacter?.id !== character.id &&
          character.is_system !== true
        }
        blockedByViewer={blockedByViewer}
        hasGlobalBlock={blockedByViewer || blockedViewer}
''', "profile block props")
        return t
    edit("app/(portal)/characters/[slug]/page.tsx", profile_page)

    # 3) Block/Unblock on profile, beside Friend List.
    def profile_component(t):
        t = once(t,
'''import { startConversation } from "@/app/(portal)/messages/actions";
import { addFriendListEntry } from "@/app/(portal)/friends/actions";
''',
'''import { startConversation } from "@/app/(portal)/messages/actions";
import { addFriendListEntry } from "@/app/(portal)/friends/actions";
import { toggleGlobalCharacterBlock } from "@/app/(portal)/characters/block-actions";
''', "profile import")

        t = once(t,
'''  canUseFriendList: boolean;
  isInFriendList: boolean;
};
''',
'''  canUseFriendList: boolean;
  isInFriendList: boolean;
  canBlock: boolean;
  blockedByViewer: boolean;
  hasGlobalBlock: boolean;
};
''', "profile prop type")

        t = once(t,
'''  canUseFriendList,
  isInFriendList,
}: PublicCharacterProfileProps) {
''',
'''  canUseFriendList,
  isInFriendList,
  canBlock,
  blockedByViewer,
  hasGlobalBlock,
}: PublicCharacterProfileProps) {
''', "profile destructure")

        t = once(t,
'''          {canMessage ? (
            <form action={startConversation}>
''',
'''          {canBlock ? (
            <form action={toggleGlobalCharacterBlock}>
              <input type="hidden" name="targetCharacterId" value={character.id} />
              <input type="hidden" name="block" value={blockedByViewer ? "false" : "true"} />
              <button
                type="submit"
                className="inline-flex items-center gap-2 border border-[rgb(var(--sep-colour-7b4035))] bg-[rgb(var(--sep-colour-24100d))] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-d99b8e))] transition hover:bg-[rgb(var(--sep-colour-351713))]"
              >
                {blockedByViewer ? "Unblock Character" : "Block Character"}
              </button>
            </form>
          ) : null}

          {hasGlobalBlock && !blockedByViewer ? (
            <span className="inline-flex items-center border border-[rgb(var(--sep-colour-60482e))]/55 px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-8f8170))]">
              Communication unavailable
            </span>
          ) : null}

          {canMessage ? (
            <form action={startConversation}>
''', "profile button")
        return t
    edit("components/characters/public-character-profile.tsx", profile_component)

    # 4) Friend List: mutual block server-side.
    # The file contains several character_friend_entries mutations, so patch
    # the addFriendListEntry upsert specifically instead of a generic anchor.
    def friends(t):
        needle = '''  const { error } = await admin
    .from("character_friend_entries")
'''
        positions = []
        pos = 0
        while True:
            pos = t.find(needle, pos)
            if pos < 0:
                break
            positions.append(pos)
            pos += len(needle)

        target_pos = None
        for candidate in positions:
            window = t[candidate:candidate + 900]
            if ".upsert(" in window and "targetCharacterId" in window and "owner_character_id" in window:
                target_pos = candidate
                break

        if target_pos is None:
            raise SystemExit(
                "ERROR: friend enforcement: could not identify the addFriendListEntry upsert. Nothing written."
            )

        insertion = '''  const { data: blockRows, error: blockError } = await admin
    .from("character_blocks")
    .select("blocker_character_id")
    .or([
      `and(blocker_character_id.eq.${owner.id},blocked_character_id.eq.${targetCharacterId})`,
      `and(blocker_character_id.eq.${targetCharacterId},blocked_character_id.eq.${owner.id})`,
    ].join(","))
    .limit(1);

  if (blockError) throw new Error(blockError.message);
  if ((blockRows ?? []).length > 0) {
    throw new Error("This character cannot be added to your Friend List.");
  }

'''
        return t[:target_pos] + insertion + t[target_pos:]

    edit("app/(portal)/friends/actions.ts", friends)

    # 5) Whispers only: ordinary IC remains untouched.
    def game(t):
        return once(t,
'''  return {
    ok: true,
    recipient:
      recipient as WhisperRecipient,
  };
}

export async function sendRoomMessage(
''',
'''  const { data: blockRows, error: blockError } = await supabase
    .from("character_blocks")
    .select("blocker_character_id")
    .or([
      `and(blocker_character_id.eq.${senderCharacterId},blocked_character_id.eq.${recipientId})`,
      `and(blocker_character_id.eq.${recipientId},blocked_character_id.eq.${senderCharacterId})`,
    ].join(","))
    .limit(1);

  if (blockError) {
    return { ok: false, message: `Unable to verify whisper availability: ${blockError.message}` };
  }

  if ((blockRows ?? []).length > 0) {
    return { ok: false, message: "That character is not available for whispers." };
  }

  return {
    ok: true,
    recipient:
      recipient as WhisperRecipient,
  };
}

export async function sendRoomMessage(
''', "whisper enforcement")
    edit("app/(portal)/game/actions.ts", game)

    # 6) Forum quote: author lookup + mutual block enforcement.
    def forum(t):
        old = '''      .select("id, topic_id")
      .eq("id", quotedPostId)
      .maybeSingle<{
        id: string;
        topic_id: string;
      }>();
'''
        # There may be only one in current reply action; require exactly one.
        t = once(t, old,
'''      .select("id, topic_id, author_character_id")
      .eq("id", quotedPostId)
      .maybeSingle<{
        id: string;
        topic_id: string;
        author_character_id: string | null;
      }>();
''', "forum quoted author")

        t = once(t,
'''    }
  }

  const {
    data: createdPost,
''',
'''    }

    if (
      quotedPost.author_character_id &&
      quotedPost.author_character_id !== character!.id
    ) {
      const { data: quoteBlocks, error: quoteBlockError } = await supabase
        .from("character_blocks")
        .select("blocker_character_id")
        .or([
          `and(blocker_character_id.eq.${character!.id},blocked_character_id.eq.${quotedPost.author_character_id})`,
          `and(blocker_character_id.eq.${quotedPost.author_character_id},blocked_character_id.eq.${character!.id})`,
        ].join(","))
        .limit(1);

      if (quoteBlockError) return { success: false, message: quoteBlockError.message };
      if ((quoteBlocks ?? []).length > 0) {
        return {
          success: false,
          message: "You cannot quote this character.",
          fieldErrors: { quotedPostId: "Remove the quote and try again." },
        };
      }
    }
  }

  const {
    data: createdPost,
''', "forum quote enforcement")
        return t
    edit("app/(portal)/forum/actions.ts", forum)

    # 7) Forum Flag recipient picker filters blocked characters, so bulk
    # ancestry/association selections cannot include them.
    def flags(t):
        t = once(t,
'''  const {
    characters,
    races,
    associations,
  } =
    await getAccessibleCharacterRows(
      sectionId,
      senderData.id,
    );

  const [
''',
'''  const {
    characters: rawCharacters,
    races,
    associations,
  } =
    await getAccessibleCharacterRows(
      sectionId,
      senderData.id,
    );

  const { data: blockRows, error: blockError } = await supabase
    .from("character_blocks")
    .select("blocker_character_id, blocked_character_id")
    .or([
      `blocker_character_id.eq.${senderData.id}`,
      `blocked_character_id.eq.${senderData.id}`,
    ].join(","));

  if (blockError) throw new Error(`Unable to filter blocked characters: ${blockError.message}`);

  const blockedIds = new Set<string>();
  for (const row of blockRows ?? []) {
    const blocker = String(row.blocker_character_id);
    const blocked = String(row.blocked_character_id);
    blockedIds.add(blocker === senderData.id ? blocked : blocker);
  }

  const characters = rawCharacters.filter(
    (character) => !blockedIds.has(character.id),
  );

  const [
''', "forum flag picker")
        return t
    edit("app/(portal)/forum/flag-actions.ts", flags)

    # 8) Remove PM-specific Block button/import. Global action lives on profile.
    def pm_page(t):
        t = once(t,
'''import {

  toggleArchive,
  toggleBlock,
} from "../actions";
''',
'''import {
  toggleArchive,
} from "../actions";
''', "remove PM block import")

        t = once(t,
'''  const blockedByMe =
    Boolean(
      blockedByMeResult.data,
    );

  const blocked =
''',
'''  const blocked =
''', "remove PM blockedByMe variable")

        t = once(t,
'''              <form
                action={
                  toggleBlock
                }
              >
                <input
                  type="hidden"
                  name="characterId"
                  value={other.id}
                />

                <input
                  type="hidden"
                  name="block"
                  value={
                    blockedByMe
                      ? "false"
                      : "true"
                  }
                />

                <button
                  type="submit"
                  className="border border-[rgb(var(--sep-colour-7b4035))] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-d99b8e))]"
                >
                  {blockedByMe
                    ? "Unblock"
                    : "Block"}
                </button>
              </form>
''', "", "remove PM block UI")
        return t
    edit("app/(portal)/messages/[id]/page.tsx", pm_page)

    def pm_actions(t):
        marker = "\nexport async function toggleBlock(formData: FormData): Promise<void> {"
        i = t.find(marker)
        if i < 0:
            return t
        return t[:i].rstrip() + "\n"
    edit("app/(portal)/messages/actions.ts", pm_actions)

    # 9) Instant Chat: remove blocked contacts + recheck immediately before RPC.
    def instant(t):
        t = once(t,
'''      const rpcContacts =
        (data ?? []) as Contact[];

      /*
''',
'''      const rawRpcContacts =
        (data ?? []) as Contact[];

      const { data: blockRows, error: blockError } = await supabase
        .from("character_blocks")
        .select("blocker_character_id, blocked_character_id")
        .or([
          `blocker_character_id.eq.${characterId}`,
          `blocked_character_id.eq.${characterId}`,
        ].join(","));

      if (blockError) console.error("Instant chat block filter:", blockError.message);

      const blockedIds = new Set<string>();
      for (const row of blockRows ?? []) {
        const blocker = String(row.blocker_character_id);
        const blocked = String(row.blocked_character_id);
        blockedIds.add(blocker === characterId ? blocked : blocker);
      }

      const rpcContacts = rawRpcContacts.filter(
        (contact) => !blockedIds.has(contact.character_id),
      );

      /*
''', "instant contact filter")

        t = once(t,
'''    const {
      error: sendError,
    } = await supabase.rpc(
      "send_instant_chat_message",
''',
'''    if (characterId) {
      const { data: blockRows, error: blockError } = await supabase
        .from("character_blocks")
        .select("blocker_character_id")
        .or([
          `and(blocker_character_id.eq.${characterId},blocked_character_id.eq.${openChat.characterId})`,
          `and(blocker_character_id.eq.${openChat.characterId},blocked_character_id.eq.${characterId})`,
        ].join(","))
        .limit(1);

      if (blockError) {
        setDraft(body);
        setError(blockError.message);
        setBusy(false);
        return;
      }

      if ((blockRows ?? []).length > 0) {
        setDraft(body);
        setError("This character is not available for Instant Chat.");
        setBusy(false);
        setOpenChat(null);
        await loadContacts();
        return;
      }
    }

    const {
      error: sendError,
    } = await supabase.rpc(
      "send_instant_chat_message",
''', "instant send enforcement")
        return t
    edit("components/instant-chat/instant-chat-dock.tsx", instant)

    # 10) Admin Communication Logs: Character Blocks tab/log.
    def logs(t):
        t = once(t,
'''  const view =
    params.view === "chat" ||
    params.view === "instant"
      ? params.view
      : "pm";
''',
'''  const view =
    params.view === "chat" ||
    params.view === "instant" ||
    params.view === "blocks"
      ? params.view
      : "pm";
''', "logs view")

        t = once(t,
'''      : view === "instant"
        ? await loadInstantChatMessages(
            params,
            characters,
          )
        : await loadRoomMessages(
''',
'''      : view === "instant"
        ? await loadInstantChatMessages(
            params,
            characters,
          )
        : view === "blocks"
          ? await loadCharacterBlocks(
              params,
              characters,
            )
        : await loadRoomMessages(
''', "logs route")

        instant_link = '''          <ViewLink
            active={
              view ===
              "instant"
            }
            href={buildHref(
              params,
              {
                view: "instant",
                room: null,
                kind: null,
                type: null,
              },
            )}
          >
            Instant Chats
          </ViewLink>
'''
        t = once(t, instant_link, instant_link + '''
          <ViewLink
            active={view === "blocks"}
            href={buildHref(params, {
              view: "blocks",
              room: null,
              kind: null,
              type: null,
              conversation: null,
            })}
          >
            Character Blocks
          </ViewLink>
''', "logs tab")

        loader = r'''
async function loadCharacterBlocks(
  params: SearchParams,
  characters: CharacterOption[],
) {
  const supabase = createAdminClient();

  let query = supabase
    .from("character_blocks")
    .select("blocker_character_id, blocked_character_id, created_at")
    .order("created_at", { ascending: false })
    .limit(250);

  if (params.character?.trim()) {
    query = query.or([
      `blocker_character_id.eq.${params.character.trim()}`,
      `blocked_character_id.eq.${params.character.trim()}`,
    ].join(","));
  }

  const from = startOfDay(params.from);
  const to = endOfDay(params.to);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  const { data: rows, error } = await query;
  if (error) throw new Error(`Unable to load Character Block logs: ${error.message}`);

  const names = new Map(
    characters.map((character) => [character.id, characterName(character)]),
  );

  return (
    <section className="mt-4 space-y-2">
      {(rows ?? []).map((row) => (
        <article
          key={`${row.blocker_character_id}:${row.blocked_character_id}`}
          className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-15100d))] p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-serif text-base text-[rgb(var(--sep-colour-dcc49a))]">
                {names.get(String(row.blocker_character_id)) ?? "Unknown character"}
                {" → "}
                {names.get(String(row.blocked_character_id)) ?? "Unknown character"}
              </p>
              <p className="mt-1 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-806f5b))]">
                Character Block
              </p>
            </div>
            <p className="text-[9px] text-[rgb(var(--sep-colour-9b8768))]">
              {formatDateTime(String(row.created_at))}
            </p>
          </div>
        </article>
      ))}
      {!rows?.length ? <EmptyState message="No Character Blocks match these filters." /> : null}
    </section>
  );
}

'''
        t = once(t, "\nfunction ViewLink({\n", "\n"+loader+"function ViewLink({\n", "logs loader")
        return t
    edit("app/(portal)/admin/communication-logs/page.tsx", logs)

    # 11) SQL database enforcement. character_blocks already exists in baseline.
    add("supabase/patches/20260822_global_character_block.sql", r'''-- GLOBAL CHARACTER BLOCK — database enforcement
-- Run in Supabase SQL Editor after applying the code patch.
begin;

create or replace function public.characters_have_global_block(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.character_blocks cb
    where (cb.blocker_character_id=a and cb.blocked_character_id=b)
       or (cb.blocker_character_id=b and cb.blocked_character_id=a)
  );
$$;

create or replace function public.enforce_block_friend()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if public.characters_have_global_block(new.owner_character_id,new.target_character_id) then
    raise exception 'This character cannot be added to a Friend List.';
  end if;
  return new;
end $$;

drop trigger if exists trg_global_block_friend on public.character_friend_entries;
create trigger trg_global_block_friend before insert or update
on public.character_friend_entries for each row execute function public.enforce_block_friend();

create or replace function public.remove_friends_after_block()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  delete from public.character_friend_entries
  where (owner_character_id=new.blocker_character_id and target_character_id=new.blocked_character_id)
     or (owner_character_id=new.blocked_character_id and target_character_id=new.blocker_character_id);
  return new;
end $$;

drop trigger if exists trg_remove_friends_after_block on public.character_blocks;
create trigger trg_remove_friends_after_block after insert
on public.character_blocks for each row execute function public.remove_friends_after_block();

-- IMPORTANT: ONLY WHISPERS are blocked. Normal IC room interaction is untouched.
create or replace function public.enforce_block_whisper()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.message_type='whisper'
     and new.whisper_recipient_character_id is not null
     and public.characters_have_global_block(new.character_id,new.whisper_recipient_character_id)
  then
    raise exception 'That character is not available for whispers.';
  end if;
  return new;
end $$;

drop trigger if exists trg_global_block_whisper on public.room_messages;
create trigger trg_global_block_whisper before insert or update
on public.room_messages for each row execute function public.enforce_block_whisper();

create or replace function public.enforce_block_direct_message()
returns trigger language plpgsql security definer set search_path=public as $$
declare other_id uuid;
begin
  for other_id in
    select p.character_id
    from public.direct_conversation_participants p
    where p.conversation_id=new.conversation_id
      and p.character_id<>new.sender_character_id
      and p.deleted_at is null
  loop
    if public.characters_have_global_block(new.sender_character_id,other_id) then
      raise exception 'This conversation is unavailable.';
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists trg_global_block_direct_message on public.direct_messages;
create trigger trg_global_block_direct_message before insert
on public.direct_messages for each row execute function public.enforce_block_direct_message();

-- Instant Chat remains additionally checked immediately before its RPC in the app.
-- If your live Instant Chat conversation table uses character_one_id/character_two_id,
-- install a hard DB trigger automatically.
do $$
declare c1 boolean; c2 boolean;
begin
  select exists(select 1 from information_schema.columns
    where table_schema='public' and table_name='instant_chat_conversations'
      and column_name='character_one_id') into c1;
  select exists(select 1 from information_schema.columns
    where table_schema='public' and table_name='instant_chat_conversations'
      and column_name='character_two_id') into c2;

  if c1 and c2 then
    execute $fn$
      create or replace function public.enforce_block_instant_message()
      returns trigger language plpgsql security definer set search_path=public as $body$
      declare a uuid; b uuid;
      begin
        select character_one_id, character_two_id into a,b
        from public.instant_chat_conversations where id=new.conversation_id;
        if public.characters_have_global_block(a,b) then
          raise exception 'This character is not available for Instant Chat.';
        end if;
        return new;
      end $body$
    $fn$;
    execute 'drop trigger if exists trg_global_block_instant on public.instant_chat_messages';
    execute 'create trigger trg_global_block_instant before insert on public.instant_chat_messages for each row execute function public.enforce_block_instant_message()';
  else
    raise notice 'Instant Chat DB schema differs; app-level mutual block enforcement was patched, but the live RPC should be hardened after inspecting its actual conversation schema.';
  end if;
end $$;

commit;
''')

    if a.dry_run:
        for p,(old,new) in changes.items():
            rel = p.relative_to(root)
            print(f"\n===== {rel} =====")
            sys.stdout.writelines(difflib.unified_diff(
                old.splitlines(True), new.splitlines(True),
                fromfile=f"a/{rel}", tofile=f"b/{rel}"
            ))
        print("\nDRY RUN ONLY — no files written.")
        return

    for p,(_,new) in changes.items():
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(new, encoding="utf-8", newline="\n")
        print("patched:", p.relative_to(root))

    print("\nApplied LOCALLY only. No GitHub write was performed.")
    print("Next: npm run build")
    print("Then run supabase/patches/20260822_global_character_block.sql in Supabase SQL Editor.")

if __name__ == "__main__":
    main()
