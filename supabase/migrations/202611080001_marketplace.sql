-- SPU Market initial Supabase schema.
-- Apply this file in the Supabase SQL Editor before running supabase/seed.sql.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  student_id text unique,
  display_name text not null default 'SPU member',
  faculty text,
  contact text,
  student_card_url text,
  member_type text not null default 'student' check (member_type in ('student', 'staff')),
  role text not null default 'member' check (role in ('member', 'admin', 'seller')),
  is_verified boolean not null default false,
  identity_check_consent_at timestamptz,
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique,
  category_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.pickup_locations (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique,
  location_name text not null,
  is_popular boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default extensions.gen_random_uuid(),
  seller_id uuid references public.profiles (id) on delete set null,
  category_id uuid not null references public.categories (id),
  location_id uuid not null references public.pickup_locations (id),
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '',
  price numeric(12, 2) not null check (price > 0),
  condition_tag text not null default 'used',
  delivery_type text not null default 'pickup' check (delivery_type in ('pickup', 'digital', 'shipping')),
  status text not null default 'active' check (status in ('draft', 'active', 'sold', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default extensions.gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  image_url text not null check (image_url ~* '^https?://'),
  display_order smallint not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  unique (product_id, display_order)
);

create table if not exists public.favorites (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table if not exists public.conversations (
  id uuid primary key default extensions.gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (seller_id <> buyer_id),
  unique (product_id, seller_id, buyer_id)
);

create table if not exists public.messages (
  id uuid primary key default extensions.gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  message_type text not null default 'text' check (message_type in ('text', 'image')),
  message_text text not null default '',
  image_url text check (image_url is null or image_url ~* '^https?://'),
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  check ((message_type = 'text' and char_length(message_text) > 0) or (message_type = 'image' and image_url is not null))
);

create table if not exists public.cart_items (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists products_active_created_idx on public.products (created_at desc) where status = 'active';
create index if not exists products_seller_idx on public.products (seller_id, created_at desc);
create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_location_idx on public.products (location_id);
create index if not exists product_images_product_order_idx on public.product_images (product_id, display_order);
create index if not exists favorites_user_created_idx on public.favorites (user_id, created_at desc);
create index if not exists conversations_participants_idx on public.conversations (buyer_id, seller_id, updated_at desc);
create index if not exists messages_conversation_created_idx on public.messages (conversation_id, created_at);
create index if not exists cart_items_user_idx on public.cart_items (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_conversation_after_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at before update on public.conversations
for each row execute function public.set_updated_at();

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation after insert on public.messages
for each row execute function public.touch_conversation_after_message();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null or lower(new.email) !~ '^[^@]+@spumail\.net$' then
    raise exception 'An @spumail.net email address is required';
  end if;

  insert into public.profiles (id, student_id, display_name, faculty, contact, member_type)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'student_id', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'faculty', ''),
    nullif(new.raw_user_meta_data ->> 'contact', ''),
    case when new.raw_user_meta_data ->> 'member_type' = 'staff' then 'staff' else 'student' end
  );
  return new;
end;
$$;

create or replace function public.enforce_spu_email_domain()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.email is null or lower(new.email) !~ '^[^@]+@spumail\.net$' then
    raise exception 'An @spumail.net email address is required';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_spu_email_domain on auth.users;
create trigger enforce_spu_email_domain before insert or update of email on auth.users
for each row execute function public.enforce_spu_email_domain();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill profiles for accounts created before this migration.
with eligible_users as (
  select
    u.id,
    u.raw_user_meta_data,
    case
      when nullif(u.raw_user_meta_data ->> 'student_id', '') is null then null
      when count(*) over (partition by nullif(u.raw_user_meta_data ->> 'student_id', '')) = 1
        then nullif(u.raw_user_meta_data ->> 'student_id', '')
      else null
    end as student_id
  from auth.users u
  where u.email is not null and lower(u.email) ~ '^[^@]+@spumail\.net$'
)
insert into public.profiles (id, student_id, display_name, faculty, contact, member_type)
select
  u.id,
  u.student_id,
  coalesce(nullif(u.raw_user_meta_data ->> 'display_name', ''), 'SPU member'),
  nullif(u.raw_user_meta_data ->> 'faculty', ''),
  nullif(u.raw_user_meta_data ->> 'contact', ''),
  case when u.raw_user_meta_data ->> 'member_type' = 'staff' then 'staff' else 'student' end
from eligible_users u
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.pickup_locations enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.favorites enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.cart_items enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (student_id, display_name, faculty, contact, member_type) on public.profiles to authenticated;

drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read" on public.categories for select to anon, authenticated using (true);
drop policy if exists "pickup_locations_public_read" on public.pickup_locations;
create policy "pickup_locations_public_read" on public.pickup_locations for select to anon, authenticated using (true);

drop policy if exists "products_public_active_or_owner_read" on public.products;
create policy "products_public_active_or_owner_read" on public.products for select to anon, authenticated using (status = 'active' or seller_id = (select auth.uid()));
drop policy if exists "products_insert_as_seller" on public.products;
create policy "products_insert_as_seller" on public.products for insert to authenticated with check (seller_id = (select auth.uid()));
drop policy if exists "products_update_own" on public.products;
create policy "products_update_own" on public.products for update to authenticated using (seller_id = (select auth.uid())) with check (seller_id = (select auth.uid()));
drop policy if exists "products_delete_own" on public.products;
create policy "products_delete_own" on public.products for delete to authenticated using (seller_id = (select auth.uid()));

drop policy if exists "product_images_public_read" on public.product_images;
create policy "product_images_public_read" on public.product_images for select to anon, authenticated using (
  exists (select 1 from public.products p where p.id = product_id and (p.status = 'active' or p.seller_id = (select auth.uid())))
);
drop policy if exists "product_images_owner_insert" on public.product_images;
create policy "product_images_owner_insert" on public.product_images for insert to authenticated with check (
  exists (select 1 from public.products p where p.id = product_id and p.seller_id = (select auth.uid()))
);
drop policy if exists "product_images_owner_delete" on public.product_images;
create policy "product_images_owner_delete" on public.product_images for delete to authenticated using (
  exists (select 1 from public.products p where p.id = product_id and p.seller_id = (select auth.uid()))
);

drop policy if exists "favorites_owner_all" on public.favorites;
create policy "favorites_owner_all" on public.favorites for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "conversations_participant_read" on public.conversations;
create policy "conversations_participant_read" on public.conversations for select to authenticated
using ((select auth.uid()) in (buyer_id, seller_id));
drop policy if exists "conversations_buyer_create" on public.conversations;
create policy "conversations_buyer_create" on public.conversations for insert to authenticated with check (
  buyer_id = (select auth.uid()) and exists (
    select 1 from public.products p where p.id = product_id and p.seller_id = seller_id and p.status = 'active'
  )
);
drop policy if exists "messages_participant_read" on public.messages;
create policy "messages_participant_read" on public.messages for select to authenticated using (
  exists (select 1 from public.conversations c where c.id = conversation_id and (select auth.uid()) in (c.buyer_id, c.seller_id))
);
drop policy if exists "messages_participant_send" on public.messages;
create policy "messages_participant_send" on public.messages for insert to authenticated with check (
  sender_id = (select auth.uid()) and exists (
    select 1 from public.conversations c where c.id = conversation_id and (select auth.uid()) in (c.buyer_id, c.seller_id)
  )
);
drop policy if exists "messages_recipient_mark_read" on public.messages;
create policy "messages_recipient_mark_read" on public.messages for update to authenticated using (
  exists (select 1 from public.conversations c where c.id = conversation_id and (select auth.uid()) in (c.buyer_id, c.seller_id) and sender_id <> (select auth.uid()))
) with check (
  exists (select 1 from public.conversations c where c.id = conversation_id and (select auth.uid()) in (c.buyer_id, c.seller_id) and sender_id <> (select auth.uid()))
);
revoke update on public.messages from authenticated;
grant update (is_read) on public.messages to authenticated;

drop policy if exists "cart_items_owner_all" on public.cart_items;
create policy "cart_items_owner_all" on public.cart_items for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select on public.categories, public.pickup_locations, public.products, public.product_images to anon, authenticated;
grant update, delete on public.products to authenticated;
grant delete on public.product_images to authenticated;
grant select, insert, delete on public.favorites, public.cart_items to authenticated;
grant select, insert on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;
grant update (is_read) on public.messages to authenticated;

-- Safe public projection: profile email, student ID, contact, and faculty stay private.
create or replace view public.marketplace_products as
select
  p.id,
  p.title,
  p.description,
  p.price,
  p.condition_tag,
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
  (select pi.image_url from public.product_images pi where pi.product_id = p.id order by pi.display_order limit 1) as image_url
from public.products p
join public.categories c on c.id = p.category_id
join public.pickup_locations l on l.id = p.location_id
left join public.profiles pr on pr.id = p.seller_id
where p.status = 'active' or p.seller_id = (select auth.uid());

grant select on public.marketplace_products to anon, authenticated;

create or replace function public.create_marketplace_product(
  p_category_id uuid,
  p_location_id uuid,
  p_title text,
  p_description text,
  p_price numeric,
  p_condition_tag text,
  p_delivery_type text,
  p_image_url text
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
  if not exists (select 1 from public.profiles p where p.id = v_seller_id and p.role = 'seller') then
    raise exception 'Seller verification is required before listing a product';
  end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 120 then
    raise exception 'Product title must contain 1 to 120 characters';
  end if;
  if p_price is null or p_price <= 0 then
    raise exception 'Product price must be greater than zero';
  end if;
  if p_image_url is null or p_image_url !~* '^https?://' then
    raise exception 'Product image must use an http or https URL';
  end if;
  if p_delivery_type not in ('pickup', 'digital', 'shipping') then
    raise exception 'Invalid delivery type';
  end if;

  insert into public.products (seller_id, category_id, location_id, title, description, price, condition_tag, delivery_type, status)
  values (v_seller_id, p_category_id, p_location_id, btrim(p_title), coalesce(p_description, ''), p_price, coalesce(nullif(btrim(p_condition_tag), ''), 'used'), p_delivery_type, 'active')
  returning id into v_product_id;

  insert into public.product_images (product_id, image_url, display_order)
  values (v_product_id, btrim(p_image_url), 0);

  return query select mp.* from public.marketplace_products mp where mp.id = v_product_id;
end;
$$;

revoke all on function public.create_marketplace_product(uuid, uuid, text, text, numeric, text, text, text) from public, anon, authenticated;
grant execute on function public.create_marketplace_product(uuid, uuid, text, text, numeric, text, text, text) to authenticated;

notify pgrst, 'reload schema';
