-- Reports and banned_until for moderation; support_tickets for support

alter table public.profiles
  add column if not exists banned_until timestamptz default null;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text,
  created_at timestamptz default now()
);

create index if not exists idx_reports_message_id on public.reports (message_id);

alter table public.messages add column if not exists hidden boolean not null default false;

alter table public.reports enable row level security;

create policy "Users can create reports"
  on public.reports for insert
  with check (reporter_id = auth.uid());

-- Admins read/update via service role; no select policy for regular users on reports.

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  message text not null,
  created_at timestamptz default now()
);

create index if not exists idx_support_tickets_user_id on public.support_tickets (user_id);

alter table public.support_tickets enable row level security;

create policy "Users can create own support tickets"
  on public.support_tickets for insert
  with check (user_id = auth.uid());
