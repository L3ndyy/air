-- Participant roles: creator, admin, member

alter table public.participants
  add column if not exists role text not null default 'member'
  check (role in ('creator', 'admin', 'member'));

-- Backfill: set creator for existing groups (first participant by joined_at)
do $$
declare
  r record;
begin
  for r in
    select distinct on (conversation_id) conversation_id, user_id
    from public.participants
    order by conversation_id, joined_at asc
  loop
    update public.participants
    set role = 'creator'
    where conversation_id = r.conversation_id and user_id = r.user_id;
  end loop;
end $$;
