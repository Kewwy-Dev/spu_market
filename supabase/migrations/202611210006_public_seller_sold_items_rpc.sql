-- Expose public sold items (completed appointments without private buyer data) for seller storefronts

create or replace function public.get_seller_public_sold_items(p_seller_id uuid)
returns table (
  appointment_id uuid,
  product_id uuid,
  sold_quantity integer,
  completed_at timestamptz,
  title text,
  price numeric,
  category_slug text,
  category_name text,
  location_name text,
  image_url text
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    pa.id as appointment_id,
    pr.id as product_id,
    coalesce(pa.quantity, 1) as sold_quantity,
    coalesce(pa.buyer_confirmed_at, pa.updated_at, pa.created_at) as completed_at,
    pr.title,
    pr.price,
    c.slug as category_slug,
    c.category_name,
    pl.location_name,
    (
      select pi.image_url
      from public.product_images pi
      where pi.product_id = pr.id
      order by pi.display_order asc
      limit 1
    ) as image_url
  from public.pickup_appointments pa
  join public.products pr on pr.id = pa.product_id
  left join public.categories c on c.id = pr.category_id
  left join public.pickup_locations pl on pl.id = pr.location_id
  where pa.seller_id = p_seller_id
    and pa.status = 'completed'
  order by coalesce(pa.buyer_confirmed_at, pa.updated_at, pa.created_at) desc;
$$;

grant execute on function public.get_seller_public_sold_items(uuid) to anon, authenticated;
