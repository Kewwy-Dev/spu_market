-- One sales conversation per buyer/seller pair, with realtime text and image messages.
alter table public.conversations
  drop constraint if exists conversations_product_id_seller_id_buyer_id_key;
with ranked as (
  select id, first_value(id) over (partition by seller_id, buyer_id order by updated_at desc, created_at desc) as keep_id
  from public.conversations
), duplicates as (
  select id, keep_id from ranked where id <> keep_id
)
update public.messages m set conversation_id = d.keep_id
from duplicates d where m.conversation_id = d.id;
with ranked as (
  select id, first_value(id) over (partition by seller_id, buyer_id order by updated_at desc, created_at desc) as keep_id
  from public.conversations
)
delete from public.conversations c using ranked r where c.id = r.id and r.id <> r.keep_id;
alter table public.conversations
  add constraint conversations_seller_buyer_key unique (seller_id, buyer_id);

create or replace function public.open_marketplace_conversation(p_product_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_buyer_id uuid := (select auth.uid());
  v_seller_id uuid;
  v_conversation_id uuid;
begin
  if v_buyer_id is null then raise exception 'Sign in to start a conversation'; end if;
  select seller_id into v_seller_id from public.products where id = p_product_id and status = 'active';
  if v_seller_id is null then raise exception 'This product is no longer available'; end if;
  if v_seller_id = v_buyer_id then raise exception 'You cannot chat about your own product'; end if;
  select id into v_conversation_id from public.conversations where seller_id = v_seller_id and buyer_id = v_buyer_id;
  if v_conversation_id is null then
    insert into public.conversations (product_id, seller_id, buyer_id)
    values (p_product_id, v_seller_id, v_buyer_id)
    on conflict (seller_id, buyer_id) do update set updated_at = now()
    returning id into v_conversation_id;
  end if;
  return v_conversation_id;
end;
$$;
revoke all on function public.open_marketplace_conversation(uuid) from public, anon;
grant execute on function public.open_marketplace_conversation(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-images', 'chat-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']::text[])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "chat_images_participant_upload" on storage.objects;
create policy "chat_images_participant_upload" on storage.objects for insert to authenticated
with check (bucket_id = 'chat-images' and exists (
  select 1 from public.conversations c
  where c.id::text = (storage.foldername(name))[1]
    and (select auth.uid()) in (c.buyer_id, c.seller_id)
));

drop policy if exists "chat_images_public_read" on storage.objects;
create policy "chat_images_public_read" on storage.objects for select to public using (bucket_id = 'chat-images');

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
