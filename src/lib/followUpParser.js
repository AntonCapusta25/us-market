import * as chrono from 'chrono-node'

// Phrases that signal "this note implies I need to follow up," used to avoid
// scheduling a reminder off an incidental date mention (e.g. "customer since 2019").
const FOLLOW_UP_HINTS = /\b(call|callback|bellen|terugbellen|bel|followup|opvolgen|opvolging|remind|herinneren|herinnering|reach\s*out|contact|touch\s*base|check\s*in|check\s*back|checken|ping|text|sms|email|mail|mailen|speak|spreken|afspraak|plannen|inplannen)\b/i

function preprocessDutchToEnglish(text) {
  let lower = text.toLowerCase();
  
  const mappings = [
    // Direct day translations to prevent splitting "volgende week [dag]"
    { regex: /\bvolgende\s+week\s+maandag\b/g, replacement: 'next Monday' },
    { regex: /\bvolgende\s+week\s+dinsdag\b/g, replacement: 'next Tuesday' },
    { regex: /\bvolgende\s+week\s+woensdag\b/g, replacement: 'next Wednesday' },
    { regex: /\bvolgende\s+week\s+donderdag\b/g, replacement: 'next Thursday' },
    { regex: /\bvolgende\s+week\s+vrijdag\b/g, replacement: 'next Friday' },
    { regex: /\bvolgende\s+week\s+zaterdag\b/g, replacement: 'next Saturday' },
    { regex: /\bvolgende\s+week\s+zondag\b/g, replacement: 'next Sunday' },

    { regex: /\bovermorgen\b/g, replacement: 'day after tomorrow' },
    { regex: /\bmorgen\b/g, replacement: 'tomorrow' },
    { regex: /\bvolgende\s+week\b/g, replacement: 'next week' },
    { regex: /\bvolgende\s+maand\b/g, replacement: 'next month' },
    { regex: /\bkomende\s+week\b/g, replacement: 'next week' },
    { regex: /\bvanavond\b/g, replacement: 'tonight' },
    
    // Days of the week
    { regex: /\bmaandag\b/g, replacement: 'Monday' },
    { regex: /\bdinsdag\b/g, replacement: 'Tuesday' },
    { regex: /\bwoensdag\b/g, replacement: 'Wednesday' },
    { regex: /\bdonderdag\b/g, replacement: 'Thursday' },
    { regex: /\bvrijdag\b/g, replacement: 'Friday' },
    { regex: /\bzaterdag\b/g, replacement: 'Saturday' },
    { regex: /\bzondag\b/g, replacement: 'Sunday' },
    
    // Relative times
    { regex: /\bover\s+(\d+)\s+dagen\b/g, replacement: 'in $1 days' },
    { regex: /\bover\s+(\d+)\s+weken\b/g, replacement: 'in $1 weeks' },
    { regex: /\bover\s+(\d+)\s+maanden\b/g, replacement: 'in $1 months' },
    { regex: /\bover\s+(\d+)\s+uur\b/g, replacement: 'in $1 hours' },
    { regex: /\bover\s+een\s+week\b/g, replacement: 'in 1 week' },
    { regex: /\bover\s+een\s+maand\b/g, replacement: 'in 1 month' },

    // Dutch time prepositions (om, rond, tegen)
    { regex: /\b(om|rond|tegen)\s+(\d{1,2}):(\d{2})\b/g, replacement: 'at $2:$3' },
    { regex: /\b(om|rond|tegen)\s+(\d{1,2})\s*uur\b/g, replacement: 'at $2:00' },
    { regex: /\b(om|rond|tegen)\s+(\d{1,2})\b/g, replacement: 'at $2' }
  ];
  
  for (const map of mappings) {
    lower = lower.replace(map.regex, map.replacement);
  }
  return lower;
}

// Parses free-text CRM notes ("call back tmrw", "follow up next Monday at 2pm")
// into a concrete Date to schedule a follow-up reminder for.
// Returns null when nothing schedulable was found.
export function parseFollowUpDate(text, referenceDate = new Date()) {
  if (!text || !text.trim()) return null

  // Preprocess Dutch phrases to English
  const englishText = preprocessDutchToEnglish(text)

  const results = chrono.parse(englishText, referenceDate, { forwardDate: true })
  if (results.length === 0) return null

  const hasExplicitTime = results.some(r => r.start.isCertain('hour'))
  if (!hasExplicitTime && !FOLLOW_UP_HINTS.test(text)) return null

  // Merge date & time details from all matching parsed segments
  let date = null
  let targetHour = 9
  let targetMinute = 0
  let isHourCertain = false

  for (const result of results) {
    const d = result.start.date()
    if (!date) {
      date = d
    } else {
      if (result.start.isCertain('day') || result.start.isCertain('weekday')) {
        date.setFullYear(d.getFullYear(), d.getMonth(), d.getDate())
      }
    }
    if (result.start.isCertain('hour')) {
      isHourCertain = true
      targetHour = result.start.get('hour')
      targetMinute = result.start.get('minute') || 0
    }
  }

  if (!date) return null

  // If only a day was given (no time), default to 9am so it lands during work hours.
  if (!isHourCertain) {
    date.setHours(9, 0, 0, 0)
  } else {
    date.setHours(targetHour, targetMinute, 0, 0)
  }

  // Ignore parses too far in the past (clock skew) or absurdly far in the future.
  const now = referenceDate.getTime()
  const maxFuture = now + 1000 * 60 * 60 * 24 * 365
  if (date.getTime() < now - 1000 * 60 * 5 || date.getTime() > maxFuture) return null

  return date
}
