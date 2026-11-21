-- Support reports table & support-images storage bucket

create table if not exists public.support_reports (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reporter_name text not null default '',
  reporter_email text not null default '',
  reporter_student_id text not null default '',
  category text not null check (category in ('การใช้งาน', 'ข้อผิดพลาดระบบ', 'การซื้อขาย')),
  description text not null check (char_length(trim(description)) > 0),
  image_url text null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  created_at timestamptz not null default now()
);

create index if not exists idx_support_reports_user_created
  on public.support_reports (user_id, created_at desc);

alter table public.support_reports enable row level security;

grant select, insert on public.support_reports to authenticated;

drop policy if exists support_reports_insert_own on public.support_reports;
create policy support_reports_insert_own
  on public.support_reports
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists support_reports_select_own on public.support_reports;
create policy support_reports_select_own
  on public.support_reports
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public)
values ('support-images', 'support-images', true)
on conflict (id) do nothing;

drop policy if exists support_images_public_read on storage.objects;
create policy support_images_public_read
  on storage.objects
  for select
  using (bucket_id = 'support-images');

drop policy if exists support_images_auth_insert on storage.objects;
create policy support_images_auth_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'support-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
