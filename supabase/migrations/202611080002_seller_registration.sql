-- Promote a member to seller only after Supabase Auth has verified the campus email OTP.
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role = any (array['member'::text, 'admin'::text, 'seller'::text]));

alter table public.profiles
  add column if not exists identity_check_consent_at timestamptz,
  add column if not exists terms_accepted_at timestamptz;

drop function if exists public.complete_seller_registration(text, text, text, text, text);

create or replace function public.complete_seller_registration(
  p_student_id text,
  p_display_name text,
  p_faculty text,
  p_contact text,
  p_member_type text,
  p_identity_check_consent boolean,
  p_terms_accepted boolean
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
      where value ->> 'method' in ('otp', 'email/signup')
        and (value ->> 'timestamp')::numeric >= extract(epoch from now() - interval '10 minutes')
  ) then
    raise exception 'Request and verify a fresh email OTP before registering as a seller';
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
          contact = btrim(p_contact),
          member_type = p_member_type,
          role = 'seller',
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

revoke all on function public.complete_seller_registration(text, text, text, text, text, boolean, boolean) from public;
grant execute on function public.complete_seller_registration(text, text, text, text, text, boolean, boolean) to authenticated;

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

notify pgrst, 'reload schema';
