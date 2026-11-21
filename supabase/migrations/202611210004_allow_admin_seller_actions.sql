-- Allow admin role to access seller store management, product creation, and preserve admin role during registration verification.

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
  if not exists (select 1 from public.profiles p where p.id = v_seller_id and p.role in ('seller', 'admin')) then
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
    where p.id = v_seller_id and p.role in ('seller', 'admin')
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

create or replace function public.complete_seller_registration(
  p_student_id text,
  p_display_name text,
  p_faculty text,
  p_contact text,
  p_member_type text,
  p_identity_check_consent boolean,
  p_terms_accepted boolean,
  p_major text default ''
)
returns setof public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_email text;
  v_email_confirmed_at timestamptz;
  v_auth_methods jsonb := coalesce((select auth.jwt()) -> 'amr', '[]'::jsonb);
begin
  if v_user_id is null then
    raise exception 'Sign in before completing seller registration';
  end if;

  select lower(u.email), u.email_confirmed_at
    into v_email, v_email_confirmed_at
    from auth.users as u
    where u.id = v_user_id;

  if v_email_confirmed_at is null or v_email !~ '^[^@]+@spumail\.net$' then
    raise exception 'Verify an @spumail.net email before registering as a seller';
  end if;

  if not exists (
    select 1
      from jsonb_array_elements(v_auth_methods) as auth_method(value)
      where value ->> 'method' in ('otp', 'magiclink', 'email/signup')
        and (value ->> 'timestamp')::numeric >= extract(epoch from now() - interval '10 minutes')
  ) then
    raise exception 'Request and verify a fresh email link or OTP before registering as a seller';
  end if;

  if p_member_type is null or p_member_type not in ('student', 'staff') then
    raise exception 'Choose student or staff member type';
  end if;

  if p_identity_check_consent is not true or p_terms_accepted is not true then
    raise exception 'Accept both required consent statements';
  end if;

  if nullif(btrim(p_display_name), '') is null
    or nullif(btrim(p_student_id), '') is null
    or nullif(btrim(p_faculty), '') is null
    or nullif(btrim(p_contact), '') is null then
    raise exception 'Complete all required profile fields';
  end if;

  if p_member_type = 'student' and btrim(p_student_id) !~ '^\d{8}$' then
    raise exception 'Student ID must contain 8 digits';
  elsif p_member_type = 'staff' and char_length(btrim(p_student_id)) < 4 then
    raise exception 'Staff ID must contain at least 4 characters';
  end if;

  return query
    update public.profiles as p
      set student_id = btrim(p_student_id),
          display_name = btrim(p_display_name),
          faculty = btrim(p_faculty),
          major = nullif(btrim(p_major), ''),
          contact = btrim(p_contact),
          member_type = p_member_type,
          role = case when p.role = 'admin' then 'admin'::public.profile_role else 'seller'::public.profile_role end,
          is_verified = true,
          identity_check_consent_at = now(),
          terms_accepted_at = now()
      where p.id = v_user_id
      returning p.*;

  if not found then
    raise exception 'Profile not found for this account';
  end if;
end;
$$;
