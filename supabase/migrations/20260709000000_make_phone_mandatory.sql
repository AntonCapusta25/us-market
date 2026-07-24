-- Migration: Make phone column mandatory in booking_leads
-- 1. Backfill existing null/empty phone values with a placeholder 'N/A'
update public.booking_leads
set phone = 'N/A'
where phone is null or trim(phone) = '';

-- 2. Alter column to be NOT NULL
alter table public.booking_leads 
alter column phone set not null;
