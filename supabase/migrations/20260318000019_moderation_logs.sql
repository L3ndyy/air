-- Moderation/audit log for admin actions (hide/delete/ban/support replies)

create table if not exists public.moderation_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  report_id uuid null references public.reports (id) on delete set null,
  message_id uuid null references public.messages (id) on delete set null,
  target_user_id uuid null references public.profiles (id) on delete set null,
  admin_id uuid null references public.profiles (id) on delete set null,
  details jsonb null,
  created_at timestamptz default now() not null
);

create index if not exists idx_moderation_logs_created_at on public.moderation_logs (created_at desc);
create index if not exists idx_moderation_logs_action on public.moderation_logs (action);

alter table public.moderation_logs enable row level security;

