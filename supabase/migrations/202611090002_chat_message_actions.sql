alter table public.messages
  add column if not exists reply_to_message_id uuid references public.messages(id) on delete set null,
  add column if not exists edited_at timestamptz;

create or replace function public.validate_message_reply()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.reply_to_message_id is not null and not exists (
    select 1 from public.messages original
    where original.id = new.reply_to_message_id
      and original.conversation_id = new.conversation_id
  ) then
    raise exception 'Reply target must be a message in the same conversation';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_validate_reply on public.messages;
create trigger messages_validate_reply before insert or update of reply_to_message_id, conversation_id
on public.messages for each row execute function public.validate_message_reply();

create or replace function public.edit_marketplace_message(p_message_id uuid, p_message_text text)
returns public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_message public.messages;
begin
  if (select auth.uid()) is null then raise exception 'Sign in to edit a message'; end if;
  update public.messages
  set message_text = btrim(p_message_text), edited_at = now()
  where id = p_message_id
    and sender_id = (select auth.uid())
    and message_type = 'text'
    and char_length(btrim(p_message_text)) > 0
  returning * into v_message;
  if v_message.id is null then raise exception 'Message not found or cannot be edited'; end if;
  return v_message;
end;
$$;
revoke all on function public.edit_marketplace_message(uuid, text) from public, anon;
grant execute on function public.edit_marketplace_message(uuid, text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
