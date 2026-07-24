-- AutoFlow Studio — Supabase Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run

-- ============================================================
-- 1. contact_leads
--    Populated by ContactForm on /contact
-- ============================================================
create table if not exists public.contact_leads (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  email       text not null,
  company     text,
  message     text
);

-- Only allow anonymous inserts (no reads, no updates, no deletes)
alter table public.contact_leads enable row level security;

create policy "anon insert contact_leads"
  on public.contact_leads
  for insert
  to anon
  with check (true);

-- ============================================================
-- 2. booking_leads
--    Populated by BookingForm (homepage CTA + contact page)
-- ============================================================
create table if not exists public.booking_leads (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  email       text not null,
  service     text,
  size        text,
  platform    text
);

alter table public.booking_leads enable row level security;

create policy "anon insert booking_leads"
  on public.booking_leads
  for insert
  to anon
  with check (true);

-- ============================================================
-- 3. newsletter_subs
--    For future newsletter signup form
-- ============================================================
create table if not exists public.newsletter_subs (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  email       text not null unique
);

alter table public.newsletter_subs enable row level security;

create policy "anon insert newsletter_subs"
  on public.newsletter_subs
  for insert
  to anon
  with check (true);
