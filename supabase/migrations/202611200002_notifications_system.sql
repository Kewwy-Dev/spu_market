create table if not exists public.notifications (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('chat', 'pickup', 'review')),
  event_type text not null,
  title text not null,
  body text not null default '',
  target_type text not null check (target_type in ('chat', 'pickup', 'seller_reviews')),
  target_id text null,
  group_key text null,
  is_read boolean not null default false,
  read_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_updated
  on public.notifications (user_id, updated_at desc);

create index if not exists idx_notifications_user_unread
  on public.notifications (user_id)
  where is_read = false;

create index if not exists idx_notifications_read_at
  on public.notifications (user_id, read_at)
  where is_read = true;

create unique index if not exists idx_notifications_user_group_key
  on public.notifications (user_id, group_key)
  where group_key is not null;

alter table public.notifications enable row level security;

grant select, update, delete on public.notifications to authenticated;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
  on public.notifications
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own
  on public.notifications
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own
  on public.notifications
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.notify_on_new_message()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_buyer_id uuid;
  v_seller_id uuid;
  v_recipient_id uuid;
  v_sender_name text;
  v_preview text;
begin
  if new.message_text like '__SYSTEM__:%' then
    return new;
  end if;

  select buyer_id, seller_id
    into v_buyer_id, v_seller_id
  from public.conversations
  where id = new.conversation_id;

  if not found then
    return new;
  end if;

  if new.sender_id = v_buyer_id then
    v_recipient_id := v_seller_id;
  elsif new.sender_id = v_seller_id then
    v_recipient_id := v_buyer_id;
  else
    return new;
  end if;

  if v_recipient_id is null or v_recipient_id = new.sender_id then
    return new;
  end if;

  select coalesce(nullif(trim(display_name), ''), 'สมาชิก SPU')
    into v_sender_name
  from public.profiles
  where id = new.sender_id;

  if new.message_type = 'image' then
    v_preview := 'ส่งรูปภาพ';
  else
    v_preview := left(coalesce(nullif(trim(new.message_text), ''), 'ส่งข้อความใหม่'), 80);
  end if;

  insert into public.notifications (
    user_id,
    category,
    event_type,
    title,
    body,
    target_type,
    target_id,
    group_key,
    is_read,
    read_at,
    created_at,
    updated_at
  )
  values (
    v_recipient_id,
    'chat',
    'new_message',
    'ข้อความจาก ' || coalesce(v_sender_name, 'สมาชิก SPU'),
    v_preview,
    'chat',
    new.conversation_id::text,
    'chat:' || new.conversation_id::text,
    false,
    null,
    now(),
    now()
  )
  on conflict (user_id, group_key) where group_key is not null
  do update set
    event_type = excluded.event_type,
    title = excluded.title,
    body = excluded.body,
    target_type = excluded.target_type,
    target_id = excluded.target_id,
    is_read = false,
    read_at = null,
    updated_at = now();

  return new;
end;
$$;

revoke all on function public.notify_on_new_message() from public;

drop trigger if exists trg_notify_on_new_message on public.messages;
create trigger trg_notify_on_new_message
  after insert on public.messages
  for each row
  execute function public.notify_on_new_message();

create or replace function public.notify_on_pickup_appointment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid;
  v_recipient_id uuid;
  v_product_title text;
  v_time_label text;
  v_event_type text;
  v_title text;
  v_body text;
begin
  select coalesce(nullif(trim(title), ''), 'สินค้า')
    into v_product_title
  from public.products
  where id = new.product_id;

  v_product_title := coalesce(v_product_title, 'สินค้า');
  v_time_label := to_char(new.scheduled_at at time zone 'Asia/Bangkok', 'DD/MM HH24:MI') || ' น.';
  v_actor_id := auth.uid();

  if tg_op = 'INSERT' then
    if v_actor_id = new.seller_id then
      v_recipient_id := new.buyer_id;
      v_title := 'นัดรับสินค้าใหม่';
    else
      v_recipient_id := new.seller_id;
      v_title := 'มีคำขอนัดรับสินค้า';
    end if;
    v_event_type := 'pickup_requested';
    v_body := v_product_title || ' • ' || v_time_label;

  elsif tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      if new.status = 'delivered' then
        v_recipient_id := new.buyer_id;
        v_event_type := 'pickup_delivered';
        v_title := 'ผู้ขายยืนยันส่งมอบแล้ว';
        v_body := v_product_title || ' • กดยืนยันรับสินค้า';
      elsif new.status = 'completed' then
        v_recipient_id := new.seller_id;
        v_event_type := 'pickup_completed';
        v_title := 'ผู้ซื้อรับสินค้าแล้ว';
        v_body := v_product_title || ' • ปิดการขายสำเร็จ';
      elsif new.status = 'cancelled' then
        if v_actor_id = new.seller_id then
          v_recipient_id := new.buyer_id;
        else
          v_recipient_id := new.seller_id;
        end if;
        v_event_type := 'pickup_cancelled';
        v_title := 'ยกเลิกนัดรับสินค้า';
        v_body := v_product_title;
      else
        return new;
      end if;
    elsif new.scheduled_at is distinct from old.scheduled_at then
      if v_actor_id = new.seller_id then
        v_recipient_id := new.buyer_id;
      else
        v_recipient_id := new.seller_id;
      end if;
      v_event_type := 'pickup_rescheduled';
      v_title := 'เลื่อนเวลานัดรับสินค้า';
      v_body := v_product_title || ' • ' || v_time_label;
    else
      return new;
    end if;
  end if;

  if v_recipient_id is null then
    return new;
  end if;

  insert into public.notifications (
    user_id,
    category,
    event_type,
    title,
    body,
    target_type,
    target_id,
    is_read,
    created_at,
    updated_at
  )
  values (
    v_recipient_id,
    'pickup',
    v_event_type,
    v_title,
    v_body,
    'pickup',
    new.conversation_id::text,
    false,
    now(),
    now()
  );

  return new;
end;
$$;

revoke all on function public.notify_on_pickup_appointment() from public;

drop trigger if exists trg_notify_on_pickup_appointment on public.pickup_appointments;
create trigger trg_notify_on_pickup_appointment
  after insert or update on public.pickup_appointments
  for each row
  execute function public.notify_on_pickup_appointment();

create or replace function public.notify_on_seller_review()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product_title text;
begin
  if new.reviewer_id = new.seller_id then
    return new;
  end if;

  select coalesce(nullif(trim(title), ''), 'สินค้าของคุณ')
    into v_product_title
  from public.products
  where id = new.product_id;

  insert into public.notifications (
    user_id,
    category,
    event_type,
    title,
    body,
    target_type,
    target_id,
    is_read,
    created_at,
    updated_at
  )
  values (
    new.seller_id,
    'review',
    'new_review',
    'ได้รับรีวิว ' || new.rating || ' ดาว',
    coalesce(v_product_title, 'สินค้าของคุณ'),
    'seller_reviews',
    new.seller_id::text,
    false,
    now(),
    now()
  );

  return new;
end;
$$;

revoke all on function public.notify_on_seller_review() from public;

drop trigger if exists trg_notify_on_seller_review on public.seller_reviews;
create trigger trg_notify_on_seller_review
  after insert on public.seller_reviews
  for each row
  execute function public.notify_on_seller_review();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
