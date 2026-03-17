-- Username is "available" only if no *confirmed* user has it.
-- Unconfirmed signups (no email confirmation) do not block the username.
create or replace function public.check_username_available(p_username text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_username is null or length(trim(p_username)) < 3 then
    return false;
  end if;
  if trim(p_username) !~ '^[a-z0-9_]+$' then
    return false;
  end if;
  return not exists (
    select 1
    from public.profiles p
    join auth.users u on u.id = p.id
    where lower(trim(p.username)) = lower(trim(p_username))
    and u.email_confirmed_at is not null
  );
end;
$$;
