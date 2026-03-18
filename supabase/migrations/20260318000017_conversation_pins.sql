-- Pin a single message per conversation (Telegram-like).
-- One pin per conversation: upsert by conversation_id.

create table if not exists public.conversation_pins (
  conversation_id uuid primary key references public.conversations (id) on delete cascade,
  message_id uuid not null references public.messages (id) on delete cascade,
  pinned_by uuid not null references public.profiles (id) on delete cascade,
  pinned_at timestamptz default now() not null
);

create index if not exists idx_conversation_pins_message on public.conversation_pins (message_id);

create or replace function public.check_pin_message_belongs_to_conversation()
returns trigger as $$
begin
  if not exists (
    select 1
    from public.messages m
    where m.id = NEW.message_id
      and m.conversation_id = NEW.conversation_id
  ) then
    raise exception 'Pin message does not belong to the conversation';
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_conversation_pins_message_belongs on public.conversation_pins;
create trigger trg_conversation_pins_message_belongs
before insert or update of message_id, conversation_id
on public.conversation_pins
for each row
execute function public.check_pin_message_belongs_to_conversation();

alter table public.conversation_pins enable row level security;

-- Read: participants can read pins for their conversations.
create policy "Participants can read conversation pins"
  on public.conversation_pins for select
  using (
    exists (
      select 1
      from public.participants p
      where p.conversation_id = conversation_pins.conversation_id
        and p.user_id = auth.uid()
    )
  );

-- Insert: only participant who pins can create/update their pin.
create policy "Participants can insert conversation pins"
  on public.conversation_pins for insert
  with check (
    pinned_by = auth.uid()
    and exists (
      select 1
      from public.participants p
      where p.conversation_id = conversation_pins.conversation_id
        and p.user_id = auth.uid()
    )
  );

-- Update: participant who pinned (pinned_by) can move/replace pin.
create policy "Participants can update conversation pins"
  on public.conversation_pins for update
  using (
    exists (
      select 1
      from public.participants p
      where p.conversation_id = conversation_pins.conversation_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    pinned_by = auth.uid()
    and exists (
      select 1
      from public.participants p
      where p.conversation_id = conversation_pins.conversation_id
        and p.user_id = auth.uid()
    )
  );

-- Delete: only the user who pinned can unpin.
create policy "Participants can delete conversation pins"
  on public.conversation_pins for delete
  using (
    exists (
      select 1
      from public.participants p
      where p.conversation_id = conversation_pins.conversation_id
        and p.user_id = auth.uid()
    )
  );

