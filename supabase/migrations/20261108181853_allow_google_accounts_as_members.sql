-- Permit Google OAuth accounts with other email domains to use the marketplace.
-- Email/password and email OTP signups remain restricted to @spumail.net.
create or replace function public.enforce_spu_email_domain()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.email is null then
    raise exception 'An email address is required';
  end if;

  if lower(new.email) !~ '^[^@]+@spumail\.net$'
    and coalesce(new.raw_app_meta_data ->> 'provider', '') <> 'google' then
    raise exception 'Use a Google account or an @spumail.net email address';
  end if;

  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null then
    raise exception 'An email address is required';
  end if;

  if lower(new.email) !~ '^[^@]+@spumail\.net$'
    and coalesce(new.raw_app_meta_data ->> 'provider', '') <> 'google' then
    raise exception 'Use a Google account or an @spumail.net email address';
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
