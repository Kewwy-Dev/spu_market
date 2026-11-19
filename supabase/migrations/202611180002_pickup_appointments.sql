-- SPU Market Pickup Appointments Migration
-- Supports appointment lifecycle: request, view, chat, cancel (30m rule), delivered, complete (auto 1h rule) for buyer & seller

create table if not exists public.pickup_appointments (
  id uuid primary key default extensions.gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  quantity integer not null default 1 check (quantity > 0),
  scheduled_at timestamptz not null,
  status text not null default 'pending',
  seller_delivered_at timestamptz,
  buyer_confirmed_at timestamptz,
  cancelled_at timestamptz,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (seller_id <> buyer_id)
);

alter table public.pickup_appointments add column if not exists seller_delivered_at timestamptz;
alter table public.pickup_appointments add column if not exists buyer_confirmed_at timestamptz;
alter table public.pickup_appointments add column if not exists cancelled_at timestamptz;

alter table public.pickup_appointments drop constraint if exists pickup_appointments_status_check;
alter table public.pickup_appointments add constraint pickup_appointments_status_check
  check (status in ('pending', 'delivered', 'completed', 'cancelled'));

create index if not exists pickup_appointments_buyer_idx
  on public.pickup_appointments (buyer_id, scheduled_at desc);

create index if not exists pickup_appointments_seller_idx
  on public.pickup_appointments (seller_id, scheduled_at desc);

create index if not exists pickup_appointments_product_idx
  on public.pickup_appointments (product_id);

alter table public.pickup_appointments enable row level security;

-- Policies for pickup_appointments
drop policy if exists "pickup_appointments_select" on public.pickup_appointments;
create policy "pickup_appointments_select" on public.pickup_appointments
  for select to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "pickup_appointments_insert" on public.pickup_appointments;
create policy "pickup_appointments_insert" on public.pickup_appointments
  for insert to authenticated
  with check (auth.uid() = buyer_id);

drop policy if exists "pickup_appointments_update" on public.pickup_appointments;
create policy "pickup_appointments_update" on public.pickup_appointments
  for update to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id)
  with check (auth.uid() = buyer_id or auth.uid() = seller_id);

-- Allow authenticated users to view public display_name & contact of other users
drop policy if exists "profiles_select_public_info" on public.profiles;
create policy "profiles_select_public_info" on public.profiles
  for select to authenticated
  using (true);

-- Realtime publication for pickup_appointments
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'pickup_appointments'
  ) then
    alter publication supabase_realtime add table public.pickup_appointments;
  end if;
end $$;

-- Drop previous function definitions before recreating to avoid return type / parameter collision errors
drop function if exists public.request_marketplace_pickup(uuid, timestamptz, integer);
drop function if exists public.update_pickup_appointment_status(uuid, text);

-- RPC for booking a pickup appointment from cart
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

  select p.seller_id into v_seller_id
  from public.products p
  where p.id = p_product_id and p.status = 'active';

  if v_seller_id is null then raise exception 'This product is no longer available'; end if;
  if v_seller_id = v_buyer_id then raise exception 'You cannot request pickup for your own product'; end if;

  -- Ensure or open conversation between buyer and seller
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

revoke all on function public.request_marketplace_pickup(uuid, timestamptz, integer) from public, anon;
grant execute on function public.request_marketplace_pickup(uuid, timestamptz, integer) to authenticated;

-- RPC for updating appointment status according to business flow:
-- Actions:
-- 1. 'buyer_received': Buyer confirms receipt -> immediately 'completed' (seller doesn't need to click)
-- 2. 'seller_delivered': Seller marks delivered -> 'delivered' (awaits buyer confirm, or auto-completes after 1 hour past scheduled_at)
-- 3. 'cancel': Either cancels immediately UNLESS within 30 minutes of scheduled_at
-- 4. 'auto_resolve': Checks past scheduled_at: if pending -> cancelled; if delivered + 1h -> completed
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

revoke all on function public.update_pickup_appointment_status(uuid, text) from public, anon;
grant execute on function public.update_pickup_appointment_status(uuid, text) to authenticated;
