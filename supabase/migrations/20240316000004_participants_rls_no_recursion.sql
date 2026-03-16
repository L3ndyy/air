-- Fix: infinite recursion in participants RLS.
-- Policy was reading from participants inside its own USING clause.

-- Function that checks membership without triggering RLS (security definer)
create or replace function public.is_conversation_member(conv_id uuid, u uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.participants
    where conversation_id = conv_id and user_id = u
  );
$$;

-- Drop recursive policies
drop policy if exists "Participants can read participants of own conversations" on public.participants;
drop policy if exists "Participants can add other participants to same conversation" on public.participants;

-- Read: own rows or rows in conversations where current user is a member
create policy "participants_select_own_or_same_conversation"
  on public.participants for select
  using (
    user_id = auth.uid()
    or public.is_conversation_member(conversation_id, auth.uid())
  );

-- Insert "add others": current user must be already in the conversation
create policy "participants_insert_if_member"
  on public.participants for insert
  with check (public.is_conversation_member(conversation_id, auth.uid()));
