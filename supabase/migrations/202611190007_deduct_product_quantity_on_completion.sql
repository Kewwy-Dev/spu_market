-- Deduct product quantity when a pickup appointment is completed,
-- and only mark product status as 'sold' when remaining quantity reaches 0.

-- 1. Allow quantity = 0 on products when stock is sold out
alter table public.products
  drop constraint if exists products_quantity_check;

alter table public.products
  add constraint products_quantity_check
  check (quantity between 0 and 10);

-- 2. Validate available stock when requesting a pickup appointment
create or replace function public.request_marketplace_pickup(
  p_product_id uuid,
  p_scheduled_at timestamptz,
  p_quantity integer default 1
)
returns setof public.pickup_appointments
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_buyer_id uuid := (select auth.uid());
  v_seller_id uuid;
  v_available_qty integer;
  v_conversation_id uuid;
  v_appointment_id uuid;
begin
  if v_buyer_id is null then raise exception 'Sign in to request an appointment'; end if;
  if p_scheduled_at is null or p_scheduled_at <= now() then
    raise exception 'Scheduled time must be in the future';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be at least 1';
  end if;

  select p.seller_id, p.quantity
  into v_seller_id, v_available_qty
  from public.products p
  where p.id = p_product_id and p.status = 'active';

  if v_seller_id is null then raise exception 'This product is no longer available'; end if;
  if v_seller_id = v_buyer_id then raise exception 'You cannot request pickup for your own product'; end if;
  if p_quantity > coalesce(v_available_qty, 0) then
    raise exception 'Requested quantity exceeds available stock (% remaining)', coalesce(v_available_qty, 0);
  end if;

  insert into public.conversations (product_id, seller_id, buyer_id)
  values (p_product_id, v_seller_id, v_buyer_id)
  on conflict (product_id, seller_id, buyer_id)
  do update set updated_at = now()
  returning public.conversations.id into v_conversation_id;

  insert into public.pickup_appointments (
    product_id, buyer_id, seller_id, conversation_id, quantity, scheduled_at, status
  ) values (
    p_product_id, v_buyer_id, v_seller_id, v_conversation_id, p_quantity, p_scheduled_at, 'pending'
  )
  returning public.pickup_appointments.id
  into v_appointment_id;

  return query
  select * from public.pickup_appointments where id = v_appointment_id;
end;
$$;

-- 3. Deduct product quantity on appointment completion, mark 'sold' only when quantity <= 0
create or replace function public.update_pickup_appointment_status(
  p_appointment_id uuid,
  p_action text
)
returns setof public.pickup_appointments
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_user_id uuid := (select auth.uid());
  v_row public.pickup_appointments;
  v_now timestamptz := now();
  v_minutes_until numeric;
  v_minutes_past numeric;
  v_deduct_qty integer;
begin
  if v_user_id is null then
    raise exception 'Sign in to update appointment status';
  end if;

  select * into v_row
  from public.pickup_appointments
  where id = p_appointment_id
  for update;

  if v_row.id is null then
    raise exception 'Appointment not found';
  end if;

  if v_user_id <> v_row.buyer_id and v_user_id <> v_row.seller_id then
    raise exception 'You are not authorized to update this appointment';
  end if;

  v_minutes_until := extract(epoch from (v_row.scheduled_at - v_now)) / 60.0;
  v_minutes_past := extract(epoch from (v_now - v_row.scheduled_at)) / 60.0;
  v_deduct_qty := greatest(1, coalesce(v_row.quantity, 1));

  -- 1. Buyer confirms receipt (or completes directly)
  if p_action = 'buyer_received' or p_action = 'completed' then
    if v_row.status = 'cancelled' then
      raise exception 'Cannot complete a cancelled appointment';
    end if;

    if v_row.status <> 'completed' then
      update public.pickup_appointments
      set status = 'completed',
          buyer_confirmed_at = coalesce(buyer_confirmed_at, v_now),
          updated_at = v_now
      where id = p_appointment_id;

      update public.products
      set quantity = greatest(0, quantity - v_deduct_qty),
          status = case
            when quantity - v_deduct_qty <= 0 then 'sold'
            else status
          end,
          updated_at = v_now
      where id = v_row.product_id
        and status in ('active', 'draft');
    end if;

  -- 2. Seller marks delivered
  elsif p_action = 'seller_delivered' or p_action = 'delivered' then
    if v_user_id <> v_row.seller_id then
      raise exception 'Only the seller can mark the product as delivered';
    end if;

    update public.pickup_appointments
    set status = 'delivered',
        seller_delivered_at = coalesce(seller_delivered_at, v_now),
        updated_at = v_now
    where id = p_appointment_id;

  -- 3. Cancel
  elsif p_action = 'cancel' or p_action = 'cancelled' then
    if v_minutes_until > 0 and v_minutes_until <= 30 then
      raise exception 'Cannot cancel within 30 minutes of scheduled pickup time';
    end if;

    update public.pickup_appointments
    set status = 'cancelled',
        cancelled_at = coalesce(cancelled_at, v_now),
        updated_at = v_now
    where id = p_appointment_id;

  -- 4. Auto resolve based on time
  elsif p_action = 'auto_resolve' then
    if v_row.status = 'delivered' and v_minutes_past >= 60 then
      update public.pickup_appointments
      set status = 'completed',
          updated_at = v_now
      where id = p_appointment_id;

      update public.products
      set quantity = greatest(0, quantity - v_deduct_qty),
          status = case
            when quantity - v_deduct_qty <= 0 then 'sold'
            else status
          end,
          updated_at = v_now
      where id = v_row.product_id
        and status in ('active', 'draft');

    elsif v_row.status = 'pending' and v_minutes_past > 0 then
      update public.pickup_appointments
      set status = 'cancelled',
          cancelled_at = coalesce(cancelled_at, v_now),
          updated_at = v_now
      where id = p_appointment_id;
    end if;

  else
    raise exception 'Invalid action: %', p_action;
  end if;

  return query select * from public.pickup_appointments where id = p_appointment_id;
end;
$$;

-- 4. Ensure reactivating a sold product with 0 stock restores quantity to at least 1
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
      quantity = case
        when p_status = 'active' and quantity <= 0 then 1
        else quantity
      end,
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

notify pgrst, 'reload schema';
