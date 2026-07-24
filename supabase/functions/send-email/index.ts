// Supabase Edge Function — sends emails via Gmail API
// Deploy: supabase functions deploy send-email
// Secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN

const CLIENT_ID     = Deno.env.get('GOOGLE_CLIENT_ID')     ?? ''
const CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? ''
const REFRESH_TOKEN = Deno.env.get('GOOGLE_REFRESH_TOKEN') ?? ''
const ADMIN_EMAIL   = 'info@autoflowstudio.net'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Replace {{variable}} placeholders in subject/body templates
function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

// Convert newlines to HTML blocks/breaks if plain text is input
function formatBodyToHtml(bodyText: string): string {
  const hasHtml = /<[a-z][\s\S]*>/i.test(bodyText)
  if (hasHtml) {
    return bodyText
  }
  return bodyText
    .split(/\n\s*\n/)
    .map(para => `<p style="margin: 0 0 16px 0;">${para.replace(/\n/g, '<br />')}</p>`)
    .join('')
}

// ── CRITICAL: Google OAuth token endpoint requires form-encoded body, NOT JSON ──
async function getAccessToken(): Promise<string> {
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    throw new Error(
      `Missing OAuth secrets — CLIENT_ID:${!!CLIENT_ID} CLIENT_SECRET:${!!CLIENT_SECRET} REFRESH_TOKEN:${!!REFRESH_TOKEN}. ` +
      `Set them via: supabase secrets set GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... GOOGLE_REFRESH_TOKEN=...`
    )
  }

  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: REFRESH_TOKEN,
    grant_type:    'refresh_token',
  })

  console.log('[OAuth] Requesting access token...')
  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    params.toString(),
  })
  const data = await res.json()

  if (!res.ok) {
    console.error('[OAuth] Token error:', JSON.stringify(data))
    throw new Error(`OAuth failed (${res.status}): ${data.error} — ${data.error_description}`)
  }

  console.log('[OAuth] Token obtained successfully')
  return data.access_token
}


// RFC 2047 encode the subject so emojis and non-ASCII chars survive MIME headers
function encodeSubject(subject: string): string {
  // Encode as UTF-8 base64 per RFC 2047: =?UTF-8?B?<base64>?=
  // Split into chunks of max 75 chars (encoded) to stay within line length limits
  const encoded = btoa(unescape(encodeURIComponent(subject)))
  // Wrap in RFC 2047 format — single chunk is fine for typical subjects
  return `=?UTF-8?B?${encoded}?=`
}

function createRawMessage(to: string, subject: string, html: string) {
  const str = [
    `From: "AutoFlow Studio" <${ADMIN_EMAIL}>`,
    `To: ${to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${encodeSubject(subject)}`,
    '',
    html
  ].join('\r\n')

  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const body = await req.json()
    const { type, name, email, company, message, service, size, platform, recipient, subject: customSubject } = body
    console.log(`[send-email] type=${type} recipient=${recipient || email}`)

    // ── get_busy_times (Google Calendar API) ───────────────────────────────
    if (type === 'get_busy_times') {
      const { timeMin, timeMax } = body
      if (!timeMin || !timeMax) {
        throw new Error('Missing required get_busy_times fields: timeMin, timeMax')
      }
      const accessToken = await getAccessToken()
      console.log(`[get_busy_times] Fetching events from ${timeMin} to ${timeMax}`)

      // Fetch primary calendar details to get timezone
      const calRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      const calData = await calRes.json()
      const timeZone = calData.timeZone || 'UTC'
      console.log(`[get_busy_times] Calendar timezone is: ${timeZone}`)

      // Fetch events
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(`Google Calendar API error ${res.status}: ${JSON.stringify(data)}`)
      }

      const busySlots = (data.items || []).map((event: any) => ({
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        summary: event.summary || 'Busy'
      }))

      return new Response(JSON.stringify({ success: true, busy: busySlots, timeZone }), {
        headers: { 'Content-Type': 'application/json', ...CORS }
      })
    }

    // ── 0. Schedule Call (Google Calendar API) ───────────────────────────────
    if (type === 'schedule_call') {
      const { leadEmail, leadName, startTime, endTime, title, description, colorId, agentName } = body
      if (!leadEmail || !startTime || !endTime) {
        throw new Error('Missing required schedule_call fields: leadEmail, startTime, endTime')
      }

      const accessToken = await getAccessToken()
      console.log(`[schedule_call] Scheduling meeting "${title}" for ${leadEmail} at ${startTime}`)

      const eventBody = {
        summary: title || `Meeting with ${leadName || 'Client'}`,
        description: description || 'Scheduled via CRM',
        start: {
          dateTime: startTime,
          timeZone: 'UTC'
        },
        end: {
          dateTime: endTime,
          timeZone: 'UTC'
        },
        attendees: [
          { email: leadEmail }
        ],
        colorId: colorId || '1',
        conferenceData: {
          createRequest: {
            requestId: `autoflow-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        }
      }

      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all&conferenceDataVersion=1', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventBody)
      })

      const responseData = await res.text()
      if (!res.ok) {
        throw new Error(`Google Calendar API error ${res.status}: ${responseData}`)
      }

      console.log('[schedule_call] Event created OK')
      const event = JSON.parse(responseData)
      const hangoutLink = event.hangoutLink || 'No Meet link generated'

      // Send confirmation email to Admin (info@autoflowstudio.net)
      try {
        const formattedTime = new Date(startTime).toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        })

        const adminSubject = `[Booking Confirmed] ${eventBody.summary}`
        const adminHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; color: #f3f4f6; padding: 30px; margin: 0; }
              .card { background-color: #111827; border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 32px; max-width: 550px; margin: 0 auto; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
              h2 { margin-top: 0; color: #60a5fa; font-size: 1.4rem; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 16px; font-weight: 800; letter-spacing: -0.01em; }
              .detail { margin: 18px 0; }
              .label { color: #6b7280; font-weight: 800; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.05em; display: block; margin-bottom: 4px; }
              .value { color: #f3f4f6; font-weight: 600; font-size: 0.95rem; }
              .btn { display: inline-block; width: 100%; box-sizing: border-box; padding: 14px; background: linear-gradient(135deg, #3b82f6, #10b981); color: white !important; text-decoration: none; border-radius: 10px; font-weight: 800; margin-top: 24px; font-size: 0.9rem; text-align: center; border: none; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2); }
            </style>
          </head>
          <body>
            <div class="card">
              <h2>Call Scheduled Successfully</h2>
              
              <div class="detail">
                <span class="label">Booked By (Agent)</span>
                <span class="value">${agentName || 'CRM Admin'}</span>
              </div>
              
              <div class="detail">
                <span class="label">Meeting Title</span>
                <span class="value">${eventBody.summary}</span>
              </div>
              
              <div class="detail">
                <span class="label">With Client</span>
                <span class="value">${leadName} (${leadEmail})</span>
              </div>
              
              <div class="detail">
                <span class="label">When</span>
                <span class="value">${formattedTime}</span>
              </div>
              
              <div class="detail">
                <span class="label">Notes / Description</span>
                <span class="value">${eventBody.description}</span>
              </div>

              <div style="text-align: center;">
                <a href="${hangoutLink}" class="btn" target="_blank">Join Google Meet</a>
              </div>
            </div>
          </body>
          </html>
        `

        console.log('[schedule_call] Sending admin notification to:', ADMIN_EMAIL)
        const adminRaw = createRawMessage(ADMIN_EMAIL, adminSubject, adminHtml)
        const emailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ raw: adminRaw })
        })
        if (!emailRes.ok) {
          const errData = await emailRes.text()
          console.error('[schedule_call] Failed to send admin booking email:', errData)
        } else {
          console.log('[schedule_call] Admin booking email sent OK')
        }
      } catch (err) {
        console.error('[schedule_call] Error sending admin notification:', err.message)
      }

      return new Response(JSON.stringify({ success: true, event }), {
        headers: { 'Content-Type': 'application/json', ...CORS }
      })
    }

    // ── 1. Campaigns ────────────────────────────────────────────────────────
    if (type === 'campaign') {
      const accessToken = await getAccessToken()
      console.log('[campaign] Sending to:', recipient)
      const raw = createRawMessage(recipient, customSubject || 'Update from AutoFlow Studio', message)
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw }),
      })
      if (!res.ok) {
        const errBody = await res.text()
        throw new Error(`Gmail Campaign error ${res.status}: ${errBody}`)
      }
      console.log('[campaign] Sent OK')
      return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json', ...CORS } })
    }

    // ── 2. Status-Change Notifications ──────────────────────────────────────
    if (type === 'status_change') {
      const { recipient: to, name: leadName, status, subject: tmplSubject, body: tmplBody, company, service } = body
      if (!to || !tmplSubject || !tmplBody) throw new Error('Missing required status_change fields: recipient, subject, body')

      const vars: Record<string, string> = {
        name:    leadName  || 'there',
        status:  status    || '',
        company: company   || '',
        service: service   || '',
      }

      const finalSubject = interpolate(tmplSubject, vars)
      const finalBodyInner = interpolate(tmplBody, vars)

      const wrappedHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.5; color: #1a1a1a; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0; padding: 10px 0;">
    ${formatBodyToHtml(finalBodyInner)}
  </div>
</body>
</html>`

      const accessToken = await getAccessToken()
      console.log('[status_change] Sending to:', to, 'subject:', finalSubject)
      const raw = createRawMessage(to, finalSubject, wrappedHtml)
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(`Status-change email failed: ${JSON.stringify(err)}`)
      }
      console.log('[status_change] Sent OK')
      return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json', ...CORS } })
    }

    // ── 3. Lead form submissions (booking / contact) ─────────────────────────
    if (!email || !name) {
      throw new Error(`Missing required lead info: name=${name}, email=${email}`);
    }

    const accessToken = await getAccessToken()


    const adminSubject = "New Lead"
    const adminHtml = `
      <div style="font-family: sans-serif; background: #f9fafb; padding: 20px; border-radius: 8px;">
        <h2 style="color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">New Lead Captured</h2>
        <p><strong>Type:</strong> ${type}</p>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Service:</strong> ${service || 'N/A'}</p>
        <p><strong>Business Size:</strong> ${size || 'N/A'}</p>
        <p><strong>Company:</strong> ${company || 'N/A'}</p>
        <p><strong>Message:</strong></p>
        <div style="background: white; padding: 15px; border-radius: 4px; border: 1px solid #e5e7eb;">${message || 'N/A'}</div>
      </div>
    `

    const customerSubject = "AutoFlow Studio - We've received your request!"
    const customerHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 15px;
      line-height: 1.6;
      color: #334155;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.03);">
          
          <!-- Header with brand gradient & logo symbol -->
          <tr>
            <td style="background: linear-gradient(135deg, #7949da, #5646e4); padding: 24px 32px; text-align: left;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="color: #ffffff; font-size: 20px; font-weight: 800; font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif; letter-spacing: -0.02em;">
                    ⚡ AutoFlow Studio
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main Content Body -->
          <tr>
            <td style="padding: 40px 32px; background-color: #ffffff;">
              <h2 style="color: #1e293b; margin-top: 0; font-size: 20px; font-weight: 700; font-family: 'Space Grotesk', sans-serif;">Hello ${name},</h2>
              
              <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
                Thank you for reaching out to us. We've successfully received your <strong>${type === 'booking' ? 'audit request' : 'message'}</strong>.
              </p>
              
              <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                Our team of automation specialists is currently analyzing your requirements. We aim to provide a detailed response within <strong>24 hours</strong>.
              </p>
              
              <!-- Blockquote Callout -->
              <div style="margin: 24px 0; padding: 16px 20px; background: rgba(121, 73, 218, 0.05); border-left: 4px solid #7949da; border-radius: 8px;">
                <p style="color: #5646e4; margin: 0; font-style: italic; font-weight: 600; font-size: 14.5px;">
                  "Automating the present to secure your future."
                </p>
              </div>
              
              <!-- Call to Action Buttons -->
              <table border="0" cellspacing="0" cellpadding="0" style="margin-top: 30px; width: 100%;">
                <tr>
                  <td align="center" style="border-radius: 12px; background: linear-gradient(135deg, #7949da, #5646e4); overflow: hidden;">
                    <a href="https://autoflowstudio.net/portfolio" target="_blank" style="padding: 14px 28px; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; display: inline-block; width: 100%; box-sizing: border-box; text-align: center;">View Our Recent Projects</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 30px; text-align: center;">
                    <p style="color: #64748b; font-size: 14px; margin: 0 0 16px 0; font-weight: 500;">
                      Have other questions or want to jump straight into a face-to-face strategy session?
                    </p>
                    <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                      <tr>
                        <td align="center" style="border-radius: 12px; border: 1px solid #7949da;">
                          <a href="https://neeto.com/call/autoflow" target="_blank" style="padding: 10px 20px; font-size: 14px; font-weight: 700; color: #7949da; text-decoration: none; display: inline-block;">Book a Strategy Call</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 12px; margin: 0; font-weight: 500;">
                &copy; 2026 AutoFlow Studio. All rights reserved.
              </p>
              <p style="color: #94a3b8; font-size: 11px; margin: 8px 0 0 0;">
                You received this email because you contacted us through autoflowstudio.net
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    // Send to Admin
    console.log('[lead] Sending admin notification to:', ADMIN_EMAIL)
    const adminRaw = createRawMessage(ADMIN_EMAIL, adminSubject, adminHtml)
    const adminRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: adminRaw }),
    })
    if (!adminRes.ok) {
      const err = await adminRes.json()
      throw new Error(`Admin email failed: ${JSON.stringify(err)}`)
    }
    console.log('[lead] Admin email sent OK')

    // Send to Customer
    console.log('[lead] Sending customer confirmation to:', email)
    const customerRaw = createRawMessage(email, customerSubject, customerHtml)
    const customerRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: customerRaw }),
    })
    if (!customerRes.ok) {
      const err = await customerRes.json()
      throw new Error(`Customer email failed: ${JSON.stringify(err)}`)
    }
    console.log('[lead] Customer email sent OK')

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  } catch (err) {
    console.error('[send-email] ERROR:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }
})
