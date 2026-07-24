-- AutoFlow Studio — Add Napoleon Role Migration

-- 1. Alter check constraint on public.profiles to allow 'Napoleon' role
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'salesperson', 'Napoleon'));

-- 2. Update is_admin() helper function to treat 'Napoleon' as admin
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'Napoleon')
  );
end;
$$ language plpgsql security definer;

-- 3. Update Walid's role to 'Napoleon' if he exists in profiles
update public.profiles
set role = 'Napoleon'
where name ilike '%walid%' or email ilike '%walid%';

-- 4. Open up read-only SELECT permissions to all authenticated users for leads and history
-- (required for shared activity feed and leaderboard statistics)
drop policy if exists "admin read contact_leads" on public.contact_leads;
create policy "admin read contact_leads" on public.contact_leads for select to authenticated using (true);

drop policy if exists "admin read booking_leads" on public.booking_leads;
create policy "admin read booking_leads" on public.booking_leads for select to authenticated using (true);

drop policy if exists "authenticated select outreach_leads" on public.outreach_leads;
create policy "authenticated select outreach_leads" on public.outreach_leads for select to authenticated using (true);

drop policy if exists "authenticated select lead_history" on public.lead_history;
create policy "authenticated select lead_history" on public.lead_history for select to authenticated using (true);

