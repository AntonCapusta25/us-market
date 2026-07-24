-- CRM Enhancement: Add Phone Numbers to all lead tables
alter table public.contact_leads add column if not exists phone text;
alter table public.booking_leads add column if not exists phone text;
alter table public.outreach_leads add column if not exists phone text;

-- Add indexes for searching by phone
create index if not exists idx_contact_leads_phone on public.contact_leads(phone);
create index if not exists idx_booking_leads_phone on public.booking_leads(phone);
create index if not exists idx_outreach_leads_phone on public.outreach_leads(phone);
