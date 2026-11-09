create or replace function public.create_marketplace_product_with_images(
  p_category_id uuid,
  p_location_id uuid,
  p_title text,
  p_description text,
  p_price numeric,
  p_condition_tag text,
  p_delivery_type text,
  p_image_urls text[]
)
returns setof public.marketplace_products
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_seller_id uuid := (select auth.uid());
  v_product_id uuid;
begin
  if v_seller_id is null then
    raise exception 'Sign in before listing a product';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = v_seller_id and p.role = 'seller'
  ) then
    raise exception 'Seller verification is required before listing a product';
  end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 120 then
    raise exception 'Product title must contain 1 to 120 characters';
  end if;
  if p_price is null or p_price <= 0 then
    raise exception 'Product price must be greater than zero';
  end if;
  if coalesce(array_length(p_image_urls, 1), 0) not between 1 and 5 then
    raise exception 'Choose between 1 and 5 product images';
  end if;
  if exists (
    select 1 from unnest(p_image_urls) as image_url
    where image_url !~* '^https?://'
  ) then
    raise exception 'Product images must use HTTP or HTTPS URLs';
  end if;
  if p_delivery_type not in ('pickup', 'digital', 'shipping') then
    raise exception 'Invalid delivery type';
  end if;

  insert into public.products (
    seller_id, category_id, location_id, title, description, price,
    condition_tag, delivery_type, status
  ) values (
    v_seller_id, p_category_id, p_location_id, btrim(p_title),
    coalesce(p_description, ''), p_price,
    coalesce(nullif(btrim(p_condition_tag), ''), 'used'), p_delivery_type, 'active'
  ) returning id into v_product_id;

  insert into public.product_images (product_id, image_url, display_order)
  select v_product_id, btrim(image_url), (ordinality - 1)::smallint
  from unnest(p_image_urls) with ordinality as images(image_url, ordinality);

  return query select mp.* from public.marketplace_products mp where mp.id = v_product_id;
end;
$$;

revoke all on function public.create_marketplace_product_with_images(uuid, uuid, text, text, numeric, text, text, text[]) from public, anon, authenticated;
grant execute on function public.create_marketplace_product_with_images(uuid, uuid, text, text, numeric, text, text, text[]) to authenticated;

notify pgrst, 'reload schema';
