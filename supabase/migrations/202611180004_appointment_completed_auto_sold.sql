-- SPU Market Migration: Auto-mark product as sold when appointment is completed
-- When buyer confirms receipt or auto-resolve marks appointment completed,
-- related product status is automatically set to 'sold'.

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
begin
  if v_user_id is null then
    raise exception 'Sign in to update appointment status';
  end if;

  select * into v_row
  from public.pickup_appointments
  where id = p_appointment_id;

  if v_row.id is null then
    raise exception 'Appointment not found';
  end if;

  if v_user_id <> v_row.buyer_id and v_user_id <> v_row.seller_id then
    raise exception 'You are not authorized to update this appointment';
  end if;

  -- Calculate time offsets in minutes
  v_minutes_until := extract(epoch from (v_row.scheduled_at - v_now)) / 60.0;
  v_minutes_past := extract(epoch from (v_now - v_row.scheduled_at)) / 60.0;

  -- 1. Buyer confirms receipt (or completes directly)
  if p_action = 'buyer_received' or p_action = 'completed' then
    if v_user_id <> v_row.buyer_id and v_user_id <> v_row.seller_id then
      raise exception 'Unauthorized';
    end if;

    update public.pickup_appointments
    set status = 'completed',
        buyer_confirmed_at = coalesce(buyer_confirmed_at, v_now),
        updated_at = v_now
    where id = p_appointment_id;

    -- Automatically mark the related product as sold
    update public.products
    set status = 'sold',
        updated_at = v_now
    where id = v_row.product_id and status in ('active', 'draft');

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
    -- Condition: Cannot cancel within 30 minutes of scheduled time
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
      -- Auto complete if seller delivered and 1 hour past scheduled time
      update public.pickup_appointments
      set status = 'completed',
          updated_at = v_now
      where id = p_appointment_id;

      -- Auto mark product as sold
      update public.products
      set status = 'sold',
          updated_at = v_now
      where id = v_row.product_id and status in ('active', 'draft');

    elsif v_row.status = 'pending' and v_minutes_past > 0 then
      -- Auto cancel if past scheduled time with no seller/buyer action
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
