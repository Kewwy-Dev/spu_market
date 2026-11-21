-- Allow public read of sold products on seller storefronts and expose aggregate completed sales stats

alter policy products_public_active_or_owner_read
  on public.products
  using ((status in ('active', 'sold')) or (seller_id = (select auth.uid())));

create or replace function public.get_seller_public_sales_stats(p_seller_id uuid)
returns table (
  completed_appointments_count bigint,
  completed_units_sold bigint
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    count(*)::bigint as completed_appointments_count,
    coalesce(sum(coalesce(quantity, 1)), 0)::bigint as completed_units_sold
  from public.pickup_appointments
  where seller_id = p_seller_id
    and status = 'completed';
$$;

grant execute on function public.get_seller_public_sales_stats(uuid) to anon, authenticated;
