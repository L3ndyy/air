-- Support chat mapping: user -> support conversation

create table if not exists public.support_conversations (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  conversation_id uuid not null unique references public.conversations (id) on delete cascade,
  created_at timestamptz default now() not null
);

alter table public.support_conversations enable row level security;

create policy "Users can read own support conversation"
  on public.support_conversations for select
  using (user_id = auth.uid());

