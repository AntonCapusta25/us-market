-- Seed outreach/outbound statuses into email_templates table
insert into email_templates (status, subject, body, enabled) values
  ('Scraped',            'Enquiry from AutoFlow Studio',                           '<p>Hi {{name}},</p><p>We found your business and would love to explore how we can automate your workflows.</p><p>Best,<br/>AutoFlow Studio</p>', false),
  ('Interested',         'Great speaking with you, {{name}}!',                     '<p>Hi {{name}},</p><p>Thanks for your interest in AutoFlow Studio. Let''s book a call to discuss how we can partner.</p><p>Best,<br/>AutoFlow Studio</p>', false),
  ('Not Interested',     'Thank you from AutoFlow Studio',                         '<p>Hi {{name}},</p><p>Thank you for your time. Let us know if anything changes in the future.</p><p>Best,<br/>AutoFlow Studio</p>', false),
  ('Promoted',           'Welcome to the next stage, {{name}}!',                   '<p>Hi {{name}},</p><p>We have promoted your profile. Our team will contact you shortly.</p><p>Best,<br/>AutoFlow Studio</p>', false)
on conflict (status) do nothing;
