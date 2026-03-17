-- Allow inserting self into a conversation (e.g. when creating a group) or adding others when already a member.
create policy "participants_insert_self_or_member"
  on public.participants for insert
  with check (
    (user_id = auth.uid())
    or public.is_conversation_member(conversation_id, auth.uid())
  );
