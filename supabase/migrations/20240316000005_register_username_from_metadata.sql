-- Use username from registration (user_metadata) when creating profile.
-- Fallback to user_<id> if missing, invalid or already taken.

create or replace function public.handle_new_user()
returns trigger as $$
declare
  meta_username text;
  final_username text;
begin
  meta_username := trim(lower(new.raw_user_meta_data->>'username'));
  -- Use metadata username if valid (3+ chars, alphanumeric + underscore) and not taken
  if length(meta_username) >= 3
     and meta_username ~ '^[a-z0-9_]+$'
     and not exists (select 1 from public.profiles where username = meta_username) then
    final_username := meta_username;
  else
    final_username := 'user_' || replace(new.id::text, '-', '');
  end if;

  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    final_username,
    coalesce(trim(new.raw_user_meta_data->>'full_name'), '')
  );
  return new;
end;
$$ language plpgsql security definer;
