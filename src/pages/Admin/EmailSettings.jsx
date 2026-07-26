import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/Admin/AdminLayout'

const STATUSES = [
  { key: 'New',                 color: '#f472b6', bg: 'rgba(209, 187, 251,0.1)',       border: 'rgba(209, 187, 251,0.2)',       icon: '✨' },
  { key: 'Contacted',          color: '#93c5fd', bg: 'rgba(59,130,246,0.1)',       border: 'rgba(59,130,246,0.2)',      icon: '📞' },
  { key: 'In Progress',        color: '#fbbf24', bg: 'rgba(245,158,11,0.1)',       border: 'rgba(245,158,11,0.2)',      icon: '⚙️' },
  { key: 'Meeting Booked',     color: '#c084fc', bg: 'rgba(168,85,247,0.1)',       border: 'rgba(168,85,247,0.2)',      icon: '🗓️' },
  { key: 'Waiting for Invoice',color: '#67e8f9', bg: 'rgba(6,182,212,0.1)',        border: 'rgba(6,182,212,0.2)',       icon: '📄' },
  { key: 'No Response',        color: '#94a3b8', bg: 'rgba(100,116,139,0.1)',      border: 'rgba(100,116,139,0.2)',     icon: '🔇' },
  { key: 'Converted',          color: '#6ee7b7', bg: 'rgba(16,185,129,0.1)',       border: 'rgba(16,185,129,0.2)',      icon: '🎉' },
  { key: 'Lost',               color: '#f87171', bg: 'rgba(239,68,68,0.1)',        border: 'rgba(239,68,68,0.2)',       icon: '👋' },
]

const SYSTEM_STATUSES_KEYS = STATUSES.map(s => s.key)

const VARIABLE_CHIPS = [
  { label: '{{name}}',    desc: 'Lead full name' },
  { label: '{{status}}',  desc: 'New status label' },
  { label: '{{company}}', desc: 'Company name' },
  { label: '{{service}}', desc: 'Requested service' },
]

const DEFAULT_TEMPLATES = {
  'New':                 { subject: "We received your enquiry, {{name}}!", body: "<p>Hi {{name}},</p>\n<p>Thanks for reaching out. We have logged your enquiry and our team will be in touch very soon.</p>\n<p>Best,<br/>Finder admin</p>" },
  'Contacted':           { subject: "You're on our radar, {{name}}!", body: "<p>Hi {{name}},</p>\n<p>One of our consultants has just reached out to you. Keep an eye on your inbox — exciting things are coming.</p>\n<p>Best,<br/>Finder admin</p>" },
  'In Progress':         { subject: "Your automation project is underway, {{name}}", body: "<p>Hi {{name}},</p>\n<p>We're actively working on your request. We'll update you shortly with our findings and next steps.</p>\n<p>Best,<br/>Finder admin</p>" },
  'Meeting Booked':      { subject: "Your strategy call is confirmed, {{name}} 🗓️", body: "<p>Hi {{name}},</p>\n<p>Great news — your strategy call has been confirmed. We look forward to speaking with you and exploring how we can transform your workflow.</p>\n<p>Best,<br/>Finder admin</p>" },
  'Waiting for Invoice': { subject: "Invoice incoming, {{name}} 📄", body: "<p>Hi {{name}},</p>\n<p>We're preparing your invoice and will send it across shortly. Feel free to reach out if you have any questions in the meantime.</p>\n<p>Best,<br/>Finder admin</p>" },
  'No Response':         { subject: "Checking in, {{name}} 👋", body: "<p>Hi {{name}},</p>\n<p>We noticed we haven't been able to connect with you yet. We'd love to learn more about your automation needs — feel free to reply or book a time that suits you.</p>\n<p>Best,<br/>Finder admin</p>" },
  'Converted':           { subject: "Welcome to Finder admin, {{name}} 🎉", body: "<p>Hi {{name}},</p>\n<p>We're thrilled to welcome you as a client! Our team will be in touch to kick off your automation journey. Get ready to save hours every week.</p>\n<p>Best,<br/>Finder admin</p>" },
  'Lost':                { subject: "A note from Finder admin, {{name}}", body: "<p>Hi {{name}},</p>\n<p>Thank you for considering Finder admin. We understand this might not be the right time — but we're here whenever you're ready to explore automation. Feel free to reach back out any time.</p>\n<p>Best,<br/>Finder admin</p>" },
}

function interpolatePreview(text, vars) {
  if (!text) return '';
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `<span style="color:#f59e0b">{{${k}}}</span>`)
}

function formatPreviewBody(text, vars) {
  if (!text) return '';
  const interpolated = interpolatePreview(text, vars);
  const hasHtml = /<[a-z][\s\S]*>/i.test(interpolated);
  if (hasHtml) {
    return `<div class="html-preview-content">${interpolated}</div>`;
  }
  return interpolated
    .split(/\n\s*\n/)
    .map(para => `<p style="margin: 0 0 16px 0;">${para.replace(/\n/g, '<br />')}</p>`)
    .join('');
}

export default function AdminEmailSettings() {
  const [templates, setTemplates] = useState({})     // { [status]: { subject, body, enabled, id } }
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [toast, setToast]         = useState(null)

  // Wizard Modal State
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardMode, setWizardMode] = useState('create') // 'create' | 'edit'
  const [wizardStep, setWizardStep] = useState(1) // 1: Name, 2: Subject, 3: Body & Preview
  const [wizardStatus, setWizardStatus] = useState('')
  const [wizardOriginalStatus, setWizardOriginalStatus] = useState('')
  const [wizardSubject, setWizardSubject] = useState('')
  const [wizardBody, setWizardBody] = useState('')
  const [wizardEnabled, setWizardEnabled] = useState(true)
  const [wizardId, setWizardId] = useState(null)

  const [modalActiveField, setModalActiveField] = useState('body') // 'subject' | 'body'
  const [modalPreviewTab, setModalPreviewTab] = useState('edit') // 'edit' | 'preview'

  const modalSubjectRef = useRef(null)
  const modalBodyRef = useRef(null)

  const previewVars = { name: 'Jan de Vries', status: 'Contacted', company: 'Acme BV', service: 'AI Automation' }

  useEffect(() => { fetchTemplates() }, [])

  async function fetchTemplates() {
    setLoading(true)
    const { data, error } = await supabase.from('email_templates').select('*')
    if (!error && data) {
      const map = {}
      data.forEach(row => { map[row.status] = { ...row } })
      // Fill defaults for any missing system statuses
      STATUSES.forEach(s => {
        if (!map[s.key]) {
          map[s.key] = { status: s.key, subject: DEFAULT_TEMPLATES[s.key]?.subject || '', body: DEFAULT_TEMPLATES[s.key]?.body || '', enabled: false }
        }
      })
      setTemplates(map)
    }
    setLoading(false)
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Open wizard to edit template
  function handleOpenEdit(statusKey) {
    const t = templates[statusKey] || {}
    setWizardMode('edit')
    setWizardStatus(statusKey)
    setWizardOriginalStatus(statusKey)
    setWizardSubject(t.subject || '')
    setWizardBody(t.body || '')
    setWizardEnabled(t.enabled ?? false)
    setWizardId(t.id || null)
    setWizardStep(1)
    setModalPreviewTab('edit')
    setModalActiveField('body')
    setWizardOpen(true)
  }

  // Open wizard to create template
  function handleOpenCreate() {
    setWizardMode('create')
    setWizardStatus('')
    setWizardOriginalStatus('')
    setWizardSubject('')
    setWizardBody('')
    setWizardEnabled(true)
    setWizardId(null)
    setWizardStep(1)
    setModalPreviewTab('edit')
    setModalActiveField('body')
    setWizardOpen(true)
  }

  // Handle Drag & Drop logic inside Wizard
  function handleDragStart(e, label) {
    e.dataTransfer.setData('text/plain', label)
  }

  function insertModalVariable(varLabel) {
    const fieldName = modalActiveField
    const ref = fieldName === 'subject' ? modalSubjectRef.current : modalBodyRef.current
    const currentVal = fieldName === 'subject' ? wizardSubject : wizardBody

    let start = currentVal.length
    let end = currentVal.length

    if (ref) {
      start = ref.selectionStart
      end = ref.selectionEnd
    }

    const newVal = currentVal.slice(0, start) + varLabel + currentVal.slice(end)

    if (fieldName === 'subject') {
      setWizardSubject(newVal)
    } else {
      setWizardBody(newVal)
    }

    setTimeout(() => {
      if (ref) {
        ref.focus()
        ref.setSelectionRange(start + varLabel.length, start + varLabel.length)
      }
    }, 0)
  }

  async function handleSaveWizard() {
    const statusName = wizardStatus.trim()
    if (!statusName) {
      alert('Template name is required.')
      return
    }

    // Name checking
    if (wizardMode === 'create' && templates[statusName]) {
      alert(`A template named "${statusName}" already exists.`)
      return
    }
    if (wizardMode === 'edit' && statusName !== wizardOriginalStatus && templates[statusName]) {
      alert(`A template named "${statusName}" already exists.`)
      return
    }

    setSaving(true)
    const payload = {
      status: statusName,
      subject: wizardSubject,
      body: wizardBody,
      enabled: wizardEnabled
    }

    let error
    if (wizardId) {
      // Update record
      ;({ error } = await supabase.from('email_templates').update(payload).eq('id', wizardId))
    } else {
      // Create new record
      const res = await supabase.from('email_templates').insert(payload).select().single()
      error = res.error
    }

    setSaving(false)
    if (!error) {
      showToast(`✅ "${statusName}" template saved!`)
      setWizardOpen(false)
      fetchTemplates()
    } else {
      showToast(`❌ Save failed: ${error.message}`, 'error')
    }
  }

  async function handleDeleteTemplate(statusKey) {
    if (!confirm(`Are you sure you want to delete the custom template "${statusKey}"?`)) return
    
    const t = templates[statusKey]
    if (t?.id) {
      const { error } = await supabase.from('email_templates').delete().eq('id', t.id)
      if (error) {
        showToast(`❌ Delete failed: ${error.message}`, 'error')
        return
      }
    }

    showToast(`🗑️ "${statusKey}" template deleted!`)
    setWizardOpen(false)
    fetchTemplates()
  }

  async function toggleEnabledDirect(statusKey, currentVal) {
    const newVal = !currentVal
    // Update local state first for fast response
    setTemplates(prev => ({
      ...prev,
      [statusKey]: { ...prev[statusKey], enabled: newVal }
    }))
    
    const t = templates[statusKey]
    if (t?.id) {
      await supabase.from('email_templates').update({ enabled: newVal }).eq('id', t.id)
    }
    showToast(newVal ? `✅ "${statusKey}" emails enabled` : `🔕 "${statusKey}" emails disabled`)
  }

  const enabledCount = Object.values(templates).filter(t => t.enabled).length
  const customTemplates = Object.keys(templates)
    .filter(key => !SYSTEM_STATUSES_KEYS.includes(key))
    .map(key => templates[key])

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', border: '3px solid rgba(209, 187, 251,0.2)', borderTopColor: '#d1bbfb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
            <p style={{ color: '#64748B' }}>Loading templates…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes toastIn { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
        .bento-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0,0,0,0.04);
        }
        .bento-card:hover {
          border-color: #C99F4A;
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(0,0,0,0.08);
        }
        .toggle-track { transition: background 0.2s; cursor: pointer; }
        .html-preview-content p {
          margin: 0 0 16px 0 !important;
        }
        .wizard-step-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 24px;
        }
        .step-bubble {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.85rem;
          transition: all 0.2s;
        }
        .chip-btn:hover { background: rgba(201, 159, 74, 0.15) !important; transform: translateY(-1px); }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '32px', right: '32px', zIndex: 99999,
          background: toast.type === 'error' ? '#fff5f5' : '#f0fdf4',
          border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
          color: toast.type === 'error' ? '#dc2626' : '#059669',
          padding: '14px 24px', borderRadius: '14px', fontWeight: 600, fontSize: '0.9rem',
          boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
          animation: 'toastIn 0.3s ease-out'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>Email Settings</h1>
          <p style={{ color: '#94A3B8' }}>Configure automated emails sent to leads and construct custom ones.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={handleOpenCreate}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #C99F4A, #1B365D)',
              border: 'none',
              borderRadius: '12px',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'white',
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(201, 159, 74, 0.25)',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={e => e.target.style.transform = 'translateY(-1px)'}
            onMouseLeave={e => e.target.style.transform = 'none'}
          >
            ➕ Create Custom Template
          </button>
          <div style={{ padding: '10px 20px', background: enabledCount > 0 ? 'rgba(16,185,129,0.08)' : '#f1f5f9', border: `1px solid ${enabledCount > 0 ? 'rgba(16,185,129,0.25)' : '#cbd5e1'}`, borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, color: enabledCount > 0 ? '#059669' : '#64748B' }}>
            {enabledCount} active
          </div>
        </div>
      </div>

      {/* ── Section 1: System / Status Templates ── */}
      <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>System Status Automations</span>
        <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>Triggered on lead status changes</span>
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginBottom: '40px' }}>
        {STATUSES.map(s => {
          const t = templates[s.key] || {}
          return (
            <div
              key={s.key}
              className="bento-card"
              onClick={() => handleOpenEdit(s.key)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.25rem' }}>{s.icon}</span>
                  <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>{s.key}</span>
                </div>
                {/* Enabled Toggle */}
                <div
                  onClick={e => {
                    e.stopPropagation()
                    toggleEnabledDirect(s.key, t.enabled)
                  }}
                  className="toggle-track"
                  style={{
                    width: '38px', height: '20px', borderRadius: '10px',
                    background: t.enabled ? '#1B365D' : '#cbd5e1',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    position: 'absolute', top: '2px', left: t.enabled ? '20px' : '2px',
                    width: '16px', height: '16px', borderRadius: '50%', background: 'white',
                    transition: 'left 0.15s'
                  }} />
                </div>
              </div>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.78rem', color: '#64748B', height: '36px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {t.subject || <span style={{ fontStyle: 'italic' }}>No subject line configured</span>}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
                  padding: '2px 8px', borderRadius: '12px', background: s.bg, color: s.color
                }}>
                  System
                </span>
                <span style={{ fontSize: '0.75rem', color: '#C99F4A', fontWeight: 700 }}>Edit →</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Section 2: Custom Templates ── */}
      <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Custom Templates</span>
        <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>Available to choose in the email composer</span>
      </h2>

      {customTemplates.length === 0 ? (
        <div style={{ border: '2px dashed #e2e8f0', borderRadius: '20px', padding: '40px', textAlign: 'center', color: '#64748B', marginBottom: '40px' }}>
          <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem' }}>No custom email templates created yet.</p>
          <button
            onClick={handleOpenCreate}
            style={{
              padding: '6px 16px', background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: '8px', color: '#0f172a', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem'
            }}
          >
            Create Custom Template
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginBottom: '40px' }}>
          {customTemplates.map(t => {
            return (
              <div
                key={t.status}
                className="bento-card"
                onClick={() => handleOpenEdit(t.status)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.25rem' }}>📝</span>
                    <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>{t.status}</span>
                  </div>
                  {/* Toggle */}
                  <div
                    onClick={e => {
                      e.stopPropagation()
                      toggleEnabledDirect(t.status, t.enabled)
                    }}
                    className="toggle-track"
                    style={{
                      width: '38px', height: '20px', borderRadius: '10px',
                      background: t.enabled ? '#1B365D' : '#cbd5e1',
                      position: 'relative'
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: '2px', left: t.enabled ? '20px' : '2px',
                      width: '16px', height: '16px', borderRadius: '50%', background: 'white',
                      transition: 'left 0.15s'
                    }} />
                  </div>
                </div>
                <p style={{ margin: '0 0 12px 0', fontSize: '0.78rem', color: '#64748B', height: '36px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {t.subject || <span style={{ fontStyle: 'italic' }}>No subject line configured</span>}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
                    padding: '2px 8px', borderRadius: '12px', background: 'rgba(201, 159, 74, 0.1)', color: '#C99F4A'
                  }}>
                    Custom
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#C99F4A', fontWeight: 700 }}>Edit →</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── WIZARD MODAL ── */}
      {wizardOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '24px', width: '100%', maxWidth: '700px', padding: '32px', boxShadow: '0 30px 60px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.3rem', fontWeight: 800, fontFamily: 'Space Grotesk, sans-serif' }}>
                {wizardMode === 'create' ? 'Create Custom Template' : `Edit Template: ${wizardOriginalStatus}`}
              </h3>
              <button onClick={() => setWizardOpen(false)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* Step Indicator */}
            <div className="wizard-step-indicator">
              {[
                { number: 1, label: 'Template Name' },
                { number: 2, label: 'Subject Line' },
                { number: 3, label: 'Message Body & Preview' }
              ].map(step => {
                const isActive = wizardStep === step.number
                const isPassed = wizardStep > step.number
                return (
                  <div key={step.number} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      className="step-bubble"
                      style={{
                        background: isActive ? '#1B365D' : isPassed ? 'rgba(27, 54, 93, 0.12)' : '#f1f5f9',
                        color: isActive ? 'white' : isPassed ? '#1B365D' : '#64748B',
                        border: `1px solid ${isActive ? '#1B365D' : isPassed ? 'rgba(27, 54, 93, 0.3)' : '#e2e8f0'}`
                      }}
                    >
                      {isPassed ? '✓' : step.number}
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: isActive ? 800 : 500, color: isActive ? '#0f172a' : '#64748B' }}>{step.label}</span>
                    {step.number < 3 && <div style={{ width: '24px', height: '1px', background: '#e2e8f0' }} />}
                  </div>
                )
              })}
            </div>

            {/* Step Body */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', marginBottom: '24px' }}>
              
              {/* STEP 1: Name */}
              {wizardStep === 1 && (
                <div style={{ animation: 'fadeUp 0.3s ease-out' }}>
                  <p style={{ color: '#64748B', fontSize: '0.85rem', marginBottom: '20px', lineHeight: 1.5 }}>
                    Choose a distinct template identifier. This name will display inside the lead email panel.
                  </p>
                  
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', color: '#64748B', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                      Template Identifier
                    </label>
                    <input
                      type="text"
                      disabled={SYSTEM_STATUSES_KEYS.includes(wizardOriginalStatus)}
                      value={wizardStatus}
                      onChange={e => setWizardStatus(e.target.value)}
                      placeholder="e.g. Booking Followup, LinkedIn Intro"
                      style={{
                        width: '100%', padding: '14px 16px', background: '#ffffff',
                        border: '1px solid #cbd5e1', borderRadius: '12px',
                        color: '#0f172a', outline: 'none', fontSize: '0.95rem', boxSizing: 'border-box'
                      }}
                    />
                    {SYSTEM_STATUSES_KEYS.includes(wizardOriginalStatus) && (
                      <span style={{ display: 'block', color: '#fbbf24', fontSize: '0.75rem', marginTop: '8px', fontWeight: 600 }}>
                        ⚠️ System template names are locked to their corresponding CRM statuses.
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '30px' }}>
                    <input
                      type="checkbox"
                      id="wizard-enabled-check"
                      checked={wizardEnabled}
                      onChange={e => setWizardEnabled(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <label htmlFor="wizard-enabled-check" style={{ color: '#0f172a', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 700 }}>
                      Enable Template for usage
                    </label>
                  </div>
                </div>
              )}

              {/* STEP 2: Subject */}
              {wizardStep === 2 && (
                <div style={{ animation: 'fadeUp 0.3s ease-out' }}>
                  <p style={{ color: '#64748B', fontSize: '0.85rem', marginBottom: '20px', lineHeight: 1.5 }}>
                    Compose the email subject line. You can inject variables directly at your cursor.
                  </p>

                  {/* Variable chips for Subject */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    {VARIABLE_CHIPS.map(v => (
                      <span
                        key={v.label}
                        onClick={() => insertModalVariable(v.label)}
                        className="chip-btn"
                        style={{
                          padding: '5px 12px', background: 'rgba(201, 159, 74, 0.06)',
                          border: '1px solid rgba(201, 159, 74, 0.2)', borderRadius: '8px',
                          color: '#C99F4A', fontSize: '0.75rem', fontWeight: 700,
                          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px',
                          userSelect: 'none'
                        }}
                      >
                        ➕ {v.label}
                      </span>
                    ))}
                  </div>

                  <div>
                    <label style={{ display: 'block', color: '#64748B', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                      Email Subject
                    </label>
                    <input
                      type="text"
                      ref={modalSubjectRef}
                      value={wizardSubject}
                      onChange={e => setWizardSubject(e.target.value)}
                      onFocus={() => setModalActiveField('subject')}
                      placeholder="e.g. Strategy session confirmed for {{name}}! 🗓️"
                      style={{
                        width: '100%', padding: '14px 16px', background: '#ffffff',
                        border: '1px solid #cbd5e1', borderRadius: '12px',
                        color: '#0f172a', outline: 'none', fontSize: '0.95rem', boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: Body & Preview */}
              {wizardStep === 3 && (
                <div style={{ animation: 'fadeUp 0.3s ease-out' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <p style={{ color: '#64748B', fontSize: '0.85rem', margin: 0 }}>
                      Write the HTML body code or check the preview. Drag variable chips straight into the editor!
                    </p>
                    {/* Tab Switcher */}
                    <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '3px' }}>
                      {['edit', 'preview'].map(tabKey => (
                        <button
                          key={tabKey}
                          onClick={() => setModalPreviewTab(tabKey)}
                          style={{
                            padding: '4px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer',
                            fontSize: '0.72rem', fontWeight: 700, transition: 'all 0.2s',
                            background: modalPreviewTab === tabKey ? '#1B365D' : 'transparent',
                            color: modalPreviewTab === tabKey ? 'white' : '#64748B'
                          }}
                        >
                          {tabKey === 'edit' ? '✏️ Editor' : '👁 Preview'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {modalPreviewTab === 'edit' ? (
                    <>
                      {/* Drag & Drop Variable Chips */}
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {VARIABLE_CHIPS.map(v => (
                          <span
                            key={v.label}
                            draggable
                            onDragStart={e => handleDragStart(e, v.label)}
                            onClick={() => insertModalVariable(v.label)}
                            className="chip-btn"
                            style={{
                              padding: '5px 12px', background: 'rgba(201, 159, 74, 0.06)',
                              border: '1px solid rgba(201, 159, 74, 0.2)', borderRadius: '8px',
                              color: '#C99F4A', fontSize: '0.75rem', fontWeight: 700,
                              cursor: 'grab', display: 'inline-flex', alignItems: 'center', gap: '4px',
                              userSelect: 'none'
                            }}
                            title="Drag this item into editor or click to insert at cursor"
                          >
                            🖐️ {v.label}
                          </span>
                        ))}

                        {/* Dropdown variables */}
                        <select
                          value=""
                          onChange={e => {
                            if (e.target.value) {
                              insertModalVariable(e.target.value)
                              e.target.value = ''
                            }
                          }}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            color: '#0f172a',
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                        >
                          <option value="" disabled style={{ background: '#ffffff', color: '#64748B' }}>+ Select Variable</option>
                          {VARIABLE_CHIPS.map(v => (
                            <option key={v.label} value={v.label} style={{ background: '#ffffff', color: '#0f172a' }}>
                              {v.label} ({v.desc})
                            </option>
                          ))}
                        </select>
                      </div>

                      <textarea
                        ref={modalBodyRef}
                        value={wizardBody}
                        onChange={e => setWizardBody(e.target.value)}
                        onFocus={() => setModalActiveField('body')}
                        placeholder="<p>Hi {{name}},</p>\n<p>Thanks for getting in touch with us at {{company}}.</p>"
                        style={{
                          width: '100%', height: '220px', padding: '16px',
                          background: '#f8fafc', border: '1px solid #e2e8f0',
                          borderRadius: '12px', color: '#0f172a', outline: 'none',
                          resize: 'vertical', fontFamily: "'Courier New', monospace",
                          fontSize: '0.85rem', lineHeight: 1.7,
                          boxSizing: 'border-box'
                        }}
                      />
                    </>
                  ) : (
                    /* Live Preview pane */
                    <div style={{ minHeight: '220px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                      <div style={{ background: 'linear-gradient(135deg, #C99F4A, #1B365D)', padding: '16px 20px', textAlign: 'center' }}>
                        <p style={{ margin: 0, color: 'white', fontWeight: 800, fontSize: '0.95rem' }}>Finder admin</p>
                      </div>
                      <div style={{ padding: '20px', background: '#ffffff' }}>
                        <p style={{ margin: '0 0 10px 0', color: '#64748B', fontSize: '0.72rem', fontWeight: 600 }}>
                          Subject: <span style={{ color: '#0f172a' }}>{interpolatePreview(wizardSubject, previewVars)}</span>
                        </p>
                        <div
                          style={{ color: '#334155', fontSize: '0.85rem', lineHeight: 1.6 }}
                          dangerouslySetInnerHTML={{ __html: formatPreviewBody(wizardBody || '<em style="color:#94a3b8">No email body code...</em>', previewVars) }}
                        />
                      </div>
                      <div style={{ padding: '10px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.65rem' }}>© 2026 Finder admin</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Modal Footer Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
              <div>
                {wizardMode === 'edit' && !SYSTEM_STATUSES_KEYS.includes(wizardOriginalStatus) && (
                  <button
                    onClick={() => handleDeleteTemplate(wizardOriginalStatus)}
                    style={{
                      padding: '10px 18px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)',
                      color: '#dc2626', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem'
                    }}
                  >
                    🗑️ Delete
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setWizardOpen(false)}
                  style={{
                    padding: '10px 20px', background: 'transparent', border: '1px solid #e2e8f0',
                    color: '#64748B', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem'
                  }}
                >
                  Cancel
                </button>

                {wizardStep > 1 && (
                  <button
                    onClick={() => setWizardStep(prev => prev - 1)}
                    style={{
                      padding: '10px 20px', background: '#f1f5f9', border: '1px solid #e2e8f0',
                      color: '#0f172a', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem'
                    }}
                  >
                    Back
                  </button>
                )}

                {wizardStep < 3 ? (
                  <button
                    onClick={() => {
                      if (wizardStep === 1 && !wizardStatus.trim()) {
                        alert('Template name is required')
                        return
                      }
                      setWizardStep(prev => prev + 1)
                    }}
                    style={{
                      padding: '10px 24px', background: 'linear-gradient(135deg, #C99F4A, #1B365D)',
                      border: 'none', color: 'white', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem'
                    }}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={handleSaveWizard}
                    disabled={saving}
                    style={{
                      padding: '10px 28px', background: 'linear-gradient(135deg, #059669, #10b981)',
                      border: 'none', color: 'white', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem',
                      opacity: saving ? 0.7 : 1
                    }}
                  >
                    {saving ? 'Saving…' : 'Save Template'}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Info footer box */}
      <div style={{
        marginTop: '40px', padding: '20px 24px',
        background: 'rgba(27, 54, 93, 0.04)', border: '1px solid rgba(27, 54, 93, 0.15)',
        borderRadius: '16px', display: 'flex', gap: '16px', alignItems: 'flex-start'
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1B365D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div>
          <p style={{ margin: '0 0 4px', color: '#1B365D', fontWeight: 700, fontSize: '0.9rem' }}>Template Instructions</p>
          <p style={{ margin: 0, color: '#64748B', fontSize: '0.85rem', lineHeight: 1.6 }}>
            Status Automations trigger automatically on lead status shifts in the CRM. Custom templates are available for manual execution inside the Leads email composer modal. Available variables: <code style={{ color: '#C99F4A' }}>{"{{name}}"}</code>, <code style={{ color: '#C99F4A' }}>{"{{status}}"}</code>, <code style={{ color: '#C99F4A' }}>{"{{company}}"}</code>, <code style={{ color: '#C99F4A' }}>{"{{service}}"}</code>. Drag and drop any variable tag directly into the editors to insert them!
          </p>
        </div>
      </div>
    </AdminLayout>
  )
}
