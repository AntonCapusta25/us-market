import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAdmin } from './AdminContext'
import useSessionState from '../../hooks/useSessionState'
import FollowUpCalendar from './FollowUpCalendar'
import { parseFollowUpDate } from '../../lib/followUpParser'
import { scheduleFollowUp } from '../../lib/followUps'

export default function LeadBank({ filters = {}, title = "Lead Bank", subtitle = "Manage your leads." }) {
  const { user, isAdmin, profile, salespeople, loading: authLoading } = useAdmin()
  const stateKey = useMemo(() => window.location.pathname, [])
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useSessionState(`${stateKey}_selectedLead`, null)
  const activeLead = useMemo(() => {
    if (!selectedLead) return null
    return leads.find(l => l.id === selectedLead.id) || selectedLead
  }, [selectedLead, leads])
  const [history, setHistory] = useState([])
  const [isImporting, setIsImporting] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [noteModalLead, setNoteModalLead] = useState(null)
  const [callModalLead, setCallModalLead] = useState(null)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [viewMode, setViewMode] = useSessionState(`${stateKey}_viewMode`, 'leads')
  const [editingEmail, setEditingEmail] = useState(false)
  const [emailDraft, setEmailDraft] = useState('')
  const [followUpModalLead, setFollowUpModalLead] = useState(null)
  const [followUpDate, setFollowUpDate] = useState('')
  const [followUpTime, setFollowUpTime] = useState('')
  const [followUpNote, setFollowUpNote] = useState('')
  const [followUpSaving, setFollowUpSaving] = useState(false)
  const [page, setPage] = useSessionState(`${stateKey}_page`, 0)
  const [totalCount, setTotalCount] = useState(0)
  const [searchTerm, setSearchTerm] = useSessionState(`${stateKey}_searchTerm`, '')
  const [statusFilter, setStatusFilter] = useSessionState(`${stateKey}_statusFilter`, 'All')
  const [assigneeFilter, setAssigneeFilter] = useSessionState(`${stateKey}_assigneeFilter`, 'all')
  const [phoneFilter, setPhoneFilter] = useSessionState(`${stateKey}_phoneFilter`, 'nl')
  const [commentFilter, setCommentFilter] = useSessionState(`${stateKey}_commentFilter`, 'all')
  const [callFilter, setCallFilter] = useSessionState(`${stateKey}_callFilter`, 'all')
  const [activeIndustries, setActiveIndustries] = useState([])
  const [tableIndustryFilter, setTableIndustryFilter] = useSessionState(`${stateKey}_tableIndustry`, '')
  const [tableTagFilter, setTableTagFilter] = useSessionState(`${stateKey}_tableTag`, '')
  const [dbIndustries, setDbIndustries] = useState([])
  const [dbTags, setDbTags] = useState([])
  const [showImportModal, setShowImportModal] = useState(false)
  const [importIndustry, setImportIndustry] = useState('')
  const [importTags, setImportTags] = useState('')
  const [importAssignee, setImportAssignee] = useState('')
  const [newNote, setNewNote] = useState('')
  const [emailSentFor, setEmailSentFor] = useState(null)
  const [customEmailLead, setCustomEmailLead] = useState(null)
  const [customEmailSubject, setCustomEmailSubject] = useState('')
  const [customEmailBody, setCustomEmailBody] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailTemplates, setEmailTemplates] = useState([])

  useEffect(() => {
    if (!customEmailLead) return
    async function fetchTemplates() {
      const { data } = await supabase
        .from('email_templates')
        .select('status, subject, body')
      if (data) {
        setEmailTemplates(data)
      }
    }
    fetchTemplates()
  }, [customEmailLead])

  const [bookingLead, setBookingLead] = useState(null)
  const [bookingTitle, setBookingTitle] = useState('')
  const [bookingSending, setBookingSending] = useState(false)
  const [busyTimes, setBusyTimes] = useState([])
  const [calendarTimeZone, setCalendarTimeZone] = useState('UTC')
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedDayOffset, setSelectedDayOffset] = useState(0)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [bookingDescription, setBookingDescription] = useState('Strategy session scheduled via CRM.')
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [bookingDisplayTZ, setBookingDisplayTZ] = useState('calendar') // 'calendar' | IANA tz string
  const [bookingOverrideEmail, setBookingOverrideEmail] = useState('')
  const [copiedName, setCopiedName] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)

  // Scraper Modal States
  const [showScrapeModal, setShowScrapeModal] = useState(false)
  const [scrapeIndustry, setScrapeIndustry] = useState([])
  const [scrapePosition, setScrapePosition] = useState([])
  const [scrapeStates, setScrapeStates] = useState([])
  const [scrapeEmployees, setScrapeEmployees] = useState('')

  const [scrapeRevenue, setScrapeRevenue] = useState([])
  const [isScraping, setIsScraping] = useState(false)

  const pageSize = 50
  const scrollRestoredRef = useRef(false)
  const pageChangedByUserRef = useRef(false)
  const loadingRef = useRef(true)

  useEffect(() => {
    loadingRef.current = loading
  }, [loading])

  // Helper: scroll the main content to top (for page changes / filter changes)
  function scrollContentToTop() {
    const container = document.querySelector('.admin-main-content')
    if (container) container.scrollTop = 0
  }

  // Helper: change page from user action (pagination click) — scrolls to top
  function goToPage(p) {
    pageChangedByUserRef.current = true
    setPage(p)
  }

  // ── Scroll position persistence ──
  useEffect(() => {
    const container = document.querySelector('.admin-main-content')
    if (!container) return
    let timeout
    const handleScroll = () => {
      if (document.visibilityState === 'hidden') return
      if (loadingRef.current) return

      const currentScroll = container.scrollTop
      // If layout collapses and container becomes unscrollable, don't save 0
      if (currentScroll === 0 && container.scrollHeight <= container.clientHeight) {
        return
      }

      clearTimeout(timeout)
      timeout = setTimeout(() => {
        if (document.visibilityState === 'hidden') return
        if (loadingRef.current) return

        const finalScroll = container.scrollTop
        if (finalScroll === 0 && container.scrollHeight <= container.clientHeight) {
          return
        }

        try { sessionStorage.setItem(`${stateKey}_scrollY`, String(finalScroll)) } catch(e) {}
      }, 150)
    }
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      clearTimeout(timeout)
      container.removeEventListener('scroll', handleScroll)
    }
  }, [stateKey])

  // After data loads: restore scroll on remount, scroll to top on user page change
  useEffect(() => {
    if (!loading) {
      if (pageChangedByUserRef.current) {
        // User clicked a page/filter — scroll to top
        pageChangedByUserRef.current = false
        scrollContentToTop()
      } else if (!scrollRestoredRef.current) {
        // First mount — restore saved position
        scrollRestoredRef.current = true
        const saved = sessionStorage.getItem(`${stateKey}_scrollY`)
        if (saved) {
          requestAnimationFrame(() => {
            const container = document.querySelector('.admin-main-content')
            if (container) container.scrollTop = parseInt(saved, 10)
          })
        }
      }
    }
  }, [loading, stateKey])

  useEffect(() => {
    setCustomEmailLead(null)
    setBookingLead(null)
  }, [selectedLead])

  useEffect(() => {
    if (bookingLead) {
      setBookingTitle(`Strategy session with ${bookingLead.name || bookingLead.email || 'Client'}`)
      setSelectedSlot(null)
      setSelectedDayOffset(0)
      setBookingDescription('Strategy session scheduled via CRM.')
      setBookingSuccess(false)
      setBookingError('')
      setBookingDisplayTZ('calendar')
      setBookingOverrideEmail(bookingLead.email || '')
      
      const fetchAvailability = async () => {
        setLoadingSlots(true)
        setBusyTimes([])
        try {
          const timeMin = new Date()
          timeMin.setHours(0,0,0,0)
          const timeMax = new Date()
          timeMax.setDate(timeMax.getDate() + 10)
          timeMax.setHours(23,59,59,999)

          const { data, error } = await supabase.functions.invoke('send-email', {
            body: {
              type: 'get_busy_times',
              timeMin: timeMin.toISOString(),
              timeMax: timeMax.toISOString()
            }
          })

          if (error) throw error
          if (data && data.success) {
            setBusyTimes(data.busy || [])
            setCalendarTimeZone(data.timeZone || 'UTC')
          }
        } catch (err) {
          console.error('Failed to load slots:', err)
        } finally {
          setLoadingSlots(false)
        }
      }
      fetchAvailability()
    }
  }, [bookingLead])

  const statusOptions = [
    { label: 'All' },
    { label: 'New' },
    { label: 'Contacted' },
    { label: 'In Progress' },
    { label: 'Follow Up Needed' },
    { label: 'Meeting Booked' },
    { label: 'Waiting for Invoice' },
    { label: 'No Response' },
    { label: 'Converted' },
    { label: 'Lost' }
  ]

  useEffect(() => {
    setEditingEmail(false)
  }, [selectedLead?.id])

  async function fetchLeads() {
    setLoading(true)

    try {
      let query = supabase
        .from('outreach_leads')
        .select('*', { count: 'exact' })

      // Apply Global Segment Filters
      if (filters.industry) query = query.ilike('industry', `%${filters.industry}%`)
      if (filters.tags) query = query.contains('tags', [filters.tags])

      // Apply Status Toggle Filter
      if (statusFilter !== 'All') query = query.eq('status', statusFilter)

      // Apply Phone / Country Filter
      if (phoneFilter === 'nl') query = query.ilike('phone', '+31%')
      else if (phoneFilter === 'uk') query = query.ilike('phone', '+44%')
      else if (phoneFilter === 'us') query = query.ilike('phone', '+1%')

      // Apply Excel-style Column Filters
      if (tableIndustryFilter) query = query.eq('industry', tableIndustryFilter)
      if (tableTagFilter) query = query.contains('tags', [tableTagFilter])

      // Apply Comment Filter
      if (commentFilter === 'has') query = query.not('notes', 'is', null).neq('notes', '')
      else if (commentFilter === 'none') query = query.or('notes.is.null,notes.eq.')

      // Apply Call Filter
      if (callFilter === 'has') query = query.gt('call_attempts', 0)
      else if (callFilter === 'none') query = query.or('call_attempts.is.null,call_attempts.eq.0')

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%,industry.ilike.%${searchTerm}%`)
      }

      // Apply Assignee Filter
      if (isAdmin) {
        if (assigneeFilter === 'unassigned') {
          query = query.is('assignee_id', null)
        } else if (assigneeFilter !== 'all') {
          query = query.eq('assignee_id', assigneeFilter)
        }
      } else {
        if (user?.id) {
          query = query.eq('assignee_id', user.id)
        } else {
          // Fallback: don't load any leads if user is not resolved yet
          query = query.eq('assignee_id', '00000000-0000-0000-0000-000000000000')
        }
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (!error) {
        setLeads(data || [])
        setTotalCount(count || 0)
      }
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) return
    fetchLeads()
  }, [page, searchTerm, statusFilter, assigneeFilter, phoneFilter, tableIndustryFilter, tableTagFilter, commentFilter, callFilter, JSON.stringify(filters), user, authLoading])

  useEffect(() => {
    async function fetchFilterOptions() {
      // 1. Try to fetch from the optimized unique views first
      const [indRes, tagRes] = await Promise.all([
        supabase.from('unique_outreach_industries').select('industry'),
        supabase.from('unique_outreach_tags').select('tag')
      ])

      if (!indRes.error && indRes.data && !tagRes.error && tagRes.data) {
        setDbIndustries(indRes.data.map(d => d.industry).filter(Boolean).sort())
        setDbTags(tagRes.data.map(d => d.tag).filter(Boolean).sort())
        return
      }

      // 2. Fallback to direct table scan if views are not available
      const { data, error } = await supabase
        .from('outreach_leads')
        .select('industry, tags')
        .order('created_at', { ascending: false })
        .limit(10000)
      if (error) {
        console.error('Error fetching filter options from outreach_leads:', error)
      }
      if (data) {
        setDbIndustries([...new Set(data.map(d => d.industry).filter(Boolean))].sort())
        setDbTags([...new Set(data.flatMap(d => Array.isArray(d.tags) ? d.tags : []).filter(Boolean))].sort())
      }
    }
    fetchFilterOptions()
  }, [])

  async function fetchUnifiedHistory(leadId) {
    const [emails, interactions] = await Promise.all([
      supabase.from('outreach_emails').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }),
      supabase.from('lead_history').select('*').eq('lead_id', leadId).order('created_at', { ascending: false })
    ])

    const combined = [
      ...(emails.data || []).map(e => ({ ...e, type: 'email', event_type: 'email', content: `Email Sent: ${e.subject}` })),
      ...(interactions.data || [])
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    const uniqueHistory = Array.from(new Map(combined.map(item => [item.id, item])).values())
    setHistory(uniqueHistory)
  }

  useEffect(() => {
    if (selectedLead?.id) {
      fetchUnifiedHistory(selectedLead.id)
    }
  }, [selectedLead?.id])

  async function addComment(lead, content) {
    if (!content.trim() || isActionLoading) return
    setIsActionLoading(true)
    const newCallCount = (lead.call_attempts || 0) + 1
    const [historyRes, leadRes] = await Promise.all([
      supabase.from('lead_history').insert({
        lead_id: lead.id,
        lead_type: 'outreach',
        event_type: 'note',
        content: content,
        admin_id: user?.id
      }),
      supabase.from('outreach_leads').update({ notes: content, call_attempts: newCallCount }).eq('id', lead.id)
    ])
    if (!historyRes.error && !leadRes.error) {
      // Also log a call event in history
      await supabase.from('lead_history').insert({
        lead_id: lead.id,
        lead_type: 'outreach',
        event_type: 'call',
        content: `Call attempt #${newCallCount}: ${content}`,
        admin_id: user?.id
      })
      if (selectedLead?.id === lead.id) {
        fetchUnifiedHistory(lead.id)
        setSelectedLead(prev => ({ ...prev, notes: content, call_attempts: newCallCount }))
        setNewNote('')
      }
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, notes: content, call_attempts: newCallCount } : l))
      maybeAutoScheduleFollowUp(lead, content)
    }
    setIsActionLoading(false)
  }

  async function updateStatus(id, newStatus) {
    if (isActionLoading) return
    setIsActionLoading(true)
    const { error } = await supabase.from('outreach_leads').update({ status: newStatus }).eq('id', id)
    if (!error) {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l))
      if (selectedLead?.id === id) setSelectedLead(prev => ({ ...prev, status: newStatus }))

      await supabase.from('lead_history').insert({
        lead_id: id,
        lead_type: 'outreach',
        event_type: 'status_change',
        content: `Status updated to ${newStatus}`,
        admin_id: user?.id
      })
      if (selectedLead?.id === id) fetchUnifiedHistory(id)

      // ── Email trigger ──
      try {
        const { data: tmpl } = await supabase
          .from('email_templates')
          .select('subject, body, enabled')
          .eq('status', newStatus)
          .single()

        if (tmpl?.enabled && tmpl.subject && tmpl.body) {
          const lead = leads.find(l => l.id === id)
          await supabase.functions.invoke('send-email', {
            body: {
              type: 'status_change',
              recipient: lead?.email || '',
              name: lead?.name || 'there',
              company: lead?.company || '',
              service: lead?.industry || '',
              status: newStatus,
              subject: tmpl.subject,
              body: tmpl.body,
            }
          })
          setEmailSentFor(id)
          setTimeout(() => setEmailSentFor(null), 3000)
        }
      } catch (emailErr) {
        console.warn('Email send skipped:', emailErr.message)
      }

      // ── Auto-create deal when Meeting Booked ──
      if (newStatus === 'Meeting Booked') {
        try {
          const { data: existing } = await supabase
            .from('deals')
            .select('id')
            .eq('lead_id', id)
            .maybeSingle()

          if (!existing) {
            const lead = leads.find(l => l.id === id) || selectedLead
            const assigneeId = lead?.assignee_id || user?.id || null
            const assigneeProf = salespeople?.find(sp => sp.id === assigneeId) || (assigneeId === user?.id ? profile : null)
            const spName = assigneeProf?.name || assigneeProf?.email?.split('@')[0] || 'Unknown'
            await supabase.from('deals').insert({
              lead_id: id,
              lead_type: 'outreach',
              lead_name: lead?.name || lead?.email || 'Unknown',
              lead_email: lead?.email || null,
              lead_company: lead?.company || null,
              salesperson_id: assigneeId,
              salesperson_name: spName,
              status: 'pipeline'
            })
          }
        } catch (dealErr) {
          console.warn('Deal auto-create skipped:', dealErr.message)
        }
      }
    }
    setIsActionLoading(false)
  }

  async function updateLeadEmail(lead, newEmail) {
    const trimmed = newEmail.trim()
    if (!trimmed || trimmed === lead.email || isActionLoading) {
      setEditingEmail(false)
      return
    }
    setIsActionLoading(true)
    const oldEmail = lead.email
    const { error } = await supabase.from('outreach_leads').update({ email: trimmed }).eq('id', lead.id)
    if (error) {
      alert('Failed to update email: ' + error.message)
    } else {
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, email: trimmed } : l))
      if (selectedLead?.id === lead.id) setSelectedLead(prev => ({ ...prev, email: trimmed }))

      await supabase.from('lead_history').insert({
        lead_id: lead.id,
        lead_type: 'outreach',
        event_type: 'note',
        content: `Email updated to ${trimmed}${oldEmail ? ` (was ${oldEmail})` : ''}`,
        admin_id: user?.id
      })
      if (selectedLead?.id === lead.id) fetchUnifiedHistory(lead.id)
      setEditingEmail(false)
    }
    setIsActionLoading(false)
  }

  // Reads a note/call's text for a schedulable date ("call back tmrw", "follow up
  // next Monday at 2pm") and quietly books it onto the salesperson's follow-up calendar.
  async function maybeAutoScheduleFollowUp(lead, text) {
    const when = parseFollowUpDate(text)
    if (!when) return
    const { error } = await scheduleFollowUp({
      lead,
      leadType: 'outreach',
      scheduledAt: when,
      notesContent: text,
      source: 'note',
      salespeople,
      currentUser: user,
      currentProfile: profile
    })
    if (!error) {
      await supabase.from('lead_history').insert({
        lead_id: lead.id,
        lead_type: 'outreach',
        event_type: 'follow_up_scheduled',
        content: `📅 Detected a follow-up in your note — scheduled for ${when.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`,
        admin_id: user?.id
      })
      if (selectedLead?.id === lead.id) fetchUnifiedHistory(lead.id)
    }
  }

  function openFollowUpPicker(lead) {
    const def = new Date()
    def.setDate(def.getDate() + 1)
    def.setHours(9, 0, 0, 0)
    setFollowUpDate(def.toISOString().slice(0, 10))
    setFollowUpTime('09:00')
    setFollowUpNote('')
    setFollowUpModalLead(lead)
  }

  async function confirmFollowUpPicker() {
    const lead = followUpModalLead
    if (!lead || !followUpDate || !followUpTime || followUpSaving) return
    setFollowUpSaving(true)

    const scheduledAt = new Date(`${followUpDate}T${followUpTime}:00`)
    const noteText = followUpNote.trim()

    await updateStatus(lead.id, 'Follow Up Needed')

    const { error } = await scheduleFollowUp({
      lead,
      leadType: 'outreach',
      scheduledAt,
      notesContent: noteText || `Follow up with ${lead.name || lead.email}`,
      source: 'manual',
      salespeople,
      currentUser: user,
      currentProfile: profile
    })

    if (error) {
      alert('Follow-up status saved, but the reminder could not be scheduled: ' + error.message)
    } else {
      await supabase.from('lead_history').insert({
        lead_id: lead.id,
        lead_type: 'outreach',
        event_type: 'follow_up_scheduled',
        content: `📅 Follow-up scheduled for ${scheduledAt.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}${noteText ? ` — "${noteText}"` : ''}`,
        admin_id: user?.id
      })
      if (selectedLead?.id === lead.id) fetchUnifiedHistory(lead.id)
    }

    setFollowUpSaving(false)
    setFollowUpModalLead(null)
  }

  async function handleViewLeadFromFollowUp(reminder) {
    const existing = leads.find(l => l.id === reminder.lead_id)
    if (existing) {
      setViewMode('leads')
      setSelectedLead(existing)
      return
    }
    if (reminder.lead_type !== 'outreach') {
      alert('This follow-up is for an inbound lead — open it from the Inbound Leads tab.')
      return
    }
    const { data } = await supabase.from('outreach_leads').select('*').eq('id', reminder.lead_id).maybeSingle()
    if (data) {
      setViewMode('leads')
      setSelectedLead(data)
    } else {
      alert('Could not find this lead — it may have been deleted.')
    }
  }

  async function sendManualEmail(lead, statusKey) {
    if (emailSending) return
    setEmailSending(true)
    try {
      const { data: tmpl } = await supabase
        .from('email_templates')
        .select('subject, body, enabled')
        .eq('status', statusKey)
        .single()

      if (!tmpl) {
        alert(`No template found for status: ${statusKey}`)
        return
      }

      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'status_change',
          recipient: lead.email,
          name: lead.name || 'there',
          company: lead.company || '',
          service: lead.industry || '',
          status: statusKey,
          subject: tmpl.subject,
          body: tmpl.body,
        }
      })

      if (error) throw error

      await supabase.from('lead_history').insert({
        lead_id: lead.id,
        lead_type: 'outreach',
        event_type: 'email_sent',
        content: `Manual email sent: "${tmpl.subject}" (Template: ${statusKey})`,
        admin_id: user?.id
      })

      if (selectedLead?.id === lead.id) fetchUnifiedHistory(lead.id)

      setEmailSentFor(lead.id)
      setTimeout(() => setEmailSentFor(null), 3000)
    } finally {
      setEmailSending(false)
    }
  }

  function openCustomEmailModal(lead) {
    setCustomEmailLead(lead)
    setCustomEmailSubject('')
    setCustomEmailBody('')
    setSelectedTemplate('')
  }

  async function handleBookAppointment() {
    if (!selectedSlot) {
      setBookingError('Please select a time slot on the calendar.')
      return
    }

    setBookingSending(true)
    setBookingError('')
    try {
      const startLocal = selectedSlot.start
      const endLocal = selectedSlot.end

      const schedulingAdmin = profile?.name || profile?.email || ''
      const colorId = schedulingAdmin.toLowerCase().includes('mzi') ? '11' : '1'

      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'schedule_call',
          leadEmail: bookingOverrideEmail.trim() || bookingLead.email,
          leadName: bookingLead.name || 'there',
          startTime: startLocal.toISOString(),
          endTime: endLocal.toISOString(),
          title: bookingTitle || `Strategy session with ${bookingLead.name || 'Client'}`,
          description: bookingDescription || `Meeting scheduled by ${schedulingAdmin} via CRM.`,
          colorId: colorId,
          agentName: schedulingAdmin
        }
      })

      if (error) throw error

      // Update status to 'Meeting Booked'
      await updateStatus(bookingLead.id, 'Meeting Booked')

      // Log event to lead history
      await supabase.from('lead_history').insert({
        lead_id: bookingLead.id,
        lead_type: 'outreach',
        event_type: 'call',
        content: `Google Calendar appointment booked: "${bookingTitle}" on ${startLocal.toLocaleString()}`,
        admin_id: user?.id
      })

      if (selectedLead?.id === bookingLead.id) {
        fetchUnifiedHistory(bookingLead.id)
      }

      setBookingSuccess(true)
    } catch (err) {
      console.error('Failed to book appointment:', err)
      setBookingError('Error booking appointment: ' + err.message)
    } finally {
      setBookingSending(false)
    }
  }

  async function handleTemplateChange(templateKey) {
    setSelectedTemplate(templateKey)
    if (!templateKey) {
      setCustomEmailSubject('')
      setCustomEmailBody('')
      return
    }

    const tmpl = emailTemplates.find(t => t.status === templateKey)
    if (tmpl) {
      const vars = {
        name: customEmailLead.name || 'there',
        status: templateKey,
        company: customEmailLead.company || '',
        service: customEmailLead.industry || customEmailLead.service || ''
      }

      const interpolateVars = (str) => {
        return str.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
      }

      setCustomEmailSubject(interpolateVars(tmpl.subject || ''))
      setCustomEmailBody(interpolateVars(tmpl.body || ''))
    }
  }

  async function logCall(lead, noteContent) {
    if (isActionLoading) return
    setIsActionLoading(true)
    const newCount = (lead.call_attempts || 0) + 1

    const updatePayload = { call_attempts: newCount }
    if (noteContent) updatePayload.notes = noteContent

    const { error } = await supabase.from('outreach_leads').update(updatePayload).eq('id', lead.id)
    if (!error) {
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, call_attempts: newCount, ...(noteContent ? { notes: noteContent } : {}) } : l))
      if (selectedLead?.id === lead.id) setSelectedLead(prev => ({ ...prev, call_attempts: newCount, ...(noteContent ? { notes: noteContent } : {}) }))

      const finalContent = noteContent
        ? `Call attempt #${newCount}: ${noteContent}`
        : `Call attempt #${newCount} to ${lead.name || lead.email}`

      await supabase.from('lead_history').insert({
        lead_id: lead.id,
        lead_type: 'outreach',
        event_type: 'call',
        content: finalContent,
        admin_id: user?.id
      })
      if (selectedLead?.id === lead.id) fetchUnifiedHistory(lead.id)
      if (noteContent) maybeAutoScheduleFollowUp(lead, noteContent)
    }
    setIsActionLoading(false)
  }

  async function submitToDeal(lead) {
    if (isActionLoading) return
    // Check if deal already exists for this lead
    const { data: existing } = await supabase.from('deals').select('id').eq('lead_id', lead.id).maybeSingle()
    if (existing) {
      alert('This lead is already in the pipeline.')
      return
    }
    setIsActionLoading(true)
    const spName = profile?.name || profile?.email?.split('@')[0] || 'Unknown'
    const { error } = await supabase.from('deals').insert({
      lead_id: lead.id,
      lead_type: 'outreach',
      lead_name: lead.name || lead.email || 'Unknown',
      lead_email: lead.email || null,
      lead_company: lead.company || null,
      salesperson_id: user?.id || null,
      salesperson_name: spName,
      status: 'pipeline'
    })
    if (!error) {
      await supabase.from('lead_history').insert({
        lead_id: lead.id,
        lead_type: 'outreach',
        event_type: 'status_change',
        content: `Submitted to deals pipeline by ${spName}`,
        admin_id: user?.id
      })
      if (selectedLead?.id === lead.id) fetchUnifiedHistory(lead.id)
      alert('✅ Lead submitted to the deals pipeline!')
    } else {
      alert('Error submitting deal: ' + error.message)
    }
    setIsActionLoading(false)
  }

  async function deleteHistoryItem(id) {
    if (!confirm('Delete this item?')) return
    const { error } = await supabase.from('lead_history').delete().eq('id', id)
    if (!error) {
      setHistory(prev => prev.filter(item => item.id !== id))
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'New': return { bg: 'rgba(233, 30, 99, 0.1)', text: 'rgb(244, 114, 182)', border: '1px solid rgba(233, 30, 99, 0.2)' }
      case 'Contacted': return { bg: 'rgba(59, 130, 246, 0.1)', text: '#93c5fd', border: '1px solid rgba(59, 130, 246, 0.2)' }
      case 'In Progress': return { bg: 'rgba(245, 158, 11, 0.1)', text: '#fcd34d', border: '1px solid rgba(245, 158, 11, 0.2)' }
      case 'Meeting Booked': return { bg: 'rgba(168, 85, 247, 0.1)', text: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.2)' }
      case 'Waiting for Invoice': return { bg: 'rgba(6, 182, 212, 0.1)', text: '#67e8f9', border: '1px solid rgba(6, 182, 212, 0.2)' }
      case 'Converted': return { bg: 'rgba(16, 185, 129, 0.1)', text: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.2)' }
      case 'Lost': return { bg: 'rgba(239, 68, 68, 0.1)', text: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.2)' }
      case 'Follow Up Needed': return { bg: 'rgba(251, 146, 60, 0.1)', text: '#fdba74', border: '1px solid rgba(251, 146, 60, 0.2)' }
      // legacy support
      case 'Scraped': return { bg: 'rgba(148, 163, 184, 0.1)', text: '#94A3B8', border: '1px solid rgba(148, 163, 184, 0.2)' }
      case 'Interested': return { bg: 'rgba(16, 185, 129, 0.1)', text: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.2)' }
      case 'Not Interested': return { bg: 'rgba(239, 68, 68, 0.1)', text: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' }
      case 'Promoted': return { bg: 'rgba(233, 30, 99, 0.1)', text: '#f472b6', border: '1px solid rgba(233, 30, 99, 0.2)' }
      default: return { bg: 'rgba(233, 30, 99, 0.1)', text: 'rgb(244, 114, 182)', border: '1px solid rgba(233, 30, 99, 0.2)' }
    }
  }

  async function deleteLead(lead) {
    if (!confirm('Permanently delete this outbound lead?')) return
    const { error } = await supabase.from('outreach_leads').delete().eq('id', lead.id)
    if (!error) {
      setLeads(prev => prev.filter(l => l.id !== lead.id))
      if (selectedLead?.id === lead.id) setSelectedLead(null)
    }
  }

  async function batchDelete() {
    if (!selectedIds.length) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} leads?`)) return

    const { error } = await supabase.from('outreach_leads').delete().in('id', selectedIds)
    if (!error) {
      setLeads(prev => prev.filter(l => !selectedIds.includes(l.id)))
      setSelectedIds([])
      if (selectedLead && selectedIds.includes(selectedLead.id)) setSelectedLead(null)
    }
  }

  const handleFileUpload = async (file) => {
    if (!file) return
    console.log('[CSV Import] Started for file:', file.name, 'size:', file.size, 'bytes')
    setIsImporting(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const csvData = event.target.result
        const parseCSV = (text) => {
          const rows = []
          let row = []
          let col = ''
          let inQuotes = false
          for (let i = 0; i < text.length; i++) {
            const char = text[i]
            const next = text[i + 1]
            if (inQuotes) {
              if (char === '"' && next === '"') { col += '"'; i++ }
              else if (char === '"') { inQuotes = false }
              else { col += char }
            } else {
              if (char === '"') { inQuotes = true }
              else if (char === ',') { row.push(col); col = '' }
              else if (char === '\r' || char === '\n') {
                row.push(col); rows.push(row); row = []; col = ''
                if (char === '\r' && next === '\n') i++
              }
              else { col += char }
            }
          }
          if (row.length || col) { row.push(col); rows.push(row) }
          return rows
        }

        console.log('[CSV Import] Parsing CSV text...')
        const rows = parseCSV(csvData)
        console.log('[CSV Import] Parsed rows count:', rows.length)

        if (rows.length < 2) {
          console.warn('[CSV Import] File has less than 2 rows. Aborting.')
          setIsImporting(false)
          setTimeout(() => {
            alert('CSV file is empty or has no data rows.')
          }, 50)
          return
        }

        const headers = rows[0].map(h => h.trim().toLowerCase())
        console.log('[CSV Import] Headers found:', headers)
        const newLeads = []
        for (let i = 1; i < rows.length; i++) {
          const values = rows[i]
          if (!values.some(v => v.trim())) continue
          const lead = {
            email: null,
            name: null,
            company: null,
            website: null,
            linkedin: null,
            industry: null,
            location: null,
            phone: null,
            status: 'New',
            tags: [],
            metadata: {},
            assignee_id: null
          }
          headers.forEach((header, index) => {
            let val = values[index]?.replace(/^["']|["']$/g, '').trim()
            if (!val) return
            if (header.includes('email')) {
              const emails = val.split(',').map(e => e.trim()).filter(Boolean)
              if (emails.length > 0) {
                lead.email = emails[0].toLowerCase()
                if (emails.length > 1) {
                  lead.metadata = {
                    ...lead.metadata,
                    additional_emails: emails.slice(1).map(e => e.toLowerCase())
                  }
                }
              }
            }
            if (header.includes('name')) lead.name = val
            if (header.includes('company')) lead.company = val
            if (header.includes('website') || (header.includes('url') && !header.includes('maps') && !header.includes('google'))) lead.website = val
            if (header.includes('linkedin')) lead.linkedin = val
            if (header.includes('industry') || header.includes('cuisine')) lead.industry = val
            if (header.includes('location') || header.includes('address')) lead.location = val
            if (header.includes('phone') || header.includes('tel')) lead.phone = val
          })

          if (lead.email || lead.phone) {
            if (!lead.industry && importIndustry) {
              lead.industry = importIndustry
            }
            if (importTags) {
              const extraTags = importTags.split(',').map(t => t.trim()).filter(Boolean)
              lead.tags = extraTags
            }
            if (importAssignee) {
              lead.assignee_id = importAssignee
            }
            newLeads.push(lead)
          }
        }

        console.log('[CSV Import] Parsed valid leads (email or phone):', newLeads.length)

        if (newLeads.length > 0) {
          // Dedup by email (for leads with email) or by phone (for phone-only leads)
          const emailLeads  = newLeads.filter(l => l.email)
          const phoneOnlyLeads = newLeads.filter(l => !l.email && l.phone)

          const existingEmails = new Set()
          if (emailLeads.length > 0) {
            const emailsToImport = [...new Set(emailLeads.map(l => l.email))]
            console.log('[CSV Import] Unique emails to check duplicates for:', emailsToImport.length)
            for (let i = 0; i < emailsToImport.length; i += 1000) {
              const chunk = emailsToImport.slice(i, i + 1000)
              const { data, error } = await supabase.from('outreach_leads').select('email').in('email', chunk)
              if (error) console.error('[CSV Import] Error fetching email duplicates:', error)
              if (data) data.forEach(d => existingEmails.add(d.email.toLowerCase()))
            }
          }

          const existingPhones = new Set()
          if (phoneOnlyLeads.length > 0) {
            const phonesToImport = [...new Set(phoneOnlyLeads.map(l => l.phone.replace(/\s/g, '')))]
            console.log('[CSV Import] Unique phones to check duplicates for:', phonesToImport.length)
            for (let i = 0; i < phonesToImport.length; i += 1000) {
              const chunk = phonesToImport.slice(i, i + 1000)
              const { data, error } = await supabase.from('outreach_leads').select('phone').in('phone', chunk)
              if (error) console.error('[CSV Import] Error fetching phone duplicates:', error)
              if (data) data.forEach(d => existingPhones.add((d.phone || '').replace(/\s/g, '')))
            }
          }

          console.log('[CSV Import] Existing email dupes:', existingEmails.size, '| phone dupes:', existingPhones.size)

          const uniqueLeads = newLeads.filter(l => {
            if (l.email) return !existingEmails.has(l.email)
            return !existingPhones.has((l.phone || '').replace(/\s/g, ''))
          })
          const duplicateCount = newLeads.length - uniqueLeads.length
          console.log('[CSV Import] Unique leads to insert after duplicate filtering:', uniqueLeads.length)

          if (uniqueLeads.length > 0) {
            let addedCount = 0
            let lastError = null
            const batchSize = 100
            const totalBatches = Math.ceil(uniqueLeads.length / batchSize)

            for (let i = 0; i < uniqueLeads.length; i += batchSize) {
              const batch = uniqueLeads.slice(i, i + batchSize)
              const batchIndex = Math.floor(i / batchSize) + 1
              console.log(`[CSV Import] Inserting batch ${batchIndex}/${totalBatches} of size ${batch.length}...`)

              const { error } = await supabase.from('outreach_leads').insert(batch)
              if (error) {
                console.error(`[CSV Import] Database error in batch ${batchIndex}:`, error)
                lastError = error
                break
              }
              addedCount += batch.length
              console.log(`[CSV Import] Successfully inserted batch ${batchIndex}. Progress: ${addedCount}/${uniqueLeads.length}`)
            }

            console.log('[CSV Import] Insertion completed. Total added:', addedCount, 'Error:', lastError?.message || 'none')

            setIsImporting(false)
            setShowImportModal(false)
            fetchLeads()

            if (!lastError) {
              setTimeout(() => {
                alert(`Import Successful!\nAdded: ${addedCount} new leads.\nSkipped: ${duplicateCount} duplicates.`)
              }, 50)
            } else {
              setTimeout(() => {
                alert(`Import partially succeeded.\nAdded: ${addedCount} leads.\nError at batch: ${lastError.message}`)
              }, 50)
            }
          } else {
            console.log('[CSV Import] No unique leads to insert.')
            setIsImporting(false)
            setShowImportModal(false)
            setTimeout(() => {
              alert(`No new leads found. All ${newLeads.length} leads are already in the database.`)
            }, 50)
          }
        } else {
          console.log('[CSV Import] No leads with valid email or phone found in file.')
          setIsImporting(false)
          setTimeout(() => {
            alert('No valid leads found. Each row must have at least an email or a phone number.')
          }, 50)
        }
      } catch (err) {
        console.error('[CSV Import] Uncaught exception in import process:', err)
        setIsImporting(false)
        setTimeout(() => {
          alert('An error occurred during import: ' + err.message)
        }, 50)
      }
    }
    reader.onerror = (err) => {
      console.error('[CSV Import] FileReader error:', err)
      setIsImporting(false)
      setTimeout(() => {
        alert('Failed to read the file.')
      }, 50)
    }
    reader.readAsText(file)
  }


  async function batchIndustryUpdate() {
    if (!selectedIds.length) return
    const industry = prompt('Enter industry for selected leads:')
    if (!industry || !industry.trim()) return

    setIsActionLoading(true)
    try {
      const { error } = await supabase.from('outreach_leads').update({ industry: industry.trim() }).in('id', selectedIds)
      if (!error) {
        fetchLeads()
        setSelectedIds([])
      }
    } catch (err) {
      console.error('Batch industry error:', err)
    } finally {
      setIsActionLoading(false)
    }
  }

  async function batchAddTag() {
    if (!selectedIds.length) return
    const tag = prompt('Enter tag to add to selected leads:')
    if (!tag || !tag.trim()) return

    setIsActionLoading(true)
    try {
      // Fetch current tags first
      const { data: currentLeads } = await supabase.from('outreach_leads').select('id, tags').in('id', selectedIds)

      const updates = currentLeads.map(l => {
        const existingTags = Array.isArray(l.tags) ? l.tags : []
        if (!existingTags.includes(tag.trim())) {
          return { id: l.id, tags: [...existingTags, tag.trim()] }
        }
        return null
      }).filter(Boolean)

      if (updates.length > 0) {
        for (const update of updates) {
          await supabase.from('outreach_leads').update({ tags: update.tags }).eq('id', update.id)
        }
        fetchLeads()
        setSelectedIds([])
      }
    } catch (err) {
      console.error('Batch tag error:', err)
    } finally {
      setIsActionLoading(false)
    }
  }

  async function handleAssignLead(leadId, assigneeId) {
    if (isActionLoading) return
    setIsActionLoading(true)
    const cleanAssigneeId = assigneeId === '' ? null : assigneeId
    const agent = salespeople.find(sp => sp.id === cleanAssigneeId)
    const agentName = agent ? (agent.name || agent.email) : 'Unassigned'

    const { error } = await supabase
      .from('outreach_leads')
      .update({ assignee_id: cleanAssigneeId })
      .eq('id', leadId)

    if (error) {
      alert('Failed to assign lead: ' + error.message)
    } else {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, assignee_id: cleanAssigneeId } : l))
      if (selectedLead?.id === leadId) {
        setSelectedLead(prev => ({ ...prev, assignee_id: cleanAssigneeId }))
      }
      await supabase.from('lead_history').insert({
        lead_id: leadId,
        lead_type: 'outreach',
        event_type: 'status_change',
        content: `Lead assigned to: ${agentName}`,
        admin_id: user?.id
      })
      if (selectedLead?.id === leadId) fetchUnifiedHistory(leadId)
    }
    setIsActionLoading(false)
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])
  }

  async function deleteAllLeads() {
    if (!confirm('Are you sure you want to delete ALL leads? This cannot be undone.')) return
    setIsActionLoading(true)
    try {
      // Clear outreach_leads table in mock DB
      await supabase.from('outreach_leads').delete().neq('id', 0)
      setLeads([])
      setTotalCount(0)
      alert('All leads have been deleted.')
    } catch (err) {
      console.error('Delete all error:', err)
    } finally {
      setIsActionLoading(false)
    }
  }

  async function generateMockLeads() {
    setIsScraping(true)
    // simulate delay for effect
    await new Promise(r => setTimeout(r, 2000))
    
    const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Emma', 'Alex', 'Chris']
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Taylor', 'Moore']
    const companies = ['TechCorp', 'Innova', 'Apex', 'Nexus', 'Summit', 'Zenith', 'Acme', 'Global', 'Stellar', 'Vanguard']
    const sources = ['LinkedIn', 'ZoomInfo', 'Apollo', 'Clearbit', 'Lusha', 'Mployer']
    const domains = ['com', 'io', 'net', 'co', 'biz']
    const allIndustries = ['HVAC', 'Real Estate', 'Technology', 'Finance', 'Healthcare', 'Construction']
    const allPositions = ['CEO', 'Founder', 'Director', 'Manager', 'Gatekeeper']
    const allStates = ['CA', 'TX', 'NY', 'FL', 'IL', 'PA']
    const allEmployees = ['1-10', '11-50', '51-200', '201-1000', '1000+']
    const allRevenue = ['<$1M', '$1M-$5M', '$5M-$20M', '$20M+']

    const newMocks = []
    for (let i = 0; i < 900; i++) {
      const fName = firstNames[Math.floor(Math.random() * firstNames.length)]
      const lName = lastNames[Math.floor(Math.random() * lastNames.length)]
      const company = companies[Math.floor(Math.random() * companies.length)]
      const email = `${fName.toLowerCase()}.${lName.toLowerCase()}@${company.toLowerCase()}.${domains[Math.floor(Math.random() * domains.length)]}`
      
      const randIndustry = scrapeIndustry.length ? scrapeIndustry[Math.floor(Math.random() * scrapeIndustry.length)] : allIndustries[Math.floor(Math.random() * allIndustries.length)]
      const randPosition = scrapePosition.length ? scrapePosition[Math.floor(Math.random() * scrapePosition.length)] : allPositions[Math.floor(Math.random() * allPositions.length)]
      const randState = scrapeStates.length ? scrapeStates[Math.floor(Math.random() * scrapeStates.length)] : allStates[Math.floor(Math.random() * allStates.length)]
      const randEmployees = scrapeEmployees ? scrapeEmployees : allEmployees[Math.floor(Math.random() * allEmployees.length)]
      const randRevenue = scrapeRevenue.length ? scrapeRevenue[Math.floor(Math.random() * scrapeRevenue.length)] : allRevenue[Math.floor(Math.random() * allRevenue.length)]

      newMocks.push({
        id: Date.now() + i + Math.random(),
        name: `${fName} ${lName}`,
        email,
        phone: `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        status: 'New',
        created_at: new Date().toISOString(),
        company,
        representative_name: `${fName} ${lName}`,
        industry: randIndustry,
        position: randPosition,
        location: randState,
        employees: randEmployees,
        annual_revenue: randRevenue,
        scrape_source: sources[Math.floor(Math.random() * sources.length)],
        website: `https://${company.toLowerCase()}.${domains[Math.floor(Math.random() * domains.length)]}`
      })
    }
    
    await supabase.from('outreach_leads').insert(newMocks)
    
    setShowScrapeModal(false)
    setIsScraping(false)
    setPage(0)
    fetchLeads()
  }

  async function distributeDutchLeads() {
    // Find MZI and Justin in the salespeople list
    const mzi = salespeople.find(sp => (sp.name || sp.email || '').toLowerCase().includes('mzi'))
    const justin = salespeople.find(sp => (sp.name || sp.email || '').toLowerCase().includes('justin'))

    if (!mzi || !justin) {
      alert(`Couldn't find both agents.\nFound: ${mzi ? (mzi.name || mzi.email) : '❌ MZI'}, ${justin ? (justin.name || justin.email) : '❌ Justin'}\nCheck that both have profiles in the system.`)
      return
    }

    if (!confirm(`This will assign ALL 🇳🇱 NL (+31) leads equally between:\n• ${mzi.name || mzi.email}\n• ${justin.name || justin.email}\n\nProceed?`)) return

    setIsActionLoading(true)
    try {
      // Fetch all NL leads (id only, all pages)
      let allIds = []
      let from = 0
      const chunkSize = 1000
      while (true) {
        const { data, error } = await supabase
          .from('outreach_leads')
          .select('id')
          .ilike('phone', '+31%')
          .range(from, from + chunkSize - 1)
        if (error) throw error
        if (!data || data.length === 0) break
        allIds = allIds.concat(data.map(r => r.id))
        if (data.length < chunkSize) break
        from += chunkSize
      }

      if (allIds.length === 0) {
        alert('No NL leads found to distribute.')
        return
      }

      // Round-robin: even index → MZI, odd index → Justin
      const mziBatch = allIds.filter((_, i) => i % 2 === 0)
      const justinBatch = allIds.filter((_, i) => i % 2 !== 0)

      const updateInBatches = async (ids, assigneeId) => {
        for (let i = 0; i < ids.length; i += 100) {
          const chunk = ids.slice(i, i + 100)
          const { error } = await supabase
            .from('outreach_leads')
            .update({ assignee_id: assigneeId })
            .in('id', chunk)
          if (error) throw error
        }
      }

      await Promise.all([
        updateInBatches(mziBatch, mzi.id),
        updateInBatches(justinBatch, justin.id)
      ])

      alert(`✅ Distributed ${allIds.length} NL leads!\n• ${mzi.name || mzi.email}: ${mziBatch.length}\n• ${justin.name || justin.email}: ${justinBatch.length}`)
      fetchLeads()
    } catch (err) {
      console.error('Distribution error:', err)
      alert('Error during distribution: ' + err.message)
    } finally {
      setIsActionLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @keyframes toastSlide { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .leadbank-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          align-items: start;
          transition: all 0.4s;
        }
        .leadbank-grid.has-selection {
          grid-template-columns: 1fr 400px;
        }
        .lead-detail-panel {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 32px;
          align-self: start;
          position: sticky;
          top: 40px;
          max-height: calc(100vh - 80px);
          overflow-y: auto;
          color: #0f172a;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
        }
        @media (max-width: 768px) {
          .leadbank-grid.has-selection { grid-template-columns: 1fr !important; }
          .lead-detail-panel { position: fixed; top: 70px; left: 0; width: 100vw; height: calc(100vh - 70px); z-index: 10000; border-radius: 0; overflow-y: auto; }
        }
      `}</style>
      {emailSentFor && (
        <div style={{
          position: 'fixed', bottom: '32px', right: '32px', zIndex: 9999,
          background: '#031a0e', border: '1px solid rgba(16,185,129,0.4)',
          color: '#6ee7b7', padding: '14px 24px', borderRadius: '14px',
          fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)', animation: 'toastSlide 0.3s ease-out'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
          </svg>
          Email sent to lead
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isAdmin && salespeople.length > 0 ? '16px' : '40px' }}>
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '2rem', fontWeight: 800, marginBottom: '8px', color: '#0f172a' }}>{title}</h1>
          <p style={{ color: '#64748B' }}>{subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                goToPage(0)
              }}
              style={{
                padding: '10px 16px 10px 38px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px', color: 'white', fontSize: '0.9rem', outline: 'none', width: '260px',
                transition: 'all 0.2s'
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'rgba(233, 30, 99, 0.4)'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>
          {selectedIds.length > 0 && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={batchIndustryUpdate} style={{ padding: '10px 20px', background: 'rgba(156, 39, 176, 0.1)', border: '1px solid rgba(156, 39, 176, 0.2)', color: '#d8b4fe', borderRadius: '12px', cursor: 'pointer', fontWeight: 600 }}>
                Update Industry
              </button>
              <button onClick={batchAddTag} style={{ padding: '10px 20px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#3b82f6', borderRadius: '12px', cursor: 'pointer', fontWeight: 600 }}>
                Add Tag
              </button>
              <button onClick={batchDelete} style={{ padding: '10px 20px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '12px', cursor: 'pointer', fontWeight: 600 }}>
                Delete ({selectedIds.length})
              </button>
            </div>
          )}
          <button onClick={() => setShowScrapeModal(true)} style={{ padding: '10px 20px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#3b82f6', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
            Scrape Data
          </button>
          <button onClick={deleteAllLeads} disabled={isActionLoading} style={{ padding: '10px 20px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
            {isActionLoading ? 'Deleting...' : 'Delete All'}
          </button>
          <button onClick={() => setShowImportModal(true)} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #C99F4A, #1B365D)', color: 'white', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', border: 'none' }}>
            {isImporting ? 'Importing...' : 'Upload CSV'}
          </button>
          <button onClick={() => fetchLeads()} style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '12px', cursor: 'pointer' }}>Refresh</button>
        </div>
      </div>

      {/* {isAdmin && salespeople.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap' }}>
          <p style={{ margin: 0, color: '#64748B', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Filter by Agent:</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[{ id: 'all', label: 'All Leads' }, { id: 'unassigned', label: 'Unassigned' }, ...salespeople.map(sp => ({ id: sp.id, label: sp.name || sp.email }))].map(opt => (
              <button
                key={opt.id}
                onClick={() => setAssigneeFilter(opt.id)}
                style={{
                  padding: '8px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                  border: assigneeFilter === opt.id ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  background: assigneeFilter === opt.id ? 'linear-gradient(135deg, #3b82f6, #10b981)' : 'rgba(255,255,255,0.03)',
                  color: assigneeFilter === opt.id ? 'white' : '#94A3B8',
                  boxShadow: assigneeFilter === opt.id ? '0 4px 15px rgba(59,130,246,0.3)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )} */}

      {title === 'Outbound' && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {[{ id: 'leads', label: 'Leads' }, { id: 'followups', label: '📅 Follow-Ups' }].map(t => (
            <button
              key={t.id}
              onClick={() => setViewMode(t.id)}
              style={{
                padding: '9px 18px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                border: viewMode === t.id ? 'none' : '1px solid rgba(255,255,255,0.1)',
                background: viewMode === t.id ? 'linear-gradient(135deg, #C99F4A, #1B365D)' : 'rgba(255,255,255,0.03)',
                color: viewMode === t.id ? 'white' : '#94A3B8',
                boxShadow: viewMode === t.id ? '0 4px 15px rgba(201,159,74,0.3)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {viewMode === 'followups' ? (
        <FollowUpCalendar user={user} isAdmin={isAdmin} salespeople={salespeople} onViewLead={handleViewLeadFromFollowUp} />
      ) : (
      <>
      <div className="leadbank-filters">
        <p style={{ margin: 0, color: '#64748B', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Quick Filter Status:</p>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            color: 'white', padding: '10px 16px', borderRadius: '12px', fontSize: '0.9rem',
            outline: 'none', cursor: 'pointer', fontWeight: 600
          }}
        >
          {statusOptions.map(opt => (
            <option key={opt.label} value={opt.label} style={{ background: '#0a0a0a', color: 'white' }}>{opt.label}</option>
          ))}
        </select>

        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.08)' }} />
        <p style={{ margin: 0, color: '#64748B', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Phone:</p>
        {[{ id: 'all', label: 'All' }, { id: 'nl', label: '🇳🇱 NL' }, { id: 'uk', label: '🇬🇧 UK' }, { id: 'us', label: '🇺🇸 US' }].map(opt => (
          <button
            key={opt.id}
            onClick={() => { setPhoneFilter(opt.id); goToPage(0); }}
            style={{
              padding: '8px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
              border: phoneFilter === opt.id ? 'none' : '1px solid rgba(255,255,255,0.1)',
              background: phoneFilter === opt.id ? 'linear-gradient(135deg, #f97316, #ef4444)' : 'rgba(255,255,255,0.03)',
              color: phoneFilter === opt.id ? 'white' : '#94A3B8',
              boxShadow: phoneFilter === opt.id ? '0 4px 15px rgba(249,115,22,0.3)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            {opt.label}
          </button>
        ))}


      </div>

      <div className={`leadbank-grid ${selectedLead ? 'has-selection' : ''}`}>
        <div className="lead-table-container" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '24px', overflowX: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1100px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <th style={{ padding: '24px 20px', width: '40px' }}>
                  <input type="checkbox" onChange={e => setSelectedIds(e.target.checked ? leads.map(l => l.id) : [])} checked={selectedIds.length === leads.length && leads.length > 0} />
                </th>
                <th style={{ padding: '24px 20px', color: '#64748B', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company</th>
                <th style={{ padding: '24px 20px', color: '#64748B', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rep Name</th>
                <th style={{ padding: '24px 20px', color: '#64748B', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Position</th>
                <th style={{ padding: '24px 20px', color: '#64748B', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Website</th>
                <th style={{ padding: '24px 20px', color: '#64748B', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: '160px', width: '160px' }}>Phone</th>
                <th style={{ padding: '24px 20px', color: '#64748B', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employees</th>
                <th style={{ padding: '24px 20px', color: '#64748B', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Source</th>
                <th style={{ padding: '24px 20px', color: '#94A3B8', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Industry
                    <select
                      value={tableIndustryFilter}
                      onChange={e => setTableIndustryFilter(e.target.value)}
                      style={{ background: 'transparent', border: 'none', color: '#3b82f6', outline: 'none', cursor: 'pointer', fontWeight: 800 }}
                    >
                      <option value="" style={{ background: '#0a0a0a', color: 'white' }}>All</option>
                      {dbIndustries.map(ind => (
                        <option key={ind} value={ind} style={{ background: '#0a0a0a', color: 'white' }}>{ind}</option>
                      ))}
                    </select>
                  </div>
                </th>
                <th style={{ padding: '24px 20px', color: '#94A3B8', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Tags
                    <select
                      value={tableTagFilter}
                      onChange={e => setTableTagFilter(e.target.value)}
                      style={{ background: 'transparent', border: 'none', color: '#3b82f6', outline: 'none', cursor: 'pointer', fontWeight: 800 }}
                    >
                      <option value="" style={{ background: '#0a0a0a', color: 'white' }}>All</option>
                      {dbTags.map(tag => (
                        <option key={tag} value={tag} style={{ background: '#0a0a0a', color: 'white' }}>{tag}</option>
                      ))}
                    </select>
                  </div>
                </th>
                <th style={{ padding: '24px 20px', color: '#94A3B8', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Status
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                      style={{ background: 'transparent', border: 'none', color: '#3b82f6', outline: 'none', cursor: 'pointer', fontWeight: 800 }}
                    >
                      {statusOptions.map(opt => (
                        <option key={opt.label} value={opt.label} style={{ background: '#0a0a0a', color: 'white' }}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </th>
                <th style={{ padding: '24px 20px', color: '#94A3B8', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Comment
                    <select
                      value={commentFilter}
                      onChange={e => { setCommentFilter(e.target.value); goToPage(0); }}
                      style={{ background: 'transparent', border: 'none', color: '#3b82f6', outline: 'none', cursor: 'pointer', fontWeight: 800 }}
                    >
                      <option value="all" style={{ background: '#0a0a0a', color: 'white' }}>All</option>
                      <option value="has" style={{ background: '#0a0a0a', color: 'white' }}>Has Comment</option>
                      <option value="none" style={{ background: '#0a0a0a', color: 'white' }}>No Comment</option>
                    </select>
                  </div>
                </th>
                {isAdmin && <th style={{ padding: '24px 20px', color: '#64748B', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assignee</th>}
                <th style={{ padding: '24px 20px', color: '#64748B', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', position: 'sticky', right: 0, background: '#f8fafc', zIndex: 10, borderLeft: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    Activity
                    <select
                      value={callFilter}
                      onChange={e => { setCallFilter(e.target.value); goToPage(0); }}
                      style={{ background: 'transparent', border: 'none', color: '#3b82f6', outline: 'none', cursor: 'pointer', fontWeight: 800 }}
                    >
                      <option value="all" style={{ background: '#0a0a0a', color: 'white' }}>All</option>
                      <option value="has" style={{ background: '#0a0a0a', color: 'white' }}>Has Calls</option>
                      <option value="none" style={{ background: '#0a0a0a', color: 'white' }}>No Calls</option>
                    </select>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={isAdmin ? '14' : '13'} style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>Loading outbound leads...</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={isAdmin ? '14' : '13'} style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>No outbound leads match table filters.</td></tr>
              ) : leads.map(lead => {
                return (
                  <tr key={lead.id} style={{ borderBottom: '1px solid #f1f5f9', background: selectedLead?.id === lead.id ? 'rgba(201, 159, 74, 0.08)' : 'transparent', transition: 'all 0.2s' }}>
                    <td style={{ padding: '20px' }}>
                      <input type="checkbox" checked={selectedIds.includes(lead.id)} onChange={() => toggleSelect(lead.id)} />
                    </td>
                    <td style={{ padding: '20px', cursor: 'pointer' }} onClick={() => setSelectedLead(lead)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '40px', height: '40px', minWidth: '40px', flexShrink: 0, borderRadius: '12px', background: 'linear-gradient(135deg, #3b82f6, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800, color: 'white', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)' }}>{(lead.company || lead.name || '?').charAt(0).toUpperCase()}</div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{lead.company || 'Unknown Company'}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '20px' }}>
                       <span style={{ color: '#0f172a', fontSize: '0.85rem', fontWeight: 600 }}>{lead.representative_name || lead.name || 'Unknown'}</span>
                    </td>
                    <td style={{ padding: '20px' }}>
                       <span style={{ color: '#334155', fontSize: '0.85rem' }}>{lead.position || 'N/A'}</span>
                    </td>
                    <td style={{ padding: '20px' }}>
                      {lead.website ? (() => {
                        let url = lead.website.trim()
                        const fullUrl = /^https?:\/\//i.test(url) ? url : `https://${url.replace(/^https?:\/*/i, '')}`
                        return (
                          <a href={fullUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', background: 'rgba(59, 130, 246, 0.05)', padding: '6px 12px', borderRadius: '8px', width: 'fit-content' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            Visit
                          </a>
                        )
                      })() : <span style={{ color: '#64748B', fontSize: '0.85rem' }}>N/A</span>}
                    </td>
                    <td style={{ padding: '20px', minWidth: '160px', width: '160px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontSize: '0.85rem', fontWeight: 600 }}>
                        <span>{lead.phone || 'N/A'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '20px' }}>
                       <span style={{ color: '#334155', fontSize: '0.85rem' }}>{lead.employees || 'N/A'}</span>
                    </td>
                    <td style={{ padding: '20px' }}>
                      <span style={{ color: '#9c27b0', fontSize: '0.85rem', fontWeight: 700, background: 'rgba(156, 39, 176, 0.1)', padding: '4px 8px', borderRadius: '4px' }}>{lead.scrape_source || 'Unknown'}</span>
                    </td>
                    <td style={{ padding: '20px' }}>
                      <input
                        type="text" placeholder="Industry"
                        value={lead.industry || ''}
                        onChange={async (e) => {
                          const val = e.target.value
                          setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, industry: val } : l))
                        }}
                        onBlur={async (e) => {
                          await supabase.from('outreach_leads').update({ industry: e.target.value }).eq('id', lead.id)
                        }}
                        style={{ background: 'transparent', border: '1px solid transparent', color: '#0f172a', fontSize: '0.85rem', padding: '4px 8px', borderRadius: '4px', width: '100px' }}
                        onMouseEnter={e => e.currentTarget.style.border = '1px solid rgba(0,0,0,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.border = '1px solid transparent'}
                      />
                    </td>
                    <td style={{ padding: '20px' }}>
                      <input
                        type="text" placeholder="Tags"
                        value={Array.isArray(lead.tags) ? lead.tags.join(', ') : (lead.tags || '')}
                        onChange={async (e) => {
                          const val = e.target.value
                          setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, tags: val } : l))
                        }}
                        onBlur={async (e) => {
                          const tagArray = e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                          await supabase.from('outreach_leads').update({ tags: tagArray }).eq('id', lead.id)
                        }}
                        style={{ background: 'transparent', border: '1px solid transparent', color: '#0f172a', fontSize: '0.85rem', padding: '4px 8px', borderRadius: '4px', width: '100px' }}
                        onMouseEnter={e => e.currentTarget.style.border = '1px solid rgba(0,0,0,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.border = '1px solid transparent'}
                      />
                    </td>
                    <td style={{ padding: '20px' }}>
                      <select
                        value={lead.status === 'Scraped' ? 'New' : (lead.status || 'New')}
                        onChange={(e) => {
                          if (e.target.value === 'Follow Up Needed') {
                            openFollowUpPicker(lead)
                          } else {
                            updateStatus(lead.id, e.target.value)
                          }
                        }}
                        style={{
                          padding: '8px 12px',
                          background: getStatusColor(lead.status === 'Scraped' ? 'New' : (lead.status || 'New')).bg,
                          border: getStatusColor(lead.status === 'Scraped' ? 'New' : (lead.status || 'New')).border,
                          borderRadius: '10px',
                          color: getStatusColor(lead.status === 'Scraped' ? 'New' : (lead.status || 'New')).text,
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        <option value="New" style={{ background: '#0a0a0a', color: 'white' }}>New</option>
                        <option value="Contacted" style={{ background: '#0a0a0a', color: 'white' }}>Contacted</option>
                        <option value="In Progress" style={{ background: '#0a0a0a', color: 'white' }}>In Progress</option>
                        <option value="Follow Up Needed" style={{ background: '#0a0a0a', color: 'white' }}>Follow Up Needed</option>
                        <option value="Meeting Booked" style={{ background: '#0a0a0a', color: 'white' }}>Meeting Booked</option>
                        <option value="Waiting for Invoice" style={{ background: '#0a0a0a', color: 'white' }}>Waiting for Invoice</option>
                        <option value="No Response" style={{ background: '#0a0a0a', color: 'white' }}>No Response</option>
                        <option value="Converted" style={{ background: '#0a0a0a', color: 'white' }}>Converted</option>
                        <option value="Lost" style={{ background: '#0a0a0a', color: 'white' }}>Lost</option>
                      </select>
                    </td>
                    <td style={{ padding: '20px' }}>
                      <div onClick={() => setSelectedLead(lead)} style={{ position: 'relative', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', padding: '10px 40px 10px 14px', minHeight: '44px' }}>
                        <div style={{ color: lead.notes ? '#CBD5E1' : '#475569', fontSize: '0.85rem', fontStyle: lead.notes ? 'normal' : 'italic', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.notes || 'No notes yet...'}</div>
                        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#3b82f6', fontSize: '1.1rem', fontWeight: 800, opacity: 0.6 }}>+</div>
                      </div>
                    </td>
                    {isAdmin && (
                      <td style={{ padding: '20px' }}>
                        <select
                          value={lead.assignee_id || ''}
                          onChange={e => handleAssignLead(lead.id, e.target.value)}
                          onClick={e => e.stopPropagation()}
                          style={{
                            padding: '8px 12px', background: lead.assignee_id ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.03)',
                            border: lead.assignee_id ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '10px', color: lead.assignee_id ? '#93c5fd' : '#64748B',
                            fontSize: '0.8rem', fontWeight: 600, outline: 'none', cursor: 'pointer', maxWidth: '140px'
                          }}
                        >
                          <option value="" style={{ background: '#0a0a0a', color: '#94A3B8' }}>Unassigned</option>
                          {salespeople.map(sp => (
                            <option key={sp.id} value={sp.id} style={{ background: '#0a0a0a', color: 'white' }}>
                              {sp.name || sp.email}
                            </option>
                          ))}
                        </select>
                      </td>
                    )}
                    <td style={{ padding: '20px', textAlign: 'center', position: 'sticky', right: 0, background: selectedLead?.id === lead.id ? '#1a0b12' : '#0a0a0a', zIndex: 10, borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <button onClick={() => setCallModalLead(lead)} style={{ padding: '8px 12px', background: 'rgba(233, 30, 99, 0.08)', border: '1px solid rgba(233, 30, 99, 0.1)', color: '#e91e63', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                          <span style={{ fontWeight: 800, fontSize: '0.8rem' }}>{lead.call_attempts || 0}</span>
                        </button>

                        <button
                          onClick={() => setSelectedLead(lead)}
                          title="View History"
                          style={{
                            padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                            color: '#94A3B8', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                            transition: 'all 0.2s'
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {totalCount > pageSize && (
            <div style={{ padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
              <div style={{ color: '#64748B', fontSize: '0.85rem', fontWeight: 600 }}>
                Showing <span style={{ color: 'white' }}>{page * pageSize + 1}</span> to <span style={{ color: 'white' }}>{Math.min((page + 1) * pageSize, totalCount)}</span> of <span style={{ color: 'white' }}>{totalCount}</span> leads
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  disabled={page === 0 || loading}
                  onClick={() => goToPage(page - 1)}
                  style={{
                    padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    color: page === 0 ? '#475569' : 'white', borderRadius: '10px', cursor: page === 0 ? 'default' : 'pointer',
                    fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.2s'
                  }}
                >
                  Prev
                </button>

                <div style={{ display: 'flex', gap: '6px' }}>
                  {Array.from({ length: Math.min(5, Math.ceil(totalCount / pageSize)) }).map((_, i) => {
                    const totalPages = Math.ceil(totalCount / pageSize)
                    let pageNum = i
                    if (totalPages > 5 && page > 2) {
                      pageNum = Math.min(page - 2 + i, totalPages - 5 + i)
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        style={{
                          width: '40px', height: '40px', borderRadius: '10px',
                          background: page === pageNum ? '#e91e63' : 'rgba(255,255,255,0.03)',
                          border: page === pageNum ? 'none' : '1px solid rgba(255,255,255,0.08)',
                          color: 'white', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem',
                          transition: 'all 0.2s',
                          boxShadow: page === pageNum ? '0 4px 15px rgba(233, 30, 99, 0.3)' : 'none'
                        }}
                      >
                        {pageNum + 1}
                      </button>
                    )
                  })}
                </div>

                <button
                  disabled={page >= Math.ceil(totalCount / pageSize) - 1 || loading}
                  onClick={() => goToPage(page + 1)}
                  style={{
                    padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    color: page >= Math.ceil(totalCount / pageSize) - 1 ? '#475569' : 'white', borderRadius: '10px',
                    cursor: page >= Math.ceil(totalCount / pageSize) - 1 ? 'default' : 'pointer',
                    fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.2s'
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {activeLead && (
          <div className="lead-detail-panel">

            <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', color: 'white', fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                  <span>{activeLead.name || 'Unnamed'}</span>
                  {activeLead.phone && (
                    <span style={{ fontSize: '0.95rem', color: '#94A3B8', fontWeight: 500 }}>
                      ({activeLead.phone})
                    </span>
                  )}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {editingEmail ? (
                    <>
                      <input
                        type="email"
                        autoFocus
                        value={emailDraft}
                        onChange={e => setEmailDraft(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') updateLeadEmail(activeLead, emailDraft)
                          if (e.key === 'Escape') setEditingEmail(false)
                        }}
                        style={{ fontSize: '0.85rem', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(233, 30, 99, 0.4)', borderRadius: '8px', padding: '5px 8px', outline: 'none', minWidth: '200px' }}
                      />
                      <button
                        onClick={() => updateLeadEmail(activeLead, emailDraft)}
                        title="Save email"
                        style={{ background: 'rgba(16, 185, 129, 0.15)', border: 'none', color: '#6ee7b7', cursor: 'pointer', padding: '5px', borderRadius: '6px', display: 'flex' }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </button>
                      <button
                        onClick={() => setEditingEmail(false)}
                        title="Cancel"
                        style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#64748B', cursor: 'pointer', padding: '5px', borderRadius: '6px', display: 'flex' }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{activeLead.email}</span>
                      <button
                        onClick={() => { setEmailDraft(activeLead.email || ''); setEditingEmail(true) }}
                        title="Edit email"
                        style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', padding: '2px', display: 'flex', opacity: 0.7 }}
                        onMouseEnter={e => e.currentTarget.style.opacity = 1}
                        onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                      </button>
                    </>
                  )}
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#334155' }}></span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: getStatusColor(activeLead.status === 'Scraped' ? 'New' : (activeLead.status || 'New')).text }}>{activeLead.status === 'Scraped' ? 'New' : (activeLead.status || 'New')}</span>
                </div>
              </div>
              <button onClick={() => setSelectedLead(null)} style={{ background: 'rgba(255, 255, 255, 0.05)', border: 'none', color: '#64748b', cursor: 'pointer', padding: '8px', borderRadius: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div style={{ background: 'linear-gradient(145deg, #160a0f, #0a0a0a)', border: '1px solid rgba(233, 30, 99, 0.2)', borderRadius: '16px', padding: '20px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, color: 'white', fontSize: '0.95rem', fontWeight: 700 }}>Quick Notes</h4>
              </div>
              {activeLead.notes && <p style={{ margin: '0 0 12px', color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.6' }}>{activeLead.notes}</p>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder={activeLead.notes ? "Update note..." : "Add a note..."}
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addComment(activeLead, newNote)}
                  style={{ flex: 1, padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                />
                <button
                  onClick={() => addComment(activeLead, newNote)}
                  disabled={!newNote.trim() || isActionLoading}
                  style={{ padding: '10px 16px', background: newNote.trim() ? '#e91e63' : 'rgba(233, 30, 99, 0.2)', border: 'none', color: 'white', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: newNote.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
                >
                  Save
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <h4 style={{ color: 'white', fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Timeline</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b', background: 'rgba(255, 255, 255, 0.05)', padding: '2px 8px', borderRadius: '10px' }}>{history.length} events</span>
              </h4>
              <div style={{ display: 'grid', gap: 0, maxHeight: '160px', overflowY: 'auto', paddingRight: '10px' }}>
                {history.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 20px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '20px' }}>
                    <p style={{ color: '#64748b', fontSize: '0.85rem' }}>No activity logged for this lead yet.</p>
                  </div>
                ) : history.map((item, idx) => {
                  const agent = salespeople?.find(sp => sp.id === item.admin_id) || (item.admin_id === user?.id ? profile : null)
                  const agentName = agent?.name || agent?.email?.split('@')[0]
                  return (
                    <div key={item.id} style={{ display: 'flex', gap: '20px', position: 'relative', paddingBottom: idx === history.length - 1 ? '0' : '24px' }}>
                      {idx !== history.length - 1 && <div style={{ position: 'absolute', left: '7px', top: '24px', bottom: 0, width: '2px', background: 'rgba(255, 255, 255, 0.05)' }} />}
                      <div style={{
                        width: '16px', height: '16px', borderRadius: '50%',
                        background: item.event_type === 'call' ? '#e91e63' : item.event_type === 'status_change' ? '#3b82f6' : item.event_type === 'follow_up_scheduled' ? '#fb923c' : (item.event_type === 'email' || item.event_type === 'email_sent') ? '#a855f7' : '#10b981',
                        zIndex: 1, marginTop: '4px', flexShrink: 0,
                        boxShadow: item.event_type === 'call' ? '0 0 10px rgba(233, 30, 99, 0.3)' : item.event_type === 'follow_up_scheduled' ? '0 0 10px rgba(251, 146, 60, 0.35)' : (item.event_type === 'email' || item.event_type === 'email_sent') ? '0 0 10px rgba(168, 85, 247, 0.3)' : 'none'
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                          <p style={{ margin: 0, color: 'white', fontSize: '0.9rem', lineHeight: '1.5' }}>{item.content}</p>
                          <button onClick={() => deleteHistoryItem(item.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', opacity: 0.4, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        </div>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.75rem' }}>
                          {new Date(item.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          {agentName ? ` • by ${agentName}` : ''}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setCallModalLead(activeLead)} style={{ flex: 1, padding: '14px', background: '#e91e63', border: 'none', color: 'white', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 8px 20px rgba(233, 30, 99, 0.3)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                  Log Call
                </button>

                <button
                  onClick={() => openCustomEmailModal(activeLead)}
                  disabled={emailSending}
                  style={{
                    flex: 1, padding: '14px',
                    background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)',
                    color: '#c084fc', borderRadius: '12px', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(168, 85, 247, 0.15)'
                    e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.5)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(168, 85, 247, 0.1)'
                    e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.3)'
                  }}
                >
                  {emailSending ? (
                    <>
                      <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#c084fc', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                      Sending…
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                      Send Email
                    </>
                  )}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setBookingLead(activeLead)}
                  style={{
                    flex: 2, padding: '14px',
                    background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)',
                    color: '#93c5fd', borderRadius: '12px', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  Book Appointment
                </button>
                {isAdmin && (
                  <button
                    onClick={() => deleteLead(activeLead)}
                    style={{
                      flex: 1, padding: '14px', background: 'transparent',
                      border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444',
                      borderRadius: '12px', fontWeight: 700, cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.6)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)' }}
                  >
                    🗑 Delete
                  </button>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
      </>
      )}

      {showScrapeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
          <div style={{ background: 'rgba(15, 17, 21, 0.95)', border: '1px solid rgba(255,255,255,0.1)', padding: '32px', borderRadius: '24px', width: '550px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <h2 style={{ margin: '0 0 24px', color: 'white', fontSize: '1.5rem', fontWeight: 800 }}>Scrape Parameters</h2>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#94A3B8', marginBottom: '12px', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Industry</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {['HVAC', 'Real Estate', 'Technology', 'Finance', 'Healthcare', 'Construction'].map(ind => (
                  <button 
                    key={ind} 
                    onClick={() => setScrapeIndustry(prev => prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind])}
                    style={{
                      padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s',
                      background: scrapeIndustry.includes(ind) ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                      border: scrapeIndustry.includes(ind) ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                      color: scrapeIndustry.includes(ind) ? '#60A5FA' : '#CBD5E1'
                    }}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#94A3B8', marginBottom: '12px', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Position</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {['CEO', 'Founder', 'Director', 'Manager', 'Gatekeeper'].map(pos => (
                  <button 
                    key={pos} 
                    onClick={() => setScrapePosition(prev => prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos])}
                    style={{
                      padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s',
                      background: scrapePosition.includes(pos) ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                      border: scrapePosition.includes(pos) ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                      color: scrapePosition.includes(pos) ? '#34D399' : '#CBD5E1'
                    }}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#94A3B8', marginBottom: '12px', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Location (States)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {[{val:'CA', label:'California'}, {val:'TX', label:'Texas'}, {val:'NY', label:'New York'}, {val:'FL', label:'Florida'}, {val:'IL', label:'Illinois'}, {val:'PA', label:'Pennsylvania'}].map(state => (
                  <button 
                    key={state.val} 
                    onClick={() => setScrapeStates(prev => prev.includes(state.val) ? prev.filter(s => s !== state.val) : [...prev, state.val])}
                    style={{
                      padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s',
                      background: scrapeStates.includes(state.val) ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.05)',
                      border: scrapeStates.includes(state.val) ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                      color: scrapeStates.includes(state.val) ? '#FBBF24' : '#CBD5E1'
                    }}
                  >
                    {state.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#94A3B8', marginBottom: '12px', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Number of Employees</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {['1-10', '11-50', '51-200', '201-1000', '1000+'].map(emp => (
                  <button 
                    key={emp} 
                    onClick={() => setScrapeEmployees(prev => prev === emp ? '' : emp)}
                    style={{
                      padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s',
                      background: scrapeEmployees === emp ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255,255,255,0.05)',
                      border: scrapeEmployees === emp ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                      color: scrapeEmployees === emp ? '#C084FC' : '#CBD5E1'
                    }}
                  >
                    {emp}
                  </button>
                ))}
              </div>
            </div>



            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', color: '#94A3B8', marginBottom: '12px', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Annual Revenue</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {['<$1M', '$1M-$5M', '$5M-$20M', '$20M+'].map(rev => (
                  <button 
                    key={rev} 
                    onClick={() => setScrapeRevenue(prev => prev.includes(rev) ? prev.filter(r => r !== rev) : [...prev, rev])}
                    style={{
                      padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s',
                      background: scrapeRevenue.includes(rev) ? 'rgba(20, 184, 166, 0.2)' : 'rgba(255,255,255,0.05)',
                      border: scrapeRevenue.includes(rev) ? '1px solid rgba(20, 184, 166, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                      color: scrapeRevenue.includes(rev) ? '#2DD4BF' : '#CBD5E1'
                    }}
                  >
                    {rev}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
              <button onClick={() => setShowScrapeModal(false)} style={{ padding: '12px 24px', background: 'transparent', color: '#94A3B8', border: 'none', cursor: 'pointer', fontWeight: 600, borderRadius: '12px' }}>
                Cancel
              </button>
              <button 
                onClick={generateMockLeads} 
                disabled={isScraping}
                style={{ 
                  padding: '12px 24px', 
                  background: '#C99F4A', 
                  color: 'white', 
                  borderRadius: '12px', 
                  border: 'none', 
                  cursor: 'pointer', 
                  fontWeight: 700, 
                  boxShadow: '0 4px 12px rgba(201, 159, 74, 0.3)',
                  opacity: isScraping ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {isScraping ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '32px', borderRadius: '24px', width: '400px', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 24px', color: '#0f172a', fontSize: '1.4rem' }}>Import CSV</h2>

            <input type="text" placeholder="Apply Industry to all..." value={importIndustry} onChange={e => setImportIndustry(e.target.value)} style={{ width: '100%', padding: '12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '12px', color: '#0f172a', marginBottom: '16px', boxSizing: 'border-box' }} />
            <input type="text" placeholder="Apply Tags (comma separated)..." value={importTags} onChange={e => setImportTags(e.target.value)} style={{ width: '100%', padding: '12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '12px', color: '#0f172a', marginBottom: '16px', boxSizing: 'border-box' }} />

            <select
              value={importAssignee}
              onChange={e => setImportAssignee(e.target.value)}
              style={{ width: '100%', padding: '12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '12px', color: '#0f172a', marginBottom: '24px', outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}
            >
              <option value="" style={{ background: '#ffffff', color: '#64748B' }}>-- Leave Unassigned --</option>
              {salespeople.map(sp => (
                <option key={sp.id} value={sp.id} style={{ background: '#ffffff', color: '#0f172a' }}>
                  {sp.name || sp.email.split('@')[0]} ({sp.role})
                </option>
              ))}
            </select>

            <div
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#C99F4A' }}
              onDragLeave={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'rgba(0,0,0,0.2)' }}
              onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'rgba(0,0,0,0.2)'; handleFileUpload(e.dataTransfer.files[0]) }}
              style={{ border: '2px dashed rgba(0,0,0,0.2)', padding: '40px', borderRadius: '16px', textAlign: 'center', color: '#64748B', cursor: 'pointer', marginBottom: '24px', transition: 'all 0.2s' }}
              onClick={() => document.getElementById('csvUploadInput').click()}
            >
              {isImporting ? 'Importing...' : 'Drag & Drop CSV or Click here'}
              <input id="csvUploadInput" type="file" accept=".csv" onChange={e => handleFileUpload(e.target.files[0])} style={{ display: 'none' }} disabled={isImporting} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowImportModal(false)} style={{ padding: '10px 20px', background: 'transparent', color: '#64748B', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {callModalLead && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '24px', width: '100%', maxWidth: '400px', padding: '24px', boxShadow: '0 30px 60px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.1rem', fontWeight: 800 }}>Log Call Details</h3>
              <button onClick={() => setCallModalLead(null)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <textarea
              id="modal-call-input"
              autoFocus
              placeholder="How did the call go?"
              style={{ width: '100%', height: '120px', padding: '16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '16px', color: '#0f172a', outline: 'none', resize: 'none', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '20px' }}
            />

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  const content = document.getElementById('modal-call-input').value
                  logCall(callModalLead, content)
                  setCallModalLead(null)
                }}
                style={{ flex: 1, padding: '12px', background: '#C99F4A', border: 'none', color: 'white', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}
              >
                Log Call
              </button>
            </div>
          </div>
        </div>
      )}
      {followUpModalLead && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#111', border: '1px solid rgba(251, 146, 60, 0.25)', borderRadius: '24px', width: '100%', maxWidth: '400px', padding: '24px', boxShadow: '0 30px 60px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem', fontWeight: 800 }}>Schedule Follow-Up</h3>
              <button onClick={() => setFollowUpModalLead(null)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <p style={{ margin: '0 0 20px', color: '#94A3B8', fontSize: '0.85rem' }}>
              Pick when to follow up with <strong style={{ color: '#CBD5E1' }}>{followUpModalLead.name || followUpModalLead.email}</strong>. It'll show up on your Follow-Ups calendar and you'll get an email reminder.
            </p>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: '#64748B', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Date</label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={e => setFollowUpDate(e.target.value)}
                  style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', outline: 'none', fontSize: '0.9rem', colorScheme: 'dark', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: '#64748B', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Time</label>
                <input
                  type="time"
                  value={followUpTime}
                  onChange={e => setFollowUpTime(e.target.value)}
                  style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', outline: 'none', fontSize: '0.9rem', colorScheme: 'dark', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <label style={{ display: 'block', color: '#64748B', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Note (optional)</label>
            <textarea
              value={followUpNote}
              onChange={e => setFollowUpNote(e.target.value)}
              placeholder="What's this follow-up about?"
              style={{ width: '100%', height: '80px', padding: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: 'white', outline: 'none', resize: 'none', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '20px', boxSizing: 'border-box' }}
            />

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setFollowUpModalLead(null)}
                disabled={followUpSaving}
                style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmFollowUpPicker}
                disabled={followUpSaving || !followUpDate || !followUpTime}
                style={{ flex: 1, padding: '12px', background: '#fb923c', border: 'none', color: '#1a0f00', borderRadius: '12px', fontWeight: 800, cursor: followUpSaving ? 'default' : 'pointer', fontSize: '0.9rem', opacity: followUpSaving ? 0.7 : 1 }}
              >
                {followUpSaving ? 'Saving…' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
      {customEmailLead && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '24px', width: '100%', maxWidth: '600px', padding: '28px', boxShadow: '0 30px 60px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem', fontWeight: 800 }}>Send Email to {customEmailLead.name || customEmailLead.email}</h3>
              <button onClick={() => setCustomEmailLead(null)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* Load Template */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#64748B', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Load Template
              </label>
              <select
                value={selectedTemplate}
                onChange={e => handleTemplateChange(e.target.value)}
                style={{ width: '100%', padding: '12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '12px', color: '#0f172a', outline: 'none', cursor: 'pointer' }}
              >
                <option value="" style={{ background: '#ffffff', color: '#0f172a' }}>-- Custom / Blank --</option>
                {emailTemplates.filter(t => ['New', 'Contacted', 'In Progress', 'Meeting Booked', 'Waiting for Invoice', 'No Response', 'Converted', 'Lost'].includes(t.status)).length > 0 && (
                  <optgroup label="System / Status Templates" style={{ background: '#ffffff', color: '#64748B' }}>
                    {emailTemplates
                      .filter(t => ['New', 'Contacted', 'In Progress', 'Meeting Booked', 'Waiting for Invoice', 'No Response', 'Converted', 'Lost'].includes(t.status))
                      .map(t => {
                        const labels = {
                          'New': 'New Lead',
                          'Contacted': 'Contacted',
                          'In Progress': 'In Progress',
                          'Meeting Booked': 'Meeting Booked',
                          'Waiting for Invoice': 'Waiting for Invoice',
                          'No Response': 'No Response',
                          'Converted': 'Converted',
                          'Lost': 'Lost'
                        }
                        return (
                          <option key={t.status} value={t.status} style={{ background: '#ffffff', color: '#0f172a' }}>
                            {labels[t.status] || t.status}
                          </option>
                        )
                      })}
                  </optgroup>
                )}
                {emailTemplates.filter(t => !['New', 'Contacted', 'In Progress', 'Meeting Booked', 'Waiting for Invoice', 'No Response', 'Converted', 'Lost'].includes(t.status)).length > 0 && (
                  <optgroup label="Custom Templates" style={{ background: '#ffffff', color: '#64748B' }}>
                    {emailTemplates
                      .filter(t => !['New', 'Contacted', 'In Progress', 'Meeting Booked', 'Waiting for Invoice', 'No Response', 'Converted', 'Lost'].includes(t.status))
                      .map(t => (
                        <option key={t.status} value={t.status} style={{ background: '#ffffff', color: '#0f172a' }}>
                          {t.status}
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Subject */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#64748B', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Subject
              </label>
              <input
                type="text"
                value={customEmailSubject}
                onChange={e => setCustomEmailSubject(e.target.value)}
                placeholder="Enter email subject..."
                style={{ width: '100%', padding: '12px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '12px', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Body */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', color: '#64748B', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Email Body (HTML supported)
              </label>
              <textarea
                value={customEmailBody}
                onChange={e => setCustomEmailBody(e.target.value)}
                placeholder="Type your message here..."
                style={{ width: '100%', height: '180px', padding: '16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '16px', color: '#0f172a', outline: 'none', resize: 'none', fontSize: '0.95rem', lineHeight: '1.5', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setCustomEmailLead(null)}
                style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid #e2e8f0', color: '#64748B', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!customEmailSubject.trim() || !customEmailBody.trim()) {
                    alert('Please enter a subject and a body.')
                    return
                  }

                  setEmailSending(true)
                  try {
                    const { error } = await supabase.functions.invoke('send-email', {
                      body: {
                        type: 'status_change',
                        recipient: customEmailLead.email,
                        name: customEmailLead.name || 'there',
                        company: customEmailLead.company || '',
                        service: customEmailLead.industry || customEmailLead.service || '',
                        status: selectedTemplate || 'Custom',
                        subject: customEmailSubject,
                        body: customEmailBody,
                      }
                    })

                    if (error) throw error

                    await supabase.from('lead_history').insert({
                      lead_id: customEmailLead.id,
                      lead_type: 'outreach',
                      event_type: 'email_sent',
                      content: `Manual email sent: "${customEmailSubject}"`,
                      admin_id: user?.id
                    })

                    if (selectedLead?.id === customEmailLead.id) {
                      fetchUnifiedHistory(customEmailLead.id)
                    }

                    setEmailSentFor(customEmailLead.id)
                    setTimeout(() => setEmailSentFor(null), 3000)
                    setCustomEmailLead(null)
                  } catch (err) {
                    console.error('Failed to send custom email:', err)
                    alert('Error sending email: ' + err.message)
                  } finally {
                    setEmailSending(false)
                  }
                }}
                disabled={emailSending}
                style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg, #C99F4A, #1B365D)', border: 'none', color: 'white', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {emailSending ? (
                  <>
                    <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                    Sending…
                  </>
                ) : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {bookingLead && (() => {
        const activeAdminName = profile?.name || profile?.email?.split('@')[0] || 'Admin'
        const isMzi = activeAdminName.toLowerCase().includes('mzi')
        const badgeColor = isMzi ? '#f87171' : '#818cf8'
        const badgeBg = isMzi ? 'rgba(248, 113, 113, 0.15)' : 'rgba(129, 140, 248, 0.15)'

        const getDayLabel = (offset) => {
          const d = new Date()
          d.setDate(d.getDate() + offset)
          if (offset === 0) return { dayName: 'Today', dateStr: d.getDate() }
          if (offset === 1) return { dayName: 'Tomorrow', dateStr: d.getDate() }
          const dayName = d.toLocaleDateString([], { weekday: 'short' })
          return { dayName, dateStr: d.getDate() }
        }

        const US_TIMEZONES = [
          { id: 'calendar', label: `Calendar (${calendarTimeZone})` },
          { id: 'America/New_York',    label: 'ET — Eastern Time' },
          { id: 'America/Chicago',     label: 'CT — Central Time' },
          { id: 'America/Denver',      label: 'MT — Mountain Time' },
          { id: 'America/Los_Angeles', label: 'PT — Pacific Time' },
        ]

        const formatSlotInTZ = (date, tz) => {
          if (!tz || tz === 'calendar') {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
          }
          return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: tz })
        }

        const formatDateInTZ = (date, tz) => {
          const opts = { weekday: 'long', month: 'short', day: 'numeric' }
          if (tz && tz !== 'calendar') opts.timeZone = tz
          return date.toLocaleDateString([], opts)
        }

        const generateSlotsForDay = (offset) => {
          const targetDate = new Date()
          targetDate.setDate(targetDate.getDate() + offset)
          
          const slots = []
          const startHour = 9
          const endHour = 18 // up to 6:00 PM
          
          for (let hour = startHour; hour < endHour; hour++) {
            for (let min of [0, 30]) {
              const slotStart = new Date(targetDate)
              slotStart.setHours(hour, min, 0, 0)
              
              if (slotStart < new Date()) continue
              
              const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000)
              const activeTZ = bookingDisplayTZ === 'calendar' ? null : bookingDisplayTZ
              
              slots.push({
                start: slotStart,
                end: slotEnd,
                label: formatSlotInTZ(slotStart, activeTZ)
              })
            }
          }
          return slots
        }

        const getAvailableSlots = (offset) => {
          const slots = generateSlotsForDay(offset)
          return slots.filter(slot => {
            return !busyTimes.some(busy => {
              const busyStart = new Date(busy.start)
              const busyEnd = new Date(busy.end)
              return (slot.start < busyEnd && slot.end > busyStart)
            })
          })
        }

        const availableSlots = getAvailableSlots(selectedDayOffset)

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '850px',
              padding: '32px',
              boxShadow: '0 30px 60px rgba(0,0,0,0.1)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.4rem', fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.01em' }}>Visual Scheduling Hub</h3>
                  <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: '0.8rem', fontWeight: 500 }}>Live availability from your primary calendar</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ background: badgeBg, color: badgeColor, padding: '6px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.01em' }}>
                    Agent: {activeAdminName}
                  </span>
                  <button onClick={() => { setBookingLead(null); setBookingSuccess(false); setBookingError(''); }} style={{ background: 'rgba(0,0,0,0.03)', border: 'none', color: '#64748B', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.06)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
              </div>

              {bookingSuccess ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '30px 0',
                  textAlign: 'center'
                }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '2px solid #10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px',
                    boxShadow: '0 0 20px rgba(16, 185, 129, 0.25)'
                  }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <h4 style={{ margin: '0 0 8px', color: '#0f172a', fontSize: '1.5rem', fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>Appointment Scheduled!</h4>
                  <p style={{ margin: '0 0 24px', color: '#64748B', fontSize: '0.9rem', maxWidth: '450px', lineHeight: 1.5 }}>
                    The call was successfully booked. An email confirmation with meeting details and a Google Meet link has been sent to <strong>{bookingLead.name || bookingLead.email}</strong>, and details have been synced to <strong>info@finderadmin.com</strong>.
                  </p>

                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '20px',
                    width: '100%',
                    maxWidth: '480px',
                    textAlign: 'left',
                    boxSizing: 'border-box',
                    marginBottom: '24px'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '95px 1fr', gap: '10px', fontSize: '0.85rem', lineHeight: 1.4 }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Event Title:</span>
                      <span style={{ color: '#0f172a', fontWeight: 700 }}>{bookingTitle}</span>
                      
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Attendee:</span>
                      <span style={{ color: '#0f172a', fontWeight: 700 }}>{bookingLead.name ? `${bookingLead.name} (${bookingLead.email})` : bookingLead.email}</span>
                      
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Date & Time:</span>
                      <span style={{ color: '#1B365D', fontWeight: 800 }}>
                        {selectedSlot ? `${selectedSlot.start.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })} at ${selectedSlot.label}` : ''}
                      </span>

                      <span style={{ color: '#64748b', fontWeight: 600 }}>Organizer:</span>
                      <span style={{ color: '#94a3b8', fontWeight: 600 }}>info@finderadmin.com</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setBookingLead(null)
                      setBookingSuccess(false)
                    }}
                    style={{
                      padding: '12px 32px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      borderRadius: '10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontSize: '0.85rem'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  {bookingError && (
                    <div style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      marginBottom: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <p style={{ margin: 0, color: '#fca5a5', fontSize: '0.8rem', fontWeight: 600 }}>{bookingError}</p>
                      </div>
                      <button onClick={() => setBookingError('')} style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 700, lineHieght: 1 }}>×</button>
                    </div>
                  )}

                  {/* Content Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', alignItems: 'start' }}>
                    
                    {/* Left Column: Dates & Slots */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <p style={{ margin: 0, color: '#64748B', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Select Booking Date</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          <select
                            value={bookingDisplayTZ}
                            onChange={e => { setBookingDisplayTZ(e.target.value); setSelectedSlot(null) }}
                            style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', fontSize: '0.7rem', fontWeight: 700, padding: '4px 8px', outline: 'none', cursor: 'pointer' }}
                          >
                            {US_TIMEZONES.map(tz => (
                              <option key={tz.id} value={tz.id} style={{ background: '#ffffff', color: '#0f172a' }}>{tz.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      
                      {/* Day Selector Grid (Optimized - No Horizontal Scroll) */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(8, 1fr)',
                        gap: '6px',
                        width: '100%'
                      }}>
                        {Array.from({ length: 8 }).map((_, idx) => {
                          const label = getDayLabel(idx)
                          const isActive = selectedDayOffset === idx
                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                setSelectedDayOffset(idx)
                                setSelectedSlot(null)
                              }}
                              style={{
                                padding: '8px 2px',
                                borderRadius: '12px',
                                border: isActive ? '1.5px solid #1B365D' : '1px solid #e2e8f0',
                                background: isActive ? 'rgba(27, 54, 93, 0.15)' : '#f8fafc',
                                color: isActive ? '#1B365D' : '#0f172a',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                textAlign: 'center',
                                width: '100%',
                                boxSizing: 'border-box'
                              }}
                            >
                              <p style={{ margin: 0, fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', opacity: isActive ? 1 : 0.6, letterSpacing: '0.02em' }}>{label.dayName}</p>
                              <p style={{ margin: '2px 0 0', fontSize: '0.95rem', fontWeight: 800 }}>{label.dateStr}</p>
                            </button>
                          )
                        })}
                      </div>

                      {/* Availability Time Slots Grid */}
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '260px' }}>
                        <p style={{ margin: '0 0 10px', color: '#64748B', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Available Slots ({bookingDisplayTZ === 'calendar' ? calendarTimeZone : US_TIMEZONES.find(t => t.id === bookingDisplayTZ)?.label?.split('—')[0]?.trim() || bookingDisplayTZ})</p>
                        
                        {loadingSlots ? (
                          <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                              <svg width="32" height="32" viewBox="0 0 38 38" stroke="#3b82f6">
                                <g fill="none" fillRule="evenodd">
                                  <g transform="translate(1 1)" strokeWidth="3">
                                    <circle strokeOpacity=".1" cx="18" cy="18" r="18" stroke="#fff"/>
                                    <path d="M36 18c0-9.94-8.06-18-18-18">
                                      <animateTransform
                                        attributeName="transform"
                                        type="rotate"
                                        from="0 18 18"
                                        to="360 18 18"
                                        dur="0.8s"
                                        repeatCount="indefinite"
                                      />
                                    </path>
                                  </g>
                                </g>
                              </svg>
                              <p style={{ margin: 0, color: '#64748B', fontSize: '0.8rem', fontWeight: 500 }}>Syncing live calendar schedule…</p>
                            </div>
                          </div>
                        ) : availableSlots.length === 0 ? (
                          <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '16px', minHeight: '200px', padding: '20px' }}>
                            <p style={{ margin: 0, color: '#64748B', fontSize: '0.85rem', fontWeight: 500, textAlign: 'center' }}>No available time slots found for this day. Please check another date.</p>
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                            {availableSlots.map((slot, sIdx) => {
                              const isSelected = selectedSlot && selectedSlot.start.getTime() === slot.start.getTime()
                              return (
                                <button
                                  key={sIdx}
                                  onClick={() => setSelectedSlot(slot)}
                                  style={{
                                    padding: '12px 6px',
                                    borderRadius: '10px',
                                    border: isSelected ? '1.5px solid #1B365D' : '1px solid rgba(0,0,0,0.06)',
                                    background: isSelected ? 'rgba(27, 54, 93, 0.15)' : '#f8fafc',
                                    color: isSelected ? '#1B365D' : '#0f172a',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    textAlign: 'center'
                                  }}
                                >
                                  {slot.label}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Confirmation Form */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', borderLeft: '1px solid #e2e8f0', paddingLeft: '28px' }}>
                      
                      {/* Client Info Summary Card */}
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <p style={{ margin: 0, color: '#64748B', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Invited Guest</p>
                          <span style={{ fontSize: '0.65rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '8px', fontWeight: 700 }}>Prefilled</span>
                        </div>
                        <p style={{ margin: '0 0 8px', color: '#0f172a', fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bookingLead.name || 'Unnamed'}</p>
                        <div>
                          <label style={{ display: 'block', color: '#64748B', fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Send invite to</label>
                          <input
                            type="email"
                            value={bookingOverrideEmail}
                            onChange={e => setBookingOverrideEmail(e.target.value)}
                            placeholder={bookingLead.email}
                            style={{ width: '100%', padding: '7px 10px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', outline: 'none', fontSize: '0.78rem', fontWeight: 600, boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                            onFocus={e => e.target.style.borderColor = '#C99F4A'}
                            onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                          />
                          {bookingOverrideEmail && bookingOverrideEmail !== bookingLead.email && (
                            <p style={{ margin: '4px 0 0', fontSize: '0.6rem', color: '#C99F4A', fontWeight: 600 }}>⚡ Using override email</p>
                          )}
                        </div>
                      </div>

                      {/* Form Inputs */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                          <label style={{ display: 'block', color: '#64748B', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                            Meeting Title
                          </label>
                          <input
                            type="text"
                            value={bookingTitle}
                            onChange={e => setBookingTitle(e.target.value)}
                            placeholder="Strategy session..."
                            style={{ width: '100%', padding: '10px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', color: '#0f172a', outline: 'none', fontSize: '0.85rem', boxSizing: 'border-box' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', color: '#64748B', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                            Meeting Description & Notes
                          </label>
                          <textarea
                            value={bookingDescription}
                            onChange={e => setBookingDescription(e.target.value)}
                            rows={3}
                            style={{ width: '100%', padding: '10px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', color: '#0f172a', outline: 'none', fontSize: '0.85rem', boxSizing: 'border-box', resize: 'none' }}
                          />
                        </div>
                      </div>

                      {/* Selected Slot Confirmation Block */}
                      <div style={{ background: selectedSlot ? 'rgba(27, 54, 93, 0.05)' : '#f8fafc', border: selectedSlot ? '1px solid rgba(27, 54, 93, 0.15)' : '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <p style={{ margin: 0, color: '#64748B', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Selected Time Slot</p>
                        {selectedSlot ? (
                          <p style={{ margin: 0, color: '#1B365D', fontSize: '0.85rem', fontWeight: 800 }}>
                            {formatDateInTZ(selectedSlot.start, bookingDisplayTZ === 'calendar' ? null : bookingDisplayTZ)} at {selectedSlot.label}
                          </p>
                        ) : (
                          <p style={{ margin: 0, color: '#64748B', fontSize: '0.8rem', fontWeight: 500 }}>
                            Select a date and time slot from the calendar availability grid.
                          </p>
                        )}
                      </div>

                      {/* Google Meet confirmation banner */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '12px', padding: '10px 14px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M23 7l-7 5 7 5V7z" />
                          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                        </svg>
                        <p style={{ margin: 0, color: '#10b981', fontSize: '0.75rem', fontWeight: 700 }}>Google Meet video link added as method</p>
                      </div>

                      {/* Modal Action Buttons */}
                      <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                        <button
                          onClick={() => setBookingLead(null)}
                          style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #e2e8f0', color: '#64748B', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem' }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleBookAppointment}
                          disabled={bookingSending || !selectedSlot}
                          style={{
                            flex: 1.5,
                            padding: '12px',
                            background: 'linear-gradient(135deg, #C99F4A, #1B365D)',
                            border: 'none',
                            color: 'white',
                            borderRadius: '10px',
                            fontWeight: 800,
                            cursor: selectedSlot ? 'pointer' : 'not-allowed',
                            opacity: selectedSlot ? 1 : 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: selectedSlot ? '0 6px 20px rgba(201, 159, 74, 0.25)' : 'none',
                            fontSize: '0.85rem',
                            transition: 'all 0.2s'
                          }}
                        >
                          {bookingSending ? (
                            <>
                              <svg width="14" height="14" viewBox="0 0 38 38" stroke="#fff">
                                <g fill="none" fillRule="evenodd">
                                  <g transform="translate(1 1)" strokeWidth="3">
                                    <circle strokeOpacity=".2" cx="18" cy="18" r="18" stroke="#fff"/>
                                    <path d="M36 18c0-9.94-8.06-18-18-18">
                                      <animateTransform
                                        attributeName="transform"
                                        type="rotate"
                                        from="0 18 18"
                                        to="360 18 18"
                                        dur="0.8s"
                                        repeatCount="indefinite"
                                      />
                                    </path>
                                  </g>
                                </g>
                              </svg>
                              Booking…
                            </>
                          ) : 'Book Call'}
                        </button>
                      </div>

                    </div>

                  </div>
                </>
              )}

            </div>
          </div>
        )
      })()}
    </>
  )
}
