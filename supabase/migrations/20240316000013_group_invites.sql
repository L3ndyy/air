-- Group invites: token-based join links

create table if not exists public.group_invites (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  max_uses int default null,
  use_count int not null default 0,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz default now()
);

create index if not exists idx_group_invites_token on public.group_invites (token);
create index if not exists idx_group_invites_conversation on public.group_invites (conversation_id);

alter table public.group_invites enable row level security;

-- Participants of the conversation can read invites for that conversation
create policy "Participants can read group_invites"
  on public.group_invites for select
  using (
    exists (
      select 1 from public.participants
      where conversation_id = group_invites.conversation_id and user_id = auth.uid()
    )
  );

-- Participants can insert invites for their group
create policy "Participants can create group_invites"
  on public.group_invites for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.participants
      where conversation_id = group_invites.conversation_id and user_id = auth.uid()
    )
  );

-- Only creator or admin can delete (we check in API; for RLS allow update for use_count by trigger or service role)
-- Service role will be used for join; no policy for anonymous join by token (API uses admin client).
