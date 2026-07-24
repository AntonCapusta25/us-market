-- AutoFlow Studio — Salespeople Call Reminder System Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run

-- ============================================================
-- 1. Enable Required Extensions
-- ============================================================
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ============================================================
-- 2. Create Reminders Table
-- ============================================================
create table if not exists public.reminders (
  id                uuid primary key default gen_random_uuid(),
  lead_id           uuid not null,
  lead_type         text not null, -- 'booking', 'contact', 'outreach'
  lead_name         text not null,
  salesperson_id    uuid not null references public.profiles(id) on delete cascade,
  salesperson_email text not null,
  salesperson_name  text not null,
  notes_content     text not null,
  scheduled_at      timestamptz not null,
  sent              boolean not null default false,
  created_at        timestamptz not null default now()
);

-- Enable RLS for Security
alter table public.reminders enable row level security;

-- Policies for Reminders
drop policy if exists "admin read reminders" on public.reminders;
create policy "admin read reminders" on public.reminders 
  for select to authenticated 
  using (public.is_admin() or salesperson_id = auth.uid());

-- ============================================================
-- 3. Create Trigger Function to Parse Notes and Schedule Reminders
-- ============================================================
create or replace function public.schedule_salesperson_reminder()
returns trigger as $$
declare
  extracted_time text;
  target_time    timestamptz;
  sp_email       text;
  sp_name        text;
  l_name         text;
begin
  -- Look for "call later" or "remind" keywords in the note/call content
  if (new.event_type = 'note' or new.event_type = 'call') and 
     (new.content ilike '%call later%' or new.content ilike '%remind%') then
     
    -- Extract date/time pattern (YYYY-MM-DD HH:MI) if present in the text
    extracted_time := substring(new.content from '\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}');
    
    if extracted_time is not null then
      begin
        target_time := to_timestamp(extracted_time, 'YYYY-MM-DD HH24:MI');
      exception when others then
        -- Fallback if parsing fails: schedule in 30 minutes
        target_time := now() + interval '30 minutes';
      end;
    else
      -- Default: schedule exactly in 30 minutes
      target_time := now() + interval '30 minutes';
    end if;

    -- Fetch salesperson details (email & name)
    select email, coalesce(name, split_part(email, '@', 1))
    into sp_email, sp_name
    from public.profiles
    where id = new.admin_id;

    -- Proceed only if salesperson exists
    if sp_email is not null then
      -- Fetch lead name based on lead type
      if new.lead_type = 'booking' then
        select name into l_name from public.booking_leads where id = new.lead_id;
      elsif new.lead_type = 'contact' then
        select name into l_name from public.contact_leads where id = new.lead_id;
      elsif new.lead_type = 'outreach' then
        select name into l_name from public.outreach_leads where id = new.lead_id;
      end if;

      -- Insert the scheduled reminder
      insert into public.reminders (
        lead_id, lead_type, lead_name,
        salesperson_id, salesperson_email, salesperson_name,
        notes_content, scheduled_at
      ) values (
        new.lead_id, new.lead_type, coalesce(l_name, 'Client'),
        new.admin_id, sp_email, sp_name,
        new.content, target_time
      );
    end if;
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- Attach trigger to lead_history (captures both logCall and addComment notes)
drop trigger if exists on_lead_history_note_added on public.lead_history;
create trigger on_lead_history_note_added
  after insert on public.lead_history
  for each row execute procedure public.schedule_salesperson_reminder();

-- ============================================================
-- 4. Create Cron Runner Function to Send Reminders via Edge Function
-- ============================================================
create or replace function public.check_and_send_reminders()
returns void as $$
declare
  r record;
  email_body text;
  request_id bigint;
begin
  for r in 
    select id, lead_name, lead_type, salesperson_email, salesperson_name, notes_content
    from public.reminders
    where sent = false and scheduled_at <= now()
  loop
    -- Build the premium HTML email body
    email_body := '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; background-color: #0b0f19; color: #f3f4f6; padding: 30px; margin: 0;">' ||
                  '  <div style="background-color: #111827; border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 32px; max-width: 550px; margin: 0 auto; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">' ||
                  '    <h2 style="margin-top: 0; color: #10b981; font-size: 1.4rem; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 16px; font-weight: 800; letter-spacing: -0.01em;">⏰ Call Reminder</h2>' ||
                  '    <div style="margin: 18px 0;">' ||
                  '      <span style="color: #6b7280; font-weight: 800; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Lead Name</span>' ||
                  '      <span style="color: #f3f4f6; font-weight: 600; font-size: 0.95rem;">' || r.lead_name || '</span>' ||
                  '    </div>' ||
                  '    <div style="margin: 18px 0;">' ||
                  '      <span style="color: #6b7280; font-weight: 800; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Lead Type</span>' ||
                  '      <span style="color: #f3f4f6; font-weight: 600; font-size: 0.95rem; text-transform: uppercase;">' || r.lead_type || '</span>' ||
                  '    </div>' ||
                  '    <div style="margin: 18px 0;">' ||
                  '      <span style="color: #6b7280; font-weight: 800; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Your Note</span>' ||
                  '      <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); padding: 16px; border-radius: 12px; font-style: italic; color: #94a3b8; margin-top: 8px; line-height: 1.6;">' ||
                  '        "' || r.notes_content || '"' ||
                  '      </div>' ||
                  '    </div>' ||
                  '    <div style="text-align: center; margin-top: 24px;">' ||
                  '      <a href="https://autoflowstudio.net/admin/leads" style="display: inline-block; width: 100%; box-sizing: border-box; padding: 14px; background: #12715B; color: white !important; text-decoration: none; border-radius: 10px; font-weight: 800; font-size: 0.9rem; text-align: center; border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(18, 113, 91, 0.2);" target="_blank">Open CRM Leads</a>' ||
                  '    </div>' ||
                  '  </div>' ||
                  '</div>';

    -- Dispatch request asynchronously via pg_net (calls edge function send-email)
    select net.http_post(
      url := 'https://gvuucsammtyweehzqwjo.supabase.co/functions/v1/send-email',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2dXVjc2FtbXR5d2VlaHpxd2pvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3Mzg3NjQsImV4cCI6MjA5MzMxNDc2NH0.0RDHL9bhXaClj0lkHy6ocuquur5rjN7IaslEtia3WzE"}'::jsonb,
      body := jsonb_build_object(
        'type', 'campaign',
        'recipient', r.salesperson_email,
        'subject', '⏰ Call Reminder: ' || r.lead_name,
        'message', email_body
      )
    ) into request_id;

    -- Mark reminder as sent
    update public.reminders
    set sent = true
    where id = r.id;
  end loop;
end;
$$ language plpgsql security definer;

-- ============================================================
-- 5. Schedule pg_cron Job (Runs check_and_send_reminders every minute)
-- ============================================================
-- Safely unschedule if exists to prevent crashes on first run
select cron.unschedule(jobid) from cron.job where jobname = 'send-sales-reminders';

select cron.schedule(
  'send-sales-reminders',
  '* * * * *',
  'select public.check_and_send_reminders();'
);
