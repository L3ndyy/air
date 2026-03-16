-- Fix 500 on profiles SELECT: replace complex policy with simpler ones.
-- Run this in Supabase SQL Editor if profile page returns 500.

drop policy if exists "Users can read profiles in same conversation" on public.profiles;

-- 1) Always allow reading own profile
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

-- 2) Allow reading profiles of users who share a conversation with current user
create policy "profiles_select_conversation_members"
  on public.profiles for select
  using (
    exists (
      select 1 from public.participants p1
      join public.participants p2 on p2.conversation_id = p1.conversation_id and p2.user_id = profiles.id
      where p1.user_id = auth.uid()
    )
  );
