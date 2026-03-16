-- 1) profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  full_name text default '',
  avatar_url text,
  status text default '',
  updated_at timestamptz default now()
);

-- 2) conversations
create type public.conversation_type as enum ('direct', 'group');

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  type public.conversation_type not null default 'direct',
  name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- 3) participants
create table public.participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (conversation_id, user_id)
);

-- 4) messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz default now(),
  is_read boolean default false
);

create index idx_messages_conversation_created on public.messages (conversation_id, created_at desc);
create index idx_participants_user on public.participants (user_id);

-- 5) Trigger: create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    'user_' || replace(new.id::text, '-', ''),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 6) RLS: profiles
alter table public.profiles enable row level security;

create policy "Users can read profiles in same conversation"
  on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from public.participants p1
      join public.participants p2 on p1.conversation_id = p2.conversation_id
      where p1.user_id = auth.uid() and p2.user_id = profiles.id
    )
  );

create policy "Users can update own profile"
  on public.profiles for update using (id = auth.uid());

create policy "Users can insert own profile"
  on public.profiles for insert with check (id = auth.uid());

-- 7) RLS: conversations
alter table public.conversations enable row level security;

create policy "Participants can read conversation"
  on public.conversations for select
  using (
    exists (
      select 1 from public.participants
      where conversation_id = conversations.id and user_id = auth.uid()
    )
  );

create policy "Authenticated users can create conversations"
  on public.conversations for insert with check (auth.uid() is not null);

create policy "Participants can update conversation"
  on public.conversations for update
  using (
    exists (
      select 1 from public.participants
      where conversation_id = conversations.id and user_id = auth.uid()
    )
  );

-- 8) RLS: participants
alter table public.participants enable row level security;

create policy "Participants can read participants of own conversations"
  on public.participants for select
  using (
    exists (
      select 1 from public.participants p2
      where p2.conversation_id = participants.conversation_id and p2.user_id = auth.uid()
    )
  );

create policy "Users can add self to conversation"
  on public.participants for insert with check (user_id = auth.uid());

create policy "Participants can add other participants to same conversation"
  on public.participants for insert
  with check (
    exists (
      select 1 from public.participants p
      where p.conversation_id = participants.conversation_id and p.user_id = auth.uid()
    )
  );

create policy "Users can delete self from conversation"
  on public.participants for delete using (user_id = auth.uid());

-- 9) RLS: messages
alter table public.messages enable row level security;

create policy "Participants can read messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.participants
      where conversation_id = messages.conversation_id and user_id = auth.uid()
    )
  );

create policy "Participants can insert messages"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.participants
      where conversation_id = messages.conversation_id and user_id = auth.uid()
    )
  );

create policy "Participants can update messages (e.g. is_read)"
  on public.messages for update
  using (
    exists (
      select 1 from public.participants
      where conversation_id = messages.conversation_id and user_id = auth.uid()
    )
  );

-- 10) Realtime: In Supabase Dashboard go to Database > Replication and add table "messages" to supabase_realtime.
