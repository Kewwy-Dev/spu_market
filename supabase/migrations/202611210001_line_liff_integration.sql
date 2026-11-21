-- LINE LIFF / LINE Mini App integration & LINE OA notification preferences
-- Adds LINE account linking and notification preference columns to public.profiles.

alter table public.profiles
  add column if not exists line_user_id text unique,
  add column if not exists line_display_name text,
  add column if not exists line_linked_at timestamptz,
  add column if not exists line_notify_enabled boolean not null default true,
  add column if not exists line_notify_categories jsonb not null default '{"chat": true, "pickup": true, "review": true}'::jsonb;

comment on column public.profiles.line_user_id is 'Verified LINE userId (sub from LINE ID Token) linked to this SPU profile';
comment on column public.profiles.line_display_name is 'LINE display name captured at link time';
comment on column public.profiles.line_linked_at is 'Timestamp when the LINE account was linked';
comment on column public.profiles.line_notify_enabled is 'Master toggle for receiving push notifications via LINE OA';
comment on column public.profiles.line_notify_categories is 'Per-category LINE notification preferences: chat, pickup, review';
