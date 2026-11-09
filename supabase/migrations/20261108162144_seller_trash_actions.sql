create or replace function public.trash_marketplace_product(p_product_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_updated_id uuid;
begin
  update public.products
  set status_before_trash = status,
      status = 'trash',
      trashed_at = now()
  where id = p_product_id
    and seller_id = (select auth.uid())
    and status <> 'trash'
  returning id into v_updated_id;

  return v_updated_id is not null;
end;
$$;

create or replace function public.restore_marketplace_product(p_product_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_updated_id uuid;
begin
  update public.products
  set status = case when status_before_trash in ('active', 'draft', 'sold', 'archived')
                    then status_before_trash else 'draft' end,
      status_before_trash = null,
      trashed_at = null
  where id = p_product_id
    and seller_id = (select auth.uid())
    and status = 'trash'
    and trashed_at > now() - interval '3 days'
  returning id into v_updated_id;

  return v_updated_id is not null;
end;
$$;

revoke all on function public.trash_marketplace_product(uuid) from public, anon;
revoke all on function public.restore_marketplace_product(uuid) from public, anon;
grant execute on function public.trash_marketplace_product(uuid) to authenticated;
grant execute on function public.restore_marketplace_product(uuid) to authenticated;

notify pgrst, 'reload schema';
