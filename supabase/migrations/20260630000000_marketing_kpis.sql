-- Marketing KPI tracker: stores daily actuals per KPI
drop table if exists public.marketing_kpis cascade;

create table public.marketing_kpis (
  id           uuid primary key default gen_random_uuid(),
  record_date  date not null,            -- the specific day (YYYY-MM-DD)
  kpi_id       text not null,            -- e.g. 'linkedin_posts', 'cold_emails'
  actual       integer not null default 0,
  updated_by   uuid references auth.users(id) on delete set null,
  updated_at   timestamptz not null default now(),
  constraint marketing_kpis_date_kpi_unique unique (record_date, kpi_id)
);

-- Auto-update updated_at
create or replace function public.set_marketing_kpis_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists marketing_kpis_updated_at on public.marketing_kpis;
create trigger marketing_kpis_updated_at
  before update on public.marketing_kpis
  for each row execute procedure public.set_marketing_kpis_updated_at();

-- RLS: only admins can read/write
alter table public.marketing_kpis enable row level security;

create policy "Admins can read marketing_kpis"
  on public.marketing_kpis for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'Napoleon')
    )
  );

create policy "Admins can upsert marketing_kpis"
  on public.marketing_kpis for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'Napoleon')
    )
  );

create policy "Admins can update marketing_kpis"
  on public.marketing_kpis for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'Napoleon')
    )
  );
