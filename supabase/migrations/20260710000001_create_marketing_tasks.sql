-- AutoFlow Studio — Marketing Task Board Migration
-- Creates the marketing_tasks table to power a Trello-like Kanban board

create table if not exists public.marketing_tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  status       text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  assignee_ids uuid[] default '{}'::uuid[], -- Array of profile IDs for multiple assignees
  attachments  jsonb not null default '[]'::jsonb, -- Array of objects: { name: text, url: text, type: 'doc'|'link' }
  comments     jsonb not null default '[]'::jsonb, -- Array of objects: { id: text, user_name: text, text: text, created_at: text }
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Enable RLS
alter table public.marketing_tasks enable row level security;

-- Policies: allow all authenticated users (salespeople and admins) to manage tasks
create policy "Allow select for all authenticated" on public.marketing_tasks for select to authenticated using (true);
create policy "Allow insert for all authenticated" on public.marketing_tasks for insert to authenticated with check (true);
create policy "Allow update for all authenticated" on public.marketing_tasks for update to authenticated using (true);
create policy "Allow delete for all authenticated" on public.marketing_tasks for delete to authenticated using (true);
