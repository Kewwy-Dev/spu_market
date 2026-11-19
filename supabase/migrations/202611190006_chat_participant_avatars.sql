-- Backfill profiles.avatar_url from auth.users metadata when missing
update public.profiles p
set avatar_url = coalesce(
  nullif(u.raw_user_meta_data->>'avatar_url', ''),
  nullif(u.raw_user_meta_data->>'picture', '')
)
from auth.users u
where u.id = p.id
  and (p.avatar_url is null or p.avatar_url = '')
  and coalesce(
    nullif(u.raw_user_meta_data->>'avatar_url', ''),
    nullif(u.raw_user_meta_data->>'picture', '')
  ) is not null;

-- Expose participant display_name and avatar_url to members of a conversation
create or replace function public.conversation_participant_profiles(p_conversation_id uuid)
returns table (user_id uuid, display_name text, avatar_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id as user_id,
    p.display_name,
    coalesce(
      nullif(p.avatar_url, ''),
      nullif(u.raw_user_meta_data->>'avatar_url', ''),
      nullif(u.raw_user_meta_data->>'picture', '')
    ) as avatar_url
  from public.conversations c
  join public.profiles p on p.id in (c.buyer_id, c.seller_id)
  left join auth.users u on u.id = p.id
  where c.id = p_conversation_id
    and (select auth.uid()) in (c.buyer_id, c.seller_id);
$$;

revoke all on function public.conversation_participant_profiles(uuid) from public, anon;
grant execute on function public.conversation_participant_profiles(uuid) to authenticated;
