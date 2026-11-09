alter table public.profiles
  add column if not exists default_pickup_location_id uuid
  references public.pickup_locations (id) on delete set null;

-- Keep existing seller stores aligned with the pickup point on their latest active listing.
update public.profiles profile
set default_pickup_location_id = latest.location_id
from (
  select distinct on (seller_id) seller_id, location_id
  from public.products
  where seller_id is not null and status = 'active'
  order by seller_id, created_at desc
) latest
where profile.id = latest.seller_id
  and profile.default_pickup_location_id is null;

create or replace function public.set_seller_pickup_location(p_location_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_seller_id uuid := (select auth.uid());
begin
  if v_seller_id is null then
    raise exception 'Sign in before changing the store pickup location';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = v_seller_id and p.role = 'seller'
  ) then
    raise exception 'Seller verification is required';
  end if;
  if not exists (select 1 from public.pickup_locations l where l.id = p_location_id) then
    raise exception 'Choose a valid pickup location';
  end if;

  update public.profiles
  set default_pickup_location_id = p_location_id
  where id = v_seller_id;

  update public.products
  set location_id = p_location_id
  where seller_id = v_seller_id and status = 'active';
end;
$$;

revoke all on function public.set_seller_pickup_location(uuid) from public, anon;
grant execute on function public.set_seller_pickup_location(uuid) to authenticated;

notify pgrst, 'reload schema';
