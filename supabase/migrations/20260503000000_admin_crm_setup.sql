-- 1. Add status and notes to contact_leads
alter table public.contact_leads 
add column if not exists status text default 'New',
add column if not exists notes text;

-- 2. Add status and notes to booking_leads
alter table public.booking_leads 
add column if not exists status text default 'New',
add column if not exists notes text;

-- 3. Update RLS policies to allow admin (authenticated) access
-- Allow authenticated users (admin) to manage all leads
create policy "admin read contact_leads" on public.contact_leads for select to authenticated using (true);
create policy "admin update contact_leads" on public.contact_leads for update to authenticated using (true);
create policy "admin delete contact_leads" on public.contact_leads for delete to authenticated using (true);

create policy "admin read booking_leads" on public.booking_leads for select to authenticated using (true);
create policy "admin update booking_leads" on public.booking_leads for update to authenticated using (true);
create policy "admin delete booking_leads" on public.booking_leads for delete to authenticated using (true);

create policy "admin read newsletter_subs" on public.newsletter_subs for select to authenticated using (true);
create policy "admin delete newsletter_subs" on public.newsletter_subs for delete to authenticated using (true);
