-- CRM Enhancement: Add Website column to all lead tables
alter table public.contact_leads add column if not exists website text;
alter table public.booking_leads add column if not exists website text;
alter table public.outreach_leads add column if not exists website text;

-- Add indexes for searching by website
create index if not exists idx_contact_leads_website on public.contact_leads(website);
create index if not exists idx_booking_leads_website on public.booking_leads(website);
create index if not exists idx_outreach_leads_website on public.outreach_leads(website);
