-- AutoFlow Studio — Salesperson Follow-Up Calendar
-- Extends the existing `reminders` table (from 20260708000000_sales_reminders.sql)
-- so it can back a dedicated per-salesperson follow-up calendar, fed either by
-- smart-parsing of notes (done client-side now, see src/lib/followUpParser.js)
-- or by manually picking a date/time when a lead is marked "Follow Up Needed".

-- ============================================================
-- 1. New columns on reminders
-- ============================================================
alter table public.reminders
  add column if not exists completed boolean not null default false,
  add column if not exists source text not null default 'note' check (source in ('note', 'manual')),
  add column if not exists lead_status_at_creation text,
  add column if not exists updated_at timestamptz not null default now();

-- ============================================================
-- 2. Retire the old regex-based auto-scheduling trigger.
--    Note/call text is now parsed client-side (chrono-node) with far better
--    natural-language support ("call back tmrw", "next Monday 3pm", etc.),
--    and the app inserts directly into `reminders`. Keeping the old trigger
--    around would double-book reminders for the same note.
-- ============================================================
drop trigger if exists on_lead_history_note_added on public.lead_history;
drop function if exists public.schedule_salesperson_reminder();

-- ============================================================
-- 3. RLS: let salespeople manage their own reminders, admins manage all
--    (matches the "open RLS for salespeople" pattern used elsewhere in the app)
-- ============================================================
drop policy if exists "admin read reminders" on public.reminders;
create policy "read own or admin reminders" on public.reminders
  for select to authenticated
  using (public.is_admin() or salesperson_id = auth.uid());

drop policy if exists "insert own or admin reminders" on public.reminders;
create policy "insert own or admin reminders" on public.reminders
  for insert to authenticated
  with check (public.is_admin() or salesperson_id = auth.uid());

drop policy if exists "update own or admin reminders" on public.reminders;
create policy "update own or admin reminders" on public.reminders
  for update to authenticated
  using (public.is_admin() or salesperson_id = auth.uid());

drop policy if exists "delete own or admin reminders" on public.reminders;
create policy "delete own or admin reminders" on public.reminders
  for delete to authenticated
  using (public.is_admin() or salesperson_id = auth.uid());

-- ============================================================
-- 4. Don't email a reminder that was marked complete before it fired
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
    where sent = false and completed = false and scheduled_at <= now()
  loop
    email_body := '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; background-color: #0b0f19; color: #f3f4f6; padding: 30px; margin: 0;">' ||
                  '  <div style="background-color: #111827; border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 32px; max-width: 550px; margin: 0 auto; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">' ||
                  '    <h2 style="margin-top: 0; color: #10b981; font-size: 1.4rem; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 16px; font-weight: 800; letter-spacing: -0.01em;">⏰ Follow-Up Reminder</h2>' ||
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
                  '      <a href="https://autoflowstudio.net/admin/follow-ups" style="display: inline-block; width: 100%; box-sizing: border-box; padding: 14px; background: #12715B; color: white !important; text-decoration: none; border-radius: 10px; font-weight: 800; font-size: 0.9rem; text-align: center; border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(18, 113, 91, 0.2);" target="_blank">Open Follow-Up Calendar</a>' ||
                  '    </div>' ||
                  '  </div>' ||
                  '</div>';

    select net.http_post(
      url := 'https://gvuucsammtyweehzqwjo.supabase.co/functions/v1/send-email',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2dXVjc2FtbXR5d2VlaHpxd2pvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3Mzg3NjQsImV4cCI6MjA5MzMxNDc2NH0.0RDHL9bhXaClj0lkHy6ocuquur5rjN7IaslEtia3WzE"}'::jsonb,
      body := jsonb_build_object(
        'type', 'campaign',
        'recipient', r.salesperson_email,
        'subject', '⏰ Follow-Up Reminder: ' || r.lead_name,
        'message', email_body
      )
    ) into request_id;

    update public.reminders
    set sent = true
    where id = r.id;
  end loop;
end;
$$ language plpgsql security definer;
