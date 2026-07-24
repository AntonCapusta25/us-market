-- AutoFlow Studio — Multi-Tenant & Sales Team Onboarding Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run

-- ============================================================
-- 1. Create Profiles Table
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'salesperson' check (role in ('admin', 'salesperson')),
  name text,
  created_at timestamptz default now()
);

-- ============================================================
-- 2. Setup Security Definer Admin Check Function
--    (Avoids infinite recursion in RLS policies)
-- ============================================================
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- ============================================================
-- 3. Automatic Profile Creation Trigger on Sign Up / User Creation
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'salesperson'),
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 4. Migrate Existing Users in auth.users to public.profiles as Admins
-- ============================================================
insert into public.profiles (id, email, role, name)
select id, email, 'admin', split_part(email, '@', 1)
from auth.users
on conflict (id) do nothing;

-- ============================================================
-- 5. Add Assignment and Creator Columns
-- ============================================================
alter table public.booking_leads add column if not exists assignee_id uuid references public.profiles(id) on delete set null;
alter table public.contact_leads add column if not exists assignee_id uuid references public.profiles(id) on delete set null;
alter table public.outreach_leads add column if not exists assignee_id uuid references public.profiles(id) on delete set null;

alter table public.campaigns add column if not exists creator_id uuid references public.profiles(id) on delete set null;
alter table public.segments add column if not exists creator_id uuid references public.profiles(id) on delete set null;

-- ============================================================
-- 6. Enable RLS and Configure Policies
-- ============================================================

-- ── profiles Policies ──
alter table public.profiles enable row level security;

drop policy if exists "Allow select for self or admins" on public.profiles;
drop policy if exists "Allow select for all authenticated" on public.profiles;
create policy "Allow select for all authenticated" on public.profiles for select to authenticated using (true);

drop policy if exists "Allow update for self or admins" on public.profiles;
create policy "Allow update for self or admins" on public.profiles for update to authenticated using (auth.uid() = id or public.is_admin());

drop policy if exists "Allow delete for admins" on public.profiles;
create policy "Allow delete for admins" on public.profiles for delete to authenticated using (public.is_admin());

-- ── contact_leads Policies ──
drop policy if exists "admin read contact_leads" on public.contact_leads;
drop policy if exists "admin update contact_leads" on public.contact_leads;
drop policy if exists "admin delete contact_leads" on public.contact_leads;

create policy "admin read contact_leads" on public.contact_leads for select to authenticated using (public.is_admin() or assignee_id = auth.uid());
create policy "admin update contact_leads" on public.contact_leads for update to authenticated using (public.is_admin() or assignee_id = auth.uid());
create policy "admin delete contact_leads" on public.contact_leads for delete to authenticated using (public.is_admin());

-- ── booking_leads Policies ──
drop policy if exists "admin read booking_leads" on public.booking_leads;
drop policy if exists "admin update booking_leads" on public.booking_leads;
drop policy if exists "admin delete booking_leads" on public.booking_leads;

create policy "admin read booking_leads" on public.booking_leads for select to authenticated using (public.is_admin() or assignee_id = auth.uid());
create policy "admin update booking_leads" on public.booking_leads for update to authenticated using (public.is_admin() or assignee_id = auth.uid());
create policy "admin delete booking_leads" on public.booking_leads for delete to authenticated using (public.is_admin());

-- ── outreach_leads Policies ──
drop policy if exists "admin manage outreach_leads" on public.outreach_leads;
drop policy if exists "authenticated select outreach_leads" on public.outreach_leads;
drop policy if exists "authenticated update outreach_leads" on public.outreach_leads;
drop policy if exists "authenticated delete outreach_leads" on public.outreach_leads;
drop policy if exists "authenticated insert outreach_leads" on public.outreach_leads;

create policy "authenticated select outreach_leads" on public.outreach_leads for select to authenticated using (public.is_admin() or assignee_id = auth.uid());
create policy "authenticated update outreach_leads" on public.outreach_leads for update to authenticated using (public.is_admin() or assignee_id = auth.uid());
create policy "authenticated delete outreach_leads" on public.outreach_leads for delete to authenticated using (public.is_admin());
create policy "authenticated insert outreach_leads" on public.outreach_leads for insert to authenticated with check (public.is_admin() or assignee_id = auth.uid());

-- ── lead_history Policies ──
drop policy if exists "admin manage lead_history" on public.lead_history;
drop policy if exists "authenticated select lead_history" on public.lead_history;
drop policy if exists "authenticated insert lead_history" on public.lead_history;
drop policy if exists "authenticated delete lead_history" on public.lead_history;

create policy "authenticated select lead_history" on public.lead_history for select to authenticated using (
  public.is_admin() or
  (lead_type = 'booking' and exists (select 1 from public.booking_leads where id = lead_id and assignee_id = auth.uid())) or
  (lead_type = 'contact' and exists (select 1 from public.contact_leads where id = lead_id and assignee_id = auth.uid())) or
  (lead_type = 'outreach' and exists (select 1 from public.outreach_leads where id = lead_id and assignee_id = auth.uid()))
);
create policy "authenticated insert lead_history" on public.lead_history for insert to authenticated with check (
  public.is_admin() or
  (lead_type = 'booking' and exists (select 1 from public.booking_leads where id = lead_id and assignee_id = auth.uid())) or
  (lead_type = 'contact' and exists (select 1 from public.contact_leads where id = lead_id and assignee_id = auth.uid())) or
  (lead_type = 'outreach' and exists (select 1 from public.outreach_leads where id = lead_id and assignee_id = auth.uid()))
);
create policy "authenticated delete lead_history" on public.lead_history for delete to authenticated using (
  public.is_admin() or admin_id = auth.uid()
);

-- ── outreach_emails Policies ──
drop policy if exists "admin manage outreach_emails" on public.outreach_emails;
drop policy if exists "authenticated select outreach_emails" on public.outreach_emails;
drop policy if exists "authenticated insert outreach_emails" on public.outreach_emails;
drop policy if exists "authenticated delete outreach_emails" on public.outreach_emails;

create policy "authenticated select outreach_emails" on public.outreach_emails for select to authenticated using (
  public.is_admin() or
  exists (select 1 from public.outreach_leads where id = lead_id and assignee_id = auth.uid())
);
create policy "authenticated insert outreach_emails" on public.outreach_emails for insert to authenticated with check (
  public.is_admin() or
  exists (select 1 from public.outreach_leads where id = lead_id and assignee_id = auth.uid())
);
create policy "authenticated delete outreach_emails" on public.outreach_emails for delete to authenticated using (
  public.is_admin()
);

-- ── campaigns Policies ──
drop policy if exists "admin manage campaigns" on public.campaigns;
drop policy if exists "authenticated select campaigns" on public.campaigns;
drop policy if exists "authenticated insert campaigns" on public.campaigns;
drop policy if exists "authenticated update campaigns" on public.campaigns;
drop policy if exists "authenticated delete campaigns" on public.campaigns;

create policy "authenticated select campaigns" on public.campaigns for select to authenticated using (public.is_admin() or creator_id = auth.uid());
create policy "authenticated insert campaigns" on public.campaigns for insert to authenticated with check (public.is_admin() or creator_id = auth.uid());
create policy "authenticated update campaigns" on public.campaigns for update to authenticated using (public.is_admin() or creator_id = auth.uid());
create policy "authenticated delete campaigns" on public.campaigns for delete to authenticated using (public.is_admin());

-- ── segments Policies ──
drop policy if exists "admin manage segments" on public.segments;
drop policy if exists "authenticated select segments" on public.segments;
drop policy if exists "authenticated insert segments" on public.segments;
drop policy if exists "authenticated update segments" on public.segments;
drop policy if exists "authenticated delete segments" on public.segments;

-- All authenticated users can view all segments (shared team resource)
create policy "authenticated select segments" on public.segments for select to authenticated using (true);
create policy "authenticated insert segments" on public.segments for insert to authenticated with check (public.is_admin() or creator_id = auth.uid());
create policy "authenticated update segments" on public.segments for update to authenticated using (public.is_admin() or creator_id = auth.uid());
create policy "authenticated delete segments" on public.segments for delete to authenticated using (public.is_admin());

