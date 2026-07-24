-- AutoFlow Studio — RLS Relaxation for Sales Team Collaboration
-- Allows authenticated salespeople to log interactions, send template/custom emails,
-- and update lead statuses for any lead in the system.

-- 1. outreach_leads: allow select, insert, update to all authenticated users
drop policy if exists "authenticated select outreach_leads" on public.outreach_leads;
create policy "authenticated select outreach_leads" on public.outreach_leads for select to authenticated using (true);

drop policy if exists "authenticated insert outreach_leads" on public.outreach_leads;
create policy "authenticated insert outreach_leads" on public.outreach_leads for insert to authenticated with check (true);

drop policy if exists "authenticated update outreach_leads" on public.outreach_leads;
create policy "authenticated update outreach_leads" on public.outreach_leads for update to authenticated using (true);

-- 2. booking_leads: allow update to all authenticated users
drop policy if exists "admin update booking_leads" on public.booking_leads;
create policy "admin update booking_leads" on public.booking_leads for update to authenticated using (true);

-- 3. contact_leads: allow update to all authenticated users
drop policy if exists "admin update contact_leads" on public.contact_leads;
create policy "admin update contact_leads" on public.contact_leads for update to authenticated using (true);

-- 4. lead_history: allow insert to all authenticated users
drop policy if exists "authenticated insert lead_history" on public.lead_history;
create policy "authenticated insert lead_history" on public.lead_history for insert to authenticated with check (true);

-- 5. outreach_emails: allow select and insert to all authenticated users
drop policy if exists "authenticated select outreach_emails" on public.outreach_emails;
create policy "authenticated select outreach_emails" on public.outreach_emails for select to authenticated using (true);

drop policy if exists "authenticated insert outreach_emails" on public.outreach_emails;
create policy "authenticated insert outreach_emails" on public.outreach_emails for insert to authenticated with check (true);
