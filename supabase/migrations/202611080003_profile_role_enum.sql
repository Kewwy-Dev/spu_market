-- Use a PostgreSQL enum so Supabase Table Editor offers the valid roles as choices.
do $$
begin
  if to_regtype('public.profile_role') is null then
    create type public.profile_role as enum ('member', 'admin', 'seller');
  end if;
end;
$$;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  alter column role drop default,
  alter column role type public.profile_role using role::text::public.profile_role,
  alter column role set default 'member'::public.profile_role;
