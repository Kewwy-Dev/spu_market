create or replace function public.update_marketplace_product(
  p_product_id uuid,
  p_category_id uuid,
  p_location_id uuid,
  p_title text,
  p_description text,
  p_price numeric,
  p_condition_tag text,
  p_delivery_type text,
  p_image_urls text[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_seller_id uuid := (select auth.uid());
  v_updated_rows integer;
begin
  if v_seller_id is null then
    raise exception 'Sign in before editing a product';
  end if;

  if coalesce(array_length(p_image_urls, 1), 0) not between 1 and 5 then
    raise exception 'Choose between 1 and 5 product images';
  end if;

  if exists (
    select 1
    from unnest(p_image_urls) as image_url
    where image_url !~* '^https?://'
  ) then
    raise exception 'Product images must use HTTP or HTTPS URLs';
  end if;

  update public.products
  set title = btrim(p_title),
      description = coalesce(btrim(p_description), ''),
      price = p_price,
      condition_tag = coalesce(nullif(btrim(p_condition_tag), ''), 'used'),
      delivery_type = p_delivery_type,
      location_id = p_location_id,
      category_id = p_category_id,
      updated_at = now()
  where id = p_product_id
    and seller_id = v_seller_id;

  get diagnostics v_updated_rows = row_count;
  if v_updated_rows = 0 then
    raise exception 'Product was not found or does not belong to this seller';
  end if;

  delete from public.product_images
  where product_id = p_product_id;

  insert into public.product_images (product_id, image_url, display_order)
  select p_product_id, image_url, (ordinality - 1)::smallint
  from unnest(p_image_urls) with ordinality as images(image_url, ordinality);
end;
$$;

revoke all on function public.update_marketplace_product(uuid, uuid, uuid, text, text, numeric, text, text, text[]) from public, anon, authenticated;
grant execute on function public.update_marketplace_product(uuid, uuid, uuid, text, text, numeric, text, text, text[]) to authenticated;

notify pgrst, 'reload schema';
