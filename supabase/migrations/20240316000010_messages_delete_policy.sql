-- Allow sender to delete their own messages.
create policy "Participants can delete own messages"
  on public.messages for delete
  using (sender_id = auth.uid());
