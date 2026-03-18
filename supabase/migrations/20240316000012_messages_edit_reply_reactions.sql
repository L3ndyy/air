-- Messages: edited_at, reply_to_id; message_reactions table

-- 1) edited_at for message edits
alter table public.messages
  add column if not exists edited_at timestamptz;

-- 2) reply_to_id for reply threading
alter table public.messages
  add column if not exists reply_to_id uuid references public.messages (id) on delete set null;

-- 3) message_reactions: one row per (message, user, emoji)
create table if not exists public.message_reactions (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null,
  primary key (message_id, user_id, emoji)
);

create index if not exists idx_message_reactions_message_id on public.message_reactions (message_id);

alter table public.message_reactions enable row level security;

-- RLS: participants of the conversation can read reactions
create policy "Participants can read message_reactions"
  on public.message_reactions for select
  using (
    exists (
      select 1 from public.messages m
      join public.participants p on p.conversation_id = m.conversation_id and p.user_id = auth.uid()
      where m.id = message_reactions.message_id
    )
  );

-- Users can insert their own reaction
create policy "Users can insert own reaction"
  on public.message_reactions for insert
  with check (user_id = auth.uid());

-- Users can delete their own reaction
create policy "Users can delete own reaction"
  on public.message_reactions for delete
  using (user_id = auth.uid());

-- 4) Realtime: add message_reactions to replication in Supabase Dashboard (Database > Replication)
