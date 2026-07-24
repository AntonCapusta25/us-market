-- AutoFlow Studio — Chat and Notifications System Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run

-- ============================================================
-- 1. Create chat_messages Table
-- ============================================================
create table if not exists public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid references public.profiles(id) on delete cascade, -- NULL for public group chat (#general)
  content     text not null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 2. Create notifications Table
-- ============================================================
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  content     text not null,
  type        text not null, -- 'lead_assigned', 'deal_created', 'deal_status_updated', 'chat_message', 'system'
  is_read     boolean not null default false,
  link        text,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 3. Enable RLS and Configure Policies
-- ============================================================

-- ── chat_messages RLS ──
alter table public.chat_messages enable row level security;

drop policy if exists "Allow select messages" on public.chat_messages;
create policy "Allow select messages" on public.chat_messages for select to authenticated using (
  receiver_id is null or sender_id = auth.uid() or receiver_id = auth.uid()
);

drop policy if exists "Allow insert messages" on public.chat_messages;
create policy "Allow insert messages" on public.chat_messages for insert to authenticated with check (
  sender_id = auth.uid()
);

-- ── notifications RLS ──
alter table public.notifications enable row level security;

drop policy if exists "Allow select notifications for owner" on public.notifications;
create policy "Allow select notifications for owner" on public.notifications for select to authenticated using (
  user_id = auth.uid()
);

drop policy if exists "Allow update notifications for owner" on public.notifications;
create policy "Allow update notifications for owner" on public.notifications for update to authenticated using (
  user_id = auth.uid()
);

drop policy if exists "Allow delete notifications for owner" on public.notifications;
create policy "Allow delete notifications for owner" on public.notifications for delete to authenticated using (
  user_id = auth.uid()
);

drop policy if exists "Allow insert notifications for all authenticated" on public.notifications;
create policy "Allow insert notifications for all authenticated" on public.notifications for insert to authenticated with check (
  true
);

-- ============================================================
-- 4. Automated Notification Trigger Functions
-- ============================================================

-- ── Trigger: Outreach Lead Assignment ──
create or replace function public.notify_on_outreach_lead_assignment()
returns trigger as $$
begin
  if (TG_OP = 'INSERT' and new.assignee_id is not null) or
     (TG_OP = 'UPDATE' and new.assignee_id is not null and (old.assignee_id is null or new.assignee_id <> old.assignee_id)) then
    insert into public.notifications (user_id, title, content, type, link)
    values (
      new.assignee_id,
      'New Lead Assigned',
      'You have been assigned to outreach lead: ' || coalesce(new.name, new.email, 'Client'),
      'lead_assigned',
      '/admin/outreach'
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_outreach_lead_assigned on public.outreach_leads;
create trigger on_outreach_lead_assigned
  after insert or update of assignee_id on public.outreach_leads
  for each row execute procedure public.notify_on_outreach_lead_assignment();

-- ── Trigger: Booking Lead Assignment ──
create or replace function public.notify_on_booking_lead_assignment()
returns trigger as $$
begin
  if (TG_OP = 'INSERT' and new.assignee_id is not null) or
     (TG_OP = 'UPDATE' and new.assignee_id is not null and (old.assignee_id is null or new.assignee_id <> old.assignee_id)) then
    insert into public.notifications (user_id, title, content, type, link)
    values (
      new.assignee_id,
      'New Lead Assigned',
      'You have been assigned to booking lead: ' || coalesce(new.name, new.email, 'Client'),
      'lead_assigned',
      '/admin/leads'
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_booking_lead_assigned on public.booking_leads;
create trigger on_booking_lead_assigned
  after insert or update of assignee_id on public.booking_leads
  for each row execute procedure public.notify_on_booking_lead_assignment();

-- ── Trigger: Contact Lead Assignment ──
create or replace function public.notify_on_contact_lead_assignment()
returns trigger as $$
begin
  if (TG_OP = 'INSERT' and new.assignee_id is not null) or
     (TG_OP = 'UPDATE' and new.assignee_id is not null and (old.assignee_id is null or new.assignee_id <> old.assignee_id)) then
    insert into public.notifications (user_id, title, content, type, link)
    values (
      new.assignee_id,
      'New Lead Assigned',
      'You have been assigned to contact lead: ' || coalesce(new.name, new.email, 'Client'),
      'lead_assigned',
      '/admin/leads'
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_contact_lead_assigned on public.contact_leads;
create trigger on_contact_lead_assigned
  after insert or update of assignee_id on public.contact_leads
  for each row execute procedure public.notify_on_contact_lead_assignment();

-- ── Trigger: Deal Creation & Updates ──
create or replace function public.notify_on_deal_update()
returns trigger as $$
begin
  if new.salesperson_id is not null then
    if (TG_OP = 'INSERT') then
      insert into public.notifications (user_id, title, content, type, link)
      values (
        new.salesperson_id,
        'New Deal Created',
        'A new deal has been created for lead: ' || new.lead_name,
        'deal_created',
        '/admin/deals'
      );
    elsif (TG_OP = 'UPDATE' and old.status <> new.status) then
      insert into public.notifications (user_id, title, content, type, link)
      values (
        new.salesperson_id,
        'Deal Status Updated',
        'Your deal for ' || new.lead_name || ' status changed to ' || upper(new.status),
        'deal_status_updated',
        '/admin/deals'
      );
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_deal_updated on public.deals;
create trigger on_deal_updated
  after insert or update of status on public.deals
  for each row execute procedure public.notify_on_deal_update();

-- ── Trigger: Direct Messages Notifications ──
create or replace function public.notify_on_chat_message()
returns trigger as $$
declare
  sender_name text;
begin
  if new.receiver_id is not null then
    select name into sender_name from public.profiles where id = new.sender_id;
    insert into public.notifications (user_id, title, content, type, link)
    values (
      new.receiver_id,
      'New Message from ' || coalesce(sender_name, 'Team Member'),
      case when length(new.content) > 50 then substring(new.content from 1 for 47) || '...' else new.content end,
      'chat_message',
      '/admin/chat'
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_chat_message_inserted on public.chat_messages;
create trigger on_chat_message_inserted
  after insert on public.chat_messages
  for each row execute procedure public.notify_on_chat_message();

-- ============================================================
-- 5. Enable Realtime Publications
-- ============================================================
-- Ensure tables are published to supabase_realtime safely without duplicate or syntax errors
do $$
begin
  -- Add chat_messages to publication if not already present
  if not exists (
    select 1 from pg_publication_rel pr
    join pg_class c on pr.prrelid = c.oid
    join pg_publication p on pr.prpubid = p.oid
    where p.pubname = 'supabase_realtime' and c.relname = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;

  -- Add notifications to publication if not already present
  if not exists (
    select 1 from pg_publication_rel pr
    join pg_class c on pr.prrelid = c.oid
    join pg_publication p on pr.prpubid = p.oid
    where p.pubname = 'supabase_realtime' and c.relname = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
