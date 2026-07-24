-- Email templates for status-change notifications
-- Each row corresponds to one lead status.
-- When a lead's status is changed in the CRM and `enabled = true`,
-- the edge function `send-email` is invoked with type='status_change'.

create table if not exists email_templates (
  id          uuid primary key default gen_random_uuid(),
  status      text not null unique,
  subject     text not null default '',
  body        text not null default '',
  enabled     boolean not null default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Seed one row per CRM status (all disabled by default)
insert into email_templates (status, subject, body, enabled) values
  ('New',                  'We received your enquiry, {{name}}!',                    '<p>Hi {{name}},</p><p>Thanks for reaching out. We have logged your enquiry and our team will be in touch very soon.</p><p>Best,<br/>AutoFlow Studio</p>', false),
  ('Contacted',            'You''re on our radar, {{name}}!',                        '<p>Hi {{name}},</p><p>One of our consultants has just reached out to you. Keep an eye on your inbox — exciting things are coming.</p><p>Best,<br/>AutoFlow Studio</p>', false),
  ('In Progress',          'Your automation project is underway, {{name}}',          '<p>Hi {{name}},</p><p>We''re actively working on your request. We''ll update you shortly with our findings and next steps.</p><p>Best,<br/>AutoFlow Studio</p>', false),
  ('Meeting Booked',       'Your strategy call is confirmed, {{name}} 🗓️',           '<p>Hi {{name}},</p><p>Great news — your strategy call has been confirmed. We look forward to speaking with you and exploring how we can transform your workflow.</p><p>Best,<br/>AutoFlow Studio</p>', false),
  ('Waiting for Invoice',  'Invoice incoming, {{name}} 📄',                          '<p>Hi {{name}},</p><p>We''re preparing your invoice and will send it across shortly. Feel free to reach out if you have any questions in the meantime.</p><p>Best,<br/>AutoFlow Studio</p>', false),
  ('No Response',          'Checking in, {{name}} 👋',                               '<p>Hi {{name}},</p><p>We noticed we haven''t been able to connect with you yet. We''d love to learn more about your automation needs — feel free to reply or book a time that suits you.</p><p>Best,<br/>AutoFlow Studio</p>', false),
  ('Converted',            'Welcome to AutoFlow Studio, {{name}} 🎉',                '<p>Hi {{name}},</p><p>We''re thrilled to welcome you as a client! Our team will be in touch to kick off your automation journey. Get ready to save hours every week.</p><p>Best,<br/>AutoFlow Studio</p>', false),
  ('Lost',                 'A note from AutoFlow Studio, {{name}}',                  '<p>Hi {{name}},</p><p>Thank you for considering AutoFlow Studio. We understand this might not be the right time — but we''re here whenever you''re ready to explore automation. Feel free to reach back out any time.</p><p>Best,<br/>AutoFlow Studio</p>', false)
on conflict (status) do nothing;

-- Auto-update updated_at on changes
create or replace function update_email_templates_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists email_templates_updated_at on email_templates;
create trigger email_templates_updated_at
  before update on email_templates
  for each row execute function update_email_templates_updated_at();
