-- CRM Enhancement: Call Tracking & Interaction History
-- 1. Add call_attempts to all lead tables
alter table public.contact_leads add column if not exists call_attempts int default 0;
alter table public.booking_leads add column if not exists call_attempts int default 0;
alter table public.outreach_leads add column if not exists call_attempts int default 0;

-- 2. Create lead_history table for all interactions
create table if not exists public.lead_history (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    lead_id uuid not null, -- Polymorphic link (matches id in any lead table)
    lead_type text not null check (lead_type in ('booking', 'contact', 'outreach')),
    event_type text not null, -- 'call', 'email', 'note', 'status_change', 'imported'
    content text,
    admin_id uuid references auth.users(id) default auth.uid()
);

-- 3. RLS Policies
alter table public.lead_history enable row level security;
create policy "admin manage lead_history" on public.lead_history for all to authenticated using (true);

-- 4. Indexes for performance
create index if not exists idx_lead_history_lead_id on public.lead_history(lead_id);
create index if not exists idx_lead_history_created_at on public.lead_history(created_at);
