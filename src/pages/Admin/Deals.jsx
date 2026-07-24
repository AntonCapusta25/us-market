import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/Admin/AdminLayout'
import { useAdmin } from '../../components/Admin/AdminContext'

const COMMISSION_RATE = 0.05

function fmt(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n)
}

export default function AdminDeals() {
  const { user, isAdmin, profile, salespeople } = useAdmin()
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedDeal, setSelectedDeal] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchDeals = useCallback(async () => {
    setLoading(true)
    try {
      let q = supabase.from('deals').select('*').order('created_at', { ascending: false })
      if (statusFilter !== 'all') {
        q = q.eq('status', statusFilter)
      }
      const { data, error } = await q
      if (!error) setDeals(data || [])
    } catch (err) {
      console.error('Error fetching deals:', err)
    } finally {
      setLoading(false)
    }
  }, [isAdmin, user?.id, statusFilter])

  useEffect(() => { fetchDeals() }, [fetchDeals])

  async function saveDealValue() {
    if (!selectedDeal || !isAdmin) return
    setSaving(true)
    const val = parseFloat(editValue) || null
    const spId = selectedDeal.salesperson_id
    const spProf = salespeople.find(sp => sp.id === spId)
    const isNapoleon = spProf?.role === 'Napoleon' || (spId === user?.id && profile?.role === 'Napoleon')
    const rate = isNapoleon ? 0.30 : COMMISSION_RATE
    const commission = val ? val * rate : null
    const { error } = await supabase
      .from('deals')
      .update({
        deal_value: val,
        commission,
        admin_notes: editNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedDeal.id)
    if (!error) {
      setDeals(prev => prev.map(d => d.id === selectedDeal.id
        ? { ...d, deal_value: val, commission, admin_notes: editNotes }
        : d
      ))
      setSelectedDeal(prev => ({ ...prev, deal_value: val, commission, admin_notes: editNotes }))
    }
    setSaving(false)
  }

  async function updateDealStatus(dealId, newStatus) {
    if (!isAdmin) return
    const { error } = await supabase.from('deals').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', dealId)
    if (!error) {
      setDeals(prev => prev.map(d => d.id === dealId ? { ...d, status: newStatus } : d))
      if (selectedDeal?.id === dealId) setSelectedDeal(prev => ({ ...prev, status: newStatus }))
    }
  }

  async function deleteDeal(dealId) {
    if (!confirm('Remove this deal from the pipeline?')) return
    const { error } = await supabase.from('deals').delete().eq('id', dealId)
    if (!error) {
      setDeals(prev => prev.filter(d => d.id !== dealId))
      if (selectedDeal?.id === dealId) setSelectedDeal(null)
    }
  }

  // ── Stats calculations ──
  const myDeals = isAdmin ? deals : deals.filter(d => d.salesperson_id === user?.id)
  const wonDeals = deals.filter(d => d.status === 'won')
  const totalRevenue = wonDeals.reduce((s, d) => s + (d.deal_value || 0), 0)
  const totalCommissions = wonDeals.reduce((s, d) => s + (d.commission || 0), 0)
  const myWonDeals = myDeals.filter(d => d.status === 'won')
  const myRevenue = myWonDeals.reduce((s, d) => s + (d.deal_value || 0), 0)
  const myCommission = myWonDeals.reduce((s, d) => s + (d.commission || 0), 0)

  // Per-employee breakdown for admins
  const employeeStats = salespeople.map(sp => {
    const spDeals = wonDeals.filter(d => d.salesperson_id === sp.id)
    const rev = spDeals.reduce((s, d) => s + (d.deal_value || 0), 0)
    const com = spDeals.reduce((s, d) => s + (d.commission || 0), 0)
    return { ...sp, dealsCount: spDeals.length, revenue: rev, commission: com }
  }).filter(sp => sp.dealsCount > 0).sort((a, b) => b.revenue - a.revenue)

  const statusColors = {
    pipeline: { bg: 'rgba(245, 158, 11, 0.1)', text: '#fcd34d', border: '1px solid rgba(245,158,11,0.2)', label: 'Pipeline' },
    won: { bg: 'rgba(16, 185, 129, 0.1)', text: '#6ee7b7', border: '1px solid rgba(16,185,129,0.2)', label: 'Won' },
    lost: { bg: 'rgba(239, 68, 68, 0.1)', text: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)', label: 'Lost' },
  }

  return (
    <AdminLayout>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .deal-skeleton {
          background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 75%);
          background-size: 400px 100%;
          animation: shimmer 1.6s infinite;
          border-radius: 8px;
        }
        .deals-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 32px;
          gap: 16px;
        }
        .deals-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 40px;
        }
        .deals-grid {
          display: grid;
          gap: 24px;
          transition: all 0.4s;
          grid-template-columns: 1fr;
        }
        .deals-grid.has-selection {
          grid-template-columns: 1fr 360px;
        }
        .deal-detail-panel {
          background: #0a0a0a;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 28px;
          align-self: start;
          position: sticky;
          top: 40px;
          animation: fadeIn 0.25s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 1024px) {
          .deals-summary { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
          .deals-header { flex-direction: column; align-items: stretch; }
          .deals-summary { grid-template-columns: 1fr; gap: 16px; }
          .deals-grid.has-selection { grid-template-columns: 1fr; }
          .deal-table-container { display: block; }
          .deals-grid.has-selection .deal-table-container { display: none; }
          .deal-detail-panel {
            position: fixed;
            top: 70px;
            left: 0;
            width: 100vw;
            height: calc(100vh - 70px);
            z-index: 10000;
            border-radius: 0;
            overflow-y: auto;
          }
        }
      `}</style>

      {/* Header */}
      <div className="deals-header">
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '2.5rem', fontWeight: 900, margin: '0 0 8px', letterSpacing: '-0.02em' }}>Deals & Revenue</h1>
          <p style={{ color: '#94A3B8', fontSize: '1.1rem', fontWeight: 500 }}>Track closed revenue and commission splits.</p>
        </div>
        {/* Status filter */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
          {['all', 'pipeline', 'won', 'lost'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding: '9px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              background: statusFilter === s ? '#d1bbfb' : 'transparent',
              color: statusFilter === s ? 'white' : '#94A3B8',
              fontWeight: 700, fontSize: '0.85rem', textTransform: 'capitalize', transition: 'all 0.2s'
            }}>{s === 'all' ? 'All' : statusColors[s]?.label}</button>
          ))}
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="deals-summary">
        {isAdmin ? (<>
          <StatCard label="Total Revenue" value={fmt(totalRevenue)} color="#10b981" icon="💰" />
          <StatCard label="Admin Share (60%)" value={fmt(totalRevenue * 0.60)} color="#3b82f6" icon="🏦" />
          <StatCard label="Napoleon Share (30%)" value={fmt(totalRevenue * 0.30)} color="#a855f7" icon="👑" />
          <StatCard label="Sales Team Share (10%)" value={fmt(totalRevenue * 0.10)} color="#f59e0b" icon="🤝" />
          <StatCard label="Won Deals" value={wonDeals.length} color="#d1bbfb" icon="🏆" />
        </>) : (<>
          <StatCard label={`My Commission (${profile?.role === 'Napoleon' ? '30%' : '5%'})`} value={fmt(myCommission)} color="#f59e0b" icon="💸" />
          <StatCard label="My Won Deals" value={myWonDeals.length} color="#3b82f6" icon="🏆" />
        </>)}
      </div>

      {/* ── Admin Employee Breakdown ── */}
      {isAdmin && employeeStats.length > 0 && (
        <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '32px', marginBottom: '32px' }}>
          <h3 style={{ color: 'white', margin: '0 0 24px', fontWeight: 800, fontSize: '1.1rem' }}>Commission Distribution</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 120px 130px 130px 130px', gap: '16px', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
            <span style={{ color: '#64748B', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>Agent</span>
            <span style={{ color: '#64748B', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }} />
            <span style={{ color: '#64748B', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>Total Value</span>
            <span style={{ color: '#64748B', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>Admin (60%)</span>
            <span style={{ color: '#64748B', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>Napoleon (30%)</span>
            <span style={{ color: '#64748B', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>Sales (10%)</span>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {employeeStats.map((sp, i) => {
              const maxRev = employeeStats[0].revenue || 1
              const isNap = sp.role === 'Napoleon'
              return (
                <div key={sp.id} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 120px 130px 130px 130px', alignItems: 'center', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isNap ? 'linear-gradient(135deg, #a855f7, #d1bbfb)' : 'linear-gradient(135deg, #d1bbfb, #5646e4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color: 'white', flexShrink: 0 }}>
                      {(sp.name || sp.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <span style={{ color: 'white', fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sp.name || sp.email?.split('@')[0]}
                      <span style={{ fontSize: '0.65rem', color: isNap ? '#c084fc' : '#64748B', marginLeft: '6px', textTransform: 'uppercase', fontWeight: 800 }}>
                        {sp.role}
                      </span>
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ width: `${(sp.revenue / maxRev) * 100}%`, height: '100%', background: isNap ? 'linear-gradient(90deg, #a855f7, #d1bbfb)' : 'linear-gradient(90deg, #d1bbfb, #5646e4)', borderRadius: '10px', transition: 'width 0.6s ease' }} />
                  </div>
                  <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.9rem', textAlign: 'right' }}>{fmt(sp.revenue)}</span>
                  <span style={{ color: '#3b82f6', fontWeight: 600, fontSize: '0.85rem', textAlign: 'right' }}>+{fmt(sp.revenue * 0.60)}</span>
                  <span style={{ color: '#a855f7', fontWeight: 600, fontSize: '0.85rem', textAlign: 'right' }}>+{fmt(sp.revenue * 0.30)}</span>
                  <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: '0.85rem', textAlign: 'right' }}>+{fmt(sp.revenue * 0.10)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Deals Table + Detail Panel ── */}
      <div className={`deals-grid ${selectedDeal ? 'has-selection' : ''}`}>
        <div className="deal-table-container" style={{ background: '#0a0a0a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '24px', overflowX: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
          {loading ? (
            <div style={{ padding: '32px', display: 'grid', gap: '12px' }}>
              {[1,2,3,4].map(i => <div key={i} className="deal-skeleton" style={{ height: '56px' }} />)}
            </div>
          ) : deals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 40px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📭</div>
              <p style={{ color: '#475569', fontSize: '1rem', fontWeight: 600 }}>No deals yet.</p>
              <p style={{ color: '#334155', fontSize: '0.85rem' }}>
                {isAdmin ? 'Deals appear here when salespeople submit leads from the pipeline.' : 'Submit a lead to the pipeline from the Outbound page to create a deal.'}
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Lead', 'Agent', 'Submitted', 'Status', isAdmin ? 'Deal Value' : null, 'Commission'].filter(Boolean).map(h => (
                    <th key={h} style={{ padding: '16px 20px', textAlign: 'left', color: '#64748B', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                  <th style={{ padding: '16px 20px' }} />
                </tr>
              </thead>
              <tbody>
                {deals.map(deal => {
                  const sc = statusColors[deal.status] || statusColors.pipeline
                  const isSelected = selectedDeal?.id === deal.id
                  return (
                    <tr
                      key={deal.id}
                      onClick={() => { setSelectedDeal(deal); setEditValue(deal.deal_value ?? ''); setEditNotes(deal.admin_notes ?? '') }}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(209, 187, 251,0.06)' : 'transparent',
                        transition: 'background 0.15s'
                      }}
                    >
                      <td style={{ padding: '16px 20px' }}>
                        <p style={{ margin: 0, color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>{deal.lead_name || 'Unknown'}</p>
                        <p style={{ margin: 0, color: '#64748B', fontSize: '0.8rem' }}>{deal.lead_email || deal.lead_company || ''}</p>
                      </td>
                      <td style={{ padding: '16px 20px', color: '#94A3B8', fontSize: '0.85rem', fontWeight: 600 }}>
                        {deal.salesperson_name || '—'}
                      </td>
                      <td style={{ padding: '16px 20px', color: '#64748B', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {new Date(deal.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '16px 20px' }} onClick={e => e.stopPropagation()}>
                        {isAdmin ? (
                          <select
                            value={deal.status}
                            onChange={(e) => updateDealStatus(deal.id, e.target.value)}
                            style={{
                              padding: '6px 12px',
                              background: sc.bg,
                              border: sc.border,
                              borderRadius: '20px',
                              color: sc.text,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              outline: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="pipeline" style={{ background: '#0a0a0a', color: '#fcd34d' }}>Pipeline</option>
                            <option value="won" style={{ background: '#0a0a0a', color: '#6ee7b7' }}>Won</option>
                            <option value="lost" style={{ background: '#0a0a0a', color: '#fca5a5' }}>Lost</option>
                          </select>
                        ) : (
                          <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: sc.bg, color: sc.text, border: sc.border }}>
                            {sc.label}
                          </span>
                        )}
                      </td>
                      {isAdmin && (
                        <td style={{ padding: '16px 20px', color: deal.deal_value ? '#10b981' : '#475569', fontWeight: 700, fontSize: '0.9rem' }}>
                          {deal.deal_value ? fmt(deal.deal_value) : <span style={{ color: '#d1bbfb', fontSize: '0.75rem', fontWeight: 700 }}>SET PRICE ↗</span>}
                        </td>
                      )}
                      <td style={{ padding: '16px 20px', color: deal.commission ? '#f59e0b' : '#334155', fontWeight: 700, fontSize: '0.9rem' }}>
                        {deal.commission ? fmt(deal.commission) : '—'}
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteDeal(deal.id) }}
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.4, fontSize: '0.75rem', padding: '4px 8px' }}
                        >✕</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {selectedDeal && (
          <div className="deal-detail-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, color: 'white', fontWeight: 800, fontSize: '1.1rem' }}>Deal Details</h3>
              <button onClick={() => setSelectedDeal(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94A3B8', cursor: 'pointer', borderRadius: '8px', padding: '6px 10px', fontSize: '0.75rem' }}>✕ Close</button>
            </div>

            {/* Lead Info */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
              <p style={{ margin: '0 0 4px', color: 'white', fontWeight: 800, fontSize: '1rem' }}>{selectedDeal.lead_name}</p>
              {selectedDeal.lead_email && <p style={{ margin: '0 0 4px', color: '#64748B', fontSize: '0.82rem' }}>{selectedDeal.lead_email}</p>}
              {selectedDeal.lead_company && <p style={{ margin: 0, color: '#64748B', fontSize: '0.82rem' }}>{selectedDeal.lead_company}</p>}
            </div>

            {/* Agent */}
            {isAdmin && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#64748B', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Agent</label>
                <p style={{ margin: 0, color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>{selectedDeal.salesperson_name || '—'}</p>
              </div>
            )}

            {/* Status controls - admin only */}
            {isAdmin && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#64748B', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Status</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['pipeline', 'won', 'lost'].map(s => {
                    const sc = statusColors[s]
                    return (
                      <button
                        key={s}
                        onClick={() => updateDealStatus(selectedDeal.id, s)}
                        style={{
                          flex: 1, padding: '8px 4px', borderRadius: '10px', border: sc.border, cursor: 'pointer',
                          background: selectedDeal.status === s ? sc.bg : 'transparent',
                          color: selectedDeal.status === s ? sc.text : '#475569',
                          fontWeight: 700, fontSize: '0.75rem', textTransform: 'capitalize', transition: 'all 0.2s'
                        }}
                      >{sc.label}</button>
                    )
                  })}
                </div>
              </div>
            )}

             {isAdmin && (
               <div style={{ marginBottom: '20px' }}>
                 <label style={{ display: 'block', color: '#64748B', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Deal Value (€)</label>
                 <input
                   type="number"
                   placeholder="e.g. 5000"
                   value={editValue}
                   onChange={e => setEditValue(e.target.value)}
                   style={{ width: '100%', padding: '12px', background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '1rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
                 />
                 {editValue && !isNaN(parseFloat(editValue)) && (() => {
                   const spId = selectedDeal.salesperson_id
                   const spProf = salespeople.find(sp => sp.id === spId)
                   const isNapoleon = spProf?.role === 'Napoleon' || (spId === user?.id && profile?.role === 'Napoleon')
                   const rate = isNapoleon ? 0.30 : COMMISSION_RATE
                   return (
                     <p style={{ margin: '8px 0 0', color: '#f59e0b', fontSize: '0.82rem', fontWeight: 600 }}>
                       {isNapoleon ? '30%' : '5%'} commission → {fmt(parseFloat(editValue) * rate)}
                     </p>
                   )
                 })()}
               </div>
             )}

            {/* Commission */}
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
              {(() => {
                const spId = selectedDeal.salesperson_id
                const spProf = salespeople.find(sp => sp.id === spId)
                const isNapoleon = spProf?.role === 'Napoleon' || (spId === user?.id && profile?.role === 'Napoleon')
                const rate = isNapoleon ? 0.30 : COMMISSION_RATE
                return (
                  <>
                    <p style={{ margin: '0 0 4px', color: '#f59e0b', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {isAdmin ? 'Agent Commission' : 'Your Commission'} ({isNapoleon ? '30%' : '5%'})
                    </p>
                    <p style={{ margin: 0, color: 'white', fontWeight: 900, fontSize: '1.6rem' }}>
                      {selectedDeal.deal_value
                        ? fmt(editValue && !isNaN(parseFloat(editValue)) ? parseFloat(editValue) * rate : selectedDeal.commission)
                        : '—'
                      }
                    </p>
                  </>
                )
              })()}
            </div>

            {/* Admin notes */}
            {isAdmin && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#64748B', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Admin Notes</label>
                <textarea
                  rows={3}
                  placeholder="Internal notes about this deal..."
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  style={{ width: '100%', padding: '12px', background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '0.85rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
            )}

            {isAdmin && (
              <button
                onClick={saveDealValue}
                disabled={saving}
                style={{
                  width: '100%', padding: '14px', background: saving ? 'rgba(209, 187, 251,0.4)' : '#d1bbfb',
                  border: 'none', color: 'white', borderRadius: '12px', fontWeight: 800, fontSize: '0.95rem',
                  cursor: saving ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                  boxShadow: '0 8px 20px rgba(209, 187, 251,0.25)'
                }}
              >
                {saving ? 'Saving...' : 'Save Deal Value'}
              </button>
            )}

            {/* Non-admin notes view */}
            {!isAdmin && selectedDeal.admin_notes && (
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '14px' }}>
                <p style={{ margin: '0 0 6px', color: '#64748B', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>Notes from Admin</p>
                <p style={{ margin: 0, color: '#94A3B8', fontSize: '0.85rem', lineHeight: 1.5 }}>{selectedDeal.admin_notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

function StatCard({ label, value, color, icon }) {
  return (
    <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
      <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <p style={{ margin: '0 0 4px', color: '#64748B', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
        <p style={{ margin: 0, color: 'white', fontSize: '1.5rem', fontWeight: 900 }}>{value}</p>
      </div>
    </div>
  )
}
