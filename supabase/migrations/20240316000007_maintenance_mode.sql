-- Table for app-wide settings (e.g. maintenance mode)
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'
);

-- Allow service role only; app reads via API with service role
alter table public.app_settings enable row level security;

-- No policies: only backend with service_role can access
-- Insert default so key exists
insert into public.app_settings (key, value)
values ('maintenance', 'false'::jsonb)
on conflict (key) do nothing;
