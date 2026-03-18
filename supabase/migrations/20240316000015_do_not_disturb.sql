alter table public.profiles
  add column if not exists do_not_disturb boolean not null default false;
