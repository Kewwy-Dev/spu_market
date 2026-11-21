-- Allow authenticated users to update their own LINE notification preferences
grant update (line_notify_enabled, line_notify_categories) on public.profiles to authenticated;
