-- AutoFlow Studio — Deals & Revenue Tracking Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run

-- ============================================================
-- 1. Create Deals Table
-- ============================================================
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null,
  lead_type text not null default 'outreach',
  lead_name text not null default '',
  lead_email text,
  lead_company text,
  salesperson_id uuid references public.profiles(id) on delete set null,
  salesperson_name text,
  deal_value numeric(12, 2),
  commission numeric(12, 2),
  status text not null default 'pipeline' check (status in ('pipeline', 'won', 'lost')),
  admin_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- 2. Index for fast lookups
-- ============================================================
create index if not exists idx_deals_salesperson_id on public.deals(salesperson_id);
create index if not exists idx_deals_status on public.deals(status);
create index if not exists idx_deals_created_at on public.deals(created_at);

-- ============================================================
-- 3. Enable RLS with open authenticated access
-- ============================================================
alter table public.deals enable row level security;

drop policy if exists "auth select deals" on public.deals;
drop policy if exists "auth insert deals" on public.deals;
drop policy if exists "auth update deals" on public.deals;
drop policy if exists "auth delete deals" on public.deals;

create policy "auth select deals" on public.deals for select to authenticated using (true);
create policy "auth insert deals" on public.deals for insert to authenticated with check (true);
create policy "auth update deals" on public.deals for update to authenticated using (true);
create policy "auth delete deals" on public.deals for delete to authenticated using (true);
