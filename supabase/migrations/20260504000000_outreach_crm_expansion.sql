-- Outreach CRM Expansion Migration
-- 1. outreach_leads: Storage for scraped data
create table if not exists public.outreach_leads (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    email text not null,
    name text,
    company text,
    website text,
    linkedin text,
    industry text,
    location text,
    status text default 'Scraped', -- Scraped, Contacted, Interested, Not Interested, Promoted
    notes text,
    tags text[],
    metadata jsonb default '{}'::jsonb,
    last_contacted_at timestamptz
);

-- 2. campaigns: Grouping for batch outreach
create table if not exists public.campaigns (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    name text not null,
    description text,
    status text default 'Draft', -- Draft, Active, Completed, Paused
    subject_template text,
    body_template text,
    stats jsonb default '{"sent": 0, "opened": 0, "replied": 0}'::jsonb
);

-- 3. outreach_emails: Email history tracking
create table if not exists public.outreach_emails (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    lead_id uuid references public.outreach_leads(id) on delete cascade,
    campaign_id uuid references public.campaigns(id) on delete set null,
    subject text,
    body text,
    status text default 'Sent', -- Sent, Delivered, Opened, Replied, Failed
    opened_at timestamptz,
    error_message text
);

-- 4. segments: Custom lead groupings
create table if not exists public.segments (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    name text not null,
    description text,
    filter_criteria jsonb not null default '{}'::jsonb -- Stores filters like { industry: 'E-commerce', tags: ['High Priority'] }
);

-- 5. RLS Policies for Admin Access (Authenticated Users)
alter table public.outreach_leads enable row level security;
alter table public.campaigns enable row level security;
alter table public.outreach_emails enable row level security;
alter table public.segments enable row level security;

create policy "admin manage outreach_leads" on public.outreach_leads for all to authenticated using (true);
create policy "admin manage campaigns" on public.campaigns for all to authenticated using (true);
create policy "admin manage outreach_emails" on public.outreach_emails for all to authenticated using (true);
create policy "admin manage segments" on public.segments for all to authenticated using (true);

-- 6. Add indexes for performance
create index if not exists idx_outreach_leads_email on public.outreach_leads(email);
create index if not exists idx_outreach_leads_status on public.outreach_leads(status);
create index if not exists idx_outreach_emails_lead_id on public.outreach_emails(lead_id);
create index if not exists idx_outreach_emails_campaign_id on public.outreach_emails(campaign_id);
