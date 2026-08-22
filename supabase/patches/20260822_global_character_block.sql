-- GLOBAL CHARACTER BLOCK — database enforcement
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
