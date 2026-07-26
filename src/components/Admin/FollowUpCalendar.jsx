import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import useSessionState from '../../hooks/useSessionState'
import { formatFollowUpDate } from '../../lib/followUps'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function buildMonthGrid(monthDate) {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const gridStart = new Date(firstOfMonth)
  gridStart.setDate(gridStart.getDate() - firstOfMonth.getDay())

  const days = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    days.push(d)
  }
  return days
}

// A compact per-salesperson follow-up calendar, meant to be embedded as a tab
// (e.g. inside the Outbound lead bank) rather than shown as its own page.
// Salespeople only see their own reminders; admins can filter by teammate.
export default function FollowUpCalendar({ user, isAdmin, salespeople, onViewLead }) {
  const [assigneeFilter, setAssigneeFilter] = useSessionState('followups_assigneeFilter', 'all')
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)
  const [monthCursor, setMonthCursor] = useState(() => startOfDay(new Date()))
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()))
  const [detailReminder, setDetailReminder] = useState(null)
  const [rescheduling, setRescheduling] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchReminders()
  }, [assigneeFilter, isAdmin, user?.id])

  async function fetchReminders() {
    if (!user?.id && !isAdmin) { setLoading(false); return }
    setLoading(true)
    let query = supabase.from('reminders').select('*').order('scheduled_at', { ascending: true })
    if (isAdmin) {
      if (assigneeFilter !== 'all') query = query.eq('salesperson_id', assigneeFilter)
    } else {
      query = query.eq('salesperson_id', user.id)
    }
    const { data, error } = await query
    if (!error) setReminders(data || [])
    setLoading(false)
  }

  const remindersByDay = useMemo(() => {
    const map = new Map()
    for (const r of reminders) {
      const key = startOfDay(new Date(r.scheduled_at)).toDateString()
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(r)
    }
    return map
  }, [reminders])

  const upcoming = useMemo(() => {
    const now = new Date()
    return reminders
      .filter(r => !r.completed && new Date(r.scheduled_at) >= startOfDay(now))
      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
      .slice(0, 5)
  }, [reminders])

  const overdueCount = useMemo(() => {
    const now = new Date()
    return reminders.filter(r => !r.completed && new Date(r.scheduled_at) < now).length
  }, [reminders])

  const days = useMemo(() => buildMonthGrid(monthCursor), [monthCursor])
  const monthLabel = monthCursor.toLocaleDateString([], { month: 'long', year: 'numeric' })
  const selectedDayReminders = (remindersByDay.get(selectedDay.toDateString()) || []).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))

  function reminderTone(r) {
    if (r.completed) return { bg: 'rgba(100,116,139,0.1)', text: '#64748B' }
    const now = new Date()
    const when = new Date(r.scheduled_at)
    if (when < now) return { bg: 'rgba(239,68,68,0.1)', text: '#dc2626' }
    if (sameDay(when, now)) return { bg: 'rgba(251,146,60,0.1)', text: '#d97706' }
    return { bg: 'rgba(59,130,246,0.1)', text: '#2563eb' }
  }

  async function toggleComplete(r) {
    const { error } = await supabase.from('reminders').update({ completed: !r.completed, updated_at: new Date().toISOString() }).eq('id', r.id)
    if (!error) {
      setReminders(prev => prev.map(x => x.id === r.id ? { ...x, completed: !r.completed } : x))
      setDetailReminder(prev => prev && prev.id === r.id ? { ...prev, completed: !r.completed } : prev)
    }
  }

  async function deleteReminder(r) {
    if (!confirm('Remove this follow-up from your calendar?')) return
    const { error } = await supabase.from('reminders').delete().eq('id', r.id)
    if (!error) {
      setReminders(prev => prev.filter(x => x.id !== r.id))
      setDetailReminder(null)
    }
  }

  function openReschedule(r) {
    const d = new Date(r.scheduled_at)
    setRescheduleDate(d.toISOString().slice(0, 10))
    setRescheduleTime(d.toTimeString().slice(0, 5))
    setRescheduling(true)
  }

  async function saveReschedule() {
    if (!detailReminder || !rescheduleDate || !rescheduleTime || saving) return
    setSaving(true)
    const newDate = new Date(`${rescheduleDate}T${rescheduleTime}:00`)
    const { error } = await supabase
      .from('reminders')
      .update({ scheduled_at: newDate.toISOString(), sent: false, completed: false, updated_at: new Date().toISOString() })
      .eq('id', detailReminder.id)
    if (!error) {
      setReminders(prev => prev.map(x => x.id === detailReminder.id ? { ...x, scheduled_at: newDate.toISOString(), sent: false, completed: false } : x))
      setDetailReminder(prev => ({ ...prev, scheduled_at: newDate.toISOString(), sent: false, completed: false }))
      setRescheduling(false)
    }
    setSaving(false)
  }

  function handleViewLead(r) {
    if (onViewLead) onViewLead(r)
    setDetailReminder(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
        <p style={{ margin: 0, color: '#64748B', fontSize: '0.85rem' }}>
          Follow-ups parsed from notes or scheduled manually.{overdueCount > 0 && (
            <span style={{ color: '#dc2626', fontWeight: 700 }}> {overdueCount} overdue.</span>
          )}
        </p>
        {isAdmin && (
          <select
            value={assigneeFilter}
            onChange={e => setAssigneeFilter(e.target.value)}
            style={{ padding: '8px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '10px', color: '#0f172a', fontSize: '0.8rem', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
          >
            <option value="all" style={{ background: '#ffffff', color: '#0f172a' }}>All Salespeople</option>
            {salespeople.map(sp => (
              <option key={sp.id} value={sp.id} style={{ background: '#ffffff', color: '#0f172a' }}>{sp.name || sp.email}</option>
            ))}
          </select>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'start' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '20px', boxShadow: '0 15px 30px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1rem', fontWeight: 800 }}>{monthLabel}</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setMonthCursor(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} style={navBtnStyle}>‹</button>
              <button
                onClick={() => { const t = startOfDay(new Date()); setMonthCursor(new Date(t.getFullYear(), t.getMonth(), 1)); setSelectedDay(t) }}
                style={{ ...navBtnStyle, width: 'auto', padding: '0 12px', fontSize: '0.7rem', fontWeight: 700 }}
              >Today</button>
              <button onClick={() => setMonthCursor(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} style={navBtnStyle}>›</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', marginBottom: '5px' }}>
            {WEEKDAYS.map(w => (
              <div key={w} style={{ textAlign: 'center', color: '#64748B', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 0' }}>{w}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
            {days.map((d, i) => {
              const inMonth = d.getMonth() === monthCursor.getMonth()
              const isToday = sameDay(d, new Date())
              const isSelected = sameDay(d, selectedDay)
              const dayReminders = remindersByDay.get(d.toDateString()) || []
              return (
                <div
                  key={i}
                  onClick={() => setSelectedDay(startOfDay(d))}
                  style={{
                    minHeight: '72px', borderRadius: '10px', padding: '6px',
                    background: isSelected ? 'rgba(201, 159, 74, 0.15)' : '#ffffff',
                    border: isSelected ? '1px solid #C99F4A' : isToday ? '1px solid rgba(251, 146, 60, 0.5)' : '1px solid #e2e8f0',
                    cursor: 'pointer', opacity: inMonth ? 1 : 0.35, display: 'flex', flexDirection: 'column', gap: '3px'
                  }}
                >
                  <span style={{ fontSize: '0.7rem', fontWeight: isToday ? 800 : 600, color: isToday ? '#C99F4A' : '#0f172a' }}>{d.getDate()}</span>
                  {dayReminders.slice(0, 2).map(r => {
                    const tone = reminderTone(r)
                    return (
                      <div
                        key={r.id}
                        onClick={e => { e.stopPropagation(); setDetailReminder(r); setRescheduling(false) }}
                        title={r.lead_name}
                        style={{
                          fontSize: '0.6rem', fontWeight: 700, padding: '2px 5px', borderRadius: '5px',
                          background: tone.bg, color: tone.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          textDecoration: r.completed ? 'line-through' : 'none'
                        }}
                      >
                        {r.lead_name}
                      </div>
                    )
                  })}
                  {dayReminders.length > 2 && (
                    <span style={{ fontSize: '0.58rem', color: '#64748B', fontWeight: 700 }}>+{dayReminders.length - 2} more</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gap: '18px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '18px', boxShadow: '0 12px 25px rgba(0,0,0,0.05)' }}>
            <h4 style={{ margin: '0 0 12px', color: '#0f172a', fontSize: '0.9rem', fontWeight: 800 }}>
              {sameDay(selectedDay, new Date()) ? 'Today' : selectedDay.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
            </h4>
            {loading ? (
              <p style={{ color: '#64748B', fontSize: '0.8rem' }}>Loading…</p>
            ) : selectedDayReminders.length === 0 ? (
              <p style={{ color: '#64748B', fontSize: '0.8rem' }}>No follow-ups scheduled.</p>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                {selectedDayReminders.map(r => {
                  const tone = reminderTone(r)
                  return (
                    <div
                      key={r.id}
                      onClick={() => { setDetailReminder(r); setRescheduling(false) }}
                      style={{ padding: '10px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                        <span style={{ color: '#0f172a', fontWeight: 700, fontSize: '0.8rem', textDecoration: r.completed ? 'line-through' : 'none' }}>{r.lead_name}</span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: tone.text }}>{new Date(r.scheduled_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                      </div>
                      <p style={{ margin: 0, color: '#64748B', fontSize: '0.72rem', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{r.notes_content}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div style={{ background: 'linear-gradient(135deg, rgba(201,159,74,0.05), rgba(27,54,93,0.05))', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '18px', boxShadow: '0 12px 25px rgba(0,0,0,0.05)' }}>
            <h4 style={{ margin: '0 0 12px', color: '#C99F4A', fontSize: '0.85rem', fontWeight: 800 }}>Coming Up</h4>
            {upcoming.length === 0 ? (
              <p style={{ color: '#64748B', fontSize: '0.75rem' }}>Nothing on the horizon.</p>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                {upcoming.map(r => {
                  const tone = reminderTone(r)
                  return (
                    <div key={r.id} onClick={() => { setDetailReminder(r); setRescheduling(false) }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                      <span style={{ color: '#0f172a', fontSize: '0.78rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }}>{r.lead_name}</span>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: tone.text, background: tone.bg, padding: '3px 7px', borderRadius: '7px', whiteSpace: 'nowrap' }}>
                        {new Date(r.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {detailReminder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setDetailReminder(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '24px', width: '100%', maxWidth: '420px', padding: '24px', boxShadow: '0 30px 60px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.15rem', fontWeight: 800, textDecoration: detailReminder.completed ? 'line-through' : 'none' }}>{detailReminder.lead_name}</h3>
                <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>{detailReminder.lead_type} · {detailReminder.source === 'manual' ? 'Manually scheduled' : 'Detected from note'}</p>
              </div>
              <button onClick={() => setDetailReminder(null)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {rescheduling ? (
              <>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                  <input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} style={{ flex: 1, padding: '10px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', color: '#0f172a', outline: 'none', colorScheme: 'light', boxSizing: 'border-box' }} />
                  <input type="time" value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)} style={{ flex: 1, padding: '10px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', color: '#0f172a', outline: 'none', colorScheme: 'light', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setRescheduling(false)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #cbd5e1', color: '#64748B', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
                  <button onClick={saveReschedule} disabled={saving} style={{ flex: 1, padding: '10px', background: '#C99F4A', border: 'none', color: 'white', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving…' : 'Save'}</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ margin: '0 0 4px', color: '#64748B', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>Scheduled For</p>
                  <p style={{ margin: 0, color: '#C99F4A', fontSize: '0.95rem', fontWeight: 700 }}>{formatFollowUpDate(detailReminder.scheduled_at)}</p>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <p style={{ margin: '0 0 4px', color: '#64748B', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>Note</p>
                  <p style={{ margin: 0, color: '#0f172a', fontSize: '0.85rem', lineHeight: 1.5, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>{detailReminder.notes_content}</p>
                </div>

                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => toggleComplete(detailReminder)} style={{ flex: 1, padding: '11px', background: detailReminder.completed ? 'rgba(100,116,139,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${detailReminder.completed ? 'rgba(100,116,139,0.2)' : 'rgba(16,185,129,0.2)'}`, color: detailReminder.completed ? '#64748B' : '#10b981', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>
                      {detailReminder.completed ? 'Mark Not Done' : 'Mark Complete'}
                    </button>
                    <button onClick={() => openReschedule(detailReminder)} style={{ flex: 1, padding: '11px', background: 'rgba(37, 99, 235, 0.1)', border: '1px solid rgba(37, 99, 235, 0.3)', color: '#2563eb', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>
                      Reschedule
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => handleViewLead(detailReminder)} style={{ flex: 1, padding: '11px', background: '#1B365D', border: 'none', color: 'white', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>
                      View Lead
                    </button>
                    <button onClick={() => deleteReminder(detailReminder)} style={{ padding: '11px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>
                      Delete
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const navBtnStyle = {
  width: '28px', height: '28px', borderRadius: '8px', background: '#ffffff', border: '1px solid #e2e8f0',
  color: '#0f172a', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'
}
