-- Keep each buyer/seller conversation scoped to one marketplace product.
alter table public.conversations
  drop constraint if exists conversations_seller_buyer_key;

alter table public.conversations
  add constraint conversations_product_seller_buyer_key
  unique (product_id, seller_id, buyer_id);

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

  select seller_id into v_seller_id
  from public.products
  where id = p_product_id and status = 'active';

  if v_seller_id is null then raise exception 'This product is no longer available'; end if;
  if v_seller_id = v_buyer_id then raise exception 'You cannot chat about your own product'; end if;

  insert into public.conversations (product_id, seller_id, buyer_id)
  values (p_product_id, v_seller_id, v_buyer_id)
  on conflict (product_id, seller_id, buyer_id)
  do update set updated_at = now()
  returning id into v_conversation_id;

  return v_conversation_id;
end;
$$;

revoke all on function public.open_marketplace_conversation(uuid) from public, anon;
grant execute on function public.open_marketplace_conversation(uuid) to authenticated;
