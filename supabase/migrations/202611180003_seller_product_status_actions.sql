-- Migration: Seller Product Status Actions
-- Allows seller to mark product as sold, relist (active), draft or archive

create or replace function public.update_marketplace_product_status(
  p_product_id uuid,
  p_status text
)
returns public.products
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_seller_id uuid := (select auth.uid());
  v_updated public.products;
begin
  if v_seller_id is null then
    raise exception 'Sign in before updating product status';
  end if;

  if p_status not in ('active', 'sold', 'draft', 'archived') then
    raise exception 'Invalid product status: %', p_status;
  end if;

  update public.products
  set status = p_status,
      updated_at = now()
  where id = p_product_id
    and seller_id = v_seller_id
    and status <> 'trash'
  returning * into v_updated;

  if v_updated.id is null then
    raise exception 'Product not found or not owned by seller, or product is in trash';
  end if;

  return v_updated;
end;
$$;

revoke all on function public.update_marketplace_product_status(uuid, text) from public, anon;
grant execute on function public.update_marketplace_product_status(uuid, text) to authenticated;

notify pgrst, 'reload schema';
