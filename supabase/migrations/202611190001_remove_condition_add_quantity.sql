-- Remove condition_tag from products and add quantity (min 1, max 10)
alter table public.products
  add column if not exists quantity integer not null default 1 check (quantity between 1 and 10);

drop view if exists public.marketplace_products cascade;

alter table public.products
  drop column if exists condition_tag cascade;

create view public.marketplace_products as
select
  p.id,
  p.title,
  p.description,
  p.price,
  p.quantity,
  p.delivery_type,
  p.status,
  p.created_at,
  p.seller_id,
  pr.display_name as seller_name,
  coalesce(pr.is_verified, false) as seller_verified,
  c.slug as category_slug,
  c.category_name,
  l.slug as location_slug,
  l.location_name,
  (
    select pi.image_url
    from public.product_images pi
    where pi.product_id = p.id
    order by pi.display_order
    limit 1
  ) as image_url
from public.products p
join public.categories c on c.id = p.category_id
join public.pickup_locations l on l.id = p.location_id
left join public.profiles pr on pr.id = p.seller_id
where p.status = 'active' or p.seller_id = (select auth.uid());

create or replace function public.create_marketplace_product_with_images(
  p_category_id uuid,
  p_location_id uuid,
  p_title text,
  p_description text,
  p_price numeric,
  p_image_urls text[],
  p_delivery_type text default 'pickup',
  p_status text default 'active',
  p_quantity integer default 1,
  p_condition_tag text default null
)
returns setof public.marketplace_products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller_id uuid := (select auth.uid());
  v_product_id uuid;
  v_qty integer := coalesce(p_quantity, 1);
begin
  if v_seller_id is null then raise exception 'Sign in before listing a product'; end if;
  if not exists (select 1 from public.profiles p where p.id = v_seller_id and p.role = 'seller') then
    raise exception 'Seller verification is required before listing a product';
  end if;
  if p_status not in ('active', 'draft') then raise exception 'Invalid product status'; end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 120 then
    raise exception 'Product title must contain 1 to 120 characters';
  end if;
  if p_price is null or p_price <= 0 then raise exception 'Product price must be greater than zero'; end if;
  if v_qty < 1 or v_qty > 10 then raise exception 'Quantity must be between 1 and 10'; end if;
  if coalesce(array_length(p_image_urls, 1), 0) not between 1 and 5 then
    raise exception 'Choose between 1 and 5 product images';
  end if;
  if exists (select 1 from unnest(p_image_urls) as image_url where image_url !~* '^https?://') then
    raise exception 'Product images must use HTTP or HTTPS URLs';
  end if;
  if p_delivery_type <> 'pickup' then raise exception 'Only on-campus pickup is currently supported'; end if;

  insert into public.products (
    seller_id, category_id, location_id, title, description, price,
    quantity, delivery_type, status
  ) values (
    v_seller_id, p_category_id, p_location_id, btrim(p_title),
    coalesce(p_description, ''), p_price,
    v_qty, 'pickup', p_status
  ) returning id into v_product_id;

  insert into public.product_images (product_id, image_url, display_order)
  select v_product_id, btrim(image_url), (ordinality - 1)::smallint
  from unnest(p_image_urls) with ordinality as images(image_url, ordinality);

  return query select mp.* from public.marketplace_products mp where mp.id = v_product_id;
end;
$$;

create or replace function public.update_marketplace_product(
  p_product_id uuid,
  p_category_id uuid,
  p_location_id uuid,
  p_title text,
  p_description text,
  p_price numeric,
  p_image_urls text[],
  p_delivery_type text default 'pickup',
  p_status text default 'active',
  p_quantity integer default 1,
  p_condition_tag text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller_id uuid := (select auth.uid());
  v_updated_rows integer;
  v_qty integer := coalesce(p_quantity, 1);
begin
  if v_seller_id is null then raise exception 'Sign in before editing a product'; end if;
  if p_status not in ('active', 'draft', 'sold', 'archived') then raise exception 'Invalid product status'; end if;
  if coalesce(array_length(p_image_urls, 1), 0) not between 1 and 5 then
    raise exception 'Choose between 1 and 5 product images';
  end if;
  if exists (select 1 from unnest(p_image_urls) as image_url where image_url !~* '^https?://') then
    raise exception 'Product images must use HTTP or HTTPS URLs';
  end if;
  if p_delivery_type <> 'pickup' then raise exception 'Only on-campus pickup is currently supported'; end if;
  if v_qty < 1 or v_qty > 10 then raise exception 'Quantity must be between 1 and 10'; end if;

  update public.products
  set title = btrim(p_title),
      description = coalesce(btrim(p_description), ''),
      price = p_price,
      quantity = v_qty,
      delivery_type = 'pickup',
      location_id = p_location_id,
      category_id = p_category_id,
      status = p_status,
      updated_at = now()
  where id = p_product_id and seller_id = v_seller_id;

  get diagnostics v_updated_rows = row_count;
  if v_updated_rows = 0 then raise exception 'Product was not found or does not belong to this seller'; end if;

  delete from public.product_images where product_id = p_product_id;
  insert into public.product_images (product_id, image_url, display_order)
  select p_product_id, image_url, (ordinality - 1)::smallint
  from unnest(p_image_urls) with ordinality as images(image_url, ordinality);
end;
$$;
