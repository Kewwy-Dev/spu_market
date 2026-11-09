-- Expose only participant display names to the other member of a conversation.
-- Contact details and the rest of profiles remain protected by the profiles RLS policy.
create or replace function public.conversation_participant_display_names(p_conversation_id uuid)
returns table (user_id uuid, display_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name
  from public.conversations c
  join public.profiles p on p.id in (c.buyer_id, c.seller_id)
  where c.id = p_conversation_id
    and (select auth.uid()) in (c.buyer_id, c.seller_id);
$$;

revoke all on function public.conversation_participant_display_names(uuid) from public, anon;
grant execute on function public.conversation_participant_display_names(uuid) to authenticated;
